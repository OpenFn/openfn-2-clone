import { useState } from "react";
// eslint-disable-next-line no-restricted-imports -- debt: the workflow editor takes the replica's models until it is split into page and .replica.tsx wrapper (STANDARDS §11).
import type { Run, WorkOrder } from "../../mock-data/models/history";
import { cn } from "../../utils/cn";
import Card from "../primitives/Card";
import Heading from "../primitives/Heading";
import IconButton from "../primitives/IconButton";
import UuidChip from "../primitives/UuidChip";
import StatePill from "../domain/StatePill";
import RunBadge from "./RunBadge";
import { formatDuration, formatRelative, uuidOf } from "../../utils/format";
import Tooltip from "../primitives/Tooltip";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";
import { Row } from "../primitives/Stack";

const Dot = () => <span className="text-strong">&bull;</span>;

/** The stack icon linking to the workflow's full history. */
function FullHistoryLink({ to, id }: { to: string; id?: string }) {
  return (
    <IconButton
      id={id}
      to={to}
      icon="hero-rectangle-stack"
      label="View full history for this workflow"
      size="xs"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export interface MiniHistoryWorkOrder {
  workOrder: WorkOrder;
  runs: Run[];
}

interface Props {
  projectId: string;
  workflowId: string;
  collapsed: boolean;
  onToggle: () => void;
  history: MiniHistoryWorkOrder[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onDeselectRun: () => void;
  /** `floating` sits on the canvas; `panel` fills the IDE's right panel. */
  variant?: "floating" | "panel";
  onBack?: () => void;
}

/**
 * The run history card on the canvas (collaborative-editor/components/
 * diagram/MiniHistory.tsx, classic rows): "View History" when collapsed,
 * "Recent History" with work orders and their runs when open. Selecting a
 * run shows it on the canvas.
 */
export default function MiniHistory({
  projectId,
  workflowId,
  collapsed,
  onToggle,
  history,
  selectedRunId,
  onSelectRun,
  onDeselectRun,
  variant = "floating",
  onBack,
}: Props) {
  const [expanded, setExpanded] = useState("");
  const historyHref = `/projects/${projectId}/history?filters[workflow_id]=${workflowId}`;

  const list =
    history.length === 0 ? (
      <EmptyState variant="plain" icon="hero-rectangle-stack" title="No related history" message="Why not run it a few times to see some history?" />
    ) : (
      // eslint-disable-next-line local/primitive-classname -- debt: F526 box (divide-y divide-subtle)
      <Text as="div" variant="body-sm" className="divide-y divide-subtle">
        {history.map(({ workOrder, runs }) => {
          const selected = runs.some((r) => r.id === selectedRunId);
          const isExpanded = expanded === workOrder.id;
          const expand = () => {
            if (!isExpanded && runs.length === 1) onSelectRun(runs[0]!.id);
            setExpanded((p) => (p === workOrder.id ? "" : workOrder.id));
          };
          return (
            <div key={workOrder.id}>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a bigger mouse target for the Expand button inside it, as in Lightning */}
              <div
                className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-hover"
                data-testid={`work-order-${workOrder.id}`}
                onClick={expand}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <IconButton
                    icon={selected || isExpanded ? "hero-chevron-down" : "hero-chevron-right"}
                    label={`${isExpanded ? "Collapse" : "Expand"} work order details`}
                    size="xs"
                    // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-primary-600)
                    className={cn(selected && "text-primary-600")}
                    onClick={(e) => {
                      e.stopPropagation();
                      expand();
                    }}
                  />
                  <UuidChip
                    uuid={uuidOf(workOrder.id)}
                    length={7}
                    to={`/projects/${projectId}/history?filters[workorder_id]=${workOrder.id}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Dot />
                  <span className="text-muted">{formatRelative(workOrder.lastActivity)}</span>
                </div>
                <StatePill labelMode="raw" state={workOrder.state} />
              </div>
              {(isExpanded || selected) &&
                runs.map((run) => {
                  const runSelected = run.id === selectedRunId;
                  return (
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- debt: choosing a run that isn't selected is mouse-only, as in Lightning; the keyboard can only open the run's page
                    <div
                      key={run.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 border-l-2 px-3 py-1.5 hover:bg-hover",
                        runSelected ? "border-l-primary-500 bg-primary-50" : "border-l-transparent"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (runSelected) onDeselectRun();
                        else onSelectRun(run.id);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {runSelected ? (
                          <IconButton
                            icon="hero-x-mark"
                            label="Deselect run"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeselectRun();
                            }}
                          />
                        ) : (
                          <span className="invisible h-5 w-5" />
                        )}
                        <UuidChip
                          uuid={uuidOf(run.id)}
                          length={7}
                          to={`/projects/${projectId}/runs/${run.id}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {(run.startedAt || run.finishedAt) && (
                          <>
                            <Dot />
                            {formatRelative((run.startedAt || run.finishedAt)!)}
                          </>
                        )}
                        {run.startedAt && run.finishedAt && (
                          <>
                            <Dot />
                            <span className="text-muted">{formatDuration(run.startedAt, run.finishedAt)}</span>
                          </>
                        )}
                      </div>
                      <StatePill labelMode="raw" state={run.state} />
                    </div>
                  );
                })}
            </div>
          );
        })}
      </Text>
    );

  if (variant === "panel") {
    return (
      <div className="flex h-full flex-col bg-surface" data-annotation="workflow-editor-versions-and-promote">
        <div className="flex items-center gap-1 border-b border-subtle bg-subtle py-2 pr-5 pl-3">
          <Heading size="sm">Run History</Heading>
          <FullHistoryLink to={historyHref} />
          {/* eslint-disable-next-line local/primitive-classname -- debt: F525 margin (ml-auto) */}
          <IconButton icon="hero-x-mark" label="Back to landing" size="xs" className="ml-auto" onClick={onBack} />
        </div>
        <div className="flex-1 overflow-y-auto">{list}</div>
      </div>
    );
  }

  const selectedRun = history.flatMap((h) => h.runs).find((r) => r.id === selectedRunId);

  return (
    <Card
      padding="none"
      className="absolute left-4 top-6 z-40 overflow-hidden"
      data-annotation="workflow-editor-versions-and-promote"
      onPointerDown={(e) => e.stopPropagation()}
    >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a bigger mouse target for the chevron button inside it, as in Lightning */}
        <div
          className={cn(
            "flex cursor-pointer items-center justify-between gap-3 border-subtle bg-subtle px-3 py-2 text-faint hover:bg-sunken",
            !collapsed && "border-b"
          )}
          onClick={onToggle}
        >
          <Row>
            {/* Only on the heading: around the link too, it would open with the link's own tooltip. */}
            <Tooltip content="⌘ H">
              <div>
                <Heading size="sm">{collapsed ? "View History" : "Recent History"}</Heading>
              </div>
            </Tooltip>
            <FullHistoryLink id="view-history" to={historyHref} />
          </Row>
          <IconButton
            icon={collapsed ? "hero-chevron-right" : "hero-chevron-left"}
            label={collapsed ? "Show history" : "Hide history"}
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          />
        </div>
        {collapsed && selectedRun && (
          <div className="border-t border-subtle px-3 py-2">
            <RunBadge runId={selectedRun.id} onClose={onDeselectRun} />
          </div>
        )}
        {!collapsed && <div className="no-scrollbar max-h-82 overflow-y-auto">{list}</div>}
    </Card>
  );
}
