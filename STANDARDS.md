# Application patterns

[docs/building.md](./docs/building.md) says how a page is built from
primitives. This file says how a page *behaves*: what every component does when a request is pending, fails, or
changes the data it shows. These are the patterns that have to be in place
before the replica becomes Lightning's frontend, because they decide the shape
of every API call and every page wiring.

Pattern numbers are cited across the repo; they never change. Which
patterns are done and which pages still need them is tracked in the project
tracker, not here.

Worked example: `src/pages/profile/TokensPage.tsx` and its
`TokensPage.replica.tsx` wrapper (patterns 1, 4, 6, 7, 11).

## 1. Async action

Every handler that will talk to the server is async, `() => Promise<void>`,
or `() => Promise<T>` when the page needs something from the reply, and runs
through `useAction` (`src/utils/useAction.ts`), or through a primitive that
does (`FormModal`, `ConfirmModal`).

- **Pending.** The triggering `Button` gets `pending`: disabled, spinner,
  `aria-busy`. A modal's Cancel and backdrop are inert while pending. Nothing
  else on the page locks.
- **Success.** The handler resolves. The caller then closes the modal,
  navigates, or toasts. The primitive never closes itself.
- **Failure.** The handler throws (a `RequestError` from `src/utils/errors.ts`
  once wired). The primitive stays where it was: a modal stays open and shows
  the message as an `Alert` above the form; a page button toasts it with
  `useAction(handler, { onError: "toast" })`. The user can retry or cancel.
- **Host.** Every `on*` prop is answered the same way: resolve when the
  server has done it, with any data the page needs, or reject with a
  `RequestError` carrying a message. When the prop takes form values, the
  error's `fieldErrors` use those values' field names (pattern 2). Where the
  message shows is the page's choice, so a prop's comment only says what is
  special about it.
- **Saved on change.** A switch or select the host saves on every change
  uses `useChosenValue(saved, save, onError)`: it shows the choice at once,
  puts back the saved value if the save fails, and new props from the host
  always replace the choice.
- **Double submit** is impossible: `run` ignores calls while pending, unless `latest` is set.
- **One per row.** A list whose rows each have an action uses `useActions`:
  `run(id, ...args)`, `pending(id)`, `error(id)`, `reset(id)`. Each id has
  its own pending, error and double-submit guard, so two rows can run at
  once; `pending()` with no id says whether any is running.
- **Only the newest answer.** A request whose answer can arrive after the
  user moved on (a select changed, another tab, the modal closed) sets
  `latest: true`. A new run supersedes the one in flight, `cancel()` and
  unmounting drop it, and a dropped answer, success or failure, never lands.
  A load hands its result to `onSuccess`.
- **Until wired,** page mutations `await simulateRequest(...)` from
  `src/mock-data/request.ts`, so the pending state is visible in the demo.
  `failNextRequest(message, fieldErrors?)` makes the next call reject, for
  stories and manual checks.

Rules: no `onClick={() => toast("Saved")}` without an awaited request in
between. No `setTimeout` to fake latency inside a component. A sync handler
is allowed only when nothing will ever go to the server (toggling a local
disclosure, copying to clipboard).

## 2. Form with server errors

One form helper owns values, dirty state, client validation and server
field errors: `useForm` (`src/utils/useForm.ts`).

- `useForm({ initial, validate, clearOnSave })` returns `values`,
  `set(field, value)`, `errors` (per field, `string[]`, client and server
  merged), `dirty`, `reset()`, and `fieldProps(name)` to spread onto
  `TextInput`, `NameField` etc. `clearOnSave` empties the form after a
  successful save (password forms) instead of keeping what was typed.
- A page form submits with `<Form {...form.formProps(save)}>`. It runs `save`
  through `useAction` (pattern 1), so `form.pending` goes on the Save button
  and `form.error` shows as an `Alert` by the form (pattern 7). On success
  the submitted values become the saved ones and the form is clean again.
  A `FormModal` form passes `onSubmit={form.modalSubmit(save)}` and closes
  itself inside `save`; the modal shows pending and other failures.
- Client validation runs on blur and on submit, not on every keystroke.
  `blank` from `utils/validate.ts` is the required-field check.
- A `RequestError` with `fieldErrors` from submit lands on the matching
  fields. If any key isn't a form field (Lightning's `current_password`
  where the form says `password`), the submit fails with the error's
  message, so nothing is lost silently. Lightning's changeset messages
  ("can't be blank", "has already been taken") are used verbatim.
- Submit, and Next in a step-by-step pop-up, is never disabled because the form is invalid: submitting shows
  every error and doesn't save, so the user can always find out why.
  (Lightning disables it, and the reason can sit on a field you haven't
  touched.)
- The one exception is type-to-confirm (pattern 6): the confirm button stays
  disabled until the typed text matches, and the dialog always shows the
  text to type. The typing is a deliberate pause before something that
  can't be undone, not data entry, and with the text shown there is no
  hidden reason.
