import { useState } from "react";
import Button from "../primitives/Button";
import FileDropZone from "../primitives/FileDropZone";
import FormModal from "../primitives/FormModal";
import { Field } from "../primitives/Inputs";
import CodeEditor from "../primitives/CodeEditor";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the YAML text; the demo builds a blank workflow from it. */
  onCreate: (yaml: string) => void;
}

/**
 * "Import a workflow" (YAMLImportModal.tsx): upload or paste YAML, then
 * Create. The demo only checks that something looks like a workflow spec.
 */
export default function YAMLImportModal({ isOpen, onClose, onCreate }: Props) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [yaml, setYaml] = useState("");
  const looksValid = /^name:/m.test(yaml) && /^jobs:/m.test(yaml);
  // Pressing Create says what's missing, rather than Create being disabled (PRINCIPLES.md, Forms).
  const [submitted, setSubmitted] = useState(false);
  const error = !looksValid && (yaml.trim() || submitted) ? (yaml.trim() ? "Workflow YAML needs a top-level name and jobs." : "Enter YAML content to create workflow") : null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      size="md"
      title="Import a workflow"
      formId="yaml-import-form"
      formClassName=""
      onSubmit={() => {
        setSubmitted(true);
        if (looksValid) onCreate(yaml);
      }}
      submitLabel="Create"
    >
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setMode(mode === "upload" ? "paste" : "upload")}>
          {mode === "upload" ? "Paste text" : "Upload a file"}
        </Button>
      </div>
      <Field errors={error ? [error] : []}>
        <div className="h-80">
          {mode === "upload" ? (
            <FileDropZone
              accept=".yaml,.yml"
              label="Upload or drop a YAML file."
              hint="YML or YAML, up to 8MB"
              invalidMessage="File must be .yml or .yaml format"
              onFile={(file) =>
                void file.text().then((t) => {
                  setYaml(t);
                  setMode("paste");
                })
              }
              className="h-full"
            />
          ) : (
            <div className="h-full overflow-hidden rounded-lg">
              <CodeEditor value={yaml} onChange={setYaml} language="yaml" ariaLabel="Workflow YAML" />
            </div>
          )}
        </div>
      </Field>
    </FormModal>
  );
}
