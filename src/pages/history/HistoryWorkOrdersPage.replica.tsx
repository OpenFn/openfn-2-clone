import { useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useToast } from "../../components/primitives/Toast";
import { projectLabel } from "../../components/shell/projectPickerItems";
import { historySearchFields, historyStatuses } from "../../constants";
import { findDataclip, stepsOf, workOrdersIn } from "../../mock-data/history";
import { historyChannelsEnabled, logsOf, runsOfWorkOrder, workflowJobs, workOrderRow } from "../../mock-data/history-extra";
import { findProject, projects } from "../../mock-data/projects";
import { simulateRequest } from "../../mock-data/request";
import { workflowsIn } from "../../mock-data/workflows";
import { usePermissions } from "../../session/session";
import type { HistoryWorkOrderState, RunRow, RunState, WorkOrderFilters, WorkOrderRow } from "../../types/history";
import type { WorkOrder } from "../../mock-data/models/history";
import HistoryWorkOrdersPage from "./HistoryWorkOrdersPage";

/** Repo's Scrivener page size, and Invocation's `@workorders_count_limit`. */
const PAGE_SIZE = 10;
const SEARCH_LIMIT = 50;

/** A URL date: an ISO string, or a datetime-local value Lightning reads as UTC. */
function isoOf(value: string | null) {
  if (!value) return null;
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * The URL's `filters[…]`, or Lightning's `init_filters` when it has none:
 * runs logs searched, last activity in the past 30 days.
 */
function filtersFrom(params: URLSearchParams): WorkOrderFilters {
  const bare = ![...params.keys()].some((k) => k.startsWith("filters["));
  const get = (key: string) => params.get(`filters[${key}]`) || null;
  const on = (key: string) => get(key) === "true";
  const sigReason = get("error_signature_exit_reason");
  return {
    workflowId: get("workflow_id"),
    statuses: historyStatuses.map((s) => s.id).filter(on),
    receivedAfter: isoOf(get("wo_date_after")),
    receivedBefore: isoOf(get("wo_date_before")),
    activityAfter: bare ? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() : isoOf(get("date_after")),
    activityBefore: isoOf(get("date_before")),
    runStatuses: params.getAll("filters[run_status][]") as RunState[],
    runCreatedAfter: isoOf(get("run_date_after")),
    runCreatedBefore: isoOf(get("run_date_before")),
    workorderId: get("workorder_id"),
    errorSignature: sigReason
      ? { exitReason: sigReason, errorType: get("error_signature_error_type"), jobId: get("error_signature_job_id"), jobName: null }
      : null,
    searchTerm: get("search_term") ?? "",
    searchFields: bare ? ["log"] : historySearchFields.map((f) => f.id).filter(on),
  };
}

const inRange = (iso: string, after: string | null, before: string | null) =>
  (!after || iso >= after) && (!before || iso <= before);

function matchesStatus(wo: WorkOrder, statuses: string[]) {
  if (!statuses.length) return true;
  return statuses.some((s) => {
    if (s === "running") return wo.state === "started" || wo.state === "claimed";
    if (s === "pending") return wo.state === "pending" || wo.state === "available";
    return wo.state === s;
  });
}

function matches(wo: WorkOrder, f: WorkOrderFilters) {
  const runs = runsOfWorkOrder(wo);
  const term = f.searchTerm.toLowerCase();
  const dataclip = findDataclip(wo.dataclipId);
  const searched =
    !term ||
    f.searchFields.some((field) => {
      switch (field) {
        case "id":
          return [wo.id, wo.dataclipId, ...runs.map((r) => r.id)].some((id) => id.toLowerCase().includes(term));
        case "dataclip_name":
          return (dataclip?.name ?? "").toLowerCase().includes(term);
        case "body":
          return JSON.stringify(dataclip?.body ?? "").toLowerCase().includes(term);
        case "log":
          return runs.some((r) => logsOf(r).some((l) => l.message.toLowerCase().includes(term)));
      }
    });
  const sig = f.errorSignature;
  const runFilter = f.runStatuses.length > 0 || f.runCreatedAfter || f.runCreatedBefore;
  return (
    (!f.workorderId || wo.id === f.workorderId) &&
    (!f.workflowId || wo.workflowId === f.workflowId) &&
    matchesStatus(wo, f.statuses) &&
    inRange(wo.insertedAt, f.receivedAfter, f.receivedBefore) &&
    inRange(wo.lastActivity, f.activityAfter, f.activityBefore) &&
    (!runFilter ||
      runs.some(
        (r) =>
          (!f.runStatuses.length || f.runStatuses.includes(r.state)) && inRange(r.insertedAt, f.runCreatedAfter, f.runCreatedBefore)
      )) &&
    (!sig ||
      runs.some((r) =>
        stepsOf(r).some(
          (s) => s.exitReason === sig.exitReason && (!sig.errorType || s.errorType === sig.errorType) && (!sig.jobId || s.jobId === sig.jobId)
        )
      )) &&
    searched
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the actions have done to the fixtures: new runs (newest first) and changed states. */
interface Changes {
  runs: Record<string, RunRow[]>;
  workOrders: Record<string, HistoryWorkOrderState>;
  runStates: Record<string, RunState>;
}

/**
 * The replica's side of HistoryWorkOrdersPage: the search read from the URL
 * as RunLive.Index reads it, the fixtures filtered, sorted and paged as the
 * server would, and Lightning's flash for each action. A retry adds an
 * enqueued run to its work order and a cancel cancels, as Lightning's live
 * updates show them. Lightning replaces this file with a LiveView wrapper.
 */
export default function HistoryWorkOrdersPageReplica() {
  const { projectId = "" } = useParams();
  const [params] = useSearchParams();
  const project = findProject(projectId);
  const { canRunWorkflow, canEditDataRetention } = usePermissions(project);
  const toast = useToast();
  const [changes, setChanges] = useState<Changes>({ runs: {}, workOrders: {}, runStates: {} });
  if (!project) return <Navigate to="/projects" replace />;

  const workflows = workflowsIn(projectId).map((w) => ({ id: w.id, name: w.name, jobs: workflowJobs(w.id) }));
  const parsed = filtersFrom(params);
  const sig = parsed.errorSignature;
  // RunLive.Index names the signature's job (`error_signature_job_name`).
  const filters = sig?.jobId
    ? { ...parsed, errorSignature: { ...sig, jobName: workflows.flatMap((w) => w.jobs).find((j) => j.id === sig.jobId)?.name ?? null } }
    : parsed;
  const sort = {
    key: params.get("filters[sort_by]") === "inserted_at" ? "inserted_at" : "last_activity",
    direction: params.get("filters[sort_direction]") === "asc" ? "asc" : "desc",
  } as const;
  const field = sort.key === "inserted_at" ? "insertedAt" : "lastActivity";
  const all = workOrdersIn(projectId)
    .filter((wo) => matches(wo, filters))
    .sort((a, b) => (sort.direction === "asc" ? 1 : -1) * a[field].localeCompare(b[field]));
  const pageNumber = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const live = (row: WorkOrderRow): WorkOrderRow => ({
    ...row,
    state: changes.workOrders[row.id] ?? row.state,
    runs: [...(changes.runs[row.id] ?? []), ...row.runs].map((r) => ({ ...r, state: changes.runStates[r.id] ?? r.state })),
  });
  const liveAll = all.map(workOrderRow).map(live);
  const rows = liveAll.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
  const idsOf = (target: string[] | "all", keep: (r: WorkOrderRow) => boolean) =>
    target === "all" ? liveAll.filter(keep).map((r) => r.id) : target;
  const workOrderOfRun = (runId: string) => liveAll.find((r) => r.runs.some((run) => run.id === runId))!;

  // A new run waits for a worker, so its work order is pending again.
  const enqueue = (ids: string[]) =>
    setChanges((c) => {
      const now = new Date().toISOString();
      const runs = { ...c.runs };
      const workOrders = { ...c.workOrders };
      for (const id of ids) {
        const runId = crypto.randomUUID();
        const run: RunRow = {
          id: runId,
          state: "available",
          insertedAt: now,
          claimedAt: null,
          startedAt: null,
          finishedAt: null,
          updatedAt: now,
          href: `/projects/${projectId}/runs/${runId}`,
          steps: [],
        };
        runs[id] = [run, ...(runs[id] ?? [])];
        workOrders[id] = "pending";
      }
      return { ...c, runs, workOrders };
    });
  // Cancelling a work order cancels its runs still waiting for a worker.
  const cancel = (ids: string[]) =>
    setChanges((c) => {
      const workOrders = { ...c.workOrders };
      const runStates = { ...c.runStates };
      for (const row of liveAll.filter((r) => ids.includes(r.id))) {
        workOrders[row.id] = "cancelled";
        for (const run of row.runs) if (run.state === "available") runStates[run.id] = "cancelled";
      }
      return { ...c, workOrders, runStates };
    });

  return (
    <HistoryWorkOrdersPage
      project={project}
      projectLabel={projectLabel(project, projects)}
      channelsEnabled={historyChannelsEnabled}
      workOrdersHref={`/projects/${projectId}/history`}
      channelLogsHref={`/projects/${projectId}/history/channels`}
      workflows={workflows}
      filters={filters}
      rows={rows}
      state="ready"
      // A search counts no further than the limit, as Invocation.search_workorders does.
      page={{ number: pageNumber, size: PAGE_SIZE, totalEntries: filters.searchTerm ? Math.min(all.length, SEARCH_LIMIT) : all.length }}
      sort={sort}
      searchLimit={SEARCH_LIMIT}
      canRunWorkflow={canRunWorkflow}
      dataStorageHref={canEditDataRetention ? `/projects/${projectId}/settings#data-storage` : null}
      onCheckRunLimit={async () => {}}
      onCancelWorkOrder={async (id) => {
        await simulateRequest();
        cancel([id]);
        toast("Work order cancelled.");
      }}
      onRetryWorkOrder={async (id) => {
        await simulateRequest();
        enqueue([id]);
        toast("New run enqueued for 1 workorder");
      }}
      onCancelRun={async (runId) => {
        await simulateRequest();
        const row = workOrderOfRun(runId);
        setChanges((c) => ({
          ...c,
          runStates: { ...c.runStates, [runId]: "cancelled" },
          workOrders: row.runs[0]?.id === runId ? { ...c.workOrders, [row.id]: "cancelled" } : c.workOrders,
        }));
        toast("Run cancelled.");
      }}
      // Lightning says nothing; the new run just appears.
      onRetryStep={async (runId) => {
        await simulateRequest();
        enqueue([workOrderOfRun(runId).id]);
      }}
      onBulkCancel={async (target) => {
        await simulateRequest();
        const ids = idsOf(target, (r) => r.state === "pending");
        cancel(ids);
        toast(target === "all" ? `Cancelling runs for ${plural(ids.length, "work order")} in the background...` : `Cancelled ${plural(ids.length, "run")}`);
      }}
      onBulkRetry={async (target) => {
        await simulateRequest();
        const ids = idsOf(target, (r) => !r.dataclipWiped);
        enqueue(ids);
        const n = ids.length;
        toast(`New run${n > 1 ? "s" : ""} enqueued for ${n} workorder${n > 1 ? "s" : ""}`);
      }}
      onExport={async () => {
        await simulateRequest();
        toast("History export started successfully. You will be notified by email after completion.");
      }}
    />
  );
}
