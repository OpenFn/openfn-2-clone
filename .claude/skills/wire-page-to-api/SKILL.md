---
name: wire-page-to-api
description: Wire a split page (one with a .replica.tsx wrapper) to Lightning's JSON API through src/api/, so it reads and writes real data, or the stand-in's, with TanStack Query. Use for "wire X to the API", "put X on the API", "move X off the fixture", or any page of the API demo after Credentials. Pages that are lists with saves fit; sign-in does not.
---

# Wire a page to Lightning's API

The page itself doesn't change. Everything that talks to the API goes in
one file, `src/api/<resource>.ts`, and the wrapper only calls the hooks that
file exports. PRINCIPLES.md "How data flows" says why;
`.claude/rules/api.md` says how. The worked example is Credentials:
`src/api/credentials.ts`, its test, and
`src/pages/profile/CredentialsIndexPage.replica.tsx`. Project members
(`src/api/projects.ts`, `ProjectSettingsPage.replica.tsx`) is the example of
one tab of a bigger page.

The page must already be split into a page and a `.replica.tsx` wrapper. If
it isn't, or if the API would need the page's props to change, stop and ask.
The one change a page may need is an optional `status` prop, drawn with
`AsyncBoundary` around the part that shows the data, if it doesn't have one
yet (as `CredentialsIndexPage` does). When only part of the page moves to
the API (one tab), the prop is named for that part (`collaborationStatus`)
and wraps only it. Then run step 7's overnight-1 check.

## 1. Match the page to the API

- List the page's props and every `on*` action (the page's props type in
  `src/types/`).
- Find each one's route in Lightning's `API.md` on the branch you're wiring
  to, then read the controller and its JSON view: field names, which body
  keys a route accepts (`@accepted`), what it refuses and in which words.
- Try each route once with `curl` against a running Lightning, signed in by
  `POST /api/session` (send `Sec-Fetch-Site: same-origin`; writes need the
  `x-csrf-token` from `GET /api/session`). The docs and the code disagree
  more often than you'd think.
- A route marked "stepped up" refuses a fresh sign-in with 403
  `step_up_required`. The wrapper catches it with `isStepUpRequired`
  (`client.ts`) and sends the person to
  `/auth/confirm_access?return_to=<this page>`, which steps the session up
  and brings them back (`TokensPage.replica.tsx`). Track it as a gap if
  Lightning's own page doesn't ask.
- Some routes outside `/api` take only an API token, not the session
  (a collection's items, `/collections/:name`). The app can't call them:
  the action refuses in plain words, and it's a gap.
- Anything the page needs that the API doesn't give is a gap. Track each
  gap as a finding (the `track` skill), one line each: the route, what's
  missing, what the page does instead.

## 2. Write `src/api/<resource>.ts`

In this order, as in `credentials.ts`:

1. **The API's types**, as Lightning sends them (snake_case).
2. **Mappers**, plain functions from the API's shape to the page's row type.
   What the API doesn't send gets the answer for "none" (an empty list,
   `null`), never made-up data. When another route has it (counts from a
   list, a role from the members), read that route instead, and still track
   the gap. When "none" would skip a warning or a confirmation, it isn't
   safe: say so in your report so someone picks the safe default (the
   remove-collaborator warning takes `null` for "can't say").
3. **Query keys**, general to specific: `["tokens"]`,
   `["projects", id, "members"]`. Reuse another resource's keys from its
   file (`projectKeys`), never retype them. A sub-route
   (`/api/projects/:id/members`) goes in its parent's file, as environments
   do in `credentials.ts`.
4. **Requests**: `listAll(path, key)` for a paged list, `request(...)`
   for the rest.
   - Wrap every request that can be refused in `withFieldNames` (`client.ts`)
     with a map from each place Lightning can blame (`#/name`,
     `#/credential_bodies/0/body/hostUrl`, `#/project_credentials/0/project_id`)
     to the form's field. An error Lightning places at a path or query
     parameter has no body pointer; pass `placeUnplaced` to put it on a
     field. Any key the form doesn't know leaves only "Please fix the errors
     below." with nothing highlighted.
   - A refusal of something the API can't do yet is an `ApiError` the form
     shows, in plain words ("Lightning's API can't change this yet"). If the
     form has no field to show it on, leave the field out so it shows at the
     top.
   - A save that takes several requests (the API has no single one) does
     first whatever Lightning is most likely to refuse, never deletes before
     the write that replaces it, and is tracked as a gap. `useSave` reloads
     either way, so a refusal halfway still shows what did save.
