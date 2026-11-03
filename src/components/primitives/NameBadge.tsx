import type { ReactNode } from "react";
import Text from "./Text";

/**
 * "Your project will be named `my-project`." (Lightning's `name_badge`,
 * components/pills.ex): the slugified name in a yellow mono chip. Renders
 * nothing while the name is empty.
 */
export default function NameBadge({ name, children }: { name: string; children?: ReactNode }) {
  if (name === "") return null;
  return (
    <span data-ui="name-badge">
      {children}
      <Text variant="code-sm" className="ml-1 rounded-md border border-strong bg-warning-badge p-1">{name}</Text>.
    </span>
  );
}
