import { Link, useRouter } from "../../routing/router";
import type { RunStep } from "../../types/history";
import { cn } from "../../utils/cn";
import ElapsedTime from "./ElapsedTime";
import StepIcon from "../domain/StepIcon";
import { clonedStepMessage, inspectStepPath, isClonedStep } from "./runHelpers";
import Text from "../primitives/Text";
import Tooltip from "../primitives/Tooltip";

/**
 * The run page's step list (run_live/components.ex `step_list` +
 * `step_item`): each step links to `?step=`, the selected one gets a
 * primary right border and bold text. Elapsed times tick while a step runs.
 */
export default function RunStepList<S extends Omit<RunStep, "insertedAt" | "snapshotLockVersion"> & { insertedAt?: string }>({
  run,
  steps,
  selectedStepId,
  projectId,
  workflowId,
  inspectPath,
}: {
  run: { id: string; insertedAt: string };
  steps: S[];
  selectedStepId: string | null;
  projectId: string;
  workflowId: string;
  /** Where "Inspect Step" goes; defaults to the editor on this run and job. */
  inspectPath?: (step: S) => string;
}) {
  const { navigate, useLocation } = useRouter();
  // Step links keep the open tab (`#input`), so a step click doesn't reset it.
  const { hash } = useLocation();
  const inspect = inspectPath ?? ((step: S) => inspectStepPath(projectId, workflowId, run, step));
  return (
    // eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops list semantics when list-style is none; the role puts them back
    <ul role="list" className="-mb-8 flex-1">
      {steps.map((step) => {
        const selected = step.id === selectedStepId;
        const isClone = isClonedStep(step, run);
        const open = (e: { preventDefault(): void; stopPropagation(): void }) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(inspect(step));
        };
        return (
          <li key={step.id} data-step-id={step.id} className="p-2">
            <Link
              to={`?step=${step.id}${hash}`}
              className={cn(
                "flex items-center gap-3 border-r-4",
                selected ? "border-primary-500 font-semibold" : "border-transparent hover:border-strong"
              )}
            >
              <StepIcon reason={step.exitReason} errorType={step.errorType ?? null} />
              {/* eslint-disable-next-line local/primitive-classname -- debt: box, state (pr-1.5 opacity-50) */}
              <Text className={cn("flex min-w-0 flex-1 items-center gap-1 pr-1.5", isClone && "opacity-50")}>
                {isClone && (
                  <Tooltip content={clonedStepMessage}>
                    <span role="img" aria-label={clonedStepMessage} className="hero-paper-clip-mini mr-1 h-3 w-3" />
                  </Tooltip>
                )}
                {step.jobName}
                {/* A link inside the step's link in Lightning; a focusable span here so the DOM stays valid.
                    The icon sits inside it because the icon's mask would clip the focus ring. */}
                <Tooltip content="Inspect Step">
                <span
                  role="link"
                  tabIndex={0}
                  aria-label="Inspect Step"
                  className="ml-1 inline-flex cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") open(e);
                  }}
                >
                  <span className="hero-document-magnifying-glass-mini h-5 w-5" aria-hidden="true" />
                </span>
                </Tooltip>
                <span className="grow whitespace-nowrap text-right text-muted">
                  <ElapsedTime startedAt={step.startedAt} finishedAt={step.finishedAt} />
                </span>
              </Text>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
