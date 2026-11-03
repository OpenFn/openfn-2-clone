---
paths:
  - "src/mock-data/**"
  - "kickstart/**"
---

# Mock data

`src/mock-data/` is the fake database: fixtures modelled on Lightning's demo
seed (`lib/lightning/setup_utils.ex`) and the queries over them
(`findProject`, `workOrdersIn`, …).

- **Fixtures and queries only.** A pure helper that doesn't read a fixture
  goes in `src/utils/` (formatters in `format.ts`).
- **Record types live in `models/`** (`WorkOrder`, …), except `User` and
  `Project`, which sit in `src/types/` for the session and permissions.
  Pages, components and `src/types/` never import them; ESLint enforces it.
  The replica maps a model onto the hand-written contract type in
  `src/types/`.
- **A join Lightning preloads is built here.** When a component needs a work
  order's runs or a project's owner, the query returns the contract type
  with that field filled (`HistoryWorkOrder`, `AdminProjectRow`), so the
  page never looks it up.
- **Shapes are Lightning's**: field names, nesting and what's masked follow
  its schemas and JSON, not what's handy for the page.
- **`generated/kickstart.ts` is generated.** `npm run kickstart:sync` writes
  it from `kickstart/exports/`, along with the Kickstart scenario that loads
  the same projects into a local Lightning (`kickstart/README.md`). Change
  the export and rerun; never edit the output.
- **A fake request** is `simulateRequest` from `request.ts`, awaited in a
  replica wrapper so pending states show. A wrapper on the API
  client (`src/api/`) loads through its stand-in instead, where `failNext`
  makes the next request fail.
