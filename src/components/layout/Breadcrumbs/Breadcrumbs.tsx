import { Fragment } from "react";
import { ChevronRight, House } from "@/components/ui/icons";

export type Crumb = { label: string; href: string };

type BreadcrumbsProps = {
  /** From the top down, after Home. */
  trail: Crumb[];
  /** This page. */
  current: string;
};

/** Where this page sits (the ARIA breadcrumb pattern): Home, the pages above it, then this page. */
export function Breadcrumbs({ trail, current }: BreadcrumbsProps) {
  const separator = <ChevronRight size={14} aria-hidden className="text-muted" />;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <li className="flex">
          <a href="/" className="rounded-md hover:text-strong focus-visible:outline-2 focus-visible:outline-focus">
            <House size={14} aria-label="Home" />
          </a>
        </li>
        {trail.map((crumb) => (
          <Fragment key={crumb.href}>
            <li className="flex" aria-hidden>
              {separator}
            </li>
            <li>
              <a href={crumb.href} className="rounded-md hover:text-strong focus-visible:outline-2 focus-visible:outline-focus">
                {crumb.label}
              </a>
            </li>
          </Fragment>
        ))}
        <li className="flex" aria-hidden>
          {separator}
        </li>
        <li aria-current="page" className="font-medium text-strong">
          {current}
        </li>
      </ol>
    </nav>
  );
}
