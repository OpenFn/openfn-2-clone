import type { LogLine } from "../../types/history";
// eslint-disable-next-line no-restricted-imports -- debt: the workflow editor takes the replica's models until it is split into page and .replica.tsx wrapper (STANDARDS §11).
import type { Dataclip, Run, Step } from "../../mock-data/models/history";
import { finalRunStates } from "../../constants";
import { formatElapsed, formatLocalDateTime, uuidOf } from "../../utils/format";
import { cn } from "../../utils/cn";
import CodeEditor from "../primitives/CodeEditor";
import StatePill from "../domain/StatePill";
import StepIcon from "../domain/StepIcon";
import UuidChip from "../primitives/UuidChip";
import LogViewer from "../domain/LogViewer";
import { DetailItem, DetailList } from "../primitives/DetailList";
import Heading from "../primitives/Heading";
import InfoTooltip from "../primitives/InfoTooltip";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";
import { Stack } from "../primitives/Stack";

export type RunViewerTab = "log" | "input" | "output";

interface Props {
  projectId: string;
  run: Run;
  /** Who or what started the run: a user's email or "webhook trigger". */
  startedBy: string | null;
  steps: Step[];
  logs: LogLine[];
  dataclips: Dataclip[];
  selectedStepId: string | null;
  onSelectStep: (step: Step) => void;
  activeTab: RunViewerTab;
  /** Fades the panel when the job in the IDE wasn't part of this run. */
  mismatch?: boolean;
}

/**
 * The run viewer in the IDE's right panel (run-viewer/RunViewerPanel.tsx):
 * run metadata and the steps it executed on top, then the Logs, Input or
 * Output of the selected step below.
 */
export default function RunViewerPanel({ projectId, run, startedBy, steps, logs, dataclips, selectedStepId, onSelectStep, activeTab, mismatch = false }: Props) {
  const step = steps.find((s) => s.id === selectedStepId) ?? null;
  const clip = (id: string | null | undefined) => dataclips.find((d) => d.id === id);

  const empty = (text: string) => <EmptyState variant="plain" fill message={text} />;
  const dataView = (id: string | null | undefined, emptyFinished: string) => {
    if (!step) return empty(`Select a step to view ${activeTab} data`);
    const d = clip(id);
    if (!id || !d) return empty(emptyFinished);
    if (d.wiped) return empty("This dataclip has been wiped by the project's data retention policy.");
    return <CodeEditor value={JSON.stringify(d.body, null, 2)} language="json" readOnly ariaLabel={`${activeTab} dataclip`} />;
  };

  return (
    <div className={cn("flex h-full flex-col", mismatch && "opacity-50")} data-annotation="workflow-editor-run-viewer">
      <div className="flex h-2/5 max-h-72 min-h-40 border-b-4 border-subtle *:w-1/2 *:overflow-auto *:p-4">
        <div className="border-r border-subtle">
          <DetailList>
            <DetailItem label="Work Order">
              <UuidChip
                uuid={uuidOf(run.workOrderId)}
                to={`/projects/${projectId}/history?filters[workorder_id]=${run.workOrderId}`}
                tooltip={`View work order ${uuidOf(run.workOrderId)}`}
              />
            </DetailItem>
            <DetailItem label="Run">
              <UuidChip uuid={uuidOf(run.id)} to={`/projects/${projectId}/runs/${run.id}`} tooltip={`View run ${uuidOf(run.id)}`} />
            </DetailItem>
            <DetailItem label="Status">
              <StatePill state={run.state} />
            </DetailItem>
            <DetailItem label="Duration">{formatElapsed(run.startedAt, run.finishedAt)}</DetailItem>
            {run.startedAt && <DetailItem label="Started">{formatLocalDateTime(run.startedAt)}</DetailItem>}
            {startedBy && <DetailItem label="Started by">{startedBy}</DetailItem>}
          </DetailList>
        </div>
        {/* eslint-disable-next-line no-restricted-syntax -- debt: F556 off-scale gap-3, waiting on Lucy's rounding */}
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line no-restricted-syntax -- debt: F557 Stack/Row can't render this element */}
          <Heading size="sm" as="p" className="flex items-center gap-1">
            Run Steps
            <InfoTooltip title="This run may not have executed all steps in the workflow. Only the steps that were executed in this specific run are shown here." />
          </Heading>
          {steps.length === 0 ? (
            <EmptyState variant="plain" message="No steps yet" />
          ) : (
            <Stack as="ul" gap="sm" aria-label="Execution steps">
              {steps.map((s) => {
                const selected = s.id === selectedStepId;
                return (
                  <li key={s.id}>
                    {/* eslint-disable-next-line no-restricted-syntax -- a whole step row is the control */}
                    <button
                      type="button"
                      onClick={() => onSelectStep(s)}
                      className={cn(
                        // eslint-disable-next-line no-restricted-syntax -- a control: the step row sets its own type
                        "flex w-full items-center gap-3 rounded border-r-4 p-2 text-left text-sm",
                        selected ? "border-primary-500 bg-primary-50 font-semibold" : "border-transparent hover:border-strong hover:bg-hover"
                      )}
                    >
                      <StepIcon reason={s.exitReason} />
                      <span className="min-w-0 flex-1 truncate">{s.jobName}</span>
                      <Text variant="body-sm" tone="muted" className="shrink-0">
                        {formatElapsed(s.startedAt, s.finishedAt)}
                      </Text>
                    </button>
                  </li>
                );
              })}
            </Stack>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {activeTab === "log" && (
          <div className="flex h-full">
            <LogViewer logs={logs} finished={finalRunStates.includes(run.state)} selectedStepId={step?.id ?? null} className="h-full" />
          </div>
        )}
        {activeTab === "input" && dataView(step?.inputDataclipId, "No input state could be saved for this run.")}
        {activeTab === "output" && dataView(step?.outputDataclipId, "No output state could be saved for this run.")}
      </div>
    </div>
  );
}
