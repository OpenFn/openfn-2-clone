import type { ReactNode } from "react";
import { Link } from "../../routing/router";
import { cn } from "../../utils/cn";
import Tooltip from "../primitives/Tooltip";

interface Props {
  /** In-app route. */
  to?: string | undefined;
  /** External link (docs, community, mailto). Opens in a new tab unless `target` says otherwise. */
  href?: string;
  target?: string;
  /** Hero icon class, e.g. `hero-folder`. */
  icon: string;
  label: string;
  active?: boolean;
  /** Shown beside the label on hover, e.g. the address a mailto link sends to. */
  tooltip?: string;
}

/**
 * One link in the sidebar (Lightning's `Menu.menu_item`): h-10, rounded-lg,
 * text-sm font-medium, primary-300 text with primary-900 behind the active row.
 */
export default function NavItem({ to, href, target = "_blank", icon, label, active = false, tooltip }: Props) {
  const className = cn(
    // eslint-disable-next-line no-restricted-syntax -- a control that owns its type: the sidebar link, as Lightning's menu_item
    "menu-item mx-3 mb-1 flex h-10 items-center rounded-lg text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2",
    active ? "menu-item-active" : "menu-item-inactive"
  );
  const content: ReactNode = (
    <>
      <span className={cn(icon, "h-5 w-5")} />
      <Tooltip content={tooltip} side="right">
        <span className="menu-item-text truncate">{label}</span>
      </Tooltip>
    </>
  );

  return href ? (
    <a href={href} target={target} rel="noreferrer" className={className} aria-label={label} data-ui="nav-link">
      {content}
    </a>
  ) : (
    <Link to={to ?? "#"} className={className} aria-current={active ? "page" : undefined} aria-label={label} data-ui="nav-link">
      {content}
    </Link>
  );
}
