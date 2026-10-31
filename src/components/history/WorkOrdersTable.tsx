import Button from "../primitives/Button";
import IconButton from "../primitives/IconButton";
import { Checkbox } from "../primitives/Inputs";
import Pagination from "../primitives/Pagination";
import { Table, Th, Tr } from "../primitives/Table";
import type { WorkOrderRow } from "../../types/history";
import type { PageInfo, SortState } from "../../types/lists";
import { activeStates } from "../../constants";
import WorkOrderTableRow from "./WorkOrderTableRow";
import { allTicked } from "../../utils/history";

/** The columns History sorts by (`filters[sort_by]`). */
export type WorkOrderSortKey = "inserted_at" | "last_activity";

/**
 * History's work orders table (run_live/index.html.heex `work-orders-table`):
 * select-all checkbox with the bulk Cancel / Retry / Retry from bar, the
 * Created and Last Activity columns linking to their re-sorted URL, one
 * WorkOrderTableRow per entry, and the pagination bar with the export button.
 */
export default function WorkOrdersTable({
  rows,
  state,
  page,
  sort,
  sortHref,
  expandedId,
  selectedIds,
  onSelectionChange,
  canRunWorkflow,
  dataStorageHref,
  onBulkCancel,
  onBulkRetry,
  onBulkRetryFrom,
  onExport,
  onCancel,
  onRetry,
  onCancelRun,
  onRetryStep,
}: {
  rows: WorkOrderRow[];
  state: "loading" | "error" | "ready";
  page: PageInfo;
  sort: SortState;
  /** The URL that sorts by `key` in `direction`. */
  sortHref: (key: WorkOrderSortKey, direction: SortState["direction"]) => string;
  /** The work order that opens expanded, with all its runs. */
  expandedId: string | null;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  canRunWorkflow: boolean;
  /** The project's data storage settings, for a wiped input; null when the viewer can't change them. */
  dataStorageHref: string | null;
  onBulkCancel: () => void;
  onBulkRetry: () => void;
  onBulkRetryFrom: () => void;
  onExport: () => void;
  onCancel: (workOrderId: string) => void;
  onRetry: (workOrderId: string) => void;
  onCancelRun: (runId: string) => void;
  onRetryStep: (runId: string, stepId: string) => void;
}) {
  const selectable = rows.filter((w) => !w.dataclipWiped);
  const selected = rows.filter((w) => selectedIds.includes(w.id));
  const allSelected = allTicked(rows, selectedIds);
  const partial = selected.length > 0 && !allSelected;

  const canCancel = selected.length > 0 && selected.every((w) => w.state === "pending");
  const canRetry = selected.length > 0 && selected.every((w) => !activeStates.includes(w.state));
  const oneWorkflow = new Set(selected.map((w) => w.workflowId)).size === 1;

  // A new column sorts newest first; the current one flips (index.ex "sort").
  const th = (key: WorkOrderSortKey) => {
    const current = sort.key === key;
    return {
      sortDirection: current ? sort.direction : null,
      sortHref: sortHref(key, current && sort.direction === "desc" ? "asc" : "desc"),
    };
  };

  const bulkButton = (label: string, enabled: boolean, onClick: () => void, disabledMsg: string) => (
    <Button size="xs" variant="secondary" disabled={!enabled} tooltip={enabled ? undefined : disabledMsg} onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <Table
      id="work-orders-table"
      state={state}
      loadingMessage="Loading work orders ..."
      errorMessage="There was an error loading the work orders"
      header={
        <Tr>
          {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (!pr-1) */}
          <Th className="!pr-1">
            <div className="relative">
              <Checkbox
                id="select_all"
                label={<span className="sr-only">Select all work orders</span>}
                checked={allSelected}
                indeterminate={partial}
                disabled={rows.length === 0}
                onChange={(e) => onSelectionChange(e.target.checked ? selectable.map((w) => w.id) : [])}
                // eslint-disable-next-line local/primitive-classname -- debt: F529 state (disabled:opacity-50)
                className="disabled:opacity-50"
              />
              {selected.length > 0 && (
                <div className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 gap-1 whitespace-nowrap bg-subtle">
                  {bulkButton(
                    "Cancel",
                    canCancel,
                    onBulkCancel,
                    "Cancel is only available when all selected work orders are pending"
                  )}
                  {bulkButton(
                    "Retry",
                    canRetry,
                    onBulkRetry,
                    "Retry is only available when all selected work orders have finished running"
                  )}
                  {oneWorkflow &&
                    bulkButton(
                      "Retry from",
                      canRetry,
                      onBulkRetryFrom,
                      "Retry from is only available when all selected work orders have finished running"
                    )}
                </div>
              )}
            </div>
          </Th>
          <Th>ID</Th>
          <Th>Workflow</Th>
          <Th>Input</Th>
          <Th {...th("inserted_at")}>Created</Th>
          <Th {...th("last_activity")}>Last Activity</Th>
          <Th align="right">Duration</Th>
          <Th align="right">
            <span className="mr-2">Status</span>
          </Th>
          <Th align="right" actions>
            Runs
          </Th>
        </Tr>
      }
      footer={
        <Pagination
          page={page}
          actions={
            canRunWorkflow &&
            page.totalEntries > 0 && (
              <IconButton
                id="export-history-button"
                icon="hero-cloud-arrow-down"
                label={`Export all ${page.totalEntries} results matching your query`}
                onClick={onExport}
                // eslint-disable-next-line local/primitive-classname -- debt: F529 state, F527 colour (transition hover:-rotate-6 hover:text-primary-500)
                className="transition hover:-rotate-6 hover:text-primary-500"
              />
            )
          }
        />
      }
    >
      {rows.map((wo) => (
          <WorkOrderTableRow
            key={wo.id}
            workOrder={wo}
            canRunWorkflow={canRunWorkflow}
            dataStorageHref={dataStorageHref}
            defaultExpanded={wo.id === expandedId}
            selected={selectedIds.includes(wo.id)}
            onSelect={(on) => onSelectionChange(on ? [...selectedIds, wo.id] : selectedIds.filter((id) => id !== wo.id))}
            onCancel={() => onCancel(wo.id)}
            onRetry={() => onRetry(wo.id)}
            onCancelRun={onCancelRun}
            onRetryStep={onRetryStep}
          />
        ))}
    </Table>
  );
}
