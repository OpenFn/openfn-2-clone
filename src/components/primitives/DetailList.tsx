import { createContext, useContext, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import Heading from "./Heading";
import Text from "./Text";

type Layout = "rows" | "grid";
const LayoutContext = createContext<Layout>("rows");

/**
 * Labelled values. `rows` (default) is a divided list with the label left
 * and the value right (run_live `detail_list`); `grid` puts small uppercase
 * labels above their values in columns. `size="sm"` sets the rows in
 * 12px, for dense lists such as HTTP headers.
 */
export function DetailList({
  layout = "rows",
  size = "md",
  id,
  className,
  children,
}: {
  layout?: Layout;
  size?: "sm" | "md";
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <LayoutContext.Provider value={layout}>
      <dl
        id={id}
        className={cn(
          size === "sm" ? "text-xs" : "text-sm",
          layout === "rows" ? "divide-y divide-subtle" : "grid grid-cols-2 gap-4 md:grid-cols-4",
          className
        )}
      >
        {children}
      </dl>
    </LayoutContext.Provider>
  );
}

/** One label and its value. `variant="code"` sets the value in the code font. */
export function DetailItem({
  label,
  variant = "text",
  className,
  children,
}: {
  label: ReactNode;
  variant?: "text" | "code";
  className?: string;
  children?: ReactNode;
}) {
  const layout = useContext(LayoutContext);
  if (layout === "grid") {
    return (
      <div className={className}>
        <Heading size="xs" as="dt">{label}</Heading>
        <Value code={variant === "code"} className="mt-1 wrap-break-word text-strong">{children}</Value>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2", className)}>
      <dt className="min-w-0 wrap-break-word font-medium text-muted">{label}</dt>
      <Value code={variant === "code"} className="min-w-0 wrap-break-word text-right text-strong">{children}</Value>
    </div>
  );
}

// A plain value takes the list's size; a code one is always code-sm.
function Value({ code, className, children }: { code: boolean; className: string; children?: ReactNode }) {
  if (code) return <Text as="dd" variant="code-sm" className={className}>{children}</Text>;
  return <dd className={className}>{children}</dd>;
}
