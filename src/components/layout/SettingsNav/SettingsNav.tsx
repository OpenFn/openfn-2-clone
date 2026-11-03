import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import type { Icon } from "@/components/ui/icons";

/** The side menu of a settings page. Holds `SettingsNavItem`s. */
export function SettingsNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="w-full shrink-0 md:w-48">
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </nav>
  );
}

type SettingsNavItemProps = {
  icon: Icon;
  children: string;
  /** Leave out for a section that isn't there yet: it shows, greyed, and can't be followed. */
  href?: string;
  /** The page you're on. */
  current?: boolean;
};

export function SettingsNavItem({ icon: Icon, children, href, current }: SettingsNavItemProps) {
  const look = cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
    current ? "bg-selected text-selected" : href ? "text-body hover:bg-hover hover:text-strong" : "text-disabled",
  );
  const content = (
    <>
      <Icon size={14} aria-hidden className={current ? "text-selected" : undefined} />
      {children}
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} aria-current={current ? "page" : undefined} className={cn(look, "focus-visible:outline-2 focus-visible:outline-focus")}>
          {content}
        </a>
      ) : (
        // A link with no href: still read out in the list, never focused or followed.
        <a aria-disabled="true" className={look}>
          {content}
        </a>
      )}
    </li>
  );
}
