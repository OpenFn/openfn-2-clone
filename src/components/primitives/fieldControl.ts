import { createContext, useContext } from "react";

export interface FieldControl {
  id?: string | undefined;
  describedBy?: string | undefined;
  invalid: boolean;
  /** The Field has a label pointing at its control. */
  labelled?: boolean;
}

export const FieldContext = createContext<FieldControl>({ invalid: false });

/**
 * The props that tie a control to the `Field` around it: its id, its hint
 * and errors as `aria-describedby`, and `aria-invalid`, which is also what
 * gives it the error look. Only the nearest Field counts, so in a row of
 * controls only the one in the Field with errors turns red.
 */
export function useFieldControl() {
  const { id, describedBy, invalid } = useContext(FieldContext);
  return { id, "aria-describedby": describedBy, "aria-invalid": invalid || undefined };
}

/**
 * Every control needs a name: a Field label or an `aria-label`. One without
 * fails tests and stories, and logs an error in the dev app.
 */
export function checkNamed(control: string, named: boolean) {
  // A host that doesn't bundle with Vite (Lightning's esbuild) has no import.meta.env
  if (named || !import.meta.env?.DEV) return;
  const message = `${control} has no name: give it a label, or aria-label when the label isn't visible.`;
  if (import.meta.env.MODE === "test") throw new Error(message);
  console.error(message);
}
