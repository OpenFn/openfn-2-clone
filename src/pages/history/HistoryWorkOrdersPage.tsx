import { useState } from "react";
import Header from "../../components/primitives/Header";
import HistoryTabs from "../../components/history/HistoryTabs";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import Text from "../../components/primitives/Text";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import FilterChip, { FilterCheckboxes, FilterDateRange, FilterMenu } from "../../components/primitives/FilterChip";
import HistorySearchBar from "../../components/history/HistorySearchBar";
import {
  BulkCancelModal,
  BulkRerunModal,
  ExportConfirmationModal,
  RerunFromJobModal,
  type BulkScope,
  type BulkSelection,
} from "../../components/history/HistoryModals";
import WorkOrdersTable from "../../components/history/WorkOrdersTable";
import { allTicked, describeWorkOrderQuery, workOrderFilterParams } from "../../utils/history";
import { useToast } from "../../components/primitives/Toast";
import { historySearchFields, historyStatuses } from "../../constants";
import type { HistoryWorkflowRef, HistoryWorkOrderState, WorkOrderFilters, WorkOrderRow, WorkOrderTarget } from "../../types/history";
import type { PageInfo, SortState } from "../../types/lists";
import type { CurrentProject } from "../../types/projects";
import { errorMessage } from "../../utils/errors";
import { capitalize, formatChipDateRange, formatRunRange, shortUuid } from "../../utils/format";
import { useUrlParams, type ParamPatch } from "../../utils/useUrlParams";

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface HistoryWorkOrdersPageProps {
  project: CurrentProject;
  /** The picker's label, "parent/child" for a sandbox. */
  projectLabel: string;
  /** Whether the Work Orders / Channel Logs tab bar shows (the viewer's experimental features). */
  channelsEnabled: boolean;
  /** The two tabs' links. */
  workOrdersHref: string;
  channelLogsHref: string;
  workflows: HistoryWorkflowRef[];
  filters: WorkOrderFilters;
  /** The page of work orders the search found. */
  rows: WorkOrderRow[];
  /** "loading" until the search answers, "error" if it failed. */
  state: "loading" | "error" | "ready";
  page: PageInfo;
  /** `filters[sort_by]` ("inserted_at" or "last_activity") and `filters[sort_direction]`. */
  sort: SortState;
  /** A search stops counting here; a count at or over it shows as "N+". */
  searchLimit: number;
  canRunWorkflow: boolean;
  /** The project's data storage settings, linked from a wiped input's tooltip; null when the viewer can't change them. */
  dataStorageHref: string | null;
  /**
   * Resolves when the project may start `runs` more runs; rejects with the
   * reason it can't. Retry and Retry from ask before opening their modal,
   * as Lightning checks the usage limit on the click.
   */
  onCheckRunLimit: (runs: number) => Promise<void>;
  /** Cancels a pending work order. */
  onCancelWorkOrder: (workOrderId: string) => Promise<void>;
  /** Retries a work order from the start. */
  onRetryWorkOrder: (workOrderId: string) => Promise<void>;
  /** Cancels a run still waiting for a worker. */
  onCancelRun: (runId: string) => Promise<void>;
  /** Reruns a run from one of its steps, on the latest version of the workflow. */
  onRetryStep: (runId: string, stepId: string) => Promise<void>;
  onBulkCancel: (target: WorkOrderTarget) => Promise<void>;
  /** Retries from the start, or from `jobId` ("Retry from"). */
  onBulkRetry: (target: WorkOrderTarget, jobId: string | null) => Promise<void>;
  /** Starts the export of everything matching the filters. */
  onExport: () => Promise<void>;
}

/** A datetime-local input's value: the UTC minutes, as Lightning reads it back. */
const inputDate = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/**
 * Inventory view `history-work-orders` (RunLive.Index :index,
 * run_live/index.html.heex): the filter chips, the search, and the work
 * orders table with its bulk actions. The search lives in the URL, as
 * Lightning keeps it; props only, so it can run unchanged in Lightning. The
 * replica's data lives in HistoryWorkOrdersPage.replica.tsx.
 */
