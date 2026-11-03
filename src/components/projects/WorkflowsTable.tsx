import { useState, type ReactNode } from "react";
import type { SortState } from "../../types/lists";
import type { WorkflowRow } from "../../types/workflows";
import { cn } from "../../utils/cn";
import EmptyState from "../primitives/EmptyState";
import { RowLink, Table, Td, Th, Tr } from "../primitives/Table";
import Toggle from "../primitives/Toggle";
import Tooltip from "../primitives/Tooltip";
import DateTime from "../primitives/DateTime";
import Button from "../primitives/Button";
import ConfirmModal from "../primitives/ConfirmModal";
import Pill from "../primitives/Pill";
import TextLink from "../primitives/TextLink";
import WorkOrderStatus from "./WorkOrderStatus";
import { useUrlParams } from "../../utils/useUrlParams";
import Text from "../primitives/Text";
import { Stack } from "../primitives/Stack";

/**
 * The workflows index table (DashboardComponents.workflows_table): name and
 * last update, latest work order, work order counts (linking to History),
 * failures, the Enabled toggle, and Health / Delete. The server sorts: every
 * column but Actions links to this URL with `?sort` and `?dir` changed
 * (the current column flips, another starts ascending). A row opens the workflow editor. With the lifecycle on (an
 * experimental feature) an ordinary project shows the state instead of the
 * switch, and a sandbox's column reads "Turn on".
 */
export default function WorkflowsTable({
  stats,
  projectId,
  searchTerm = "",
  canDelete = true,
  period = "last 30 days",
  lifecycle = false,
  isSandbox = false,
  sort,
  onToggle,
  onDelete,
}: {
  stats: WorkflowRow[];
  projectId: string;
  searchTerm?: string;
  canDelete?: boolean;
  period?: string;
  lifecycle?: boolean;
  isSandbox?: boolean;
  /** The order the server listed `stats` in. */
  sort: SortState;
  onToggle?: (workflowId: string, enabled: boolean) => void;
  onDelete?: (workflowId: string) => void | Promise<void>;
}) {
  const { href } = useUrlParams();
  const thProps = (key: string) => {
    const current = sort.key === key;
    const dir = current && sort.direction === "asc" ? "desc" : "asc";
    return { sortDirection: current ? sort.direction : null, sortHref: href({ sort: key, dir }) };
  };
  const history = `/projects/${projectId}/history`;
  const stateColumn = lifecycle ? (isSandbox ? "Turn on" : "State") : "Enabled";
  // The workflow whose Delete was clicked, while the user confirms (Lightning's data-confirm).
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (stats.length === 0) {
    return (
      <EmptyState
        variant="plain"
        message={searchTerm !== "" ? (
          <>
            No workflows found matching "{searchTerm}". Try a different search term or{" "}
            <TextLink to={`/projects/${projectId}/w/new`}>create a new one</TextLink>.
          </>
        ) : (
          <>
            No workflows found. <TextLink to={`/projects/${projectId}/w/new`}>Create one</TextLink> to start
            automating.
          </>
        )}
      />
    );
  }

  return (
    <>
      {deletingId && (
        <ConfirmModal
          key={deletingId}
          open
          onClose={() => setDeletingId(null)}
          onConfirm={async () => {
            await onDelete?.(deletingId);
            setDeletingId(null);
          }}
          title="Delete workflow"
          confirmLabel="Delete"
          tone="danger"
        >
          <p>Are you sure you&apos;d like to delete this workflow?</p>
        </ConfirmModal>
      )}
      <Table
        id="workflows-table"
        header={
          <Tr>
            <Th {...thProps("name")}>Name</Th>
            <Th {...thProps("last_workorder_updated_at")}>Latest Work Order</Th>
            <Th {...thProps("workorders_count")}>Work Orders</Th>
            <Th {...thProps("failed_workorders_count")}>Work Orders in a failed state</Th>
            <Th {...thProps("enabled")}>{stateColumn}</Th>
            <Th actions align="right">Actions</Th>
          </Tr>
        }
      >
        {stats.map((s) => {
          const wf = s.workflow;
          const on = s.triggerEnabled ?? wf.enabled;
          return (
            <Tr key={wf.id} id={`workflow-${wf.id}`}>
              <Td maxWidth={60}>
                <Stack gap="xs">
                  <Tooltip content={on ? wf.name : `${wf.name} (disabled)`}>
                    <p className={cn("workflow-name truncate font-medium", on ? "text-strong" : "text-faint")}>
                      <RowLink to={`/projects/${projectId}/w/${wf.id}`}>{wf.name}</RowLink>
                    </p>
                  </Tooltip>
                  <Text as="p" variant="body-sm">
                    Updated <DateTime value={wf.updatedAt} />
                  </Text>
                </Stack>
              </Td>
              <Td>
                <WorkOrderStatus state={s.lastWorkOrder?.state ?? null} updatedAt={s.lastWorkOrder?.updatedAt} period={period} />
              </Td>
              <Td>
                <Count value={s.workordersCount} to={s.historyHref ?? history}>
                  ({s.stepCount} steps, {s.stepSuccessRate.toFixed(1)}% success)
                </Count>
              </Td>
              <Td>
                <Count value={s.failedWorkordersCount} to={s.failedHistoryHref ?? history}>
                  Latest failure {s.lastFailedAt && <DateTime value={s.lastFailedAt} />}
                </Count>
              </Td>
              <Td>
                {lifecycle && !isSandbox ? (
                  <Pill tone={s.state === "live" ? "success" : "neutral"}>{s.state === "live" ? "Live" : "Draft"}</Pill>
                ) : (
                  <Toggle
                    id={wf.id}
                    name="workflow_state"
                    checked={wf.enabled}
                    onChange={(v) => onToggle?.(wf.id, v)}
                    tooltip={s.toggleTooltip ?? toggleTooltip(wf.triggerType, wf.enabled, lifecycle, s.state)}
                  />
                )}
              </Td>
              <Td actions>
                <Button variant="secondary" size="xs" to={`/projects/${projectId}/w/${wf.id}/health`}>
                  Health
                </Button>
                {canDelete && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setDeletingId(wf.id)}
                  >
                    Delete
                  </Button>
                )}
              </Td>
            </Tr>
          );
        })}
      </Table>
    </>
  );
}

/** Lightning's `Helpers.workflow_state_tooltip`, or the lifecycle wording. */
function toggleTooltip(triggerType: string, enabled: boolean, lifecycle: boolean, state: "live" | "draft" | undefined) {
  if (lifecycle) return state === "live" ? "On. Its triggers are answering." : "Off. Its triggers are not answering.";
  return enabled ? `This workflow is active (${triggerType} trigger enabled)` : "This workflow is inactive (manual runs only)";
}

/**
 * A work order count linking to History with a detail line under it, or a
 * gray 0 and "N/A". The space between the two lines keeps them apart in the
 * cell's text, as a template's line break would.
 */
function Count({ value, to, children }: { value: number; to: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Text as="div" variant="stat-sm">{value > 0 ? <TextLink to={to}>{value}</TextLink> : <span className="text-faint">0</span>}</Text>
      <Text as="div" variant="body-sm">{value > 0 ? children : "N/A"}</Text>
    </Stack>
  );
}