5. **The hooks** a wrapper calls:
   - `useXIndex()`: one `useQuery` per list, side by side, and
     `status: statusOf(...queries)`. Returns the page's data props, mapped.
     A query per row (each project's members) is `useQueries` over the
     parent list; it starts once the parent has loaded, so give the test's
     `waitFor` more than its one second.
   - `useXSaves()`: one `useSave(keys, fn)` per action (`client.ts`), with
     the keys of every list the save names or touches, on any page. The
     page's promise then resolves only once those lists have reloaded.
     Never `setQueryData` (lint stops it).
6. **The stand-in**: `standIn(method, route, handler)` for every route the
   page calls. Keep it thin: replay reads, apply writes simply, and copy
   only the refusals the page shows or a test uses, in Lightning's exact
   words. Its data comes from `src/api/recorded/<resource>.json`, recorded
   from the real Lightning with `curl`. Check a recording for anything that
   looks like a secret or a real token before committing (redact it);
   GitHub blocks the push if it finds one.
   - A route another file's stand-in answers (`GET /api/credentials`) is
     only taught once that file loads; `import type` doesn't load it, so
     import the file itself too, or the page says "not found" on the
     stand-in.
   - Lightning sends a changeset's refusals together (a blank name and a
     bad URL in one answer), and a name taken only once those pass, as the
     database checks it. The stand-in refuses in the same order.

## 3. The wrapper

- Call the hooks and spread what they return into the page, after anything
  still on the fixture, so the API's data wins.
- Add each success toast here, after the save resolves, in Lightning's
  flash wording. Error toasts are the page's, not the wrapper's.
- Keep on the fixture only what the API doesn't serve yet, and say so in the
  wrapper's comment.
- **The fixtures' ids aren't Lightning's.** Live, the signed-in person has
  Lightning's id, and so do the projects, so anything the wrapper still
  works out from the fixture comes out empty or all-false:
  - permissions: take the viewer's role from the API (the members list)
    and use `permissionsForRole(role, viewer)`, not
    `permissionsFor(fixtureProject, viewer)`. A tab's hook that needs the
    role reads `meQuery` and `membersQuery` itself (the same cache, no
    extra request) and its `status` covers them, so the tab never shows
    its buttons off while the members load;
  - a project the wrapper finds in the fixture: find it by name on the API
    too (`useProjectName`), and read and save under the URL's id.
  List every fixture lookup and permission left in the wrapper and check
  each one live.
- Who's looking: `useCurrentUser()` is Lightning's person live, and on the
  stand-in the fixture user with the same email and Lightning's role. A
  mapper that needs the viewer's id uses `meQuery` (`me.ts`).

## 4. Test

`src/api/<resource>.test.ts`, through `renderHook` with a fresh
`QueryClient` (see `credentials.test.ts`). At least:

- a save resolves only once the list has reloaded with it (check the
  query cache right after the promise resolves);
- a refusal from Lightning lands on the form's field name;
- each refusal you added for something the API can't do, sent the way the
  form would send it: the page's own checks may refuse first (a blank
  secret), so the hook's refusal may never be reached;
- for a save of several requests, one refused partway: the list shows what
  did save.

Break the invalidation once and watch the first test fail.

The page's `.replica.test.tsx`, if it has one, moves onto the stand-in too:
render it inside a fresh `QueryClientProvider`, and inside
`ReactRouterAdapter` under the `MemoryRouter` if the page navigates with
`useRouter()`. The stand-in's data lives as long as the test file, so give
each test its own new record, and put a test that deletes a recorded one
last. Each request waits the stand-in's delay, so a page that loads in
several rounds (a tree a level at a time, then members) needs `waitFor`
timeouts of several seconds.

## 5. See it work, both ways

Start the replica twice: `npm run dev:fake -- --port <a>` for the stand-in,
and `npm run dev -- --port <b>` against Lightning on :4000. In a headless
browser (Playwright from `node_modules`), sign in through the log in page
(demo@openfn.org / welcome12345 on both), then go through every action on
the page in both modes: a save, a refusal, a delete.

- Do the same clicks on both, as the same person, and compare what each
  allows: role, the buttons that are on, what's refused. The stand-in is the
  demo's fallback; it must allow what live allows and refuse what live
  refuses.
- Open the page for every record the recording holds, including odd ones
  (a credential with no environments, a project you're not owner of), and
  edit each one.
- End the session from outside (`DELETE /api/session` with curl, as the
  same person) while the page is open, then click something: you should land
  on log in and come back to the page after signing in.
- Wait for a modal to close rather than for a fixed time: live answers are
  slower than the stand-in's. Log each non-GET request and each 4xx answer.
  Look at the screenshots.
- Delete what you created on the real Lightning afterwards, and make the
  script refuse to delete anything that was there before you started: other
  people use the same Lightning. Signing out disconnects that person's other
  open pages, so don't sign out while someone is using it. Don't keep
  screenshots that show a real secret.

## 6. Checks

- `npm run lint`, `npm run build`, `npm test`; `npm run test:stories` if a
  component or story changed.

## 7. overnight-1

If the page or its props changed (an optional `status` counts), run
overnight-1's typecheck and that page's test in `test/design-system/`, on
this branch and on `main`, and compare: the bar is no new failures. Its
tests only see one React if the design system sits in a folder named
`openfn-ia-demo-overnight`, so copy the worktree to
`/tmp/<x>/openfn-ia-demo-overnight` and point
`<overnight checkout>/assets/node_modules/@openfn/ui` at the copy; move the
installed package aside first and put it back after.
