# Prompt: build the remaining application patterns

Paste this into a fresh Claude Code session on `brandonjackson/openfn-ia-demo`.

---

Read `CLAUDE.md`, `docs/building.md` and `STANDARDS.md` in full before doing anything.
`STANDARDS.md` lists the application patterns (which are done is in the
project tracker). Pattern 1
(async action) is done and `src/pages/profile/TokensPage.tsx` is its worked
example; study `useAction`, `Button`'s `pending`, `FormModal` and
`ConfirmModal` so you build the rest in the same style.

Work through the patterns below **in this order**, one PR-sized commit each,
on the current branch. After each one: `npm run build`, `npm run lint`,
`npm run build-storybook` must pass, `node scripts/design-system-metrics.mjs`
must not go up, and the status table in `STANDARDS.md` is updated. Commit
with a message that names the pattern. Do not start the next pattern until
the previous one is committed.

Keep Lightning's wording, ids and URLs exactly; `STANDARDS.md` changes how
pages behave, not what they say. Components still never import
`src/mock-data/` (ESLint enforces it).

## Step 1. Pattern 2: `useForm`

Build `src/utils/useForm.ts` to the contract in STANDARDS.md §2. Then
convert these, in order, and delete their inline render-time validation:

1. `CreateProjectModal` (modal form, client validation, server field error
   via `FormModal onFieldErrors`).
2. `ProjectSetupPanel` (inline settings form: Save disabled until dirty,
   `await simulateRequest()`, toast from the page).
3. `ProfileForms` (two forms on one page, each with its own `useForm`).

Add a story for a form showing a server field error, using
a rejected promise with `RequestError.fieldErrors`.

## Step 2. Pattern 3: server-driven list, on History

1. Add `src/mock-data/queries.ts` (or extend `history.ts`) with
   `workOrdersQuery(params): { rows, total, page, pageSize }`, moving
   `matchesStatus`, `inRange`, `matchesSearch` and the sort out of
   `HistoryWorkOrdersPage`.
2. Move the nine filter `useState`s into the URL with `useUrlParams`, using
   Lightning's param names (check `lib/lightning_web/live/run_live/index.ex`
   in OpenFn/lightning for the exact keys: `filters[...]`, `sort_by`,
   `sort_direction`, `page`).
3. Give `Table` a `state` prop (`"loading" | "error" | "ready"`) with loading
   and error treatments and stories. Give `Pagination` real `page`, `total`,
   `pageSize`, `onPage`; remove `pageNumber={1}` from `WorkOrdersTable`.
4. Wrap the query in `simulateRequest` so the loading state shows.
5. Apply the same to `AdminAuditPage` and `AdminUsersPage`.

## Step 3. Pattern 4: lift the five panels

For each of `CollaborationPanel`, `CollectionsPanel`,
`WebhookSecurityPanel`, `SecurityPanel`, `CredentialIndex`: remove the
`initial*` props and the copied state, take records as props, add
`onAdd`/`onRemove`/`onUpdate` returning `Promise<void>`, and move the list
and the toasts to `ProjectSettingsPage` / `CredentialsIndexPage`. Each
mutation awaits `simulateRequest`. Update stories to pass records and no-op
callbacks.

## Step 4. Pattern 6: one confirm

Replace the three `window.confirm` calls and rebuild `UserDeletionModal` and
`CredentialDeletionModal` on `ConfirmModal` with `confirmation`. Keep
Lightning's modal titles and button text.

## Step 5. Pattern 5: loading and not-found

Add `AsyncBoundary`, `NotFoundPage`, `ErrorPage`. Route the catch-all to
`NotFoundPage`. Replace every `<Navigate to="/projects">` not-found and
every inline "not found" text with the boundary. Pages that load one record
(`RunShowPage`, `DataclipShowPage`, `ProjectSettingsPage`,
`ChannelRequestShowPage`) go through it with `simulateRequest`.

## Step 6. Pattern 7 and 9 sweep

Grep `useToast` in `src/components`: move every call to the owning page
through a callback. Grep for hidden-when-not-allowed actions in components
and make them disabled-with-reason unless Lightning hides them (check the
annotation for that view).

## Step 7. Pattern 10: route guards

Add `RouteGuard` around the route groups in `App.tsx`, with the session
states listed in STANDARDS.md §10. Extend `Session` with what the guard
needs (`confirmed`, `totpPending`, `superuser`). Keep the demo signed in by
default; add a devtools toggle in `SettingsMenu` to flip states.

## Leave for later

Pattern 8 (live updates) waits until a real query layer exists. The
workflow editor canvas, `CodeEditor` and `useWorkflowEditorState` are
visual mocks that will be replaced by Lightning's xyflow, Monaco and
WorkflowStore; don't invest in them beyond keeping their inspectors on the
patterns above.

## When you finish

Write a short summary at the top of `STANDARDS.md` under the status table:
what's done, what's still open, and anything you had to decide that the
document didn't cover.
