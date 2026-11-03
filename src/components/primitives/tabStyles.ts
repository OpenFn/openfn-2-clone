/**
 * The look of `Tabs`, shared with `SegmentedControl` so a pill switch looks
 * the same whether it swaps panels or picks a value.
 */
export const tabStyles = {
  base: "inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  disabled: "cursor-not-allowed opacity-50 hover:border-transparent hover:bg-transparent hover:text-muted",
  line: {
    list: "gap-4",
    tab: "border-b-2 px-1 py-2 text-sm font-medium leading-tight",
    selected: "border-selected text-selected",
    idle: "border-transparent text-muted hover:border-strong hover:text-body",
  },
  pill: {
    list: "gap-1 rounded-lg bg-sunken p-1",
    tab: "rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
    selected: "bg-surface text-selected shadow-xs",
    idle: "text-muted hover:bg-hover hover:text-body",
  },
};