- Whether Save waits for changes follows Lightning form by form: Project
  Identity's doesn't, Concurrency's and basic info's do.
- Field ids keep Lightning's (`project-settings-form_raw_name`), so the
  compare tooling and the annotations still line up. An input without an
  `id` gets a generated one, so every label is linked to its control.

## 3. Server-driven list

Filtering, sorting and paging are the server's job. The browser holds the
query, not the rows.

- Query state (filters, sort, page, search) lives in the URL via
  `useUrlParams`, using Lightning's own param names (`filters[workflow_id]`,
  `sort_by`, `page`). Reloading the page reproduces the view.
- The host sends the result as plain data: the rows, `page: PageInfo` and,
  for a sorted list, `sort: SortState`. No callbacks for paging or sorting,
  and no browser fallback when they are missing.
- The page links to its own query string only (`useUrlParams().href`),
  never a path, so it knows no routes. A link to another page is an `…Href`
  prop from the host.
- The host (the `.replica.tsx` wrapper) turns the URL into a query (today: a mock-data function that
  filters fixtures; later: a request) and gets back `{ rows, total, page,
  pageSize }`.
- `Table` takes rows and a `state: "loading" | "error" | "ready"`, and shows
  the loading and error treatments itself. `EmptyState` stays for "no rows".
- `Pagination` takes `page` and links each page to this URL with `?page=`
  changed, showing five pages either side as Lightning does. No component
  hardcodes `number: 1`.
- A server-sorted header is `<Th sortHref>`, a plain link. `onSort` and
  `useTableSort` are only for small, fully loaded lists (project members,
  tabs).

## 4. Data down, mutations up

A component never copies a record list into local state and mutates it.

- Records come in as props. Changes go out as `onAdd`, `onRemove`,
  `onUpdate` callbacks that return `Promise<void>`. The page (later the
  query layer) applies the change and re-renders with new props.
- Local state in a component is for *UI* only: which modal is open, which
  row is expanded, draft text not yet submitted.
- `initialX` props are a smell: a component that seeds state from them is
  keeping its own copy of the records.
- A component shared by two pages takes one shared action interface, which
  both pages' props extend (`CredentialActions` for `CredentialIndex`, used by
  the Credentials page and project settings' Credentials tab).
- A record's secrets aren't props. An edit form that shows stored secrets
  asks for them when it opens (`onLoadCredentialSecrets`), and the answer
  lives only in the open modal.

## 5. Resource loading states

**Not built yet. Don't build it without asking.**

Any page or panel built around one record (a project, a run, a credential)
needs the same four treatments: loading, not found, forbidden, error.

- One `AsyncBoundary` primitive (or equivalent) takes a resource state and
  renders `Spinner`, a not-found page, or an `Alert`, and otherwise its
  children.
- A real `NotFoundPage` and `ErrorPage` under `src/pages/`, routed as the
  catch-all. No more `<Navigate to="/projects">` as the not-found treatment.
- Pages don't invent their own "Project not found" text.

## 6. Confirm then act

`ConfirmModal` is the one way to confirm a destructive action. It supports
type-to-confirm, async `onConfirm` (pattern 1), and stays open on failure.
Type-to-confirm keeps the confirm button disabled until the text matches,
and the dialog says what to type ("To confirm, type alice@example.org
below"). This is the one exception to pattern 2's rule.

A modal (`ConfirmModal`, `FormModal`, anything on `Modal`) is mounted only
while open and keyed by what it is about:
`{deleting && <ConfirmModal key={deleting.id} open … />}`. Closing it throws
its state away, so a typed confirmation or a failed attempt's error never
shows up again on the next open.

A dialog that can only explain why the action can't happen yet (a
scheduled credential with audited runs, a user with activity) is a plain
`Modal` with one dismiss button, beside the `ConfirmModal`, as
`CredentialDeletionModal` and `UserDeletionModal` do. Type-to-confirm is
used where Lightning asks for typing (not for credentials), and for a new
action that deletes a project or account or stops data being kept.
The `/…/delete` routes stay, because Lightning has them; they open a
`ConfirmModal`.

## 7. Feedback

- Success is announced by the **host**, never the page: the replica wrapper
  toasts it, and Lightning shows its own flash (put by the server) as the
  same toast. Components report through callbacks. Wording is Lightning's
  flash text.
- Failure that needs reading (a form rejected, a conflict) is an inline
  `Alert` next to what failed. Failure of a one-shot button is an error
  toast.
- A server flash that survives a redirect (login errors, "Project created"
  after navigation) needs a small flash store read once by the shell. The
  `?error=1` simulation on auth pages is a placeholder for it.

## 8. Live updates

**Not built yet. Don't build it without asking.**

History and run show update in place in Lightning (PubSub). The component
contract from pattern 3 must not assume rows are static: rows are keyed by
id, and a subscription hook replaces or inserts rows in the same query
result the page already holds. Build after pattern 3.

