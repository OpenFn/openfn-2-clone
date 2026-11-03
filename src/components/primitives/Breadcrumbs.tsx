import type { ReactNode } from "react";
import { Link } from "../../routing/router";

/**
 * Breadcrumb trail for the page header (Lightning's `breadcrumbs`,
 * `breadcrumb_items` and `breadcrumb`). Separators show between crumbs only.
 */
export function Breadcrumbs({ children }: { children: ReactNode }) {
  return (
    <nav className="flex" aria-label="Breadcrumbs" data-ui="breadcrumbs">
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops list semantics when list-style is none; the role puts them back */}
      <ol
        role="list"
        className="flex items-center space-x-2 [&>li.breadcrumb-item_.breadcrumb-separator]:hidden [&>li+li.breadcrumb-item_.breadcrumb-separator]:flex"
      >
        {children}
      </ol>
    </nav>
  );
}

export function Breadcrumb({ to, children }: { to?: string; children: ReactNode }) {
  return (
    <li className="breadcrumb-item">
      <div className="flex items-center">
        <span className="hero-chevron-right breadcrumb-separator mr-1 h-5 w-5 shrink-0 text-faint" />
        {to ? (
          <Link to={to} className="ml-1 flex text-sm font-medium text-muted hover:text-body">
            {children}
          </Link>
        ) : (
          <span className="ml-1 flex items-center text-sm font-medium text-muted">{children}</span>
        )}
      </div>
    </li>
  );
}

/** Wraps a picker button as the first crumb (`breadcrumb_project_picker`). */
export function BreadcrumbPicker({ children }: { children: ReactNode }) {
  return <li className="mr-2">{children}</li>;
}
