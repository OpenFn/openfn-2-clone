---
paths:
  - "src/api/**"
  - "src/**/*.replica.tsx"
  - "src/**/*Replica.ts"
---

# The API and the wrappers that call it

PRINCIPLES.md "How data flows" says what; this is how. Decisions D373–D376.

## `src/api/`

- `client.ts` is the only file that calls `fetch`. `request(method, path, body)`
  goes to Lightning through the Vite `/api` proxy with `VITE_API=lightning`,
  or to the stand-in, which replays `recorded/` answers. `listAll(path, key)`
  follows `links.next` to the end.
- A refused request throws `ApiError`. Show its `message` (the server's
  `detail`); branch on `code`, never on the words (G199). Body errors arrive
  as `fieldErrors`, ready for the form.
- One file per resource (`credentials.ts`, `projects.ts`, …), holding, in
  this order: the API's type (`ApiCredential`, snake_case as sent), the mapper
  to the page's props type (a plain function, D363), the query keys, the
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
  flash wording. Errors are never toasted.
- The page's props and action types don't change to suit the API. A new
  thing is an optional prop, so Lightning's LiveView wrapper keeps compiling.
  If a page needs a prop changed, stop and ask.
- What the API can't give a page yet is mapped to the answer for "none" and
  tracked as a finding for Brandon, not faked in the page.
