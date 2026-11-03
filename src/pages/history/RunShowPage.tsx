import Button from "../../components/primitives/Button";
import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import DateTime from "../../components/primitives/DateTime";
import { DetailItem, DetailList } from "../../components/primitives/DetailList";
import ElapsedTime from "../../components/history/ElapsedTime";
import LogViewer, { type LogLevel } from "../../components/domain/LogViewer";
import RunStepList from "../../components/history/RunStepList";
import SnapshotVersionChip from "../../components/history/SnapshotVersionChip";
import StatePill from "../../components/domain/StatePill";
import StepDataclipViewer from "../../components/history/StepDataclipViewer";
import Tabs from "../../components/primitives/Tabs";
import TextLink from "../../components/primitives/TextLink";
import { useRouter } from "../../routing/router";
import { finalRunStates } from "../../constants";
import type { CurrentProject } from "../../types/projects";
import type { LogLine, RunDetail, RunStep, RunWorkflow, StepDataclip } from "../../types/history";
import { shortUuid } from "../../utils/format";
import { useAction } from "../../utils/useAction";

export interface RunShowPageProps {
  project: CurrentProject;
  projectLabel: string;
  /** The run in the URL; known before the run itself loads. */
  runId: string;
  /** The run is still being fetched. */
  loading: boolean;
  /** Null while loading, and when the run could not be loaded. */
  run: RunDetail | null;
  workflow: RunWorkflow | null;
  steps: RunStep[];
  /** The `?step=` in the URL, as given. */
  selectedStepId: string | null;
  inputDataclip: StepDataclip | null;
  outputDataclip: StepDataclip | null;
  /** Every log line received so far, in timestamp order. */
  logs: LogLine[];
  /** The viewer's remembered level. */
  logLevel: LogLevel;
  experimentalFeatures: boolean;
  canRunWorkflow: boolean;
  canEditDataRetention: boolean;
  /** Named in a wiped notice when the viewer cannot change the policy. */
  adminContacts: string[];
  /** Cancels this run; rejects with the reason it could not. */
  onCancel: () => Promise<void>;
  /** Remembers the log level for next time. */
  onLogLevelChange: (level: LogLevel) => void;
}

type TabId = "log" | "input" | "output";
const tabIds: TabId[] = ["log", "input", "output"];

const isTabId = (id: string): id is TabId => (tabIds as string[]).includes(id);

/** "2026-10-14 at 09:31:12" (Lightning's `format_date(…, "%F at %T")`, in UTC). */
function snapshotDate(iso: string) {
  return `${iso.slice(0, 10)} at ${iso.slice(11, 19)}`;
}

/** The editor on this run, pinned to the version it ran unless that is the current one. */
function editorPath(
  projectId: string,
  workflowId: string,
  runId: string,
  snapshotVersion: number,
  workflow: RunWorkflow,
  experimentalFeatures: boolean,
  extra = ""
) {
  const pin =
    snapshotVersion === workflow.lockVersion ? "" : experimentalFeatures ? `&as_run=${runId}` : `&v=${snapshotVersion}`;
  return `/projects/${projectId}/w/${workflowId}?run=${runId}${extra}${pin}`;
}

