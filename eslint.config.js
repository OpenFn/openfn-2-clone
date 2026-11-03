import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import fs from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";

// The area lines from PRINCIPLES.md "Areas" and STRUCTURE.md. ESLint replaces a rule's options
// per matching block rather than merging them, so each block lists every ban that applies to it.

const ban = (regex, message) => ({ regex, message });

const notPages = ban("(^|/)pages(/|$)", "Only app/ imports pages.");
const noClient = ban("(^|/)lib/api(/|$)", "Pages don't fetch: only *.route.tsx imports the API client.");
const noFake = ban("(^|/)fake-api(/|$)", "Only app/ chooses fake-api.");
const noOtherPage = ban("^@/pages/", "Pages don't import each other. Move what two pages share to components/ or lib/.");
const noDeepComponents = ban("components/.+", "Pages import components from components/index.ts only.");
const noLib = ban("(^|/)lib(/|$)", "Components know nothing about data: no lib/.");
const noData = ban("\\.data$", "Components know nothing about data: no *.data.ts.");
const noApp = ban("(^|/)app(/|$)", "Nothing imports the app shell.");
const noUpper = ban("(^|/)(layout|openfn)(/|$)", "ui/ uses nothing above it: no layout/ or openfn/.");
const noComponents = ban("(^|/)components(/|$)", "Data knows nothing about how it's shown: no components/.");
const noReact = ban("^react(-dom)?(/|$)", "lib/ and fake-api/ have no React.");
const noParent = ban("^\\.\\./", "Import across folders with @/ (for example @/components); ./ only within a folder.");

const noIconLibrary = ban("^lucide-react$", "Icons come from @/components/ui/icons, the one file that imports the library.");

const imports = (...patterns) => ["error", { patterns: [noParent, noIconLibrary, ...patterns] }];

// React and component conventions from PRINCIPLES.md. no-restricted-syntax is replaced per block too, so every block that
// sets it spreads these in.
const conventions = [
  { selector: "ExportDefaultDeclaration", message: "Named exports only." },
  { selector: "JSXAttribute[name.name='id'][value.type='Literal']", message: "IDs come from useId(), never written by hand." },
  {
    selector: "JSXAttribute[name.name='key'] > JSXExpressionContainer > Identifier[name=/^(i|idx|index)$/]",
    message: "A key names the thing, never its position in the list.",
  },
  {
    selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
    message: "Join classes with cn(), never by building a string.",
  },
];
const syntax = (...extra) => ["error", ...conventions, ...extra];

