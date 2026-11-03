# Misfits

These are methods from the [decoupling design](https://github.com/OpenFn/context/tree/main/lightning/brandon/decoupling-experiment-v2)
that this API doesn't take on. The API serves two kinds of client: scripts,
CLIs and other services holding a bearer token, and Lightning's own app holding
a [session token](./authentication.md#session-tokens). The methods below fit
neither, because they are browser navigation, a live connection, code inside
the backend, or a page's own helper that an existing route already covers.

Each section names the methods, says why, and what to use instead. The
[register](./register.md) lists every method and links here.

## Browser redirects

`GET /sso/callback`, `GET /oauth_clients/:id/authorize_url`,
`POST /oauth/callback`, `POST /me/github-connection/authorize`,
`GET /oauth/github/callback`.

Signing in with a provider, connecting an OAuth credential and connecting a
GitHub account all send the browser to another site and back to Lightning.
Those are page loads with redirects, not API calls, and they stay as
Lightning's own browser routes. The app starts sign-in from a provider's
`start_url` on [`GET /api/instance`](./account.md#get-the-instance), and the
session cookie carries the person through.

Connecting an OAuth credential has an open question the design also flagged:
how the token the provider returns reaches the credential without passing
through the browser. It should be settled before this flow moves off LiveView.

## Not needed with a session cookie

`POST /session/token_exchange`.

The design traded a one-time code for a session after a redirect, because its
sessions were bearer tokens the redirect couldn't carry. A session cookie is set
by the redirect itself, so there is nothing to trade.

## Cancelling your own deletion

`DELETE /me/deletion`.

Scheduling your own deletion signs you out and disables the account, so you
can't sign in to cancel it. A superuser or the service account cancels it with
[`DELETE /api/users/:id/scheduled_deletion`](./users.md#cancel-a-users-deletion).

## Immediate purges

`DELETE /me`, `DELETE /projects/:id`, `DELETE /admin/projects/:id`,
`DELETE /admin/users/:id`.

Deleting a project or user here schedules it, and Lightning removes it after
the instance's retention period. Deleting one that is already scheduled answers
409 `scheduled_for_deletion`, so a retried request can't turn a schedule into
permanent loss. A route that purges at once would undo that guarantee, for a
script or the app alike.

## Confirm-dialog previews

`GET /projects/:id/members/:member_id/removability`,
`GET /projects/:project_id/work_orders/retriable_jobs`,
`GET /sandboxes/:id/merge/targets`.

These word a confirmation before the user clicks. The routes that do the work
already answer the same questions: removing a member refuses with a 422 naming
the rule (`one_owner`), a bulk retry answers with how many it
`enqueued` and `discarded`, and a merge or
[merge preview](./projects.md#preview-a-sandbox-merge) refuses a target it
can't use. What the caller may do at all is `permissions` on
[`GET /api/projects/:id`](./projects.md#get-a-project).

## Form helpers

`POST /triggers/cron/preview`, `POST /auth/provider-config/test`.

These check a form before it is saved. The write does the check: a workflow
with a bad cron expression answers 422 `invalid`, and
[`PUT /api/auth_provider`](./authentication.md#set-the-sign-in-provider)
answers 422 with a `discovery_failed` entry when the provider can't be reached.
[`POST /api/projects/:project_id/workflows/validations`](./workflows.md#validate-a-workflow)
checks a whole workflow without saving it.

## Page-shaped aggregates

`GET /workflows/:id/context`, `GET /projects/:project_id/collections/:name/export`.

The first gathers ten things the editor needs when it opens into one response.
Each part has its own route here, and the project's `permissions` and `limits`
cover the rest. The second sends a whole collection as one file, with no
limit on its size. [Streaming items](./collections.md#stream-items) returns the
same items in batches.

## Live connections

`WS JOIN workflow:collaborate/:workflow_id[:vN]`, `WS SEND yjs.sync` /
`yjs.update`, `GET workflow:collaborate/:workflow_id/session`,
`POST workflow:collaborate/:workflow_id/save`,
`POST workflow:collaborate/:workflow_id/save_and_sync`,
`POST workflow:collaborate/:workflow_id/reset`,
`POST workflow:collaborate/:workflow_id/ai_apply_lock` (and its release),
`WS presence`, `run:<id>` follow channel, `GET /ai/sessions/:id/events`.

Editing a workflow together, following a run as it happens and watching the AI
assistant's reply arrive all run over a connection that stays open. This API is
request and response. These belong in a separate realtime surface, using the
same session token, which isn't specified yet.

Without it: read and save a workflow with the [workflow routes](./workflows.md)
(a save while someone has it open answers 409 `being_edited`), poll
`GET /api/runs/:id` and `GET /api/log_lines?run_id=…`, and fetch the AI session
again until its message isn't `pending`. To save and sync, update the workflow,
then `POST /api/projects/:project_id/repo_connection/syncs`.

## Worker protocol

Worker leg of `run:<id>`.

Workers claim and report on runs over their own socket with worker and run
tokens. That protocol is separate from this API and isn't being redesigned.

## In-process contracts

`authenticate/1`, `authorize/3`, `scope/3`, `assert_elevated/1`.

These are function calls inside the backend, not HTTP routes. Every route here
already authenticates, authorizes and scopes in the
[order of checks](./errors.md#order-of-checks).

## Re-parenting a project

The `parent_id` part of `PATCH /admin/projects/:id`.

Moving a project under a new parent turns it into a sandbox, or moves a sandbox
to a different workspace. That changes its environment, who can see it, its
MFA and its merge targets, and nothing checks the new parent for cycles. Create
a sandbox with `PUT /api/projects/:project_id/sandboxes/:id` instead.
