import type { ReactNode } from "react";
import { Link } from "../../routing/router";
import type { PageInfo } from "../../types/lists";
import { cn } from "../../utils/cn";
import { useUrlParams } from "../../utils/useUrlParams";
import Text from "./Text";

interface Props {
  /** The page shown, as the server paged it. Each page links to this URL with `?page=` changed. */
  page: PageInfo;
  /** Extra controls after the count, e.g. the export button on History. */
  actions?: ReactNode;
}

const edge =
  "relative inline-flex items-center px-2 py-2 border border-strong bg-surface text-sm font-medium text-muted hover:bg-hover";
const box = "relative inline-flex items-center px-4 py-2 border text-sm font-medium";

/**
 * The page numbers to show, as Lightning's `raw_pagination_links` picks them:
 * up to `distance` either side of the current page, then the first and last
 * page, with an ellipsis where pages are skipped.
 */
function pageWindow(current: number, totalPages: number, distance = 5): (number | "…")[] {
  const from = Math.max(1, current - distance);
  const to = Math.min(totalPages, current + distance);
  const numbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return [
    ...(from > 1 ? [1] : []),
    ...(from > 2 ? ["…" as const] : []),
    ...numbers,
    ...(to < totalPages - 1 ? ["…" as const] : []),
    ...(to < totalPages ? [totalPages] : []),
  ];
}

/** Footer bar for paginated tables (Lightning's `Pagination.pagination_bar`). */
export default function Pagination({ page, actions }: Props) {
  const { href } = useUrlParams();
  const { number, size, totalEntries } = page;
  const totalPages = Math.max(1, Math.ceil(totalEntries / size));
  const from = number * size - size + 1;
  const to = Math.min(number * size, totalEntries);
  const pageHref = (n: number) => href({ page: n > 1 ? String(n) : null });

  return (
    <div data-ui="pagination" className="bg-surface px-4 py-3 flex items-center justify-between sm:px-6 rounded-b-lg">
      <div className="flex items-center space-x-4">
        <Text as="p" className="text-body">
          {totalEntries === 0 ? (
            "No results found"
          ) : (
            <>
              Showing <span className="font-medium">{from}</span> to <span className="font-medium">{to}</span> of{" "}
              <span className="font-medium">{totalEntries}</span> total results
            </>
          )}
        </Text>
        {actions && <div className="flex items-center">{actions}</div>}
      </div>
      <nav className="relative z-0 inline-flex rounded-md shadow-xs -space-x-px" aria-label="Pagination">
        {number > 1 && (
          <Link to={pageHref(number - 1)} className={cn(edge, "rounded-l-md")}>
            <span className="sr-only">Previous</span>
            <span className="hero-chevron-left h-5 w-5" />
          </Link>
        )}
        {pageWindow(number, totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className={cn(box, "bg-surface border-strong text-muted")}>
              …
            </span>
          ) : (
            <Link
              key={n}
              to={pageHref(n)}
              aria-current={n === number ? "page" : undefined}
              data-ui="pagination-page"
              className={cn(
                box,
                n === number
                  ? "z-10 bg-selected border-selected text-selected"
                  : "bg-surface border-strong text-muted hover:bg-hover"
              )}
            >
              {n}
            </Link>
          )
        )}
        {number < totalPages && (
          <Link to={pageHref(number + 1)} className={cn(edge, "rounded-r-md")}>
            <span className="sr-only">Next</span>
            <span className="hero-chevron-right h-5 w-5" />
          </Link>
        )}
      </nav>
    </div>
  );
}
