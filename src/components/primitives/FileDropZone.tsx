import { useId, useState, type DragEvent } from "react";
import { cn } from "../../utils/cn";
import { useFieldControl } from "./fieldControl";

/** Lightning's YAML import limit, applied to every upload here. */
const MAX_BYTES = 8 * 1024 * 1024;

interface Props {
  /** File types, as the input's `accept` (".json", ".yaml,.yml"). A picked or dropped file must match one by extension. */
  accept: string;
  /** Called with the picked or dropped file. Several dropped at once, or one over 8MB, show an error instead. */
  onFile: (file: File) => void;
  /** The zone's text and the file input's name: "Upload or drop a YAML file." */
  label: string;
  /** Smaller text under the label: "JSON, up to 8MB". */
  hint?: string;
  /** Shown in place of `hint` when a file doesn't match `accept`. */
  invalidMessage: string;
  disabled?: boolean | undefined;
  className?: string;
}

/**
 * A dashed area that takes one file, by click, keyboard (the file input
 * inside it is focusable) or drag and drop. Inside a `Field`, the field's
 * errors mark it invalid and are read with it.
 */
export default function FileDropZone({ accept, onFile, label, hint, invalidMessage, disabled = false, className }: Props) {
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const field = useFieldControl();
  const invalid = (error !== "" || field["aria-invalid"] === true) && !disabled;
  const describedBy = [hint || error ? hintId : undefined, field["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const extensions = accept.split(",").map((ext) => ext.trim().toLowerCase());

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const problem =
      files.length > 1
        ? "Only 1 file can be uploaded"
        : !extensions.some((ext) => file.name.toLowerCase().endsWith(ext))
          ? invalidMessage
          : file.size > MAX_BYTES
            ? `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 8MB`
            : "";
    setError(problem);
    if (!problem) onFile(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    // Moving onto the icon or text inside fires dragleave too.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) take(e.dataTransfer.files);
  };

  return (
    <label
      data-ui="file-drop-zone"
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-strong p-3 text-center text-sm/6 text-muted transition-colors",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
        disabled
          ? "cursor-not-allowed bg-subtle"
          : dragging
            ? "cursor-pointer border-primary-500 bg-primary-50 text-body"
            : invalid
              ? "cursor-pointer border-invalid bg-danger"
              : "cursor-pointer bg-surface hover:border-emphasis",
        className
      )}
    >
      <span className={cn("size-8", invalid ? "hero-exclamation-circle text-invalid" : "hero-cloud-arrow-up text-faint")} />
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <span className={cn("font-medium", disabled ? "text-muted" : "text-strong")}>{label}</span>
      {error !== "" && !disabled ? (
        <span id={hintId} role="alert" className="text-xs/5 text-invalid">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="text-xs/5">
            {hint}
          </span>
        )
      )}
    </label>
  );
}
