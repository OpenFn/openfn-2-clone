# Structure (draft)

The new repo, on one page. Read with [PRINCIPLES.md](./PRINCIPLES.md). Layout borrowed from [Bulletproof React](https://github.com/alan2207/bulletproof-react): code grouped by what it's for, not by what kind of file it is.

```
v3-real/
  CLAUDE.md          one page: read PRINCIPLES.md, then this file
  api/               the API contract (copied from openfn-3-poc/api), the source of truth for shapes
  src/
    app/             routes, the shell (sidebar, header), providers. Nothing else
    components/      the design system: Brandon's components on our tokens, each with stories
    lib/
      api/           the API client, then one file per resource (tokens.ts): the API's shape, the mapper to page props, query keys, and the TanStack hooks a route calls. No components
      …              formatters, small helpers. No React
    pages/
      tokens/
        TokensPage.tsx           the page: takes props, renders, no fetching
        TokensPage.stories.tsx   one story per state
        tokens.route.tsx         calls the hooks in lib/api/tokens.ts and passes props down
        tokens.test.ts
    fake-api/        made-up answers shaped like api/, so it runs with no server. Kept apart from lib/api/, so going real deletes this folder and touches nothing else
```

## The components folder

Brandon has about 70 components in one flat folder. Split by who may use what:

```
components/
  ui/                 generic, like any design system: knows nothing about OpenFn
    Button/
      Button.tsx
      Button.stories.tsx
      Button.test.tsx       only if it has logic worth testing
    IconButton/  Modal/  ConfirmModal/  DropdownMenu/  Tooltip/
    Surface/  Card/  Stack/  Row/  Text/  Heading/
    TextInput/  Select/  ToggleSwitch/  FormField/  SearchInput/
    DataTable/  ListRow/  EmptyState/  Callout/  Badge/
  layout/             the page frame every page uses
    PageContainer/  PageHeader/  Breadcrumbs/  SettingsLayout/  SettingsNav/
  openfn/             OpenFn things, built from ui/
    StatusPill/  EntityPill/  AdaptorLogo/  RunLabel/  ChannelRow/
  index.ts            what pages may import
theme/                tokens and themes
editor/               the workflow editor: a feature of its own, not a page (Brandon's workflow/)
```

- **One folder per component**, with its story beside it. Find a component and you've found everything about it.
- **Imports go one way:** `openfn/` and `layout/` use `ui/`; `ui/` uses nothing above it. Lint checks it.
- **Where does a new one go?** Would any design system have it? `ui/`. Is it the page frame? `layout/`. Does it need an OpenFn word or idea? `openfn/`. Only one page uses it? It stays in that page's folder.

## What goes where

- **A page is one folder.** Everything about it lives there. Delete the folder and the page is gone, with nothing left behind.
- **Only `*.route.tsx` gets data, and only through `lib/api/`.** It calls the resource's hooks (`useTokens()`) and hands props to the page. Everything about a resource (its shape, mapper, keys, queries, saves) lives in its one `lib/api/` file, so two pages using it share it. Fake answers live in `fake-api/`, never in `lib/api/`.
- **Pages don't import each other.** Something two pages share moves to `components/` (looks) or `lib/` (logic).
- **`components/` knows nothing about OpenFn.** No product words, no permissions. A component that's OpenFn-specific (run status, adaptor icon) sits in `components/openfn/`.
- **Lint enforces the lines**, not a doc: a page's `*.route.tsx` is the only file in it that may import `lib/api/`; only `lib/api/client.ts` may import `fake-api/`; nothing imports from `pages/` except `app/`; no raw colours, hex or one-off sizes outside `src/theme/`.

## How we know it works

- The scenario tests in Lightning pass on the new page, same as on the old one.
- Storybook shows every component and every page state.
- A fresh Claude, given this page and PRINCIPLES.md, builds the next page right the first time.

## First step

Tokens: small, and its API route exists. Build it here end to end. If the structure feels wrong on tokens, change this page before page two.

## Open

- Do we keep Brandon's components as he has them, or rename to our naming rules as they come in?
- Do we change the component folder structure?
