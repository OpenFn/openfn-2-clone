import type { ReactNode } from "react";
import Button from "./Button";
import Menu from "./Menu";

interface Props {
  /** The main action's label. */
  children: ReactNode;
  /** The main action's icon, as Button's `icon`. */
  icon?: ReactNode;
  onClick: () => void;
  /** MenuItems for the chevron's menu. */
  menu: ReactNode;
  /** Screen-reader name of the chevron. */
  menuLabel?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  /** The main action is in flight: both halves are disabled and the main one shows a spinner. */
  pending?: boolean;
  /** Hover text for the main action (often a keyboard shortcut). */
  tooltip?: string | undefined;
}

/**
 * A Button with a chevron that opens a Menu of related actions: the
 * editor's Run / Retry buttons.
 */
export default function SplitButton({ children, icon, onClick, menu, menuLabel = "More options", variant = "primary", disabled = false, pending = false, tooltip }: Props) {
  return (
    <div data-ui="split-button" className="inline-flex rounded-md shadow-xs">
      <Button variant={variant} onClick={onClick} disabled={disabled} pending={pending} tooltip={tooltip} icon={icon} className="rounded-r-none">
        {children}
      </Button>
      <Menu
        align="end"
        className="w-max"
        trigger={
          <Button variant={variant} disabled={disabled || pending} aria-label={menuLabel} className="-ml-px rounded-l-none px-2">
            <span className="hero-chevron-down h-4 w-4" aria-hidden="true" />
          </Button>
        }
      >
        {menu}
      </Menu>
    </div>
  );
}
