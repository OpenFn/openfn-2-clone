import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
// eslint-disable-next-line no-restricted-imports -- debt: not yet split into page and .replica.tsx wrapper (STANDARDS §11).
import { Navigate, useParams } from "react-router-dom";
import Pill from "../../components/primitives/Pill";
import { useToast } from "../../components/primitives/Toast";
import AdaptorConfigModals, { type AdaptorModal } from "../../components/workflow/AdaptorConfigModals";
import AIAssistantPanel from "../../components/workflow/AIAssistantPanel";
import EdgeInspector from "../../components/workflow/EdgeInspector";
import EditorHeader from "../../components/workflow/EditorHeader";
import FullScreenIDE, { type IDEPanelState } from "../../components/workflow/FullScreenIDE";
import JobInspector from "../../components/workflow/JobInspector";
import LandingScreen from "../../components/workflow/LandingScreen";
import ManualRunPanel from "../../components/workflow/ManualRunPanel";
import MiniHistory from "../../components/workflow/MiniHistory";
import RunViewerPanel, { type RunViewerTab } from "../../components/workflow/RunViewerPanel";
import TemplateBrowserModal from "../../components/workflow/TemplateBrowserModal";
import TriggerInspector from "../../components/workflow/TriggerInspector";
import WorkflowCodePanel from "../../components/workflow/WorkflowCodePanel";
import WorkflowDiagram, { type Selection } from "../../components/workflow/WorkflowDiagram";
import WorkflowSettings from "../../components/workflow/WorkflowSettings";
import YAMLImportModal from "../../components/workflow/YAMLImportModal";
import { workflowNameFromYaml } from "../../components/workflow/workflowYaml";
// eslint-disable-next-line no-restricted-imports -- debt: not yet split into page and .replica.tsx wrapper (STANDARDS §11).
import { aiSessionsFor } from "../../mock-data/ai-assistant";
import { adaptorShortName } from "../../utils/adaptors";
// eslint-disable-next-line no-restricted-imports -- debt: not yet split into page and .replica.tsx wrapper (STANDARDS §11).
import { findProject, projects } from "../../mock-data/projects";
import { projectLabel } from "../../components/shell/projectPickerItems";
// eslint-disable-next-line no-restricted-imports -- debt: the workflow editor takes the replica's models until it is split into page and .replica.tsx wrapper (STANDARDS §11).
import type { Project } from "../../types/projects";
import { blankWorkflowGraph, newWorkflowGraph, templateGraph } from "../../utils/workflowGraph";
// eslint-disable-next-line no-restricted-imports -- debt: not yet split into page and .replica.tsx wrapper (STANDARDS §11).
import { findWorkflowGraph, snapshotsOf, workflowTemplates } from "../../mock-data/workflow";
import type { WorkflowGraph } from "../../types/workflow-graph";
import { useUrlParams, type ParamPatch } from "../../utils/useUrlParams";
import { useEditorRuns } from "./useEditorRuns";
import { useWorkflowEditorState } from "./useWorkflowEditorState";

/**
 * Inventory views `workflow-editor-*`: the collaborative workflow editor at
 * /projects/:projectId/w/:workflowId (and /w/new). Lightning's
 * CollaborativeEditor.tsx + WorkflowEditor.tsx, rebuilt on local React state
 * and static fixtures (no Yjs, no channels). Panels follow Lightning's URL
 * parameters: ?job= / ?trigger= / ?edge= select a node and open its
 * inspector, ?panel=settings|code|run|editor opens workflow settings, the
 * YAML view, the manual run panel or the full-screen IDE, ?run= shows a run,
 * ?chat=true opens the AI assistant.
 */
export default function WorkflowEditorPage() {
  const { projectId, workflowId } = useParams();
  const project = findProject(projectId);
  if (!project) return <Navigate to="/projects" replace />;
  const graph = workflowId ? findWorkflowGraph(workflowId) : newWorkflowGraph(project.id);
  if (!graph || graph.projectId !== project.id) return <Navigate to={`/projects/${project.id}/w`} replace />;
  return <WorkflowEditor key={graph.id} project={project} initial={graph} isNew={!workflowId} />;
}

