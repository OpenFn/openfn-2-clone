# CLAUDE.md

A React replica of OpenFn Lightning's UI, built page by page. It is
becoming the frontend that replaces Lightning's LiveView UI. Built with React,
TypeScript, Vite, Tailwind 4.

**No backend.** Pages render from fixtures in `src/mock-data/`; save, delete
and run only change local state. Each page is built so that wiring it to
Lightning touches one wrapper file and nothing else (see The data seam).

## What to read for your task

| You're… | Read |
|---|---|
| Doing anything | [PRINCIPLES.md](./PRINCIPLES.md). It's short: what good looks like |
| Building or changing a page | The page's annotation, `annotations/views/<inventory-id>.md`: what Lightning's page does and says. Then [STANDARDS.md](./STANDARDS.md): the page and its `.replica.tsx` wrapper, pending, failure, lists |
| Building or changing a component | [docs/building.md](./docs/building.md): which primitive to use, where a new one goes, the recurring patterns |
| Choosing or changing a colour, or a theme | [docs/colour.md](./docs/colour.md): the roles, what a theme may change, when to add a role |
| Building something Lightning doesn't have, or a redesign | PRINCIPLES.md "Where we're heading" |
| Changing something that looks different from Lightning | [docs/lightning-differences.md](./docs/lightning-differences.md) first; it may be on purpose |

`.claude/rules/` holds the rules for one kind of file (tests, stories, mock
data, comments, lint) and loads by itself when you touch one.

## Checking your work

- Before you say it's done: `npm run lint` (warnings fail too),
  `npm run build` (typechecks) and `npm test`.
- Changed a component or a story: while you work, run only the stories
  you touched (`npm run test:stories -- Button`). Run the full
  `npm run test:stories` once, right before you commit, and under the
  other themes (`STORYBOOK_THEME=dark …`) only if you changed colours.
  It renders every story and runs axe on it. Stop Storybook first.
- The pixel check is a local Chromatic, for big sweeps across many screens
  that should mostly look the same; don't run it for a normal change. It
  screenshots every story before and after and lists only the ones that
  changed, so the reviewer reads its report instead of the diff. A full run
  takes several minutes; `--only <id part>,…` checks just those stories in
  seconds. Build Storybook at main (`git worktree add --detach <dir>
  origin/main`, then `npx storybook build -o <dir>/sb` there) and on your
  branch (`npx storybook build -o <after>`), then
  `npm run pixel-check -- <dir>/sb <after> <name>`. The report and its
  screenshots land in `pixel-check-screenshots/<name>/` (git ignores it);
  serve that folder. `npm run pixel-check:clear` deletes every saved run.
- A lint exception is disabled on its line with a reason after ` -- `;
  `debt:` marks one to fix.

## Running it

- `npm run dev`, then open `http://localhost:5173/openfn-3-poc/#/projects`.
  It's a hash router; `/projects` is a 404.
- `npm run storybook` (port 6006).
- `npm run compare:all` compares the replica with a local Lightning. Use
  the `compare-with-lightning` skill.
- `npm run kickstart:sync` regenerates the shared projects from
  `kickstart/exports/`.
- CI fails if the styling counts from `scripts/design-system-metrics.mjs`
  rise.

## Where things are

- `src/App.tsx`: the routes. Each is a Lightning URL, commented with its
  INVENTORY.md id.
- `src/pages/<area>/`: one file per Lightning view, named for its inventory
  id (`history-work-orders` → `HistoryWorkOrdersPage.tsx`), with a
  `.replica.tsx` wrapper beside it once split into page and wrapper
  (STANDARDS.md pattern 11; pages not yet split carry a `debt:` import).
- `src/components/`: `primitives/`, `domain/`, `shell/`, then one folder per
  area.
- `src/types/`: the hand-written shapes pages take. `src/constants.ts`:
  Lightning's fixed option lists and copy.
- `src/utils/`: every formatter in `format.ts` (add new ones there, not in
  an area folder); `search.ts` (`matchesQuery`), `validate.ts`
  (`isValidEmail`), `useUrlParams`, `useCopy`, and pure domain helpers
  (`adaptors.ts`, `history.ts`, `urls.ts`, `workflowGraph.ts`). Look here
  before writing a helper.
- `src/permissions.ts`: every `can*` flag, mirroring Lightning's policies.
  `src/session/`: the signed-in user.
- `src/mock-data/`: the fake database. `src/theme/`: themes and colour
  tokens.

## Rules that matter everywhere

- **Copy Lightning's behaviour and words, not its code.** Headings, labels,
  button text, empty states, columns and what each action does come from
  Lightning (paths in INVENTORY.md). The markup comes from our primitives.
  Where two Lightning screens style the same thing differently, pick one
  treatment in the primitive and list it in `docs/lightning-differences.md`,
  so a comparison run doesn't undo it.
- **Pages take props.** Data, the user and `can*` flags arrive from the
  `.replica.tsx` wrapper. Lint stops pages, components and utils importing
  `src/mock-data/`, `src/session/` or the router.
- **No styling in pages.** Use a primitive; if none fits, extend one. Lint
  bans raw palette colours, hex, arbitrary values (`text-[13px]`) and type
  sizes outside primitives.
- **Icons** are Heroicons classes: `<span className="hero-folder h-5 w-5" />`.
  No icon packages. Conditional classes use `cn()`.
- Fixes and open questions go in Lucy's project tracker, not in new files
  here.

## The data seam

Only `*.replica.*` wrappers, `*Replica.ts` helpers and `main.tsx` may import
`src/mock-data/`, `src/session/` or the router. There, the user comes from
`useCurrentUser()` (never a fixture import) and permissions from
`usePermissions(project)` / `permissionsFor`, passed down as `can*`
booleans; no inline role checks. Lint can't see inside replicas, so this
one is on you. Any other file that imports them says why on the import: `-- wiring: …` for one that stays (the app shell),
`-- debt: …` for a page not yet split. List them with
`grep -rnE "no-restricted-imports -- (wiring|debt):" src`.
`src/pages/profile/TokensPage.tsx` and `TokensPage.replica.tsx` are the
worked example (STANDARDS.md pattern 11).
