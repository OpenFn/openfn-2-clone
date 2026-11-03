import type { ReactNode } from "react";

type SectionHeadingProps = {
  title: string;
  description?: string;
  /** The section's main action, on the right. */
  action?: ReactNode;
};

/** The top of a section of a page: its title, what it's for, and its main action. */
export function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg font-semibold text-strong">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
