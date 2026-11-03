import {
  Menu as HeadlessMenu,
  MenuButton,
  MenuHeading as HeadlessMenuHeading,
  MenuItem as HeadlessMenuItem,
  MenuItems,
  MenuSection as HeadlessMenuSection,
  MenuSeparator,
} from "@headlessui/react";
import { Fragment, type MouseEvent, type ReactNode } from "react";
import { Link } from "../../routing/router";
import { cn } from "../../utils/cn";
import { floatingPanelClasses, type FloatingAlign, type PanelProps } from "./floating";
import Text from "./Text";
import Heading from "./Heading";

interface MenuProps {
  /**
   * The element that opens the menu. A single element that accepts a ref
   * and spreads its props, as Button and IconButton do.
   */
  trigger: ReactNode;
  /** Which edge of the trigger the menu lines up with. */
  align?: FloatingAlign | undefined;
  /** Width class for the menu, e.g. `w-56`. */
  className?: string | undefined;
  /** Extra attributes for the open panel, e.g. `data-annotation`. The panel is portalled, so it doesn't inherit its trigger's. */
  panelProps?: PanelProps;
  /** Whether the rest of the page goes inert while the menu is open. Off for chrome such as the account menu, which Lightning left interactive. */
  modal?: boolean;
  children: ReactNode;
}

/**
 * A dropdown list of actions or choices, opened from a trigger. Keyboard
 * navigation, typeahead and closing on select or click-away come with it.
 */
export default function Menu({ trigger, align = "end", className = "w-56", panelProps, modal = true, children }: MenuProps) {
  return (
    <HeadlessMenu>
      <MenuButton as={Fragment}>{trigger}</MenuButton>
      <MenuItems
        anchor={{ to: `bottom ${align}`, gap: 8 }}
        modal={modal}
        transition
        data-ui="menu"
        {...panelProps}
        className={cn(floatingPanelClasses, "py-1", className)}
      >
        {children}
      </MenuItems>
    </HeadlessMenu>
  );
}

interface MenuItemProps {
  /** Hero icon class shown before the label. */
  icon?: string;
  /** In-app route. */
  to?: string;
  /** External link. */
  href?: string;
  onClick?: (e: MouseEvent) => void;
  /** Marks the current choice with a check. */
  selected?: boolean;
  tone?: "danger" | undefined;
  disabled?: boolean | undefined;
  /** A muted line under the label. */
  description?: ReactNode;
  children: ReactNode;
}

/** One row of a Menu: a button, router link or external link. */
export function MenuItem({ icon, to, href, onClick, selected, tone, disabled = false, description, children }: MenuItemProps) {
  const className = cn(
    "group flex w-full items-start gap-x-3 px-4 py-2 text-left text-sm cursor-pointer",
    "data-focus:bg-hover data-focus:outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
     
    tone === "danger" ? "text-danger" : "text-body data-focus:text-strong"
  );
  const content = (
    <>
      {icon && <span className={cn(icon, "mt-0.5 h-4 w-4 shrink-0", tone === "danger" ? "text-danger-icon" : "text-faint")} />}
      <span className="min-w-0 flex-1">
        <span className={cn("block", selected && "font-medium text-strong")}>{children}</span>
        {description && <Text variant="body-sm" className="mt-0.5 block text-muted">{description}</Text>}
      </span>
      {selected && <span className="hero-check mt-0.5 h-4 w-4 shrink-0 text-selected" />}
    </>
  );

  if (to && !disabled) {
    return (
      <HeadlessMenuItem as={Link} to={to} className={className} onClick={onClick}>
        {content}
      </HeadlessMenuItem>
    );
  }
  if (href && !disabled) {
    return (
      <HeadlessMenuItem as="a" href={href} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
        {content}
      </HeadlessMenuItem>
    );
  }
  return (
    <HeadlessMenuItem as="button" type="button" disabled={disabled} className={className} onClick={onClick}>
      {content}
    </HeadlessMenuItem>
  );
}

/**
 * An inline link inside other menu content, e.g. a notice's "Turn off in
 * your profile". A menu item, so the arrow keys reach it and a click closes
 * the menu; it takes its colour from the text around it.
 */
export function MenuLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <HeadlessMenuItem
      as={Link}
      to={to}
      className="font-medium underline underline-offset-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-focus"
    >
      {children}
    </HeadlessMenuItem>
  );
}

/** A labelled group of items. */
export function MenuSection({ heading, children }: { heading?: ReactNode; children: ReactNode }) {
  return (
    <HeadlessMenuSection>
      {heading && (
        <HeadlessMenuHeading as={Fragment}>
          <Heading size="xs" as="div" className="px-4 pb-1 pt-2">
            {heading}
          </Heading>
        </HeadlessMenuHeading>
      )}
      {children}
    </HeadlessMenuSection>
  );
}

/** Non-interactive content at the top of a menu, e.g. who's signed in. */
export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3 text-sm">{children}</div>;
}

export function MenuDivider() {
  return <MenuSeparator className="my-1 h-px bg-emphasis" />;
}
