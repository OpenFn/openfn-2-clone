# API and data principles (from openfn-3-poc main)

Copied from main on 3 Nov: PRINCIPLES.md "How data flows" and .claude/rules/api.md (commit c4e9428). Written for main's layout; in v3-real the wrapper is a page's `*.route.tsx` and `src/api/` is `src/lib/api/`. To fold into PRINCIPLES.md.

## How data flows

A page only shows what it's given (props). That way the same page works inside today's Lightning and in the new app. Fetching and saving happen in a small file beside each page, the wrapper and never in the page itself. 

- **Loading.** The wrapper loads with TanStack Query. The page never
  fetches, and never imports `src/api/`.
- **Saving.** After a save, the wrapper marks the affected queries
  stale, and the page's `on*` promise resolves once they've reloaded, the way
  LiveView re-renders after an event. Never write a response into the cache.
  Show a change before the server confirms it only where the page already
  does (`useChosenValue`).
- **Waiting and refusals.** While data loads, or when the server
  refuses the whole page, the page gets an optional `status` prop, and
  `AsyncBoundary` shows it in Lightning's words. A failed save stays in its
  form. A failed action with no form shows its error in a toast that stays
  until dismissed. A crash shows an error page with "Try again". The API
  code never shows a toast; the page decides where a message goes.
- **The API code.** One `src/api/` folder: `client.ts` talks to
  Lightning (or the stand-in) and turns refusals into `ApiError`, and one file
  per resource holds the API's shape, the mapper to page props, the query keys,
  the queries and the saves. Show the server's `detail`; branch on `code`.

How to apply it is in `.claude/rules/api.md`.




# The API and the wrappers that call it

PRINCIPLES.md "How data flows" says what; this is how.
At the moment the app supports us moving to Lightning as a single page React app with API or connecting up the existing backend with React islands. This document talks about the api side of things.

## `src/api/`

- `client.ts` is the only file that calls `fetch`. `request(method, path, body)`
  goes to Lightning through the Vite `/api` proxy with `VITE_API=lightning`,
  or to the stand-in, which replays `recorded/` answers. `listAll(path, key)`
  follows `links.next` to the end.
- A refused request throws `ApiError`. Show its `message` (the server's
  `detail`); branch on `code`, never on the words. Body errors arrive
  as `fieldErrors`, ready for the form.
- One file per resource (`credentials.ts`, `projects.ts`, …), holding, in
  this order: the API's type (`ApiCredential`, snake_case as sent), the mapper
  to the page's props type (a plain function), the query keys, the
  queries and the saves.
- Query keys go from general to specific, all from that file:
  `["credentials"]`, `["projects", id, "members"]`.
- No UI here: no components, no toasts (lint).
- In tests and stories, `failNext({ status, code, detail, errors })` makes
  the stand-in's next request fail.

## The wrapper

- Loads with `useQuery`, maps the answer with the resource's mapper, and
  passes the page its usual props plus `status`. Independent queries run side
  by side, never one after another.
- `status` comes from the query: loading while there's no data, `notFound` /
  `forbidden` from the `ApiError` code, otherwise `error` with its message.
  The page draws it with `AsyncBoundary`. A refetch keeps the old rows on
  screen.
- A save is a `useMutation` whose `onSuccess` returns the invalidation of
  every key the save changed. The page's `on*` gets `mutateAsync`, so it
  resolves once the lists have reloaded and rejects with the `ApiError` the
  form shows (STANDARDS pattern 1).
- Never `setQueryData` (lint): the server's answer comes back through the
  refetch. Show a change early only where the page already uses
  `useChosenValue`.
- A success toast is the wrapper's, after the save resolves, in Lightning's
  flash wording. An error toast is the page's, for an action with no form
  (`useAction(handler, { onError: "toast" })`, STANDARDS pattern 1); it
  stays until dismissed. Nothing in `src/api/` toasts.
- The page's props and action types don't change to suit the API. A new
  thing is an optional prop, so Lightning's LiveView wrapper keeps compiling.
  If a page needs a prop changed, stop and ask.
- What the API can't give a page yet is mapped to the answer for "none" and
  tracked as a finding, not faked in the page.
