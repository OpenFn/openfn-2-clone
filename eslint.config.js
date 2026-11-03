import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

// The area lines from PRINCIPLES.md "Areas" and STRUCTURE.md. ESLint replaces a rule's options
// per matching block rather than merging them, so each block lists every ban that applies to it.

const ban = (regex, message) => ({ regex, message });

const notPages = ban("(^|/)pages(/|$)", "Only app/ imports pages.");
const noClient = ban("(^|/)lib/api(/|$)", "Pages don't fetch: only *.route.tsx imports the API client.");
const noFake = ban("(^|/)fake-api(/|$)", "Only app/ chooses fake-api.");
const noOtherPage = ban("^\\.\\./[^./]", "Pages don't import each other. Move what two pages share to components/ or lib/.");
const noDeepComponents = ban("components/.+", "Pages import components from components/index.ts only.");
const noLib = ban("(^|/)lib(/|$)", "Components know nothing about data: no lib/.");
const noData = ban("\\.data$", "Components know nothing about data: no *.data.ts.");
const noApp = ban("(^|/)app(/|$)", "Nothing imports the app shell.");
const noUpper = ban("(^|/)(layout|openfn)(/|$)", "ui/ uses nothing above it: no layout/ or openfn/.");
const noComponents = ban("(^|/)components(/|$)", "Data knows nothing about how it's shown: no components/.");
const noReact = ban("^react(-dom)?(/|$)", "lib/ and fake-api/ have no React.");

const imports = (...patterns) => ["error", { patterns }];

// Colour and size: roles only, outside src/theme/ (docs: colour rules, decision D385).
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const COLOUR_UTILS = "bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|accent|caret|decoration|placeholder";
const styleChecks = [
  [new RegExp(`(^|[\\s:])(${COLOUR_UTILS})-([a-z]-)?(${PALETTE})(-\\d+)?\\b`), "Use a colour role (text-muted, bg-brand), not a palette shade."],
  [/#[0-9a-fA-F]{3,8}\b/, "No hex colours outside src/theme/. Use a colour role."],
  [/(^|[\s:])-?[a-z][a-z0-9-]*-\[[^\]\s]+\]/, "No arbitrary values like text-[13px]. Use the scale, or add a token in src/theme/."],
  [/(^|[\s:])[a-z-]+\/\d+(\s|$)|(^|[\s:])opacity-\d+\b/, "No opacity on colours: a state is its own role."],
];
const local = {
  rules: {
    "no-raw-style": {
      meta: { type: "problem", schema: [] },
      create(context) {
        const check = (node, text) => {
          for (const [regex, message] of styleChecks) if (regex.test(text)) context.report({ node, message });
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

  // Pages: take props, fetch nothing, hold no styling. The route fetches; the mappers may name API types.
  {
    files: ["src/pages/**/*.{ts,tsx}"],
    ignores: ["src/pages/**/*.route.tsx", "src/pages/**/*.data.ts"],
    rules: {
      "no-restricted-imports": imports(noClient, noFake, noOtherPage, noDeepComponents, noApp),
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name=/^(className|style)$/]", message: "Pages hold no styling: arrange components, or extend one." },
      ],
    },
  },
  {
    files: ["src/pages/**/*.data.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ ...noClient, allowTypeImports: true }, noFake, noOtherPage, noApp] }] },
  },
  { files: ["src/pages/**/*.route.tsx"], rules: { "no-restricted-imports": imports(noFake, noOtherPage, noDeepComponents, noApp) } },

  // Components: look only. ui/ uses nothing above it.
  { files: ["src/components/**/*.{ts,tsx}"], rules: { "no-restricted-imports": imports(notPages, noLib, noData, noApp, noFake) } },
  { files: ["src/components/ui/**/*.{ts,tsx}"], rules: { "no-restricted-imports": imports(notPages, noLib, noData, noApp, noFake, noUpper) } },

  // Data: no React, nothing about how it's shown.
  { files: ["src/lib/**/*.ts"], rules: { "no-restricted-imports": imports(notPages, noComponents, noApp, noFake, noReact) } },
  { files: ["src/fake-api/**/*.ts"], rules: { "no-restricted-imports": imports(notPages, noComponents, noApp, noReact) } },
  { files: ["src/theme/**/*.ts"], rules: { "no-restricted-imports": imports(notPages, noComponents, noApp, noFake, noLib) } },
]);
