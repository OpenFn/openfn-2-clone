/**
 * Pure helpers over history records: log filtering, channel request events,
 * failure counts, run state labels, work order selection, History's search in
 * words and as URL params, and the workflows-index metric cards. No fixture access.
 */
import type { ChannelEvent } from "../types/channels";
import type { HistoryWorkflowRef, LogLine, RunDisplayState, SearchFieldId, WorkOrderFilters, WorkOrderRow } from "../types/history";
import type { SortState } from "../types/lists";
import { historySearchFields, historyStatuses } from "../constants";
import type { ParamPatch } from "./useUrlParams";
import { capitalize, formatQueryDate } from "./format";
import type { ProjectMetrics } from "../types/workflows";
import { FAILURE_STATES, type WorkOrderStateCounts } from "../types/workflow-health";

/** What the metric cards count of one workflow. */
interface WorkflowCounts {
  workordersCount: number;
  failedWorkordersCount: number;
  pendingWorkorders: number;
  runs: { total: number; pending: number; success: number };
}

const levelScore = (l: string) => ({ debug: 0, info: 1, warn: 2, error: 3 })[l] ?? 4;

/** The log lines a level filter lets through: `level` and everything above it. */
export function logsAtLevel<T extends { level: string }>(logs: T[], level: LogLine["level"]): T[] {
  return logs.filter((l) => levelScore(l.level) >= levelScore(level));
}

/** Prefers the destination response event, falls back to the error event. */
export function primaryEvent(cr: { events: ChannelEvent[] }): ChannelEvent | undefined {
  return cr.events.find((e) => e.type === "destination_response") ?? cr.events.find((e) => e.type === "error");
}

export const failureTotal = (counts: WorkOrderStateCounts) =>
  FAILURE_STATES.reduce((sum, state) => sum + counts[state], 0);

/**
 * A History link scoped to the workflow plus `filters` (Lightning's
 * historyUrl.ts). `log` is named so History's search-field buttons match what
 * it searches. Empty values are skipped; a list goes as repeated `key[]`.
 */
export function historyUrl(
  projectId: string,
  workflowId: string,
  filters: Record<string, string | readonly string[] | null | undefined>
): string {
  const params = new URLSearchParams({ "filters[workflow_id]": workflowId, "filters[log]": "true" });
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) for (const item of value) params.append(`filters[${key}][]`, item);
    else if (typeof value === "string" && value) params.set(`filters[${key}]`, value);
  }
  return `/projects/${projectId}/history?${params.toString()}`;
}

/** The History link for the states a slice counts, from `from`: one flag per state. */
export const stateUrl = (projectId: string, workflowId: string, from: string, ...states: (keyof WorkOrderStateCounts)[]) =>
  historyUrl(projectId, workflowId, { date_after: from, ...Object.fromEntries(states.map((state) => [state, "true"])) });

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

export function projectMetricsFor(stats: WorkflowCounts[]): ProjectMetrics {
  const sum = (f: (s: WorkflowCounts) => number) => stats.reduce((acc, s) => acc + f(s), 0);
  const woTotal = sum((s) => s.workordersCount);
  const woFailed = sum((s) => s.failedWorkordersCount);
  const runTotal = sum((s) => s.runs.total);
  const runSuccess = sum((s) => s.runs.success);
  return {
    workOrders: {
      total: woTotal,
      pending: sum((s) => s.pendingWorkorders),
      failed: woFailed,
      failedPercentage: pct(woFailed, woTotal),
    },
    runs: {
      total: runTotal,
      pending: sum((s) => s.runs.pending),
      success: runSuccess,
      successRate: pct(runSuccess, runTotal),
    },
  };
}

/** Whether every row that can be ticked is, so a row with a wiped input doesn't keep select-all part-ticked. */
export const allTicked = (rows: WorkOrderRow[], ids: string[]) => {
  const selectable = rows.filter((w) => !w.dataclipWiped);
  return selectable.length > 0 && selectable.every((w) => ids.includes(w.id));
};

/** `display_text_from_state`. */
export function stateLabel(state: RunDisplayState): string {
  switch (state) {
    case "rejected":
      return "Rejected";
    case "pending":
    case "available":
      return "Enqueued";
    case "running":
    case "started":
      return "Running";
    case "claimed":
      return "Starting";
    default:
      return capitalize(state);
  }
}

const fieldWords: Record<SearchFieldId, string> = { log: "Logs", body: "Input", dataclip_name: "Dataclip Name", id: "Id" };

/**
 * The search in words, for "Rerun all matching" (components.ex
 * `humanize_search_params`, word for word, including its "between before
 * and after").
 */
export function describeWorkOrderQuery(f: WorkOrderFilters, workflows: HistoryWorkflowRef[]) {
  const between = (after: string | null, before: string | null, lead: string) =>
    after && before
      ? `${lead} between ${formatQueryDate(before)} and ${formatQueryDate(after)}`
      : after
        ? `${lead} after ${formatQueryDate(after)}`
        : before
          ? `${lead} before ${formatQueryDate(before)}`
          : "";
  const workflow = workflows.find((w) => w.id === f.workflowId);
  const statuses = f.statuses.map((s) => `'${capitalize(s)}'`);
  return [
    between(f.receivedAfter, f.receivedBefore, "received"),
    workflow ? `for ${workflow.name} workflow` : "",
    between(f.activityAfter, f.activityBefore, "which was last run"),
    f.searchTerm && f.searchFields.length
      ? `whose run ${f.searchFields.map((x) => fieldWords[x]).join(" and ")} contain ${f.searchTerm}`
      : "",
    statuses.length > 1 ? `having a status of either ${statuses.join(" or ")}` : statuses.length ? `having a status of ${statuses[0]}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Every filter as the URL's `filters[…]` params, so a change keeps the rest
 * (index.ex "apply_filters" merges into the filters it holds). The run
 * statuses go as repeated `filters[run_status][]`, which a patch can't set,
 * so they're left as the URL has them.
 */
export function workOrderFilterParams(f: WorkOrderFilters, sort: SortState): ParamPatch {
  const flag = (on: boolean) => (on ? "true" : null);
  return {
    "filters[workflow_id]": f.workflowId,
    ...Object.fromEntries(historyStatuses.map((s) => [`filters[${s.id}]`, flag(f.statuses.includes(s.id))])),
    "filters[wo_date_after]": f.receivedAfter,
    "filters[wo_date_before]": f.receivedBefore,
    "filters[date_after]": f.activityAfter,
    "filters[date_before]": f.activityBefore,
    "filters[run_date_after]": f.runCreatedAfter,
    "filters[run_date_before]": f.runCreatedBefore,
    "filters[workorder_id]": f.workorderId,
    "filters[error_signature_exit_reason]": f.errorSignature?.exitReason ?? null,
    "filters[error_signature_error_type]": f.errorSignature?.errorType ?? null,
    "filters[error_signature_job_id]": f.errorSignature?.jobId ?? null,
    "filters[search_term]": f.searchTerm || null,
    ...Object.fromEntries(historySearchFields.map((s) => [`filters[${s.id}]`, flag(f.searchFields.includes(s.id))])),
    "filters[sort_by]": sort.key,
    "filters[sort_direction]": sort.direction,
  };
}
