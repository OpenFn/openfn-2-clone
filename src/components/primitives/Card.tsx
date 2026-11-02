import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import SectionHeader from "./SectionHeader";

export type CardVariant = "default" | "muted" | "dashed";

export type CardPadding = "none" | "sm" | "md" | "lg";

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

interface Props extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** With a title, description or action, the card opens with a SectionHeader. */
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: CardPadding;
  /**
   * `muted`: gray-50 fill, for a panel nested inside a white one.
   * `dashed`: dashed outline, for drop zones and placeholders.
   */
  variant?: CardVariant;
  /** `button` makes the whole card one click target (option tiles, list choices). */
  as?: "div" | "section" | "ul" | "li" | "article" | "button";
  /** Inventory id for the annotations panel (`data-annotation`). */
  annotation?: string;
  id?: string | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * The bordered, rounded panel every grouped block of content sits in:
 * settings sections, detail panels, stat tiles, form cards, list items.
 */
export default function Card({
  title,
  description,
  action,
  padding = "md",
  variant = "default",
  as: Tag = "div",
  annotation,
  id,
  className,
  children,
  ...rest
}: Props) {
  const hasHeader = title || description || action;
  return (
    <Tag
      {...rest}
      {...(Tag === "button" ? { type: "button" as const } : {})}
      id={id}
      data-ui="card"
      data-annotation={annotation}
      className={cn(
        "rounded-lg",
        variant === "dashed" ? "border-2 border-dashed border-strong" : "border border-subtle",
        variant === "muted" && "bg-subtle",
        variant === "default" && "bg-surface shadow-xs",
        paddings[padding],
        hasHeader && "space-y-4",
        Tag === "button" &&
          "block w-full text-left transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className
      )}
    >
      {hasHeader && <SectionHeader title={title} subtitle={description} action={action} />}
      {children}
    </Tag>
  );
}
