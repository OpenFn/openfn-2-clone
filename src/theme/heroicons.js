// Heroicons as `hero-*` classes, as Lightning has them: <span className="hero-trash size-4" />.
// hero-<name> is the 24px outline, hero-<name>-mini the 20px solid.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import plugin from "tailwindcss/plugin";

const iconsDir = path.dirname(createRequire(import.meta.url).resolve("heroicons/package.json"));
const sets = [
  ["", "24/outline"],
  ["-mini", "20/solid"],
];

const values = {};
for (const [suffix, dir] of sets) {
  for (const file of fs.readdirSync(path.join(iconsDir, dir))) {
    values[path.basename(file, ".svg") + suffix] = path.join(iconsDir, dir, file);
  }
}

export default plugin(({ matchComponents }) => {
  matchComponents(
    {
      hero: (file) => {
        const svg = fs.readFileSync(file, "utf8").replace(/\r?\n|\r/g, "");
        const mask = `url('data:image/svg+xml;utf8,${svg}') no-repeat center / contain`;
        return { mask, "-webkit-mask": mask, "background-color": "currentColor", display: "inline-block", "flex-shrink": "0" };
      },
    },
    { values },
  );
});
