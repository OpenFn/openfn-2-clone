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
`src/pages/profile/CredentialsIndexPage.replica.tsx`.

The page must already be split into a page and a `.replica.tsx` wrapper. If
it isn't, or if the API would need the page's props to change, stop and ask.
The one change a page may need is an optional `status` prop, drawn with
`AsyncBoundary` around the part that shows the data, if it doesn't have one
yet (as `CredentialsIndexPage` does). Then run step 6's overnight-1 check.

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
  `step_up_required`. Try it before and after `POST /api/session` with just
  `{"password": …}`. The page has no step-up screen, so the page shows
  Lightning's refusal; track it as a gap.
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
   the gap.
   When a mapper needs to know who's looking, use `meQuery` (`me.ts`, the
   API's `GET /api/me`), not `useCurrentUser()`, which is the fixture's.
3. **Query keys**, general to specific: `["tokens"]`,
   `["projects", id, "members"]`. Reuse another resource's keys from its
   file (`projectKeys`), never retype them. A sub-route
   (`/api/projects/:id/members`) goes in its parent's file, as environments
   do in `credentials.ts`.
4. **Requests**: `listAll(path, key)` for a paged list, `request(...)`
   for the rest. Turn Lightning's field names into the form's with
   `withFieldNames` (`client.ts`), so a refusal lands on the right field.
   A refusal of something the API can't do yet is an `ApiError` the form
   shows, in plain words ("Lightning's API can't change this yet").
5. **The hooks** a wrapper calls:
   - `useXIndex()`: one `useQuery` per list, side by side, and
     `status: statusOf(...queries)`. Returns the page's data props, mapped.
     A query per row (each project's members) is `useQueries` over the
     parent list; it starts once the parent has loaded, so give the test's
     `waitFor` more than its one second.
   - `useXSaves()`: one `useSave(keys, fn)` per action (`client.ts`), with
     the keys of every list the save can change, on any page. The page's
     promise then resolves only once those lists have reloaded. Never
     `setQueryData` (lint stops it).
6. **The stand-in**: `standIn(method, route, handler)` for every route the
   page calls, answering and refusing as Lightning does, in Lightning's
   exact words. Its data comes from `src/api/recorded/<resource>.json`,
   recorded from the real Lightning with `curl`. Check a recording for
   anything that looks like a secret before committing; GitHub blocks the
   push if it finds one.

## 3. The wrapper

- Call the hooks and spread what they return into the page, after anything
  still on the fixture, so the API's data wins.
- Add each success toast here, after the save resolves, in Lightning's
  flash wording. Error toasts are the page's, not the wrapper's.
- Keep on the fixture only what the API doesn't serve yet, and say so in the
  wrapper's comment.

## 4. Test

`src/api/<resource>.test.ts`, through `renderHook` with a fresh
`QueryClient` (see `credentials.test.ts`). At least:

- a save resolves only once the list has reloaded with it (check the
  query cache right after the promise resolves);
- a refusal from Lightning lands on the form's field name;
- each refusal you added for something the API can't do.

Break the invalidation once and watch the first test fail.

## 5. See it work, both ways

Start the replica twice: `npx vite --port <a>` for the stand-in, and
`VITE_API=lightning npx vite --port <b>` against Lightning on :4000. In a
headless browser (Playwright from `node_modules`), sign in on the live one
by calling `fetch("/api/session", { method: "POST", ... })` from the page
and reload (a list that loaded before signing in holds its 401), then go through every action on the page in both modes: a save, a refusal,
a delete. Log each non-GET request and each 4xx answer. Look at the
screenshots. Delete what you created on the real Lightning afterwards, and
make the script refuse to delete anything that was there before you started:
other people use the same Lightning. Don't keep screenshots that show a real
secret.

## 6. Checks

- `npm run lint`, `npm run build`, `npm test`.
- If the page or its props changed (they shouldn't), overnight-1's
  typecheck and that page's test in `test/design-system/`, compared with
  `main`.
