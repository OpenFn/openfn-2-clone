import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Tooltip from "./Tooltip";
import type { Tone } from "./tone";

/** Tag colours, for tags that mean nothing (dataclip types, HTTP methods). Meaning goes in `tone`. */
export type PillColor = "gray" | "red" | "orange" | "yellow" | "green" | "blue" | "primary" | "purple" | "pink";

const colorClasses: Record<PillColor, string> = {
  gray: "bg-gray-100 text-gray-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  primary: "bg-primary-100 text-primary-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};

const toneClasses: Record<Tone, string> = {
  neutral: "bg-sunken text-body",
  // eslint-disable-next-line no-restricted-syntax -- debt: Pill's fill is 100, the fill role is 50 (F521)
  info: "bg-info-100 text-info",
  // eslint-disable-next-line no-restricted-syntax -- debt: Pill's fill is 100, the fill role is 50 (F521)
  success: "bg-success-100 text-success",
  warning: "bg-warning text-warning-strong",
  // eslint-disable-next-line no-restricted-syntax -- debt: Pill's fill is 100, the fill role is 50 (F521)
  danger: "bg-danger-100 text-danger",
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
            className="inline-flex rounded-full text-current opacity-60 hover:bg-black/10 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <span className="hero-x-mark-mini h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </span>
  );
  return <Tooltip content={title}>{pill}</Tooltip>;
}