/** Inventory view `run-show` (RunLive.Show, run_live/show.ex). */
export default function RunShowPage({
  project,
  projectLabel,
  runId,
  loading,
  run,
  workflow,
  steps,
  selectedStepId,
  inputDataclip,
  outputDataclip,
  logs,
  logLevel,
  experimentalFeatures,
  canRunWorkflow,
  canEditDataRetention,
  adminContacts,
  onCancel,
  onLogLevelChange,
}: RunShowPageProps) {
  const { navigate, useLocation } = useRouter();
  const { pathname, search, hash } = useLocation();
  // The tab is in the URL hash, as Lightning's TabbedContainer reads it; no
  // tab named means Log. Step links carry the hash, so every history entry
  // names its own tab and Back and Forward move between them.
  const hashTab = hash.slice(1);
  const tab: TabId = isTabId(hashTab) ? hashTab : "log";
  const cancel = useAction(onCancel, { onError: "toast" });
  const selectedStep = steps.find((s) => s.id === selectedStepId);
  const finished = run ? finalRunStates.includes(run.state) : false;
  const activeTab = selectedStep ? tab : "log";

  const snapshotVersion =
    run && workflow ? (run.snapshot.lockVersion === workflow.lockVersion ? "latest" : run.snapshot.id.slice(0, 7)) : null;

  const header = (
    <Header
      breadcrumbs={
        <ProjectBreadcrumbs
          project={project}
          label={projectLabel}
          items={[["History", `/projects/${project.id}/history`]]}
          current="Run"
        />
      }
      title={`Run ${shortUuid(runId)}`}
    />
  );

  if (loading) {
    return (
      <PageContent header={header}>
        <Centered className="@container/main h-full">
          {/* eslint-disable-next-line local/primitive-classname -- debt: state (animate-pulse) */}
          <DetailList id="run-loading" className="animate-pulse @5xl/main:w-1/3">
            {["w-16", "w-12", "w-12"].map((w, i) => (
              <DetailItem key={i} label={<span className={`inline-block h-3 ${w} rounded-full bg-emphasis`} />}>
                <span className="inline-block h-3 w-24 rounded-full bg-emphasis" />
              </DetailItem>
            ))}
          </DetailList>
        </Centered>
      </PageContent>
    );
  }

  if (!run || !workflow) {
    return (
      <PageContent header={header}>
        <Centered>there was an error loading the run</Centered>
      </PageContent>
    );
  }

  const selectTab = (next: TabId) => {
    // The full path: a hash-only navigate would drop `?step=`. The open tab
    // adds no history entry, so Back still leaves it.
    if (`#${next}` !== hash) navigate(`${pathname}${search}#${next}`);
  };

  const waitingMessage =
    run.state === "available"
      ? "Waiting for worker"
      : run.state === "claimed"
        ? "Creating runtime & installing adaptors"
        : "Nothing yet";

  return (
    <PageContent header={header}>
      <Centered className="@container/main h-full">
        <div className="flex gap-x-6 @5xl/main:flex-row flex-col h-full">
          <div className="@5xl/main:basis-1/3 flex gap-6 @5xl/main:flex-col flex-row">
            <DetailList id={`run-detail-${run.id}`} className="flex-1 @5xl/main:flex-none">
              <DetailItem label="Workflow">
                {/* The version this run used sits with the workflow it's a version of. */}
                <span className="flex min-w-0 items-center gap-2">
                  <TextLink
                    to={editorPath(project.id, workflow.id, run.id, run.snapshot.lockVersion, workflow, experimentalFeatures)}
                    className="text-ellipsis"
                  >
                    {workflow.name}
                  </TextLink>
                  {snapshotVersion && (
                    <SnapshotVersionChip
                      version={snapshotVersion}
                      tooltip={
                        snapshotVersion === "latest"
                          ? "This run is based on the latest version of this workflow."
                          : `This run is based on a snapshot of this workflow that was taken on ${snapshotDate(run.snapshot.insertedAt)}`
                      }
                    />
                  )}
                </span>
              </DetailItem>
              <DetailItem label="Work Order" variant="code">
                <TextLink to={`/projects/${project.id}/history?filters[workorder_id]=${run.workOrderId}`} title={run.workOrderId}>
                  {shortUuid(run.workOrderId)}
                </TextLink>
              </DetailItem>
              {run.startedBy && <DetailItem label="Started by">{run.startedBy}</DetailItem>}
              <DetailItem label="Started">{run.startedAt && <DateTime value={run.startedAt} />}</DetailItem>
              <DetailItem label="Finished">{run.finishedAt && <DateTime value={run.finishedAt} />}</DetailItem>
              <DetailItem label="Final Output" variant="code">
                {run.finalDataclipId && (
                  <TextLink to={`/projects/${project.id}/dataclips/${run.finalDataclipId}/show`}>
                    {shortUuid(run.finalDataclipId)}
                  </TextLink>
                )}
              </DetailItem>
              <DetailItem label="Duration">
                <ElapsedTime startedAt={run.startedAt} finishedAt={run.finishedAt} />
              </DetailItem>
              <DetailItem label="Status">
                <StatePill state={run.state} />
              </DetailItem>
              {run.state === "available" && canRunWorkflow && (
                <DetailItem label="Action">
                  <Button size="sm" variant="secondary" onClick={() => void cancel.run()} pending={cancel.pending}>
                    Cancel
                  </Button>
                </DetailItem>
              )}
            </DetailList>

            <RunStepList
              run={run}
              steps={steps}
              selectedStepId={selectedStepId}
              projectId={project.id}
              workflowId={workflow.id}
              inspectPath={(step) =>
                editorPath(
                  project.id,
                  workflow.id,
                  run.id,
                  step.snapshotLockVersion,
                  workflow,
                  experimentalFeatures,
                  `&panel=editor&job=${step.jobId}`
                ) + "#log"
              }
            />
          </div>
          <div className="@5xl/main:basis-2/3 flex flex-col gap-1 h-full min-h-0">
            <Tabs
              label="Run details"
              active={activeTab}
              onChange={selectTab}
              tabs={[
                {
                  id: "log",
                  label: "Log",
                  icon: "hero-command-line",
                },
                {
                  id: "input",
                  disabled: !selectedStep,
                  disabledReason: "A valid step must be selected to view its input",
                  label: "Input",
                  icon: "hero-arrow-down-on-square",
                },
                {
                  id: "output",
                  disabled: !selectedStep,
                  disabledReason: "A valid step (with a readable output) must be selected to view its output",
                  label: "Output",
                  icon: "hero-arrow-up-on-square",
                },
              ]}
            />
            <div className="flex min-h-0 flex-1 flex-col">
              {activeTab === "log" && (
                <div className="flex h-full min-h-96">
                  <LogViewer
                    logs={logs}
                    finished={finished}
                    selectedStepId={selectedStepId}
                    waitingMessage={waitingMessage}
                    defaultLevel={logLevel}
                    onLevelChange={onLogLevelChange}
                    className="h-full"
                  />
                </div>
              )}
              {activeTab !== "log" && selectedStep && (
                <StepDataclipViewer
                  step={selectedStep}
                  inputOrOutput={activeTab}
                  dataclip={(activeTab === "input" ? inputDataclip : outputDataclip) ?? undefined}
                  runFinished={finished}
                  projectId={project.id}
                  canEditDataRetention={canEditDataRetention}
                  adminContacts={adminContacts}
                />
              )}
            </div>
          </div>
        </div>
      </Centered>
    </PageContent>
  );
}
