import { useState } from "react";
import IconButton from "../primitives/IconButton";
import { Checkbox } from "../primitives/Inputs";
import Pill from "../primitives/Pill";
import { RowToggle, Td, Tr } from "../primitives/Table";
import type { WorkOrderRow } from "../../types/history";
import { activeStates } from "../../constants";
import DateTime from "../primitives/DateTime";
import TextLink from "../primitives/TextLink";
import Text from "../primitives/Text";
import ElapsedTime from "./ElapsedTime";
import StatePill from "../domain/StatePill";
import UuidChip from "../primitives/UuidChip";
import { RunCard } from "./RunCard";
import WipedTooltip from "./WipedTooltip";
import { zeroPersistenceMessage as zeroPersistence } from "./runHelpers";
import Tooltip from "../primitives/Tooltip";

/**
 * A work order row in History plus, when expanded, its runs and steps
 * (run_live/workorder_component.ex). Clicking the row toggles the details.
 */
export default function WorkOrderTableRow({
  workOrder: wo,
  selected,
  onSelect,
  canRunWorkflow,
  dataStorageHref,
  defaultExpanded = false,
  onCancel,
  onRetry,
  onCancelRun,
  onRetryStep,
}: {
  workOrder: WorkOrderRow;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  canRunWorkflow: boolean;
  /** The project's data storage settings, for a wiped input; null when the viewer can't change them. */
  dataStorageHref: string | null;
  /** Opens with every run showing, as History does for the work order its URL filters to; follows the URL. */
  defaultExpanded?: boolean;
  /** Cancels the pending work order. */
  onCancel: () => void;
  /** Retries the work order from the start. */
  onRetry: () => void;
  onCancelRun: (runId: string) => void;
  onRetryStep: (runId: string, stepId: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showPrevious, setShowPrevious] = useState(defaultExpanded);
  // The URL can point at this work order after it mounted (an ID link, Back): open it then too.
  const [opened, setOpened] = useState(defaultExpanded);
  if (opened !== defaultExpanded) {
    setOpened(defaultExpanded);
    if (defaultExpanded) {
      setExpanded(true);
      setShowPrevious(true);
    }
  }
  const runs = wo.runs;
  const lastRun = runs[0];
  const available = !wo.dataclipWiped;

  return (
    <>
      <Tr
        id={`toggle_details_for_${wo.id}`}
        // eslint-disable-next-line local/primitive-classname -- debt: F526 box (bg-subtle bg-surface)
        className={selected ? "bg-subtle" : "bg-surface"}
      >
        {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (!pr-1) */}
        <Td className="!pr-1">
          {available ? (
            <Checkbox
              id={`select_${wo.id}`}
              label={<span className="sr-only">Select work order</span>}
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
            />
          ) : (
            <WipedTooltip message={zeroPersistence} dataStorageHref={dataStorageHref}>
              <Checkbox
                id={`select_${wo.id}`}
                label={<span className="sr-only">Select work order</span>}
                // eslint-disable-next-line local/primitive-classname -- debt: F526 box (disabled:bg-subtle)
                className="disabled:bg-subtle"
                checked={false}
                disabled
                onChange={() => {}}
              />
            </WipedTooltip>
          )}
        </Td>
        <Td>
          <UuidChip uuid={wo.id} to={wo.href} />
        </Td>
        <Td>
          {wo.workflowHref ? (
            <TextLink
              to={wo.workflowHref}
              variant="plain"
              // eslint-disable-next-line local/primitive-classname -- debt: F529 state, F527 colour (workflow-name text-strong hover:text-link)
              className="workflow-name block max-w-50 truncate text-strong hover:text-link"
              title={
                <>
                  {wo.workflowName}
                  <Text variant="body-sm" tone="faint" className="block">Click to view</Text>
                </>
              }
            >
              {wo.workflowName}
            </TextLink>
          ) : (
            <Tooltip content={wo.workflowName}>
              <span className="workflow-name block max-w-50 truncate text-strong">{wo.workflowName}</span>
            </Tooltip>
          )}
        </Td>
        <Td>
          {available ? (
            <UuidChip uuid={wo.dataclipId} to={wo.dataclipHref} />
          ) : (
            <WipedTooltip
              message="The input dataclip is unavailable due to this project's data retention policy."
              dataStorageHref={dataStorageHref}
            >
              <UuidChip uuid={wo.dataclipId} disabled />
            </WipedTooltip>
          )}
        </Td>
        <Td>
          <DateTime value={wo.insertedAt} />
        </Td>
        <Td>
          <DateTime value={wo.lastActivity} />
        </Td>
        <Td align="right" className="w-28">
          {lastRun && <ElapsedTime startedAt={lastRun.startedAt} finishedAt={lastRun.finishedAt} />}
        </Td>
        <Td align="right" className="w-32">
          <StatePill state={wo.state} />
        </Td>
        <Td actions className="w-20">
          {runs.length > 0 && (
            <>
              {wo.state === "pending" && canRunWorkflow && (
                <IconButton
                  id={`cancel-wo-${wo.id}`}
                  icon="hero-x-mark-mini"
                  label="Cancel pending run"
                  size="xs"
                  onClick={onCancel}
                />
              )}
              {!activeStates.includes(wo.state) &&
                (available && canRunWorkflow ? (
                  <IconButton
                    id={`retry-workorder-${wo.id}`}
                    icon="hero-arrow-path-mini"
                    label="Retry (run from the start)"
                    size="xs"
                    // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (hover:text-link)
                    className="hover:text-link"
                    onClick={() => {
                      onRetry();
                      setExpanded((e) => !e);
                    }}
                  />
                ) : canRunWorkflow ? (
                  <WipedTooltip message={zeroPersistence} dataStorageHref={dataStorageHref}>
                    <IconButton icon="hero-arrow-path-mini" label="Retry (run from the start)" tooltip={false} size="xs" disabled />
                  </WipedTooltip>
                ) : (
                  <IconButton
                    icon="hero-arrow-path-mini"
                    label="Retry (run from the start)"
                    tooltip="You are not authorized to start runs for this project."
                    size="xs"
                    disabled
                  />
                ))}
              <Pill>{runs.length}</Pill>
              <RowToggle expanded={expanded} onToggle={() => setExpanded((e) => !e)} label="Show runs" />
            </>
          )}
        </Td>
      </Tr>
      {expanded && (
        <Tr>
          {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (!p-0) */}
          <Td colSpan={9} className="!p-0">
            <div className="flex flex-col gap-3 bg-sunken p-3">
              {runs.map((run, i) => {
                const index = runs.length - i;
                if (index !== runs.length && !showPrevious) return null;
                return (
                  <RunCard
                    key={run.id}
                    run={run}
                    index={index}
                    total={runs.length}
                    showPrevious={showPrevious}
                    onTogglePrevious={() => setShowPrevious((s) => !s)}
                    canRunWorkflow={canRunWorkflow}
                    dataStorageHref={dataStorageHref}
                    onCancel={() => onCancelRun(run.id)}
                    onRetryStep={(stepId) => onRetryStep(run.id, stepId)}
                  />
                );
              })}
            </div>
          </Td>
        </Tr>
      )}
    </>
  );
}
