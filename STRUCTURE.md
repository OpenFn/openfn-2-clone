# Structure (draft)

The new repo, on one page. Read with [PRINCIPLES.md](./PRINCIPLES.md). Layout borrowed from [Bulletproof React](https://github.com/alan2207/bulletproof-react): code grouped by what it's for, not by what kind of file it is.

```
v3-real/
  CLAUDE.md          one page: read PRINCIPLES.md, then this file
  api/               the API contract (copied from openfn-3-poc/api), the source of truth for shapes
  src/
    app/             routes, the shell (sidebar, header), providers. Nothing else
    components/      the design system: Brandon's components on our tokens, each with stories
    lib/             the API client, formatters, small helpers. No React
    pages/
      tokens/
        TokensPage.tsx           the page: takes props, renders, no fetching
        TokensPage.stories.tsx   one story per state
        tokens.data.ts           API answer in, page props out (plain functions)
        tokens.route.tsx         the one file that fetches and passes props down
        tokens.test.ts
    fake-api/        made-up answers shaped like api/, so it runs with no server
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
- **Only `*.route.tsx` fetches.** It calls the client, maps the answer with `*.data.ts`, and hands props to the page. That's the one file that changes when the data moves from fake to real, or from LiveView to the API.
- **Pages don't import each other.** Something two pages share moves to `components/` (looks) or `lib/` (logic).
- **`components/` knows nothing about OpenFn.** No product words, no permissions. A component that's OpenFn-specific (run status, adaptor icon) sits in `components/openfn/`.
- **Lint enforces the lines**, not a doc: pages can't import the client, nothing imports from `pages/` except `app/`, no raw colours or sizes outside `components/`.

## How we know it works

- The scenario tests in Lightning pass on the new page, same as on the old one.
- Storybook shows every component and every page state.
- A fresh Claude, given this page and PRINCIPLES.md, builds the next page right the first time.

## First step

Tokens: small, and its API route exists. Build it here end to end. If the structure feels wrong on tokens, change this page before page two.

## Open

- Do we keep Brandon's components as he has them, or rename to our naming rules as they come in?
- Do we change the component folder structure?
