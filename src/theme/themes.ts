/** The themes, as `data-theme` on <html>. Each one is a list of role values in this folder. */
export const THEMES = [
  { id: "basic", name: "Basic" },
  { id: "dark", name: "Dark" },
] as const;

export const DEFAULT_THEME = "basic";
