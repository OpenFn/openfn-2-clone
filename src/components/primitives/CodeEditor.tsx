import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import type { editor } from "monaco-editor";
import { useFieldControl } from "./fieldControl";
import { cn } from "../../utils/cn";
import { setUpMonaco } from "../../theme/monacoTheme";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  /** The editor's accessible name ("Job code", "Workflow YAML"). */
  ariaLabel: string;
  /** Monaco's language id. */
  language?: string;
  /** Merged over the defaults, as Lightning's CollaborativeMonaco takes them. */
  options?: editor.IStandaloneEditorConstructionOptions;
}

// Lightning's job editor defaults (CollaborativeMonaco.tsx baseEditorOptions).
const defaults: editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on",
  lineNumbers: "on",
  folding: true,
  renderWhitespace: "selection",
  tabSize: 2,
  insertSpaces: true,
  automaticLayout: true,
  fixedOverflowWidgets: true,
  codeLens: false,
  wordBasedSuggestions: "off",
  showFoldingControls: "always",
  suggest: {
    showModules: true,
    showKeywords: false,
    showFiles: false,
    showClasses: false,
    showInterfaces: false,
    showConstructors: false,
    showDeprecated: false,
  },
};

// As CollaborativeMonaco's onMount: job code is a script, with no browser lib.
const onMount: OnMount = (_editor, monaco) => {
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ allowNonTsExtensions: true, noLib: true });
};

/**
 * Lightning's Monaco code editor with the shared "default" theme. The host
 * sets up Monaco's workers and loader (src/monacoSetup.ts in the replica).
 * In a `Field` with errors it gets a red border.
 */
export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  className,
  ariaLabel,
  language = "javascript",
  options,
}: Props) {
  const field = useFieldControl();
  const invalid = field["aria-invalid"];
  const describedBy = field["aria-describedby"];
  // Monaco's own textarea takes the keyboard, so it carries the Field's error and hint.
  const [input, setInput] = useState<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!input) return;
    for (const [name, value] of [["aria-invalid", invalid && "true"], ["aria-describedby", describedBy]] as const) {
      if (value) input.setAttribute(name, value);
      else input.removeAttribute(name);
    }
  }, [input, invalid, describedBy]);
  return (
    <div data-ui="code-editor" className={cn("h-full w-full", invalid && "rounded-lg border border-invalid", className)}>
      <Editor
        height="100%"
        value={value}
        onChange={(next) => onChange?.(next ?? "")}
        language={language}
        theme="default"
        beforeMount={setUpMonaco}
        onMount={(editor, monaco) => {
          onMount(editor, monaco);
          setInput(editor.getDomNode?.()?.querySelector("textarea") ?? null);
        }}
        options={{ ...defaults, readOnly, ariaLabel, ...options }}
      />
    </div>
  );
}
