import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Tooltip from "./Tooltip";
import type { Tone } from "./tone";

/** Tag colours, for tags that mean nothing (dataclip types, HTTP methods). Meaning goes in `tone`. */
export type PillColor = "gray" | "red" | "orange" | "yellow" | "green" | "blue" | "indigo" | "purple" | "pink";

const colorClasses: Record<PillColor, string> = {
  gray: "bg-sunken text-body",
  red: "bg-tag-red text-tag-red",
  orange: "bg-tag-orange text-tag-orange",
  yellow: "bg-tag-yellow text-tag-yellow",
  green: "bg-tag-green text-tag-green",
  blue: "bg-tag-blue text-tag-blue",
  indigo: "bg-tag-indigo text-tag-indigo",
  purple: "bg-tag-purple text-tag-purple",
  pink: "bg-tag-pink text-tag-pink",
};

const toneClasses: Record<Tone, string> = {
  neutral: "bg-sunken text-body",
  info: "bg-info-badge text-info",
  success: "bg-success-badge text-success",
  warning: "bg-warning-badge text-warning-strong",
  danger: "bg-danger-badge text-danger",
};

/**
 * A small tag (Lightning's components/pills.ex `pill`): states, types,
 * versions, selected items. Always pale. `tone` says what it means; `color`
 * is only for tags that mean nothing. `variant="square"` gives it
 * rounded-md corners and `onRemove` an x button. For the code font, put the
 * text in `<code>`.
 */
export default function Pill({
  id,
  "aria-label": ariaLabel,
  tone,
  color,
  variant = "round",
  title,
  onRemove,
  removeLabel = "Remove",
  className,
  children,
}: {
  id?: string;
  "aria-label"?: string;
  variant?: "round" | "square";
  /** Hover text. */
  title?: string | undefined;
  /** Shows an x button that calls this. */
  onRemove?: (() => void) | undefined;
  /** Accessible name for the x button. */
  removeLabel?: string;
  className?: string | undefined;
  children: ReactNode;
} & (
  | {
      /** Leave it off for a plain grey tag. */
      tone?: Tone | undefined;
      color?: never;
    }
  | {
      /** A tag colour that means nothing. Takes the place of `tone`. */
      color?: PillColor | undefined;
      tone?: never;
    }
)) {
  const pill = (
    <span
      id={id}
      aria-label={ariaLabel}
      data-ui="tag"
      data-tone={color ? undefined : tone}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs font-medium",
        variant === "square" ? "rounded-md" : "rounded-full",
        color ? colorClasses[color] : toneClasses[tone ?? "neutral"],
        onRemove && "pr-1",
        className
      )}
    >
      {children}
      {onRemove && (
        // Part of the chip, in its colour and smaller than any button size, so the pill draws it.
        <Tooltip content={removeLabel}>
          <button
            type="button"
            aria-label={removeLabel}
            onClick={onRemove}
            className="inline-flex rounded-full text-current opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <span className="hero-x-mark-mini h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </span>
  );
  return <Tooltip content={title}>{pill}</Tooltip>;
}
