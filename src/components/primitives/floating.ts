/** Which edge of the trigger a floating panel lines up with. */
export type FloatingAlign = "start" | "end";

/**
 * The white card Menus and Popovers open as, with a short fade. It stacks
 * above the sidebar (z-100) and modals (z-200), so menus work inside both.
 */
export const floatingPanelClasses =
  "z-300 rounded-md bg-surface shadow-lg ring-1 ring-floating focus:outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0";

/** Attributes a caller can put on a Menu or Popover panel: an id, or `data-*` hooks such as `data-annotation`. */
export type PanelProps = { id?: string } & { [key: `data-${string}`]: string | undefined };
