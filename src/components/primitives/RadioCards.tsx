import { useId, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Field } from "./Inputs";

export interface RadioCardOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** A Heroicon class shown large at the card's left, e.g. "hero-globe-alt". */
  icon?: string;
}

interface Props<T extends string> {
  /** The group's visible name. Without one, give `aria-label`. */
  label?: ReactNode;
  "aria-label"?: string | undefined;
  hint?: ReactNode;
  errors?: string[] | undefined;
  disabled?: boolean | undefined;
  /** The picked option's value; null picks none. */
  value: T | null;
  onChange: (value: T) => void;
  options: RadioCardOption<T>[];
  /** Classes for the list of cards, e.g. a grid. */
  className?: string | undefined;
}

/**
 * Pick one of a few options, each drawn as a card. Native radios sit under
 * the cards, so the arrow keys move between them; the picked card gets a
 * primary border, the focused one the focus outline.
 */
export default function RadioCards<T extends string>({ label, "aria-label": ariaLabel, hint, errors = [], disabled, value, onChange, options, className }: Props<T>) {
  const name = useId();
  return (
    <Field group label={label} aria-label={ariaLabel} hint={hint} errors={errors} disabled={disabled}>
      <div className={cn("space-y-4", className)}>
        {options.map((o) => (
          <label
            key={o.value}
            data-ui="radio-card"
            className={cn(
              "flex cursor-pointer items-center gap-x-2.5 rounded-lg border bg-surface p-2 text-sm text-body shadow-xs",
              "border-subtle has-aria-invalid:border-invalid",
              "has-checked:border-selected has-checked:ring-1 has-checked:ring-selected",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
              "has-disabled:cursor-not-allowed has-disabled:bg-subtle has-disabled:text-muted"
            )}
          >
            <input type="radio" name={name} value={o.value} aria-invalid={errors.length > 0 || undefined} className="sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.icon && <span className={cn(o.icon, "h-10 w-10")} />}
            {o.label}
          </label>
        ))}
      </div>
    </Field>
  );
}
