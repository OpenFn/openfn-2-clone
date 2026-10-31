import type { MouseEvent, ReactNode, TdHTMLAttributes } from "react";
import { Link } from "../../routing/router";
import { cn } from "../../utils/cn";
import EmptyState from "./EmptyState";

/**
 * Lightning's table components (components/table.ex): a ringed, rounded
 * card with a gray-50 header row and white body. Compose with Tr / Th / Td.
 */
export function Table({
  header,
  children,
  footer,
  variant = "divided",
  id,
  state = "ready",
  loadingMessage = "Loading ...",
  errorMessage = "There was an error loading the data",
}: {
  header: ReactNode;
  children: ReactNode;
  /** Rendered under the table, e.g. a Pagination bar. */
  footer?: ReactNode;
  /** `divided` rules a line between rows; `plain` leaves them open. */
  variant?: "divided" | "plain";
  id?: string;
  /** While a server-driven list loads or after it fails, the body is a message instead of `children` (STANDARDS pattern 3). */
  state?: "loading" | "error" | "ready";
  loadingMessage?: string;
  errorMessage?: string;
}) {
  const divide = variant === "divided";
  return (
    <div id={id} data-ui="table" className="shadow ring-1 ring-black/5 sm:rounded-lg bg-subtle">
      <table className={cn("min-w-full", divide && "divide-y divide-subtle")}>
        <thead>{header}</thead>
        {state === "ready" && <tbody className={cn("bg-surface", divide && "divide-y divide-subtle")}>{children}</tbody>}
      </table>
      {state !== "ready" && (
        <div role={state === "error" ? "alert" : undefined}>
          <EmptyState
            variant="plain"
            loading={state === "loading"}
            message={state === "loading" ? loadingMessage : errorMessage}
            className={cn("bg-surface", divide && "border-t border-subtle")}
          />
        </div>
      )}
      {footer && <div className={cn(divide && "border-t border-subtle")}>{footer}</div>}
    </div>
  );
}

/** True when a click landed on a link, button or input inside the row, which handles it itself. */
function clickedControl(e: MouseEvent<HTMLElement>) {
  const control = (e.target as HTMLElement).closest("a, button, input, select, textarea, label, [role=switch]");
  return control !== null && e.currentTarget.contains(control);
}

/** A clickable row's link, in its first cell (D303): Tab reaches it, Enter opens it, and a click anywhere else on the row follows it. */
export function RowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} data-row-action="">
      {children}
    </Link>
  );
}

/** An expandable row's chevron, as a button: Enter or Space toggles it, and a click anywhere else on the row does too. */
export function RowToggle({ expanded, onToggle, label }: { expanded: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      data-row-action=""
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
      className="flex"
    >
      <span aria-hidden="true" className={cn(expanded ? "hero-chevron-up" : "hero-chevron-down", "size-4 text-faint")} />
    </button>
  );
}

/**
 * A row. A row holding a `RowLink` or `RowToggle` is clickable: a click on the row clicks it,
 * so the keyboard path and the mouse path are the same control. Links and buttons inside the row still do their own thing.
 */
export function Tr({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <tr
      id={id}
      onClick={(e) => {
        if (!clickedControl(e)) e.currentTarget.querySelector<HTMLElement>("[data-row-action]")?.click();
      }}
      className={cn(
        "transition-colors duration-150",
        "has-[td]:hover:bg-hover",
        "has-data-row-action:cursor-pointer",
        "last:rounded-b-lg",
        "[&>td:first-child]:py-4 [&>td:first-child]:pr-3 [&>td:first-child]:pl-4 [&>td:first-child]:sm:pl-6",
        "[&>th:first-child]:py-3.5 [&>th:first-child]:pr-3 [&>th:first-child]:pl-4 [&>th:first-child]:sm:pl-6",
        "[&>td:not(:first-child):not(:last-child)]:px-3 [&>td:not(:first-child):not(:last-child)]:py-4",
        "[&>th:not(:first-child):not(:last-child)]:px-3 [&>th:not(:first-child):not(:last-child)]:py-3.5",
        "[&>td:last-child]:relative [&>td:last-child]:py-4 [&>td:last-child]:pr-4 [&>td:last-child]:pl-3 [&>td:last-child]:sm:pr-6",
        "[&>th:last-child]:relative [&>th:last-child]:py-3.5 [&>th:last-child]:pr-4 [&>th:last-child]:pl-3 [&>th:last-child]:sm:pr-6",
        className
      )}
    >
      {children}
    </tr>
  );
}

export type CellAlign = "left" | "center" | "right";

const alignClasses: Record<CellAlign, string> = { left: "text-left", center: "text-center", right: "text-right" };

export function Th({
  children,
  className,
  colSpan,
  sortDirection,
  onSort,
  sortHref,
  align = "left",
  actions = false,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  /** When set the header is sortable; "asc" / "desc" marks the active column. */
  sortDirection?: "asc" | "desc" | null;
  /** Sorts a fully loaded list in the browser. */
  onSort?: () => void;
  /** Re-sorts a server-sorted list: the sort control links to this URL instead of calling `onSort`. */
  sortHref?: string | undefined;
  align?: CellAlign;
  /** The row-actions column. With no children the header reads "Actions" to screen readers only. */
  actions?: boolean;
}) {
  if (actions && children === undefined) children = <span className="sr-only">Actions</span>;
  const sortContent = (
    <>
      {children}
      <span
        className={cn(
          "ml-2 flex-none rounded-sm",
          sortDirection ? "bg-sunken text-strong group-hover:bg-emphasis" : "invisible text-faint group-hover:visible"
        )}
      >
        <span className={cn(sortDirection === "asc" ? "hero-chevron-up" : "hero-chevron-down", "h-5 w-5")} />
      </span>
    </>
  );
  return (
    <th
      scope="col"
      colSpan={colSpan}
      className={cn("text-sm font-semibold text-strong select-none whitespace-nowrap", alignClasses[align], className)}
    >
      {sortHref ? (
        <Link to={sortHref} className="group inline-flex items-center">
          {sortContent}
        </Link>
      ) : onSort ? (
        <button type="button" onClick={onSort} className="group inline-flex items-center">
          {sortContent}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

// Static so Tailwind sees each class: the widths cells use today.
const maxWidthClasses = {
  40: "max-w-40",
  48: "max-w-48",
  60: "max-w-60",
  64: "max-w-64",
  72: "max-w-72",
  80: "max-w-80",
  100: "max-w-100",
};

export function Td({
  children,
  className,
  align,
  actions = false,
  wrap = false,
  maxWidth,
  ...rest
}: Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> & {
  children?: ReactNode;
  align?: CellAlign;
  /** A row's action buttons: one right-aligned row with even gaps. */
  actions?: boolean;
  /** Long words (names, emails, URLs) break onto the next line. */
  wrap?: boolean;
  /** A max-width in Tailwind spacing units (60 = 15rem). Auto table layout ignores it while the table has room (F530). */
  maxWidth?: keyof typeof maxWidthClasses;
}) {
  return (
    <td
      className={cn(
        "text-sm text-muted first:rounded-bl-lg last:rounded-br-lg",
        align && alignClasses[align],
        wrap && "wrap-break-word",
        maxWidth && maxWidthClasses[maxWidth],
        className,
      )}
      {...rest}
    >
      {actions ? <div className="flex items-center justify-end gap-2">{children}</div> : children}
    </td>
  );
}
