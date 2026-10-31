import fs from 'node:fs'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// The design-system rules in CLAUDE.md and docs/building.md, as lint. An exception is disabled on
// its line with a reason, so the reason is reviewed with it:
// `// eslint-disable-next-line no-restricted-syntax -- <why>`. A reason that
// starts `debt:` is one we mean to fix: `grep -rn "debt:" src` lists them.
const offScale = 'neutral scale is gray-*, brand is primary-*. See src/theme/tokens.css.'
const propNames =
  'Prop name: say meaning with `tone`, loudness with `variant` and size with `size`, not theme, color, type, kind or appearance. `color` is only for Pill tags that mean nothing. See docs/building.md, Prop names.'
const lookWords = 'primary|secondary|plain|subtle|solid|muted|neutral|info|success|warning|danger|error'
const designRules = [
  {
    selector: 'Literal[value=/\\b(slate|zinc|indigo|neutral|stone|secondary)-\\d/]',
    message: `Off-palette colour: the ${offScale}`,
  },
  {
    selector: 'TemplateElement[value.raw=/\\b(slate|zinc|indigo|neutral|stone|secondary)-\\d/]',
    message: `Off-palette colour: the ${offScale}`,
  },
  {
    selector:
      // `w-[3ch]`, not a variant like `has-[td]:`.
      ':matches(JSXAttribute[name.name=/[cC]lassName$/], CallExpression[callee.name="cn"]) :matches(Literal[value=/-\\[[^\\]]*\\](?!:)/], TemplateElement[value.raw=/-\\[[^\\]]*\\](?!:)/])',
    message:
      "Arbitrary Tailwind value: use Tailwind's scale. Real geometry (a diagram, a chart) is the exception; disable it with a reason.",
  },
  // Prop names (docs/building.md): meaning is `tone`, loudness
  // `variant`, size `size`. Checked on our own components (capitalised JSX);
  // Monaco's `Editor` and `DiffEditor` take a real `theme`. Native `type` (submit, email) and
  // a content `type` (cron, credential) pass; only a look word is caught.
  // Kept simple: values in braces, dotted names and story args aren't checked.
  {
    selector: 'JSXOpeningElement[name.name=/^[A-Z]/]:not([name.name=/^(Diff)?Editor$/]) > JSXAttribute[name.name=/^(theme|kind|appearance)$/]',
    message: propNames,
  },
  // D300: a look is one `variant`, not a boolean. The primitives' old boolean names stay banned.
  {
    selector: 'JSXOpeningElement[name.name=/^(Card|Table|Modal|DetailItem|Pill|Disclosure|Header)$/] > JSXAttribute[name.name=/^(muted|dashed|square|mono|bare|divide|padded|loggedOut)$/]',
    message: "A look is one `variant`, not a boolean prop (PRINCIPLES.md, Components).",
  },
  {
    selector: 'JSXOpeningElement[name.name=/^[A-Z]/]:not([name.name="Pill"]) > JSXAttribute[name.name="color"][value.type="Literal"]',
    message: propNames,
  },
  {
    selector: `JSXOpeningElement[name.name=/^[A-Z]/] > JSXAttribute[name.name="type"][value.value=/^(${lookWords})$/]`,
    message: propNames,
  },
  {
    selector: 'JSXAttribute[name.name="variant"][value.value=/^(neutral|info|success|warning|danger|error)$/]',
    message: propNames,
  },
]

