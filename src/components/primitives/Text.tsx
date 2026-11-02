import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

// The type scale: a role (body, label, code) at a size (md 14px, sm 12px),
// and the big number a card or chart is about (stat, at 30, 24 and 18px).
// Headings are Heading; everything else is one of these.
const variants = {
  "body-md": "text-sm",
  "body-sm": "text-xs",
  "label-md": "text-sm font-medium",
  "label-sm": "text-xs font-medium",
  "code-md": "font-mono text-sm",
  "code-sm": "font-mono text-xs",
  "stat-lg": "text-3xl font-bold",
  "stat-md": "text-2xl font-semibold",
  "stat-sm": "text-lg",
};

export type TextVariant = keyof typeof variants;

// Colour: the greys from strongest to faintest, then the status text roles.
// Unset inherits the parent's colour.
const tones = {
  strong: "text-strong",
  body: "text-body",
  muted: "text-muted",
  faint: "text-faint",
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

export type TextTone = keyof typeof tones;

/**
 * Any text that isn't a heading. `variant` names what the text is and how
 * big; `tone` sets its colour (unset inherits). `className` is layout and
 * sizing only (see src/components/CLAUDE.md). It can wrap a block
 * of copy as well as a line: `<Text as="div">` around a `<Stack>`. Inside
 * it, bold, italic and code keep its size: `font-medium`, `italic`, `<code>`.
 */
export default function Text({
  variant = "body-md",
  tone,
  as: Tag = "span",
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  variant?: TextVariant;
  tone?: TextTone;
  as?: "span" | "p" | "div" | "dt" | "dd" | "pre" | "ul" | "kbd";
}) {
  return <Tag {...rest} data-ui="text" data-variant={variant} className={cn(variants[variant], tone && tones[tone], className)} />;
}