// Colour and size: roles only, outside src/theme/ (the colour rules).
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const COLOUR_UTILS = "bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|accent|caret|decoration|placeholder";
// Layout components and the app shell may set sizes: they are the layout that decides.
const FIXED_SIZE = [
  /(^|[\s:])((w|h|min-w|max-w|min-h|max-h)-([1-9]\d*|px)|size-(?![3-6]\b)\d+)\b/,
  "No fixed sizes: layout decides how much space a component gets. Icons use size-3 to size-6.",
];
const styleChecks = [
  [new RegExp(`(^|[\\s:])(${COLOUR_UTILS})-([a-z]-)?(${PALETTE})(-\\d+)?\\b`), "Use a colour role (text-muted, bg-brand), not a palette shade."],
  [/#[0-9a-fA-F]{3,8}\b/, "No hex colours outside src/theme/. Use a colour role."],
  [/(^|[\s:])-?[a-z][a-z0-9-]*-\[[^\]\s]+\]/, "No arbitrary values like text-[13px]. Use the scale, or add a token in src/theme/."],
  [/(^|[\s:])[a-z-]+\/\d+(\s|$)|(^|[\s:])opacity-\d+\b/, "No opacity on colours: a state is its own role."],
  [
    /(^|[\s:])rounded(-[trblse]{1,2})?(-(none|xs|sm|2xl|3xl|4xl))?(?=[\s"'`]|$)/,
    "Corners: rounded-md (controls), rounded-lg (on the page), rounded-xl (above the page), rounded-full (pills).",
  ],
  [/(^|[\s:])-?z-\d+\b/, "Stacking order comes from the named layers in src/theme/ (menu, dialog, tooltip), never a number."],
  [
    /(^|[\s:])-?(p[xytrblse]?|m[xytrblse]?|gap(-[xy])?|space-[xy])-(?!(0\.5|1\.5|0|1|2|3|4|6|8)(?![\w.]))[\d.]+(?![\w.])/,
    "Spacing uses only Tailwind's steps 0, 0.5, 1, 1.5, 2, 3, 4, 6 and 8. Pick the nearest.",
  ],
];
// A colour class must name a role defined in src/theme/roles.css. Tailwind drops a class it doesn't know without a word,
// so a typo or a renamed role would otherwise leave a control with no colour at all.
const ROLE_NAMESPACES = { text: "text-color", bg: "background-color", border: "border-color", divide: "border-color", outline: "outline-color", ring: "ring-color" };
// Re-read whenever roles.css changes, so an editor's long-running lint sees a role added after it started.
const ROLES_FILE = new URL("./src/theme/roles.css", import.meta.url);
let rolesCache = { mtime: -1, set: new Set() };
function currentRoles() {
  const mtime = fs.statSync(ROLES_FILE).mtimeMs;
  if (mtime !== rolesCache.mtime) {
    const css = fs.readFileSync(ROLES_FILE, "utf8");
    rolesCache = { mtime, set: new Set([...css.matchAll(/--([a-z]+-color)-([a-z0-9-]+):/g)].map(([, ns, name]) => `${ns}:${name}`)) };
  }
  return rolesCache.set;
}
// Utilities that share a colour prefix but set something else: size, alignment, width, side, style.
const NOT_COLOUR = {
  text: /^(xs|sm|base|lg|\d?xl|left|center|right|start|end|justify|wrap|nowrap|balance|pretty|ellipsis|clip)$/,
  bg: /^(fixed|local|scroll|none|auto|cover|contain|center|top|bottom|left|right|repeat(-.+)?|no-repeat|clip-.+|origin-.+|linear-.+|radial.*|conic.*|blend-.+)$/,
  border: /^(\d+|[xytblrse](-\d+)?|solid|dashed|dotted|double|none|hidden|collapse|separate|spacing-.+)$/,
  divide: /^([xy](-\d+|-reverse)?|\d+|solid|dashed|dotted|double|none)$/,
  outline: /^(\d+|none|hidden|solid|dashed|dotted|double|offset-\d+)$/,
  ring: /^(\d+|inset|offset-.+)$/,
};
const KEYWORDS = /^(transparent|current|inherit)$/;
function unknownRoles(text) {
  const roles = currentRoles();
  const found = [];
  for (const token of text.split(/\s+/)) {
    const utility = token.split(":").pop().replace(/^[!-]/, "");
    const m = utility.match(/^(text|bg|border|divide|outline|ring)-(.+)$/);
    if (!m || /[[/]/.test(utility)) continue;
    const [, prefix, rest] = m;
    if (NOT_COLOUR[prefix].test(rest) || KEYWORDS.test(rest)) continue;
    const ns = ROLE_NAMESPACES[prefix];
    const sideless = prefix === "border" ? rest.replace(/^[xytblrse]-/, "") : rest;
    if (!roles.has(`${ns}:${rest}`) && !roles.has(`${ns}:${sideless}`)) found.push(token);
  }
  return found;
}

const local = {
  rules: {
    "no-raw-style": {
      meta: { type: "problem", schema: [{ type: "object", properties: { allowSizes: { type: "boolean" } }, additionalProperties: false }] },
      create(context) {
        const checks = context.options[0]?.allowSizes ? styleChecks : [...styleChecks, FIXED_SIZE];
        const check = (node, text) => {
          for (const [regex, message] of checks) if (regex.test(text)) context.report({ node, message });
          for (const token of unknownRoles(text)) context.report({ node, message: `"${token}" isn't a colour role. Use one defined in src/theme/roles.css.` });
        };
        return {
          Literal: (node) => typeof node.value === "string" && check(node, node.value),
          TemplateElement: (node) => check(node, node.value.raw),
        };
      },
    },
  },
};

export default defineConfig([
  globalIgnores(["dist", "storybook-static", "api"]),
  {
    files: ["**/*.{ts,tsx,js}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { local },
  },
  { files: ["*.{js,ts}", "src/theme/*.js"], languageOptions: { globals: globals.node } },

  { files: ["src/**/*.{ts,tsx}"], ignores: ["src/theme/**"], rules: { "local/no-raw-style": "error" } },
  { files: ["src/components/layout/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"], rules: { "local/no-raw-style": ["error", { allowSizes: true }] } },

  // Everywhere in src/: the conventions, @/ imports, and files small enough to read. Stories need a default export.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": imports(),
      "no-restricted-syntax": syntax(),
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  { files: ["src/**/*.stories.tsx"], rules: { "no-restricted-syntax": ["error", ...conventions.slice(1)] } },

  // Pages: take props, fetch nothing, hold no styling. The route fetches; the mappers may name API types.
  {
    files: ["src/pages/**/*.{ts,tsx}"],
    ignores: ["src/pages/**/*.route.tsx", "src/pages/**/*.data.ts"],
    rules: {
      "no-restricted-imports": imports(noClient, noFake, noOtherPage, noDeepComponents, noApp),
      "no-restricted-syntax": syntax({
        selector: "JSXAttribute[name.name=/^(className|style)$/]",
        message: "Pages hold no styling: arrange components, or extend one.",
      }),
    },
  },
  {
    files: ["src/pages/**/*.data.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [noParent, noIconLibrary, { ...noClient, allowTypeImports: true }, noFake, noOtherPage, noApp] }] },
  },
  { files: ["src/pages/**/*.route.tsx"], rules: { "no-restricted-imports": imports(noFake, noOtherPage, noDeepComponents, noApp) } },

  // Components: look only. ui/ uses nothing above it.
  { files: ["src/components/**/*.{ts,tsx}"], rules: { "no-restricted-imports": imports(notPages, noLib, noData, noApp, noFake) } },
  { files: ["src/components/ui/**/*.{ts,tsx}"], rules: { "no-restricted-imports": imports(notPages, noLib, noData, noApp, noFake, noUpper) } },

  // Data: no React, nothing about how it's shown.
  { files: ["src/lib/**/*.ts"], rules: { "no-restricted-imports": imports(notPages, noComponents, noApp, noFake, noReact) } },
  { files: ["src/fake-api/**/*.ts"], rules: { "no-restricted-imports": imports(notPages, noComponents, noApp, noReact) } },
  { files: ["src/theme/**/*.ts"], rules: { "no-restricted-imports": imports(notPages, noComponents, noApp, noFake, noLib) } },
  // The one file that may import the icon library.
  { files: ["src/components/ui/icons.ts"], rules: { "no-restricted-imports": ["error", { patterns: [noParent] }] } },
]);
