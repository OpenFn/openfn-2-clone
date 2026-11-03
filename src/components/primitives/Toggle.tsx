import { useId, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { useFieldControl } from "./fieldControl";
import Text from "./Text";
import Tooltip from "./Tooltip";

interface BaseProps {
  checked: boolean;
  onChange?: ((checked: boolean) => void) | undefined;
  /** Shown to the right of the switch. */
  label?: string;
  /** Gray text after the label, e.g. "(currently optional for this project)". */
  note?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  /** Hover text, e.g. why the switch is disabled. */
  tooltip?: string | undefined;
  /** id of an element that labels the switch, when there's no `label`. */
  labelledBy?: string;
  /** Name of the hidden checkbox that mirrors the state, as Lightning's toggle input has. */
  name?: string | undefined;
}

/** A switch has no text of its own, so one of these must name it. */
type Props = BaseProps & ({ label: string } | { labelledBy: string } | { tooltip: string });

/**
 * Lightning's toggle switch (new_inputs.ex `type="toggle"`): primary-600
 * when on, with a check / cross in the knob. A hidden checkbox mirrors the
 * state, as Lightning's does, so forms and tests can read it. In a `Field`
 * with errors it gets a red ring.
 */
export default function Toggle({ checked, onChange, label, note, description, disabled = false, id, tooltip, labelledBy, name }: Props) {
  const labelId = useId();
  const field = useFieldControl();
  // The description (e.g. why the plan doesn't allow it) is read with the switch.
  const descriptionId = `${labelId}-description`;
  const describedBy = [...(description ? [descriptionId] : []), ...(field["aria-describedby"] ? [field["aria-describedby"]] : [])].join(" ") || undefined;
  const button = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy ?? (label ? labelId : undefined)}
      // An unlabelled switch is named by its tooltip, as Lightning's toggle input is.
      aria-label={label || labelledBy ? undefined : tooltip}
      disabled={disabled}
      aria-invalid={field["aria-invalid"]}
      aria-describedby={describedBy}
      data-ui="toggle"
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
        checked ? "bg-brand" : "bg-emphasis",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-2 aria-invalid:ring-invalid aria-invalid:ring-offset-2"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      >
        <span className={cn("h-4 w-4", checked ? "hero-check-micro text-selected" : "hero-x-mark-micro text-faint")} />
      </span>
    </button>
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Tooltip content={tooltip} disabled={disabled}>
          {button}
        </Tooltip>
        <input type="checkbox" name={name} checked={checked} readOnly tabIndex={-1} aria-hidden="true" className="hidden" />
        {label && (
          <Text id={labelId} className="text-muted">
            <span className="font-medium text-strong">{label}</span>
            {note && <> {note}</>}
          </Text>
        )}
      </div>
      {description && (
        <div id={descriptionId}>{typeof description === "string" ? <Text as="p" tone="muted">{description}</Text> : description}</div>
      )}
    </div>
  );
}
