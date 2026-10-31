import type { ReactNode } from "react";
import Toggle from "../primitives/Toggle";
import type { CurrentProject } from "../../types/projects";
import type { WorkflowSnapshot } from "../../types/workflow-graph";
import IconButton from "../primitives/IconButton";
import ProjectBreadcrumbs from "../shell/ProjectBreadcrumbs";
import NewRunButton from "./NewRunButton";
import SaveButton from "./SaveButton";
import VersionDropdown from "./VersionDropdown";
import Tooltip from "../primitives/Tooltip";
import Text from "../primitives/Text";

interface Props {
  project: CurrentProject;
  /** The project picker's label ("parent/child" for a sandbox). */
  projectLabel: string;
  workflowName: string;
  snapshots: WorkflowSnapshot[];
  pinnedVersion: number | null;
  onVersionSelect: (version: number | "latest") => void;
  /** Clicking the workflow name closes every panel and returns to the bare canvas. */
  onTitleClick: () => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  settingsOpen: boolean;
  onSettingsClick: () => void;
  /** Hidden when the workflow has no trigger to start a run from. */
  canRun: boolean;
  runDisabled?: boolean;
  onRun: () => void;
  /** "Retry" while a finished run with steps is followed (?run=). */
  runLabel?: string;
  onRunWithCustomInput: () => void;
  hasChanges: boolean;
  onSave: () => void;
  saveLabel?: string;
  aiOpen: boolean;
  onAIClick: () => void;
  /** Extra content after the breadcrumbs (e.g. a "Read-only" pill). */
  children?: ReactNode;
}

/**
 * The collaborative editor's header bar (collaborative-editor/components/
 * Header.tsx + BreadcrumbContent in CollaborativeEditor.tsx): project picker,
 * Workflows, the workflow name with its version pill; then the enabled
 * switch, the settings icon, the split Run button, Save and the AI button.
 * This is the "no experimental features" layout Lightning shows by default.
 */
export default function EditorHeader({
  project,
  projectLabel,
  workflowName,
  snapshots,
  pinnedVersion,
  onVersionSelect,
  onTitleClick,
  enabled,
  onEnabledChange,
  settingsOpen,
  onSettingsClick,
  canRun,
  runDisabled = false,
  onRun,
  runLabel,
  onRunWithCustomInput,
  hasChanges,
  onSave,
  saveLabel = "Save",
  aiOpen,
  onAIClick,
  children,
}: Props) {
  return (
    // eslint-disable-next-line local/primitive-classname -- debt: F526 box (border-b border-subtle bg-surface shadow-xs sm:px-4)
    <Text as="div" className="relative z-50 flex h-20 flex-none items-center gap-2 border-b border-subtle bg-surface shadow-xs sm:px-4">
      <div className="flex min-w-0 items-center">
        <ProjectBreadcrumbs
          project={project}
          label={projectLabel}
          items={[["Workflows", `/projects/${project.id}/w`]]}
          current={
            <span className="flex items-center gap-2">
              <Tooltip content={workflowName}>
                {/* eslint-disable-next-line no-restricted-syntax -- debt: a plain text button; Button has no text theme */}
                <button type="button" onClick={onTitleClick} className="max-w-64 truncate hover:text-body">
                  {workflowName}
                </button>
              </Tooltip>
              <VersionDropdown snapshots={snapshots} pinnedVersion={pinnedVersion} onVersionSelect={onVersionSelect} />
            </span>
          }
        />
      </div>
      {children}

      <div className="ml-auto flex items-center gap-2">
        {/* The workflow's on/off state: a switch, though it waits for Save. */}
        <Toggle checked={enabled} onChange={onEnabledChange} tooltip={enabled ? "Disable workflow" : "Enable workflow"} />
        <IconButton icon="hero-adjustments-vertical" label="Workflow settings" active={settingsOpen} onClick={onSettingsClick} />
        {canRun && (
          <NewRunButton onClick={onRun} onRunWithCustomInputClick={onRunWithCustomInput} disabled={runDisabled}>
            {runLabel}
          </NewRunButton>
        )}
        <SaveButton onClick={onSave} hasChanges={hasChanges}>
          {saveLabel}
        </SaveButton>
      </div>

      <IconButton
        icon="hero-chat-bubble-left-right"
        label={aiOpen ? "Close AI Assistant" : "Open AI Assistant"}
        tooltip={`${aiOpen ? "Close AI Assistant" : "Open AI Assistant"} (⌘ K)`}
        active={aiOpen}
        size="lg"
        // eslint-disable-next-line local/primitive-classname -- debt: F525 margin, F526 box (ml-2 rounded-full)
        className="ml-2 rounded-full"
        onClick={onAIClick}
      />
    </Text>
  );
}
