import { useState } from "react";
import Toggle from "../primitives/Toggle";
import type { EdgeConditionType, EditorEdge } from "../../types/workflow-graph";
import { edgeConditionOptions } from "../../constants";
import Button from "../primitives/Button";
import ConfirmModal from "../primitives/ConfirmModal";
import Disclosure from "../primitives/Disclosure";
import { Select, TextArea, TextInput } from "../primitives/Inputs";
import TextLink from "../primitives/TextLink";
import InspectorLayout, { InspectorFooter } from "./InspectorLayout";
import Tooltip from "../primitives/Tooltip";
import Text from "../primitives/Text";

interface Props {
  edge: EditorEdge;
  onChange: (patch: Partial<EditorEdge>) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * The path inspector (inspector/EdgeInspector.tsx + EdgeForm.tsx): Label,
 * Condition, the JavaScript expression for "On Match", and a footer with
 * the Enabled toggle and Delete. Paths from a trigger have no footer.
 */
export default function EdgeInspector({ edge, onChange, onDelete, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fromTrigger = !!edge.sourceTriggerId;
  const options = fromTrigger
    ? edgeConditionOptions.filter(([, value]) => value === "always" || value === "js_expression")
    : edgeConditionOptions;
  const expression = edge.conditionExpression ?? "";
  const unsafe = /(\bimport\b|\brequire\b|\bprocess\b|\bawait\b|\beval\b)/.test(expression);

  const footer = fromTrigger ? undefined : (
    <InspectorFooter
      leftButtons={
        <Toggle checked={edge.enabled} onChange={(enabled) => onChange({ enabled })} label="Enabled" tooltip="Enable or disable this path" />
      }
      rightButtons={
        <Button tone="danger" tooltip="Delete this path" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      }
    />
  );

  return (
    <InspectorLayout title="Path" onClose={onClose} footer={footer}>
      <TextInput
        id="condition_label"
        label="Label"
        value={edge.conditionLabel ?? ""}
        onChange={(e) => onChange({ conditionLabel: e.target.value || null })}
      />
      <Select
        id="condition_type"
        label="Condition"
        options={options}
        value={edge.conditionType}
        onChange={(e) => onChange({ conditionType: e.target.value as EdgeConditionType })}
      />
      {edge.conditionType === "js_expression" && (
        <div className="space-y-2">
          <TextArea
            id="condition_expression"
            label={
              <span className="inline-flex items-center gap-2">
                Javascript Expression
                {unsafe && (
                  <Tooltip content="Expression contains potentially unsafe functions">
                    <span
                      role="img"
                      aria-label="Expression contains potentially unsafe functions"
                      // eslint-disable-next-line no-restricted-syntax -- debt: warning icon is 500, this one 600 (F476)
                      className="hero-exclamation-triangle h-4 w-4 text-warning-600"
                    />
                  </Tooltip>
                )}
              </span>
            }
            value={expression}
            onChange={(e) => onChange({ conditionExpression: e.target.value })}
            placeholder="eg: !state.error"
            // eslint-disable-next-line local/primitive-classname -- debt: F526 box, F528 type, F527 colour (bg-code font-mono text-code)
            className="h-24 bg-code font-mono text-code"
          />
          <Disclosure variant="inline" defaultOpen={false} title="How to write expressions">
            <Text as="div" variant="body-sm" tone="muted" className="space-y-1">
              <p>Use the state from the previous step to decide whether this step should run.</p>
              <p>Must be a single JavaScript expression with `state` in scope.</p>
              <p>
                Check{" "}
                <TextLink to="https://docs.openfn.org/documentation/build/paths#writing-javascript-expressions-for-custom-path-conditions" external>
                  docs.openfn.org
                </TextLink>{" "}
                for more details.
              </p>
            </Text>
          </Disclosure>
        </div>
      )}
      {fromTrigger && (
        // eslint-disable-next-line local/primitive-classname -- debt: F528 type (italic)
        <Text as="p" variant="body-sm" tone="muted" className="italic">
          This path will be active if its trigger is enabled
        </Text>
      )}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        title="Delete Path?"
        confirmLabel="Delete"
        tone="danger"
      >
        <p>Are you sure you want to delete this edge? This action cannot be undone.</p>
      </ConfirmModal>
    </InspectorLayout>
  );
}