## 9. Permission gating

`can*` booleans come from `usePermissions(project)` in the page's
`.replica.tsx` and are passed down. A gated action is
*disabled with a reason*, never hidden, unless Lightning hides it. The
reason is `Button`'s `tooltip` or `SectionHeader`'s `permissionsSection`.
No inline role checks in components.

## 10. Session and route guards

**Not built yet. Don't build it without asking.**

`SessionProvider` supplies the user and instance. Still needed, once at the
router: redirect to login when signed out, to `/users/two-factor` when 2FA is
pending, to confirm-required when unconfirmed, to the MFA-required page for
projects that require it, and away from `/settings/*` for non-superusers.
Lightning does this in plugs and `on_mount`; mirror those rules in one
`RouteGuard` component around the route groups in `App.tsx`.

## 11. Page and wrapper

A page that will move to Lightning is two files: the page draws, the wrapper
feeds it. The page file is copied into Lightning unchanged; only the wrapper
is rewritten.

- **`XPage.tsx`** takes everything as props: the records, and an `on*`
  function per action returning a promise (pattern 1). It imports nothing from
  `src/mock-data/`, `src/session/` or `react-router-dom`. Lint enforces this on
  `src/pages/`, `src/components/` and `src/utils/`; `*.replica.*` files,
  `*Replica.ts` helpers (such as `src/pages/profile/credentialsReplica.ts`),
  tests and stories are exempt, and a page not yet split carries a `-- debt:`
  disable.
  Its props type (`XPageProps`, a comment on each prop) is the contract
  between the two.
- **`XPage.replica.tsx`** is what `App.tsx` routes to. It holds the fixtures
  in state as the server would, reads URL params, awaits `simulateRequest`,
  fires success toasts and navigates. It is the "page" patterns 4 and 7 mean.
- **In Lightning**, an island wrapper feeds the same `XPage.tsx` from the
  LiveView's `data-*` attributes and turns each `on*` call into a
  `pushEvent`. After an action the LiveView re-renders with new attributes,
  so new props arrive the same way they do in the replica.
- **Shapes are Lightning's**, not the convenient ones: a token arrives
  `masked`.
- **Secrets come back only in an action's reply, never in props**:
  `onGenerateApiKey` answers with the key, `onLoadCredentialSecrets` with a
  credential's stored values. What the host can keep (an OAuth token, the
  generated API key) it keeps, and the page sends nothing of it back.
- **A browser redirect's URL comes from the host**, as data or in a reply
  (`onAuthorizeOauth` answers with the provider's sign-in page). The page
  never builds a provider URL. How the redirect ended comes back as data,
  one answer per attempt (`oauthSignIns`, keyed by `signInId`). Whatever the
  host keeps from it is tied to the form that started it (`formId`) and the
  record it was for, so it can only be saved there.
- **The contract is written by hand.** `XPageProps` and the shapes it names
  never build on the replica's model types (`User`, `Project`, `WorkOrder`,
  in `src/mock-data/models/`); the replica maps fixtures onto them, and lint
  stops `src/types/`, pages and components importing the models. Every one is
  exported from `index.ts`, camelCase, and plain JSON apart from the `on*`
  callbacks.
- **Names say what a shape is**: `…Row` for a table row, `…Ref` for a
  pointer to another record, `…Values` for what a form saves, `…Detail` for
  one record's page, `…Result` for an event's answer, `…Actions` for the
  `on*` set a shared component takes. No two exported types share a name.
- **Required unless the host may not support it.** Data the host always knows
  is required, `T | null` for none. `?:` hides a feature; it never falls back
  to a route or wording the design system makes up.
- **The page keeps UI state only**: which modal is open, a draft not yet
  saved. Never its own copy of the records.
- **The replica shows each kind of refusal once**, not every Lightning
  server rule: one of each the page handles (a field error, a message, a
  refusal after a race). A refusal the page handles the same way as one
  already shown is out of scope; Lightning enforces the rest on the server.
- **Every page gets a story and a `renderPage` test**; see
  `.claude/rules/stories.md` and `.claude/rules/tests.md`.

## 12. Server checks

The page disables or explains an action from the host's `can*` flags
(pattern 9). That is a courtesy, not a check: the host's server is what
decides who may do what, whatever the page sent or shows.

- A page and its components never enforce a permission.
- The replica enforces none either, on purpose: it does whatever it is
  asked, so a page can be tried with any role.
- Contracts don't write down who may do each action. That lives in
  Lightning's code and tests, and a copy here would go stale.
- When a page is ported, each action with a check gets a Lightning test that
  a user without access is refused, and the port gets a security review.

## How to add a pattern to a component

1. Read the pattern here and the worked example.
2. Change the primitive first, with its story showing the new state
   (pending, failed, loading).
3. Apply it to one page end to end, through `simulateRequest`.
4. Run `node scripts/design-system-metrics.mjs`; nothing should go up.