// Colours are named for what they're for (src/theme/tokens.css). Each message
// names what to use instead. White and black with an alpha (`black/5`,
// `white/10`) are allowed: they tint whatever is behind them.
const WB = '(?:white|black)(?![\\w\\x2f-])'
const UTIL = '(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|divide|fill|stroke|from|to|via|placeholder|shadow|decoration|caret|accent)'
const OTHER = ['amber', 'orange', 'purple', 'pink', 'sky', 'teal', 'emerald', 'lime', 'cyan', 'violet', 'fuchsia', 'rose']
const banned = (re, message) => [
  { selector: `Literal[value=/${re}/]`, message },
  { selector: `TemplateElement[value.raw=/${re}/]`, message },
]
const tokens = 'See src/theme/tokens.css.'
const statusRoles = `Each status (danger, success, warning, info) has text-<s>, text-<s>-strong (headings, text on a fill), text-<s>-icon, border-<s> and ring-<s>, bg-<s> (pale fill) and bg-<s>-strong (the solid). A use no role fits stays on its shade behind a debt: disable naming a finding. ${tokens}`
const colourRules = ({ palette = true, literals = true, amber = false } = {}) => [
  ...(palette
    ? [
        ...banned(
          `\\btext-(?:gray-\\d|${WB})`,
          `Raw text colour: use text-strong (gray-900/800), text-body (700), text-muted (600/500), text-faint (400/300), text-code (on bg-code) or text-inverse (white). ${tokens}`
        ),
        ...banned(
          `\\bbg-(?:gray-\\d|${WB})`,
          `Raw background: use bg-surface (white), bg-subtle (gray-50), bg-hover (gray-50, hover on white), bg-page or bg-sunken (100), bg-emphasis (200/300), bg-code (700), bg-inverse (800) or bg-overlay. ${tokens}`
        ),
        ...banned(
          `\\b(?:border(?:-[trblxyse])?|divide|ring|outline)-(?:gray-\\d|${WB})`,
          `Raw border colour: use border-subtle (gray-100/200), border-strong (300) or border-emphasis (400/500). divide-* and ring-* take the same names; focus is outline-focus or ring-focus. ${tokens}`
        ),
        ...banned(
          `\\b${UTIL}-(?:red|green|yellow|blue)-\\d`,
          'Raw status colour: red is danger, green is success, yellow is warning, blue is info; then use its role name (bg-red-50 becomes bg-danger). ' + statusRoles
        ),
        ...banned(
          `\\b${UTIL}-(?:${OTHER.filter((f) => !amber || f !== 'amber').join('|')})-\\d|\\b(?:fill|stroke|from|to|via|placeholder|shadow|decoration)-(?:gray-\\d|${WB})`,
          `Raw palette colour: a tag takes a Pill colour, a run state comes from src/theme/runStateColours.ts, and a chart keeps its palette in its own allow-listed file. Icons take fill-current or stroke-current with a text-* name; placeholders take placeholder:text-faint. ${tokens}`
        ),
      ]
    : []),
  // Status shades, banned even where raw palette colours are allowed (Pill).
  ...banned(`\\b${UTIL}-(?:danger|success|warning|info)-\\d`, `Status shade: use its role name. ${statusRoles}`),
  ...(literals
    ? banned(
        '(?:^|[\\s(,\\[:])#[0-9a-fA-F]{3,8}\\b|rgba?\\(|--color-(?:gray|red|green|yellow|blue|white|black|danger|success|warning|info)\\b',
        `Colour literal: use a named colour class, or its variable in a style (var(--text-color-muted), var(--background-color-surface)). A canvas or Monaco value that copies Lightning is disabled on its line with the reason. ${tokens}`
      )
    : []),
]

// Pages and feature components compose primitives (src/components/primitives/).
const rawControl = {
  selector: 'JSXOpeningElement[name.name=/^(button|input|select|textarea|table)$/]',
  message:
    'Raw control: use Button, IconButton, the Inputs controls or Table. If this element deliberately is not that control, disable it with a reason.',
}

// Type size comes from Text or Heading (src/components/primitives/Text.tsx). Weight,
// italic and mono stay classes: they emphasise text inside its size.
const typeRules = banned(
  '\\b(?:text-(?:xs|sm|base|lg|[2-9]?xl)(?![\\w-])|leading-|tracking-)',
  'Type size: use Text (body, label or code, at md or sm) or Heading, not text-sm, leading-* or tracking-*. See src/components/primitives/Text.tsx.'
)

const srcRules = (colours) => ['error', ...designRules, ...colours, liveViewAttribute]
const consumerRules = (colours) => [...srcRules(colours), rawControl]

// Every eslint-disable says why, after ` -- `, so a reviewer can judge it.
const local = {
  rules: {
    'disable-needs-reason': {
      meta: { type: 'suggestion', messages: { missing: 'Say why: `eslint-disable-next-line <rule> -- <reason>`.' } },
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              if (/^\s*eslint-disable/.test(comment.value) && !/\s--\s/.test(comment.value)) {
                context.report({ loc: comment.loc, messageId: 'missing' })
              }
            }
          },
        }
      },
    },
  },
}

const routerMessage = 'Navigate through useRouter() and Link from src/routing/router.'
const routerImports = [
  { name: 'react-router-dom', message: routerMessage },
  { name: 'react-router', message: routerMessage },
]

