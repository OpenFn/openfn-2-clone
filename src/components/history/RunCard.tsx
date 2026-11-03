import type { RunRow, StepRow } from "../../types/history";
import { shortUuid } from "../../utils/format";
import Card from "../primitives/Card";
import IconButton from "../primitives/IconButton";
import DateTime from "../primitives/DateTime";
import TextLink from "../primitives/TextLink";
import Text from "../primitives/Text";
import ElapsedTime from "./ElapsedTime";
import StepIcon from "../domain/StepIcon";
import WipedTooltip from "./WipedTooltip";
import { cn } from "../../utils/cn";
import { clonedStepMessage, zeroPersistenceMessage } from "./runHelpers";
import Tooltip from "../primitives/Tooltip";

/** The rerun icon on a finished step (run_live/components.ex `step_rerun_tag`). */
function StepRerun({ step, dataStorageHref, onRetry }: { step: StepRow; dataStorageHref: string | null; onRetry: () => void }) {
  if (step.inputWiped)
    return (
      <WipedTooltip message={zeroPersistenceMessage} dataStorageHref={dataStorageHref}>
        <IconButton icon="hero-play-circle-mini" label="Run this step with the latest version of this workflow" tooltip={false} disabled />
      </WipedTooltip>
    );
  if (step.jobDeleted)
    return (
      <IconButton
        icon="hero-play-circle-mini"
        label="Run this step with the latest version of this workflow"
        tooltip="This step has been deleted and cannot be retried. Try running from other steps"
        disabled
      />
    );
  return (
    <IconButton
      id={step.id}
      icon="hero-play-circle-mini"
      label="Run this step with the latest version of this workflow"
      // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (hover:text-link)
      className="hover:text-link"
      onClick={onRetry}
    />
  );
}

/**
 * One step row inside an expanded work order (run_live/components.ex
 * `step_list_item`): icon, job name, start time, rerun + inspect icons,
 * duration and exit reason.
 */
export function StepListItem({
  step,
  canRunWorkflow,
  dataStorageHref,
  onRetry,
}: {
  step: StepRow;
  canRunWorkflow: boolean;
  /** The project's data storage settings, for a wiped input; null when the viewer can't change them. */
  dataStorageHref: string | null;
  /** Reruns the run from this step. */
  onRetry: () => void;
}) {
  return (
    // eslint-disable-next-line local/primitive-classname -- debt: F526 box, F529 state (hover:bg-surface opacity-50)
    <Text as="div" variant="body-sm" id={`step-${step.id}`} role="listitem" tone="muted" className={cn("flex items-center hover:bg-surface", step.cloned && "opacity-50")}>
      <div className="flex flex-1 items-center gap-2 py-2 pl-4">
        <StepIcon reason={step.exitReason} errorType={step.errorType} />
        {/* eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-strong hover:text-link) */}
        <TextLink to={step.href} variant="plain" className="whitespace-nowrap text-strong hover:text-link">
          {step.jobName}
        </TextLink>
        {step.cloned && (
          <Tooltip content={clonedStepMessage}>
            <span role="img" aria-label={clonedStepMessage} className="hero-paper-clip-mini h-3 w-3" />
          </Tooltip>
        )}
        &bull;
        <span>
          started <DateTime value={step.startedAt} format="time_only" />
        </span>
      </div>
      <div className="flex min-w-60 shrink-0 items-center justify-end gap-3 px-4 py-2">
        {canRunWorkflow && step.exitReason && <StepRerun step={step} dataStorageHref={dataStorageHref} onRetry={onRetry} />}
        <IconButton id={`inspect-step-${step.id}`} icon="hero-document-magnifying-glass-mini" label="Inspect this step" to={step.inspectHref} />
        <span className="w-16 text-right">
          <ElapsedTime startedAt={step.startedAt} finishedAt={step.finishedAt} />
        </span>
        <span className="w-24 text-right font-mono">
          {step.exitReason}
          {step.errorType && `:${step.errorType}`}
        </span>
      </div>
    </Text>
  );
}

function runStatusText(run: RunRow) {
  switch (run.state) {
    case "available":
      return ["enqueued", run.insertedAt] as const;
    case "claimed":
      return ["claimed", run.claimedAt] as const;
    case "started":
      return ["started", run.startedAt] as const;
    case "cancelled":
      return ["cancelled", run.updatedAt] as const;
    default:
      return ["finished", run.finishedAt] as const;
  }
}

/**
 * A run card inside an expanded work order (workorder_component.ex): gray
 * header with the run id, "(n/m • show previous)", its status line,
 * duration and state, then its steps.
 */
export function RunCard({
  run,
  index,
  total,
  showPrevious,
  onTogglePrevious,
  canRunWorkflow,
  dataStorageHref,
  onCancel,
  onRetryStep,
}: {
  run: RunRow;
  /** 1-based position, oldest first. */
  index: number;
  total: number;
  showPrevious: boolean;
  onTogglePrevious: () => void;
  canRunWorkflow: boolean;
  dataStorageHref: string | null;
  /** Cancels this run while it waits for a worker. */
  onCancel: () => void;
  /** Reruns this run from one of its steps. */
  onRetryStep: (stepId: string) => void;
}) {
  const [label, at] = runStatusText(run);
  const steps = run.steps;
  return (
    <Card id={`run_${run.id}`} padding="none" className="overflow-hidden">
      {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (bg-emphasis) */}
      <Text as="div" variant="body-sm" className="flex items-center bg-emphasis">
        <div className="flex flex-1 items-center gap-1 py-2 pl-4">
          Run
          {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-mono) */}
          <TextLink to={run.href} title={run.id} className="font-mono">
            {shortUuid(run.id)}
          </TextLink>
          {total > 1 && (
            <>
              ({index}/{total}
              {index !== total && ")"}
              {index === total && (
                <span>
                  &bull; <TextLink onClick={onTogglePrevious}>{showPrevious ? "hide" : "show"} previous</TextLink>)
                </span>
              )}
            </>
          )}
          <span>
            &bull; {label} <DateTime value={at} format="relative_detailed" />
          </span>
        </div>
        <div className="flex min-w-60 shrink-0 items-center justify-end gap-3 px-4 py-2">
          <span className="w-16 text-right">
            {run.state !== "available" && run.state !== "cancelled" && (
              <ElapsedTime startedAt={run.startedAt} finishedAt={run.finishedAt} />
            )}
          </span>
          <span className="w-24 text-right font-mono">{run.state}</span>
          {run.state === "available" && canRunWorkflow && (
            <IconButton
              id={`cancel-run-${run.id}`}
              icon="hero-x-mark-mini"
              label="Cancel this run"
              size="xs"
              onClick={onCancel}
            />
          )}
        </div>
      </Text>
      <div role="list" aria-label="Steps" id={`run-${run.id}`} className={cn("bg-sunken", steps.length && "border-t border-strong")}>
        {steps.map((step) => (
          <StepListItem key={step.id} step={step} canRunWorkflow={canRunWorkflow} dataStorageHref={dataStorageHref} onRetry={() => onRetryStep(step.id)} />
        ))}
      </div>
    </Card>
  );
}