export default function HistoryWorkOrdersPage({
  project,
  projectLabel,
  channelsEnabled,
  workOrdersHref,
  channelLogsHref,
  workflows,
  filters,
  rows,
  state,
  page,
  sort,
  searchLimit,
  canRunWorkflow,
  dataStorageHref,
  onCheckRunLimit,
  onCancelWorkOrder,
  onRetryWorkOrder,
  onCancelRun,
  onRetryStep,
  onBulkCancel,
  onBulkRetry,
  onExport,
}: HistoryWorkOrdersPageProps) {
  const { update, href } = useUrlParams();
  const toast = useToast();
  // The host announces success (its flash); a refusal or a lost connection is said here.
  const failed = (error: unknown) => toast(errorMessage(error), "danger");
  const [ticked, setTicked] = useState<string[]>([]);
  const [modal, setModal] = useState<null | "cancel" | "retry" | "retry-from" | "export">(null);
  // Remounts "Run from a specific step" on each open, so its job choice starts fresh.
  const [retryFromKey, setRetryFromKey] = useState(0);

  // A new search starts at page 1.
  const apply = (change: Partial<WorkOrderFilters>, extra: ParamPatch = {}) =>
    update({ ...workOrderFilterParams({ ...filters, ...change }, sort), ...extra, page: null });
  const sortHref = (key: string, direction: SortState["direction"]) =>
    href({ ...workOrderFilterParams(filters, { key, direction }), page: null });

  // Only rows still on the page stay ticked.
  const selectedIds = ticked.filter((id) => rows.some((r) => r.id === id));
  const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
  const selection: BulkSelection = {
    selectedCount: selectedIds.length,
    allSelected: allTicked(rows, selectedIds),
    pageNumber: page.number,
    pages: Math.max(1, Math.ceil(page.totalEntries / page.size)),
    totalEntries: page.totalEntries,
  };
  const target = (scope: BulkScope): WorkOrderTarget => (scope === "all" ? "all" : selectedIds);
  // A refused check is said as Lightning flashes it, and no modal opens.
  const afterLimitCheck = (open: () => void) => void onCheckRunLimit(selectedIds.length).then(open, failed);
  const done = () => {
    setModal(null);
    setTicked([]);
  };

  // "Retry from" counts, per job, the selected work orders whose last run has a stored input for it.
  const selectedWorkflow = workflows.find((w) => w.id === selectedRows[0]?.workflowId);
  const retryFromJobs = (selectedWorkflow?.jobs ?? []).map((job) => ({
    ...job,
    retriableCount: selectedRows.filter((r) => r.runs[0]?.steps.some((s) => s.jobId === job.id && !s.inputWiped)).length,
  }));

  const selectedStatuses = historyStatuses.filter((s) => filters.statuses.includes(s.id));
  const hasReceived = Boolean(filters.receivedAfter || filters.receivedBefore);
  const hasActivity = Boolean(filters.activityAfter || filters.activityBefore);
  const sig = filters.errorSignature;
  const capped = page.totalEntries >= searchLimit;

  return (
    <PageContent
      header={
        <Header breadcrumbs={<ProjectBreadcrumbs project={project} label={projectLabel} current="History" />} title="History">
          {channelsEnabled && (
            <HistoryTabs active="work-orders" workOrdersHref={workOrdersHref} channelLogsHref={channelLogsHref} />
          )}
        </Header>
      }
    >
      <Centered>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <FilterChip
            id="workflow-filter-chip"
            active={filters.workflowId !== null}
            onClear={() => apply({ workflowId: null })}
            menu={
              <FilterMenu
                options={[{ value: null, label: "Any" }, ...workflows.map((w) => ({ value: w.id, label: w.name }))]}
                selected={filters.workflowId}
                onSelect={(workflowId) => apply({ workflowId })}
              />
            }
          >
            Workflow is {workflows.find((w) => w.id === filters.workflowId)?.name ?? "any"}
          </FilterChip>

          <FilterChip
            id="status-filter-chip"
            active={selectedStatuses.length > 0}
            onClear={() => apply({ statuses: [] })}
            dropdownClassName="w-44"
            dropdown={() => (
              <FilterCheckboxes
                options={historyStatuses}
                checked={filters.statuses}
                onToggle={(id) => apply({ statuses: toggle(filters.statuses, id as HistoryWorkOrderState) })}
              />
            )}
          >
            Status {selectedStatuses.length > 1 ? "in" : "is"}{" "}
            {selectedStatuses.length ? selectedStatuses.map((s) => s.label).join(", ") : "any"}
          </FilterChip>

          <FilterChip
            id="received-filter-chip"
            active={hasReceived}
            onClear={() => apply({ receivedAfter: null, receivedBefore: null })}
            dropdownClassName=""
            dropdown={() => (
              <FilterDateRange
                title="Filter by Date Received"
                afterLabel="Received After"
                beforeLabel="Received Before"
                after={inputDate(filters.receivedAfter)}
                before={inputDate(filters.receivedBefore)}
                onChange={(after, before) => apply({ receivedAfter: after || null, receivedBefore: before || null })}
              />
            )}
          >
            Received {formatChipDateRange(filters.receivedAfter, filters.receivedBefore)}
          </FilterChip>

          <FilterChip
            id="activity-filter-chip"
            active={hasActivity}
            onClear={() => apply({ activityAfter: null, activityBefore: null })}
            dropdownClassName=""
            dropdown={() => (
              <FilterDateRange
                title="Filter by Last Activity"
                afterLabel="Activity After"
                beforeLabel="Activity Before"
                after={inputDate(filters.activityAfter)}
                before={inputDate(filters.activityBefore)}
                onChange={(after, before) => apply({ activityAfter: after || null, activityBefore: before || null })}
              />
            )}
          >
            Last activity {formatChipDateRange(filters.activityAfter, filters.activityBefore)}
          </FilterChip>

          {filters.runStatuses.length > 0 && (
            <FilterChip
              id="run-status-filter-chip"
              active
              onClear={() => apply({ runStatuses: [] }, { "filters[run_status][]": null })}
            >
              Run status: {filters.runStatuses.map(capitalize).join(", ")}
            </FilterChip>
          )}

          {(filters.runCreatedAfter || filters.runCreatedBefore) && (
            <FilterChip
              id="run-dates-filter-chip"
              active
              onClear={() => apply({ runCreatedAfter: null, runCreatedBefore: null })}
            >
              Run created {formatRunRange(filters.runCreatedAfter, filters.runCreatedBefore)}
            </FilterChip>
          )}

          {filters.workorderId && (
            <FilterChip id="workorder-id-filter-chip" active onClear={() => apply({ workorderId: null })}>
              Work order: {shortUuid(filters.workorderId)}
            </FilterChip>
          )}

          {sig && (
            <FilterChip id="error-signature-filter-chip" active onClear={() => apply({ errorSignature: null })}>
              {sig.exitReason}
              {sig.errorType && `:${sig.errorType}`}
              {sig.jobId && ` @ ${sig.jobName ?? shortUuid(sig.jobId)}`}
            </FilterChip>
          )}
        </div>

        <div className="mt-2">
          <HistorySearchBar
            fields={historySearchFields}
            selected={filters.searchFields}
            onToggle={(id) => apply({ searchFields: toggle(filters.searchFields, id) })}
            term={filters.searchTerm}
            onSearch={(searchTerm) => apply({ searchTerm })}
          />
        </div>

        {filters.searchTerm && (
          // eslint-disable-next-line local/primitive-classname -- debt: F525 margin (m-2)
          <Text as="div" tone="muted" className="m-2 truncate">
            {page.totalEntries}
            {capped && "+"} work orders with runs matching "{filters.searchTerm}"
            {capped && <Text variant="body-sm"> (try more specific filters)</Text>}
          </Text>
        )}

        <div className="mt-2">
          <WorkOrdersTable
            rows={rows}
            state={state}
            page={page}
            sort={sort}
            sortHref={sortHref}
            expandedId={filters.workorderId}
            selectedIds={selectedIds}
            onSelectionChange={setTicked}
            canRunWorkflow={canRunWorkflow}
            dataStorageHref={dataStorageHref}
            onBulkCancel={() => setModal("cancel")}
            onBulkRetry={() => afterLimitCheck(() => setModal("retry"))}
            onBulkRetryFrom={() =>
              afterLimitCheck(() => {
                setRetryFromKey((k) => k + 1);
                setModal("retry-from");
              })
            }
            onExport={() => setModal("export")}
            onCancel={(id) => void onCancelWorkOrder(id).catch(failed)}
            onRetry={(id) => void onRetryWorkOrder(id).catch(failed)}
            onCancelRun={(id) => void onCancelRun(id).catch(failed)}
            onRetryStep={(runId, stepId) => void onRetryStep(runId, stepId).catch(failed)}
          />
        </div>

        <BulkCancelModal
          open={modal === "cancel"}
          onClose={() => setModal(null)}
          selection={selection}
          onConfirm={async (scope) => {
            await onBulkCancel(target(scope));
            done();
          }}
        />
        <BulkRerunModal
          open={modal === "retry"}
          onClose={() => setModal(null)}
          selection={selection}
          query={describeWorkOrderQuery(filters, workflows)}
          onConfirm={async (scope) => {
            await onBulkRetry(target(scope), null);
            done();
          }}
        />
        {selectedWorkflow && (
          <RerunFromJobModal
            key={retryFromKey}
            open={modal === "retry-from"}
            onClose={() => setModal(null)}
            jobs={retryFromJobs}
            selection={selection}
            onConfirm={async (scope, jobId) => {
              await onBulkRetry(target(scope), jobId);
              done();
            }}
          />
        )}
        <ExportConfirmationModal
          open={modal === "export"}
          onClose={() => setModal(null)}
          count={page.totalEntries}
          onConfirm={async () => {
            await onExport();
            setModal(null);
          }}
        />
      </Centered>
    </PageContent>
  );
}