// The replica's models (src/mock-data/models/) are its own records. Contract
// shapes are written by hand in src/types/ and the replica maps the models
// onto them, so a fixture change can't change a contract (STANDARDS §11).
const modelImports = {
  group: ['**/mock-data/models', '**/mock-data/models/**'],
  message: "Models are the replica's records: take a hand-written contract shape from src/types/ (STANDARDS §11).",
}
const mockDataImports = {
  // Any other mock-data path: models get their own message.
  regex: '(^|/)mock-data(/(?!models(/|$)).*)?$',
  message: 'Take data as props; the replica loads it. Types live in src/types/, helpers in src/utils/.',
}
const sessionImports = {
  group: ['**/session', '**/session/**'],
  message: 'Take the user and permissions as props; the replica reads the session.',
}

const seamIgnores = ['**/*.stories.tsx', '**/*[rR]eplica.{ts,tsx}', '**/*.test.{ts,tsx}']
const seamImports = (extra = []) => [
  'error',
  { paths: routerImports, patterns: [modelImports, mockDataImports, sessionImports, ...extra] },
]

// Each folder in src/components/ other than primitives/ and domain/ is an
// area of feature components (history/, credentials/, …) or the app shell (shell/).
const areas = fs
  .readdirSync(new URL('./src/components', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !['primitives', 'domain'].includes(entry.name))
  .map((entry) => entry.name)
const tiers = 'See docs/building.md, Where a new component goes.'
const pageImports = {
  regex: '(^|/)pages(/|$)',
  message: `Nothing outside src/pages/ imports a page except App.tsx and src/index.ts. Move what you need into src/types/ or a component. ${tiers}`,
}
const primitiveImports = {
  // From primitives/, `../x` is a sibling folder in src/components/; `../../components/x` is the long way round.
  regex: '^\\.\\./[^.]|(^|/)pages(/|$)|(^|/)components/(?!primitives(/|$))',
  message: `A primitive uses only other primitives (and utils, types, theme). Pass the feature in as a prop or children. ${tiers}`,
}
const domainImports = {
  regex: '^\\.\\./(?!primitives(/|$))[^.]|(^|/)pages(/|$)|(^|/)components/(?!(primitives|domain)(/|$))',
  message: `A domain component uses only primitives and other domain components. Pass the feature in as a prop or children. ${tiers}`,
}
const utilImports = {
  regex: '(^|/)components/(?!primitives(/|$))|(^|/)pages(/|$)',
  message: `A util may import primitives, not domain/, shell or area components or a page. ${tiers}`,
}
const otherAreaImports = (area) => ({
  regex: `(^(\\.\\./)+|(^|/)components/)(${areas.filter((other) => other !== area && other !== 'shell').join('|')})(/|$)`,
  message: `A feature component uses primitives, domain/, the shell and its own area, not another area. Move what two areas share into domain/ (or primitives/ if it's general). ${tiers}`,
})

// The design system runs outside Lightning too (the replica, Storybook), so it
// can't lean on LiveView or the browser URL. URLs go through src/routing.
const hostMessage = 'Design-system code must not depend on LiveView or the browser URL; use useRouter() from src/routing/router.'
const liveViewAttribute = {
  selector: 'JSXAttribute[name.name=/^phx-/]',
  message: `phx- attribute: ${hostMessage}`,
}

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'compare-out']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { local },
    rules: { 'local/disable-needs-reason': 'error' },
  },
  // Accessibility. Stories stay in: they are the components' specs.
  { files: ['src/**/*.tsx'], ...jsxA11y.flatConfigs.recommended },
  {
    // Deprecated React, DOM and library APIs (FormEvent, navigator.platform) fail lint.
    // It needs the types, so it reads the tsconfig; that roughly doubles lint's time.
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-deprecated': 'error' },
  },
  {
    // Stories set fixed canvas sizes, so they're left out.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.stories.tsx'],
    rules: { 'no-restricted-syntax': srcRules(colourRules()) },
  },
  {
    files: ['src/pages/**/*.tsx', 'src/components/*/**/*.tsx'],
    ignores: ['src/components/primitives/**', '**/*.stories.tsx'],
    rules: { 'no-restricted-syntax': [...consumerRules(colourRules()), ...typeRules] },
  },
  // Raw palette colours, confined to the files that are about colour.
  // Tag colours:
  { files: ['src/components/primitives/Pill.tsx'], rules: { 'no-restricted-syntax': srcRules(colourRules({ palette: false })) } },
  // The theme files and the run-state map:
  { files: ['src/theme/**/*.{ts,tsx}'], rules: { 'no-restricted-syntax': srcRules([]) } },
  // Monaco's theme, the sandbox colours (user data) and the health charts' palette:
  {
    files: ['src/theme/monacoTheme.ts', 'src/constants.ts', 'src/components/projects/health/palette.ts'],
    rules: { 'no-restricted-syntax': srcRules(colourRules({ literals: false })) },
  },
  // Chart palettes (the status-shade ban still holds):
  {
    files: ['src/components/history/ChannelTiming.tsx', 'src/components/admin/LiveDashboardHome.tsx'],
    rules: { 'no-restricted-syntax': [...consumerRules(colourRules({ palette: false, literals: false })), ...typeRules] },
  },
  // Tests and fixtures hold data (sandbox colours) and query chart classes:
  { files: ['src/**/*.test.{ts,tsx}', 'src/mock-data/**/*.{ts,tsx}'], rules: { 'no-restricted-syntax': srcRules([]) } },
  {
    files: ['src/pages/**/*.test.tsx', 'src/components/*/**/*.test.tsx'],
    ignores: ['src/components/primitives/**'],
    rules: { 'no-restricted-syntax': consumerRules([]) },
  },
  // Stories are checked for colour too. Hex stays allowed: it is data there (sandbox colours, chart values).
  { files: ['src/**/*.stories.tsx'], rules: { 'no-restricted-syntax': ['error', ...colourRules({ literals: false })] } },
  { files: ['src/components/primitives/Menu.stories.tsx'], rules: { 'no-restricted-syntax': ['error', ...colourRules({ literals: false, amber: true })] } },
  // The amber notices (support user, experimental):
  {
    files: ['src/components/shell/UserMenu.tsx', 'src/components/shell/Sidebar.tsx'],
    rules: { 'no-restricted-syntax': [...consumerRules(colourRules({ amber: true })), ...typeRules] },
  },
  {
    // The router adapter is the one place that reads the browser URL.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/routing/**'],
    rules: {
      'no-restricted-globals': ['error', { name: 'location', message: hostMessage }],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'location', message: hostMessage },
        { object: 'document', property: 'location', message: hostMessage },
        { property: 'pushEvent', message: hostMessage },
        { property: 'pushEventTo', message: hostMessage },
      ],
    },
  },
  {
    // Annotations navigate through the router adapter too.
    files: ['src/annotations/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { paths: routerImports, patterns: [pageImports] }] },
  },
  {
    // The data seam: components, pages and utils get records and permission
    // booleans as props (the wiring loads them), so wiring the backend only
    // touches `*.replica.*` files and `*Replica.ts` helpers. Stories may use
    // fixtures. An import that still crosses the seam says why, with
    // `-- wiring: …` (it stays) or `-- debt: …` (page not yet split).
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}'],
    ignores: seamIgnores,
    rules: { 'no-restricted-imports': seamImports() },
  },
  // The tiers: imports only go down, pages → feature components → domain →
  // primitives. A primitive uses only other primitives; a domain component
  // uses primitives and domain; a feature component uses those, the shell and
  // its own area. These blocks repeat the seam's patterns, because a later
  // block replaces an earlier one's options.
  {
    files: ['src/components/primitives/**/*.{ts,tsx}'],
    ignores: seamIgnores,
    rules: { 'no-restricted-imports': seamImports([primitiveImports]) },
  },
  {
    files: ['src/components/domain/**/*.{ts,tsx}'],
    ignores: seamIgnores,
    rules: { 'no-restricted-imports': seamImports([domainImports]) },
  },
  ...areas.map((area) => ({
    files: [`src/components/${area}/**/*.{ts,tsx}`],
    ignores: seamIgnores,
    rules: { 'no-restricted-imports': seamImports([otherAreaImports(area), pageImports]) },
  })),
  { files: ['src/utils/**/*.{ts,tsx}'], ignores: seamIgnores, rules: { 'no-restricted-imports': seamImports([utilImports]) } },
  {
    // A replica outside src/pages/ is wiring, not a page's wrapper, so it doesn't import pages either.
    files: ['src/components/**/*[rR]eplica.{ts,tsx}', 'src/utils/**/*[rR]eplica.{ts,tsx}'],
    ignores: ['**/*.stories.tsx', '**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [pageImports] }] },
  },
  {
    // Outside src/pages/, only the route table and the package entry import a page.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      '**/*.stories.tsx',
      '**/*.test.{ts,tsx}',
      'src/pages/**',
      'src/components/**',
      'src/utils/**',
      'src/types/**',
      'src/annotations/**',
      'src/App.tsx',
      'src/index.ts',
    ],
    rules: { 'no-restricted-imports': ['error', { patterns: [pageImports] }] },
  },
  {
    // Contract shapes are written by hand, never built on models or fixtures.
    files: ['src/types/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [modelImports, mockDataImports, pageImports] }] },
  },
])