function WorkflowEditor({ project, initial, isNew }: { project: Project; initial: WorkflowGraph; isNew: boolean }) {
  const editor = useWorkflowEditorState(initial);
  const { graph } = editor;
  const { params, update } = useUrlParams<"chat" | "edge" | "job" | "panel" | "run" | "runMode" | "step" | "trigger">();
  const [pinnedVersion, setPinnedVersion] = useState<number | null>(null);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [created, setCreated] = useState(!isNew);
  // The landing screen's dialogs. The key remounts them on each open, so they start fresh.
  const [landingModal, setLandingModal] = useState<{ which: "templates" | "yaml" | null; key: number }>({ which: null, key: 0 });
  const openLandingModal = (which: "templates" | "yaml") => setLandingModal((m) => ({ which, key: m.key + 1 }));
  const closeLandingModal = () => setLandingModal((m) => ({ ...m, which: null }));
  const [ideSub, setIdeSub] = useState<"history" | "create-run" | undefined>(undefined);
  const [runTab, setRunTab] = useState<RunViewerTab>("log");
  const [ideAdaptorModal, setIdeAdaptorModal] = useState<AdaptorModal>(null);

  const runs = useEditorRuns(graph, params.run ?? null);
  const toast = useToast();

  // Selection (Lightning's useNodeSelection): one of ?job, ?trigger, ?edge.
  const selection: Selection = useMemo(
    () =>
      params.job
        ? { kind: "job", id: params.job }
        : params.trigger
          ? { kind: "trigger", id: params.trigger }
          : params.edge
            ? { kind: "edge", id: params.edge }
            : null,
    [params.job, params.trigger, params.edge]
  );
  const job = params.job ? (graph.jobs.find((j) => j.id === params.job) ?? null) : null;
  const trigger = params.trigger ? (graph.triggers.find((t) => t.id === params.trigger) ?? null) : null;
  const edge = params.edge ? (graph.edges.find((e) => e.id === params.edge) ?? null) : null;

  const panel = params.panel ?? null;
  const select = useCallback(
    (sel: Selection) =>
      update({
        job: sel?.kind === "job" ? sel.id : null,
        trigger: sel?.kind === "trigger" ? sel.id : null,
        edge: sel?.kind === "edge" ? sel.id : null,
        // The run panel follows the selection; other panels give way to it.
        ...(panel === "run" ? {} : { panel: null }),
      }),
    [update, panel]
  );

  const isIDEOpen = panel === "editor" && !!params.job && created;
  const isRunPanelOpen = panel === "run";
  const aiOpen = params.chat === "true";
  const showLanding = isNew && !created;

  const closeAll = useCallback(
    () => update({ panel: null, job: null, trigger: null, edge: null, run: null, step: null, runMode: null }),
    [update]
  );

  // A step picked from the keyboard puts focus on its inspector's first field; a click leaves focus where it is.
  const inspectorRef = useRef<HTMLDivElement>(null);
  const focusInspector = useRef(false);
  const focusFirstField = () => {
    const field = inspectorRef.current?.querySelector<HTMLElement>(
      '[data-inspector-body] :is(input:not([type="hidden"]), select, textarea, button, a[href], [tabindex="0"]):not(:disabled)'
    );
    field?.focus();
    return !!field;
  };
  const pick = (sel: Selection, how?: { keyboard: boolean }) => {
    if (how?.keyboard && sel?.id === selection?.id) {
      focusFirstField();
      return;
    }
    focusInspector.current = !!how?.keyboard;
    select(sel);
  };
  // The URL, and with it the inspector, can update a render after the pick.
  useEffect(() => {
    if (focusInspector.current && focusFirstField()) focusInspector.current = false;
  });

  // Escape closes the open panel or the inspector (Lightning's keyboard provider).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Menus and dialogs handle their own Escape.
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select") && !target.closest("[data-inspector-body]")) return;
      if (panel === "code") update({ panel: "settings" });
      else if (panel) update({ panel: null, runMode: null });
      else if (selection) select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, selection, select, update]);

  const adaptorsInUse = useMemo(() => [...new Set(graph.jobs.map((j) => adaptorShortName(j.adaptor)))], [graph.jobs]);
  const firstTrigger = graph.triggers[0];

  // Running: the demo "starts" a run by following the workflow's newest
  // finished fixture run. From the canvas, running also closes the run panel;
  // the IDE stays open.
  // Lightning's Header: a followed run that finished and has steps is retried, not re-run.
  const isRetryable =
    !!runs.selectedRun &&
    !["available", "claimed", "started"].includes(runs.selectedRun.state) &&
    runs.selectedSteps.length > 0;

  // Lightning's useRunRetry / Header toast "Run started" or "Retry started" once the run is submitted.
  const followDemoRun = (closePanel: boolean, retry = false) => {
    const close: ParamPatch = closePanel ? { panel: null, runMode: null } : {};
    if (runs.demoRunId) update({ run: runs.demoRunId, step: null, ...close });
    else if (closePanel) update(close);
    toast(retry ? "Retry started" : "Run started");
  };

  // Replacing the new workflow's blank graph (from the landing screen) creates it.
  const createFrom = (g: WorkflowGraph) => {
    editor.replace(g);
    setCreated(true);
  };
  const runPanelTitle =
    params.runMode === "custom"
      ? "Pick a custom input"
      : job
        ? `Run from ${job.name}`
        : trigger
          ? `Run from Trigger (${trigger.type})`
          : "Run Workflow";

  let inspector: ReactNode = null;
  if (!showLanding && !isRunPanelOpen && !isIDEOpen) {
    if (panel === "settings") {
      inspector = (
        <WorkflowSettings
          graph={graph}
          projectConcurrency={project.concurrency}
          projectId={project.id}
          onChange={editor.updateWorkflow}
          onViewAsYAML={() => update({ panel: "code" })}
          onReset={editor.resetToSaved}
          onClose={() => update({ panel: null })}
        />
      );
    } else if (panel === "code") {
      inspector = <WorkflowCodePanel graph={graph} onClose={() => update({ panel: "settings" })} />;
    } else if (job) {
      inspector = (
        <JobInspector
          key={job.id}
          job={job}
          projectId={project.id}
          adaptorsInUse={adaptorsInUse}
          onChange={(patch) => editor.updateJob(job.id, patch)}
          onClose={() => select(null)}
          onOpenEditor={() => update({ panel: "editor" })}
          onDelete={() => {
            editor.removeJob(job.id);
            select(null);
          }}
          onRunFromHere={() => update({ panel: "run", runMode: null })}
          canDelete={!graph.edges.some((e) => e.sourceJobId === job.id)}
        />
      );
    } else if (trigger) {
      inspector = (
        <TriggerInspector
          key={trigger.id}
          trigger={trigger}
          onChange={(patch) => editor.updateTrigger(trigger.id, patch)}
          onClose={() => select(null)}
        />
      );
    } else if (edge) {
      inspector = (
        <EdgeInspector
          key={edge.id}
          edge={edge}
          onChange={(patch) => editor.updateEdge(edge.id, patch)}
          onDelete={() => {
            editor.removeEdge(edge.id);
            select(null);
          }}
          onClose={() => select(null)}
        />
      );
    }
  }

  // The IDE's right-hand panel: the run (from ?run=), history, or picking an input.
  const idePanelState: IDEPanelState = params.run ? "run-viewer" : ideSub;
  const ideJob = isIDEOpen ? job : null;
  let ideRightPanel: ReactNode = null;
  if (isIDEOpen && idePanelState === "run-viewer" && runs.selectedRun) {
    const steps = runs.selectedSteps;
    const stepId = params.step ?? steps.find((s) => s.jobId === ideJob?.id)?.id ?? steps[0]?.id ?? null;
    ideRightPanel = (
      <RunViewerPanel
        projectId={project.id}
        run={runs.selectedRun}
        startedBy={runs.selectedStartedBy}
        steps={steps}
        logs={runs.selectedLogs}
        dataclips={runs.dataclips}
        selectedStepId={stepId}
        onSelectStep={(s) => update({ job: s.jobId, step: s.id })}
        activeTab={runTab}
        mismatch={!!ideJob && steps.length > 0 && !steps.some((s) => s.jobId === ideJob.id)}
      />
    );
  } else if (isIDEOpen && idePanelState === "history") {
    ideRightPanel = (
      <MiniHistory
        variant="panel"
        projectId={project.id}
        workflowId={graph.id}
        collapsed={false}
        onToggle={() => {}}
        history={runs.history}
        selectedRunId={params.run ?? null}
        onSelectRun={(id) => update({ run: id, step: null })}
        onDeselectRun={() => update({ run: null, step: null })}
        onBack={() => setIdeSub(undefined)}
      />
    );
  } else if (isIDEOpen && idePanelState === "create-run") {
    ideRightPanel = (
      <ManualRunPanel
        mode="embedded"
        title=""
        dataclips={runs.dataclips}
        onClose={() => setIdeSub(undefined)}
        onClosePanel={() => setIdeSub(undefined)}
        onRun={() => followDemoRun(false)}
      />
    );
  }

  return (
    <div className="collaborative-editor h-full flex relative" data-testid="collaborative-editor" data-annotation="workflow-editor-canvas">
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col relative">
        {!showLanding && (
          <EditorHeader
            project={project}
            projectLabel={projectLabel(project, projects)}
            workflowName={graph.name}
            snapshots={snapshotsOf(graph)}
            pinnedVersion={pinnedVersion}
            onVersionSelect={(v) => setPinnedVersion(v === "latest" || v === graph.lockVersion ? null : v)}
            onTitleClick={closeAll}
            enabled={graph.triggers.some((t) => t.enabled)}
            onEnabledChange={editor.setEnabled}
            settingsOpen={panel === "settings"}
            onSettingsClick={() => update({ panel: panel === "settings" ? null : "settings" })}
            canRun={!!firstTrigger}
            runDisabled={isRunPanelOpen || isIDEOpen}
            runLabel={isRetryable ? "Retry" : "Run"}
            onRun={() =>
              runs.demoRunId
                ? followDemoRun(true, isRetryable)
                : update({ panel: "run", trigger: firstTrigger?.id ?? null, job: null, edge: null })
            }
            onRunWithCustomInput={() =>
              update({ panel: "run", trigger: firstTrigger?.id ?? null, job: null, edge: null, runMode: "custom" })
            }
            hasChanges={editor.hasChanges || !created}
            onSave={() => {
              editor.save();
              setCreated(true);
              toast("Workflow saved");
            }}
            saveLabel={isNew && !created ? "Create" : "Save"}
            aiOpen={aiOpen}
            onAIClick={() => update({ chat: aiOpen ? null : "true" })}
          >
            {pinnedVersion !== null && (
              <span className="pl-3" data-annotation="workflow-editor-versions-and-promote">
                <Pill tone="warning">Read-only</Pill>
              </span>
            )}
          </EditorHeader>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div className="flex h-full w-full">
            <div className="flex-1 relative">
              <WorkflowDiagram
                graph={graph}
                selection={selection}
                onSelect={pick}
                onAddPath={(jobId) => {
                  const id = editor.addJobAfter(jobId);
                  select({ kind: "job", id });
                }}
                run={runs.overlay}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                onUndo={editor.undo}
                onRedo={editor.redo}
              >
                {!isNew && (
                  <MiniHistory
                    projectId={project.id}
                    workflowId={graph.id}
                    collapsed={historyCollapsed}
                    onToggle={() => setHistoryCollapsed((c) => !c)}
                    history={runs.history}
                    selectedRunId={params.run ?? null}
                    onSelectRun={(id) => update({ run: id, step: null })}
                    onDeselectRun={() => update({ run: null, step: null })}
                  />
                )}
              </WorkflowDiagram>

              {inspector && (
                <div ref={inspectorRef} className="absolute top-0 right-0 z-45" id="inspector">
                  {inspector}
                </div>
              )}

              {isRunPanelOpen && (
                <div className="absolute inset-y-0 right-0 z-46 flex pointer-events-none">
                  <ManualRunPanel
                    key={`${params.job ?? params.trigger ?? params.edge}-${params.runMode ?? ""}`}
                    title={runPanelTitle}
                    dataclips={runs.dataclips}
                    fromEdge={!!edge}
                    initialTab={params.runMode === "custom" ? "custom" : "empty"}
                    onClose={() => update({ panel: null, runMode: null })}
                    onRun={() => followDemoRun(true)}
                  />
                </div>
              )}
            </div>

            {isIDEOpen && (
              <FullScreenIDE
                jobs={graph.jobs}
                job={ideJob}
                onSelectJob={(j) => update({ job: j.id })}
                onBodyChange={(body) => ideJob && editor.updateJob(ideJob.id, { body })}
                onClose={() => update({ panel: null })}
                onEditAdaptor={() => setIdeAdaptorModal("configure")}
                onChangeAdaptor={() => setIdeAdaptorModal("picker")}
                panelState={idePanelState}
                onShowHistory={() => {
                  update({ run: null, step: null });
                  setIdeSub("history");
                }}
                onShowCreateRun={() => setIdeSub("create-run")}
                followRunId={params.run ?? null}
                isRetryable={isRetryable}
                onRun={() => followDemoRun(false)}
                onRetry={() => followDemoRun(false, true)}
                onClearRun={() => {
                  update({ run: null, step: null });
                  setIdeSub(undefined);
                }}
                runTab={runTab}
                onRunTabChange={setRunTab}
                rightPanel={ideRightPanel}
              />
            )}
          </div>
        </div>

        {showLanding && (
          <LandingScreen
            onBuildWithAI={() => {
              createFrom(blankWorkflowGraph(project.id));
              update({ chat: "true" });
            }}
            onBuildFromScratch={() => createFrom(blankWorkflowGraph(project.id))}
            onBrowseTemplates={() => openLandingModal("templates")}
            onImportYAML={() => openLandingModal("yaml")}
          />
        )}
      </div>

      {aiOpen && <AIAssistantPanel sessions={aiSessionsFor(graph.id)} onClose={() => update({ chat: null })} />}

      <TemplateBrowserModal
        key={`templates-${landingModal.key}`}
        isOpen={landingModal.which === "templates"}
        onClose={closeLandingModal}
        projectId={project.id}
        templates={workflowTemplates}
        onCreate={(t) => {
          createFrom(templateGraph(t, project.id));
          closeLandingModal();
        }}
      />
      <YAMLImportModal
        key={`yaml-${landingModal.key}`}
        isOpen={landingModal.which === "yaml"}
        onClose={closeLandingModal}
        onCreate={(yaml) => {
          createFrom({ ...blankWorkflowGraph(project.id), name: workflowNameFromYaml(yaml) || "Imported workflow" });
          closeLandingModal();
        }}
      />
      {ideJob && (
        <AdaptorConfigModals
          open={ideAdaptorModal}
          onOpenChange={setIdeAdaptorModal}
          projectId={project.id}
          job={ideJob}
          adaptorsInUse={adaptorsInUse}
          onChange={(patch) => editor.updateJob(ideJob.id, patch)}
        />
      )}
    </div>
  );
}
