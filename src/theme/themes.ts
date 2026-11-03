/**
 * Theme registry for the theme switcher (the settings button, and the
 * Storybook toolbar).
 *
 * Each entry is pure metadata used to render the switcher. The actual
 * visual transformation lives entirely in `theme.css`, keyed by the
 * matching `data-theme` value on the <html> element. Adding a theme is
 * therefore two steps: a token block in `theme.css` and an entry here.
 */

export type ThemeId = "lightning-v2" | "light" | "dark" | "gds";

export interface ThemeMeta {
  id: ThemeId;
  /** Display name shown in the picker. */
  name: string;
  /** One-line description of the look and feel. */
  description: string;
  /** Light or dark, used for the picker's mode dot. */
  mode: "light" | "dark";
  /** Representative colors (hex) rendered as swatches in the picker. */
  swatches: string[];
}

export const THEMES: ThemeMeta[] = [
  {
    id: "lightning-v2",
    name: "Lightning v2",
    description: "Today's Lightning app: deep indigo sidebar, Inter, white header bar on light gray.",
    mode: "light",
    swatches: ["#3730a3", "#4f46e5", "#111827", "#f3f4f6"],
  },
  {
    id: "light",
    name: "Light",
    description: "Airy and quiet, like Stripe: Geist, a white page, hairlines, soft shadows and a blurple accent.",
    mode: "light",
    swatches: ["#635bff", "#1a1b25", "#6c7688", "#f7f8fa"],
  },
  {
    id: "dark",
    name: "Dark",
    description: "Light after dark: slate charcoal like Linear and GitHub dimmed, a glass header and an indigo that glows.",
    mode: "dark",
    swatches: ["#5e6ad2", "#f3f4f6", "#9aa1b0", "#1b1e24"],
  },
  {
    id: "gds",
    name: "GDS",
    description: "GOV.UK design system: a plain white page, functional colour, square and flat, underlined links.",
    mode: "light",
    swatches: ["#1d70b8", "#0f7a52", "#0b0c0c", "#ffdd00"],
  },
];

/** The theme applied when nothing is stored: today's Lightning. */
export const DEFAULT_THEME_ID: ThemeId = "lightning-v2";

/** localStorage key the chosen theme is persisted under. */
export const THEME_STORAGE_KEY = "openfn-lightning-theme";

export const THEME_IDS = THEMES.map((t) => t.id);

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}
