import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEMES } from "./themes";

// A dark theme can't fall back on the light defaults in tokens.css, so it
// has to give every colour role a value of its own (docs/colour.md).
const tokens = readFileSync(join(process.cwd(), "src/theme/tokens.css"), "utf8");
const theme = readFileSync(join(process.cwd(), "src/theme/theme.css"), "utf8");
const roles = [...tokens.matchAll(/^\s*(--(?:text|background|border|ring|outline)-color-[\w-]+):/gm)].map((m) => m[1]!);

/** Every declaration made in the theme's own blocks (`html[data-theme="id"] { … }`). */
function declared(id: string) {
  const names = new Set<string>();
  for (const m of theme.matchAll(new RegExp(`html\\[data-theme="${id}"\\][^{]*\\{([^}]*)\\}`, "g")))
    for (const d of m[1]!.matchAll(/(--[\w-]+)\s*:/g)) names.add(d[1]!);
  return names;
}

describe("dark themes", () => {
  it.each(THEMES.filter((t) => t.mode === "dark").map((t) => t.id))("%s sets every colour role", (id) => {
    const set = declared(id);
    expect(roles.filter((r) => !set.has(r))).toEqual([]);
  });
});
