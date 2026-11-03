import type { ReactNode } from "react";
import type { Icon } from "@/components/ui/icons";

type EmptyStateProps = {
  icon?: Icon;
  title: string;
  description?: string;
  /** What to do about it, usually one Button. */
  action?: ReactNode;
};

/** A list with nothing in it yet. Never for a list that failed to load: that's a danger Callout. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-strong bg-subtle p-8 text-center">
      {Icon && <Icon size={24} aria-hidden className="mb-1 text-muted" />}
      <p className="text-sm font-medium text-strong">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
