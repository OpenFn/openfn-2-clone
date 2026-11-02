import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface Props {
  /** The page title. With breadcrumbs it sits in a row under the bar, with the actions. */
  title?: ReactNode;
  /** Shown after the title: "Workflows (3)". */
  count?: number | undefined;
  breadcrumbs?: ReactNode;
  /** Right-aligned content: buttons, the period picker, etc. */
  children?: ReactNode;
  /** Title size: `xl` for logged-out pages, `md` everywhere else. */
  size?: "md" | "xl";
}

/**
 * The white bar across the top of every page (Lightning's
 * `LayoutComponents.header`): h-20, breadcrumbs or a title on the left,
 * actions on the right. A page inside a project passes breadcrumbs and a
 * title: the bar holds the breadcrumbs, and the title and actions take a row
 * beneath it, so every page names itself the same way.
 */
export default function Header({ title, count, breadcrumbs, children, size = "md" }: Props) {
  // One title for both places, so the two can't drift apart.
  const heading = title && (
    <h1 className={cn("min-w-0 text-strong", size === "xl" ? "text-3xl font-bold" : "text-xl font-semibold")}>
      {title}
      {count !== undefined && (
        <>
          {" "}
          <span className="text-base font-normal">({count})</span>
        </>
      )}
    </h1>
  );

  if (breadcrumbs && title) {
    return (
      <div className="flex-none">
        <div className="bg-surface shadow-xs border-b border-subtle" data-ui="page-header" data-testid="top-bar">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-6 flex items-center h-20">{breadcrumbs}</div>
        </div>
        {/* Part of the page, so themes paint it like the body. The same gutter as the body, so
            the title lines up with the content under it (the gutter needs an overflow). */}
        <div className="bg-page overflow-x-auto [scrollbar-gutter:stable_both-edges]" data-ui="page-title-row">
          {/* One height whatever sits beside the title (nothing, a button, a search box), so the
              title and the content start at the same place on every page. Narrow, the actions
              wrap under the title, and pb-1 keeps their focus rings inside the row. */}
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 pt-4 pb-1 flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {heading}
            {children && <div className="flex min-w-0 items-center gap-2">{children}</div>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-none bg-surface shadow-xs border-b border-subtle" data-ui="page-header" data-testid="top-bar">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-6 flex items-center h-20">
        {breadcrumbs ?? heading}
        <div className="grow" />
        {children}
      </div>
    </div>
  );
}
