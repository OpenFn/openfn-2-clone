import { useState, type ReactNode } from "react";
import type { WorkflowGraph } from "../../types/workflow-graph";
import Button from "../primitives/Button";
import ConfirmModal from "../primitives/ConfirmModal";
import Heading from "../primitives/Heading";
import { TextInput } from "../primitives/Inputs";
import Toggle from "../primitives/Toggle";
import TextLink from "../primitives/TextLink";
import InspectorLayout from "./InspectorLayout";
import Text from "../primitives/Text";

interface Props {
  graph: WorkflowGraph;
  /** The project's concurrency; 1 means parallel runs are disabled. */
  projectConcurrency: number | null;
  projectId: string;
  onChange: (patch: Partial<Pick<WorkflowGraph, "name" | "concurrency" | "enableJobLogs">>) => void;
  onViewAsYAML: () => void;
  onReset: () => void;
  onClose: () => void;
}

function Section({ title, description, className, children }: { title: string; description?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mb-2) */}
      <Heading size="sm" className="mb-2">
        {title}
      </Heading>
      {description && (
        // eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mb-3)
        <Text as="p" tone="muted" className="mb-3">
          {description}
        </Text>
      )}
      {children}
    </div>
  );
}

/**
 * Workflow settings (`?panel=settings`, inspector/WorkflowSettings.tsx):
 * name, the YAML link, console.log toggle, max concurrency and Reset.
 */
export default function WorkflowSettings({ graph, projectConcurrency, projectId, onChange, onViewAsYAML, onReset, onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const concurrencyDisabled = projectConcurrency === 1;
  return (
    <InspectorLayout title="Workflow settings" onClose={onClose}>
      <TextInput id="name" label="Workflow Name" value={graph.name} onChange={(e) => onChange({ name: e.target.value })} />
      <Section title="Workflow as YAML">
        <Text>
          <TextLink onClick={onViewAsYAML}>View your workflow as YAML code</TextLink>
        </Text>
      </Section>
      <Toggle
        label="Allow console.log() usage"
        description="Control what's printed in run logs"
        checked={graph.enableJobLogs}
        onChange={(enableJobLogs) => onChange({ enableJobLogs })}
      />
      <Section
        title="Concurrency"
        description={
          <>
            Control how many of this workflow's <em>Runs</em> are executed at the same time
          </>
        }
      >
        <TextInput
          id="concurrency"
          type="number"
          label="Max Concurrency"
          placeholder="Unlimited (up to max available)"
          min={1}
          disabled={concurrencyDisabled}
          value={graph.concurrency ?? ""}
          onChange={(e) => onChange({ concurrency: e.target.value === "" ? null : Number(e.target.value) })}
        />
        {concurrencyDisabled && (
          // eslint-disable-next-line local/primitive-classname -- debt: F525 margin, F528 type (mt-2 italic)
          <Text as="p" variant="body-sm" tone="muted" className="mt-2 italic">
            Parallel execution of runs is disabled for this project. This setting will have no effect. You can modify your Project
            Concurrency setting on the <TextLink to={`/projects/${projectId}/settings`}>project setup</TextLink> page.
          </Text>
        )}
      </Section>
      <Section
        title="Reset Workflow"
        description="Discard all uncommitted changes and restore the workflow to its latest saved snapshot. This action cannot be undone."
        className="border-t border-subtle pt-6"
      >
        <Button tone="danger" onClick={() => setConfirmReset(true)}>
          Reset to Latest Snapshot
        </Button>
      </Section>
      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          onReset();
        }}
        title="Reset Workflow?"
        confirmLabel="Reset Workflow"
        tone="danger"
      >
        <p>This will undo all uncommitted changes and restore the workflow to its latest snapshot. This action cannot be undone.</p>
      </ConfirmModal>
    </InspectorLayout>
  );
}
