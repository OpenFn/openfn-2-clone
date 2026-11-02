// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Every lint rule we write is proved here: a snippet with the mistake it
// exists to catch must fail with its message, and the right way must pass.
// A rule with no case here may be matching nothing (.claude/rules/lint.md).
const eslint = new ESLint({ cwd: process.cwd() });

/** The messages ESLint gives `code` as if it were the file at `path` (an existing file, which typed linting needs; its contents on disk are not read). */
async function lint(code: string, path = "src/components/history/WorkOrdersTable.tsx") {
  const [result] = await eslint.lintText(code, { filePath: path });
  return result!.messages.map((m) => m.message);
}

const component = (jsx: string, imports = "") =>
  `${imports}\nexport default function Example() {\n  return ${jsx};\n}\n`;
const table = 'import { Td } from "../primitives/Table";';
const text = 'import Text from "../primitives/Text";';
const card = 'import Card from "../primitives/Card";';

const cases: { rule: string; bad: string; good: string; message: RegExp; path?: string }[] = [
  {
    rule: "native title tooltip",
    bad: component('<span title="Full name">Name</span>'),
    good: component('<Card title="Settings">x</Card>', card),
    message: /Native title tooltip/,
  },
  {
    rule: "hand-made cell truncation (F530)",
    bad: component('<Td maxWidth={60} className="truncate">x</Td>', table),
    good: component("<Td truncate maxWidth={60}>x</Td>", table),
    message: /Truncate a cell with `<Td truncate/,
  },
  {
    rule: "status shade (D301)",
    bad: component('<span className="text-danger-700">x</span>'),
    good: component('<span className="text-danger">x</span>'),
    message: /Status shade/,
  },
  {
    rule: "raw palette colour",
    bad: component('<span className="text-red-600">x</span>'),
    good: component('<span className="text-danger">x</span>'),
    message: /Raw status colour/,
  },
  {
    rule: "look boolean (D300)",
    bad: component("<Card muted>x</Card>", card),
    good: component('<Card variant="muted">x</Card>', card),
    message: /A look is one `variant`/,
  },
  {
    rule: "primitive className is layout and sizing only (D299)",
    bad: component('<Text className="text-muted">x</Text>', text),
    good: component('<Text tone="muted" className="truncate">x</Text>', text),
    message: /className on a primitive is layout and sizing only/,
  },
  {
    rule: "arbitrary Tailwind value",
    bad: component('<span className="w-[13px]">x</span>'),
    good: component('<span className="w-3">x</span>'),
    message: /Arbitrary Tailwind value/,
  },
  {
    rule: "a plain column or line is Stack or Row (D312)",
    bad: component('<div className="flex items-center justify-between gap-2">x</div>'),
    good: component('<div className="flex flex-col gap-4 p-2">x</div>'),
    message: /Plain column or line/,
  },
  {
    rule: "data seam: no mock data in a component",
    bad: 'import { projects } from "../../mock-data/projects";\nexport const n = projects.length;\n',
    good: 'import type { ProjectRow } from "../../types/projects";\nexport const n = (p: ProjectRow[]) => p.length;\n',
    message: /Take data as props/,
  },
];

describe("lint rules catch the mistakes they exist for", () => {
  it.each(cases)("$rule", async ({ bad, good, message, path }) => {
    expect((await lint(bad, path)).some((m) => message.test(m))).toBe(true);
    expect((await lint(good, path)).filter((m) => message.test(m))).toEqual([]);
  }, 30_000);
});
