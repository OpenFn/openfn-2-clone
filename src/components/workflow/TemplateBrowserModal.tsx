import { useState } from "react";
import { templateGraph } from "../../utils/workflowGraph";
import type { WorkflowTemplate } from "../../types/workflow-graph";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import Heading from "../primitives/Heading";
import Modal from "../primitives/Modal";
import RadioCards from "../primitives/RadioCards";
import SearchInput from "../primitives/SearchInput";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";
import WorkflowDiagram from "./WorkflowDiagram";
import { matchesQuery } from "../../utils/search";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  /** Templates available to the project (base templates and published ones). */
  templates: WorkflowTemplate[];
  onCreate: (template: WorkflowTemplate) => void;
}

/** A template's name over its clamped description. */
function TemplateSummary({ template, lines }: { template: WorkflowTemplate; lines: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Heading size="sm" as="p" className="truncate">
        {template.name}
      </Heading>
      <p className={`text-muted ${lines}`}>{template.description}</p>
    </div>
  );
}

/**
 * "Templates" (TemplateBrowserModal.tsx): searchable template list on the
 * left, a preview of the selected one on the right with Create.
 */
export default function TemplateBrowserModal({ isOpen, onClose, projectId, templates, onCreate }: Props) {
  const [query, setQuery] = useState("");
  const [previewedId, setPreviewedId] = useState<string | null>(templates[0]?.id ?? null);
  const visible = templates.filter((t) => matchesQuery(query, t.name, t.description));
  const previewed = templates.find((t) => t.id === previewedId) ?? null;

  return (
    <Modal open={isOpen} onClose={onClose} size="2xl" title="Templates">
      {/* eslint-disable-next-line no-restricted-syntax -- sized to the viewport */}
      <Text as="div" className="flex h-[70vh] max-h-160 gap-6">
        {/* Padding inside the scroller so focus outlines aren't clipped (sides here, top by the list's own pt-1, clear of the sticky search); the negative margin keeps the layout. */}
        <div className="-m-1 w-78 shrink-0 overflow-y-auto p-1">
          <div className="sticky top-0 z-10 bg-surface pb-1">
            <SearchInput value={query} onChange={setQuery} placeholder="Search templates" size="sm" />
          </div>
          <RadioCards
            aria-label="Templates"
            // eslint-disable-next-line local/primitive-classname -- debt: box (pt-1)
            className="pt-1"
            value={previewedId}
            onChange={setPreviewedId}
            options={visible.map((t) => ({ value: t.id, label: <TemplateSummary template={t} lines="line-clamp-3" /> }))}
          />
          {visible.length === 0 && <EmptyState variant="plain" message="No saved templates match your search." />}
        </div>
        <Card variant="muted" padding="none" className="flex min-w-0 flex-1 flex-col overflow-clip">
          <div className="min-h-0 flex-1">
            {previewed ? (
              <WorkflowDiagram key={previewed.id} graph={templateGraph(previewed, projectId)} selection={null} onSelect={() => {}} preview />
            ) : (
              <EmptyState variant="plain" fill message="Select a template to preview it." />
            )}
          </div>
          {previewed && (
            <div className="flex items-center justify-between gap-14 bg-surface p-4">
              <TemplateSummary template={previewed} lines="line-clamp-2" />
              <Button className="shrink-0" onClick={() => onCreate(previewed)}>
                Create
              </Button>
            </div>
          )}
        </Card>
      </Text>
    </Modal>
  );
}
