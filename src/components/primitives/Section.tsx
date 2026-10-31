import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import SectionHeader from "./SectionHeader";

interface Props {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action, usually a Button. */
  action?: ReactNode;
  /** The heading's size; see `SectionHeader`. */
  size?: "lg" | "md" | "sm";
  /** `eyebrow`: a small uppercase label with a rule under it, for groups of facts inside a card. */
  variant?: "default" | "eyebrow";
  permissionsSection?: string | undefined;
  id?: string | undefined;
  /** Layout and sizing only. */
  className?: string | undefined;
  children: ReactNode;
}

/**
 * A titled block: a `SectionHeader`, then its body. It owns the gaps, between
 * the header and the body and between the body's children: 16px (Card's) for
 * `lg` and `md`, 8px for `sm` and `eyebrow`. Use a bare `SectionHeader` only
 * when there's no body or the parent already owns the gap.
 */
export default function Section({
  title,
  description,
  action,
  size = "md",
  variant = "default",
  permissionsSection,
  id,
  className,
  children,
}: Props) {
  const tight = size === "sm" || variant === "eyebrow";
  return (
    <section id={id} data-ui="section" className={cn(tight ? "space-y-2" : "space-y-4", className)}>
      <SectionHeader
        title={title}
        subtitle={description}
        action={action}
        size={size}
        variant={variant}
        permissionsSection={permissionsSection}
      />
      {children}
    </section>
  );
}
