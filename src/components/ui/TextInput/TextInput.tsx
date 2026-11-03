import type { ComponentProps } from "react";
import { cn } from "@/components/ui/cn";

type TextInputProps = Omit<ComponentProps<"input">, "className" | "type"> & {
  type?: "text" | "email" | "password" | "search" | "url";
  /** For a value people copy rather than read, like a token. */
  monospace?: boolean;
  /** Layout only (`flex-1`), never how it looks. */
  className?: string;
};

/** A one-line text box. Give it a label: a `<label>`, or `aria-label` where the words around it already say what it is. */
export function TextInput({ type = "text", monospace, className, ...rest }: TextInputProps) {
  return (
    <input
      type={type}
      className={cn(
        "min-w-0 rounded-md border border-strong bg-surface px-3 py-2 text-sm text-strong",
        "focus:outline-2 focus:-outline-offset-1 focus:outline-focus",
        "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-disabled",
        monospace && "font-mono",
        className,
      )}
      {...rest}
    />
  );
}
