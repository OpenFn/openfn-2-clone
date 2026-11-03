# Lightning API reference

This page covers Lightning's HTTP API for clients outside Lightning (scripts,
CLIs, infrastructure automation and other services) and, with a planned
[session token](./authentication.md#session-tokens), for Lightning's own app.

All paths are relative to your instance, for example
`https://app.openfn.org`. Request and response bodies are JSON unless a section
says otherwise.

## Contents

- [Authentication](./authentication.md): tokens, service accounts, session tokens and scopes
- [Account](./account.md): signing in, and a person's own account, MFA and tokens
- [Conventions](./conventions.md): identifiers, content types, idempotent writes, pagination, dates
- [Errors](./errors.md): problem documents, order of checks, response and entry codes, unknown routes
- [Projects](./projects.md): projects, members and sandboxes
- [Credentials](./credentials.md)
- [Collections](./collections.md): collections and their items
- [Users](./users.md)
- [Workflows](./workflows.md)
- [Jobs](./jobs.md)
- [Work orders](./work-orders.md): listing work orders and running a workflow
- [Runs](./runs.md): listing, cancelling and retrying runs, and their steps
- [Dataclips](./dataclips.md)
- [Log lines](./log-lines.md)
- [Provisioning](./provisioning.md): deploying and exporting a whole project
- [GitHub sync](./github-sync.md): connecting a project to a repository
- [Webhooks](./webhooks.md): triggering workflows and webhook auth methods
- [Channels](./channels.md): proxying requests and their history
- [Audit events](./audit-events.md)
- [AI assistant](./ai-assistant.md)

Two pages track this reference against the
[decoupling design](https://github.com/OpenFn/context/tree/main/lightning/brandon/decoupling-experiment-v2):

- [Register](./register.md): every method in that design and where it stands here
- [Misfits](./misfits.md): the methods that don't belong in this API, and why

## Status

Every endpoint carries a status:

| Status | Meaning |
| --- | --- |
| **Public** | Available now. Any client with the right token can call it. |
| **Private** | Lightning can already do this inside the app, but there is no API route for it yet. The spec here is how the route should look, following the same patterns as the public routes. Each one has an implementation note naming the function that does the work today and how it differs from the spec. |
| **Planned** | Lightning can't do this yet, or can only do part of it. The spec here is how the route should look, following the same patterns. |

A Public or Private endpoint can also list **planned additional scope**: things
it should do that it doesn't yet, such as a filter, a field or a token kind.

Public means available on the API branch this reference tracks,
`stuart/api-contract` in OpenFn/lightning, which hasn't merged to `main` yet.
Its own `API.md` and `SERVICE_ACCOUNTS.md` describe the same routes for
operators. Most Public routes are on `main` too, but a few aren't:
`PUT /api/projects/:id`, `GET` and `PUT /api/credentials/:id`, and `GET` and
`PUT /api/projects/:project_id/collections/:id`. On `main`, the service account
can only call `/api/users`, with the scopes `users:read` and `users:write`. Its
scopes `projects:write`, `credentials:write` and `collections:write`, the
`members` attribute on a project, the problem documents in
[Errors](./errors.md) and the order of checks there are also missing. Until the
branch merges, treat those as Public on the branch only.

## All endpoints

| Method | Path | Status |
| --- | --- | --- |
| `GET` | [`/.well-known/oauth-authorization-server`](./authentication.md) | Public |
| `POST` | [`/api/oauth/token`](./authentication.md) | Public |
| `GET` | [`/api/instance`](./account.md) | Private |
| `POST`, `GET`, `DELETE` | [`/api/session`](./account.md) | Private |
| `POST` | [`/api/password_resets`](./account.md) | Private |
| `PUT` | [`/api/password_resets/:token`](./account.md) | Private |
| `POST` | [`/api/confirmations`](./account.md) | Private |
| `PUT` | [`/api/confirmations/:token`](./account.md) | Private |
| `GET` | [`/api/me`](./account.md) | Private |
| `GET`, `POST` | [`/api/me/tokens`](./account.md) | Private |
| `DELETE` | [`/api/me/tokens/:id`](./account.md) | Private |
| `GET`, `POST`, `PUT`, `DELETE` | [`/api/me/mfa`](./account.md) | Private |
| `POST` | [`/api/me/mfa/backup_codes`](./account.md) | Private |
| `DELETE` | [`/api/me/identities/:id`](./account.md) | Planned |
| `DELETE` | [`/api/me/github_connection`](./account.md) | Private |
| `GET` | [`/api/me/github_repos`, `/api/me/github_repos/:owner/:name/branches`](./account.md) | Private |
| `GET` | [`/api/projects`](./projects.md) | Public |
| `GET` | [`/api/projects/:id`](./projects.md) | Public |
| `PUT` | [`/api/projects/:id`](./projects.md) | Public |
| `DELETE` | [`/api/projects/:id`](./projects.md) | Private |
| `DELETE` | [`/api/projects/:id/scheduled_deletion`](./projects.md) | Private |
| `PUT` | [`/api/projects/:id/data_retention`](./projects.md) | Private |
| `PUT` | [`/api/projects/:id/mfa_requirement`](./projects.md) | Private |
| `PUT` | [`/api/projects/:id/support_access`](./projects.md) | Private |
| `GET` | [`/api/projects/:project_id/members`](./projects.md) | Private |
| `PUT` | [`/api/projects/:project_id/members/:user_id`](./projects.md) | Private |
| `DELETE` | [`/api/projects/:project_id/members/:user_id`](./projects.md) | Private |
| `PUT` | [`/api/projects/:project_id/members/:user_id/notifications`](./projects.md) | Private |
| `POST` | [`/api/projects/:project_id/invitations`](./projects.md) | Private |
| `GET` | [`/api/projects/:project_id/sandboxes`](./projects.md) | Private |
| `PUT` | [`/api/projects/:project_id/sandboxes/:id`](./projects.md) | Private |
| `POST` | [`/api/projects/:project_id/sandboxes/:id/merge_previews`](./projects.md) | Private |
| `POST` | [`/api/projects/:project_id/sandboxes/:id/merges`](./projects.md) | Private |
| `GET` | [`/api/credentials`](./credentials.md) | Public |
| `GET` | [`/api/projects/:project_id/credentials`](./credentials.md) | Public |
| `POST` | [`/api/credentials`](./credentials.md) | Public |
| `GET` | [`/api/credentials/:id`](./credentials.md) | Public |
| `PUT` | [`/api/credentials/:id`](./credentials.md) | Public |
| `DELETE` | [`/api/credentials/:id`](./credentials.md) | Public |
| `PUT` | [`/api/credentials/:id/scheduled_deletion`](./credentials.md) | Private |
| `DELETE` | [`/api/credentials/:id/scheduled_deletion`](./credentials.md) | Private |
| `PUT` | [`/api/projects/:project_id/credentials/:id`](./credentials.md) | Private |
| `DELETE` | [`/api/projects/:project_id/credentials/:id`](./credentials.md) | Private |
| `GET` | [`/api/credentials/:id/environments`](./credentials.md) | Private |
| `PUT` | [`/api/credentials/:id/environments/:name`](./credentials.md) | Private |
| `DELETE` | [`/api/credentials/:id/environments/:name`](./credentials.md) | Private |
| `PUT` | [`/api/credentials/:id/transfer`](./credentials.md) | Private |
| `DELETE` | [`/api/credentials/:id/transfer`](./credentials.md) | Private |
| `GET` | [`/api/oauth_clients`, `/api/projects/:project_id/oauth_clients`](./credentials.md) | Private |
| `PUT` | [`/api/oauth_clients/:id`](./credentials.md) | Private |
| `DELETE` | [`/api/oauth_clients/:id`](./credentials.md) | Private |
| `GET` | [`/api/projects/:project_id/keychain_credentials`](./credentials.md) | Private |
| `PUT` | [`/api/projects/:project_id/keychain_credentials/:id`](./credentials.md) | Private |
| `DELETE` | [`/api/projects/:project_id/keychain_credentials/:id`](./credentials.md) | Private |
| `GET` | [`/api/credential_schemas`, `/api/credential_schemas/:name`](./credentials.md) | Private |
| `GET` | [`/api/projects/:project_id/collections`](./collections.md) | Private |
| `GET` | [`/api/collections`](./collections.md) | Private |
| `GET` | [`/api/projects/:project_id/collections/:id`](./collections.md) | Public |
| `PUT` | [`/api/projects/:project_id/collections/:id`](./collections.md) | Public |
| `DELETE` | [`/api/projects/:project_id/collections/:id`](./collections.md) | Private |
| `GET` | [`/collections/:name`](./collections.md) | Public |
| `POST` | [`/collections/:name`](./collections.md) | Public |
| `DELETE` | [`/collections/:name`](./collections.md) | Public |
| `GET` | [`/collections/:name/:key`](./collections.md) | Public |
| `PUT` | [`/collections/:name/:key`](./collections.md) | Public |
| `DELETE` | [`/collections/:name/:key`](./collections.md) | Public |
| `GET` | [`/api/users`](./users.md) | Public |
| `POST` | [`/api/users`](./users.md) | Public |
| `GET` | [`/api/users/:id`](./users.md) | Public |
| `PATCH` | [`/api/users/:id`](./users.md) | Public |
| `DELETE` | [`/api/users/:id`](./users.md) | Private |
| `DELETE` | [`/api/users/:id/scheduled_deletion`](./users.md) | Private |
| `GET` | [`/api/workflows`](./workflows.md) | Public |
| `GET` | [`/api/workflows/:id`](./workflows.md) | Public |
| `GET` | [`/api/projects/:project_id/workflows`](./workflows.md) | Public |
| `POST` | [`/api/projects/:project_id/workflows`](./workflows.md) | Public |
| `GET` | [`/api/projects/:project_id/workflows/:id`](./workflows.md) | Public |
| `PATCH`, `PUT` | [`/api/projects/:project_id/workflows/:id`](./workflows.md) | Public |
| `DELETE` | [`/api/projects/:project_id/workflows/:id`](./workflows.md) | Private |
| `POST` | [`/api/projects/:project_id/workflows/validations`](./workflows.md) | Planned |
| `GET` | [`/api/workflows/:id/snapshots`, `/api/workflows/:id/snapshots/:snapshot_id`](./workflows.md) | Private |
| `GET` | [`/api/workflows/:id/versions`](./workflows.md) | Private |
| `GET` | [`/api/workflow_templates`](./workflows.md) | Private |
| `PUT` | [`/api/workflows/:id/template`](./workflows.md) | Private |
| `GET` | [`/api/jobs`, `/api/jobs/:id`, `/api/projects/:project_id/jobs`, `/api/projects/:project_id/jobs/:id`](./jobs.md) | Public |
| `GET` | [`/api/work_orders`, `/api/work_orders/:id`, `/api/projects/:project_id/work_orders`, `/api/projects/:project_id/work_orders/:id`](./work-orders.md) | Public |
| `POST` | [`/api/projects/:project_id/workflows/:workflow_id/work_orders`](./work-orders.md) | Private |
| `POST` | [`/api/projects/:project_id/work_orders/retries`](./work-orders.md) | Private |
| `PATCH` | [`/api/work_orders/:id`](./work-orders.md) | Private |
| `POST` | [`/api/projects/:project_id/work_orders/cancellations`](./work-orders.md) | Private |
| `POST` | [`/api/projects/:project_id/history_exports`](./work-orders.md) | Private |
| `GET` | [`/api/projects/:project_id/history_exports`, `/api/projects/:project_id/history_exports/:id`](./work-orders.md) | Private |
| `GET` | [`/api/runs`, `/api/runs/:id`, `/api/projects/:project_id/runs`, `/api/projects/:project_id/runs/:id`](./runs.md) | Public |
| `PATCH` | [`/api/runs/:id`](./runs.md) | Private |
| `POST` | [`/api/runs/:id/retries`](./runs.md) | Private |
| `GET` | [`/api/runs/:id/steps`](./runs.md) | Private |
| `GET` | [`/api/dataclips/:id`](./dataclips.md) | Private |
| `PATCH` | [`/api/dataclips/:id`](./dataclips.md) | Private |
| `GET` | [`/api/projects/:project_id/dataclips`](./dataclips.md) | Planned |
| `GET` | [`/api/log_lines`](./log-lines.md) | Public |
| `POST` | [`/api/provision`](./provisioning.md) | Public |
| `GET` | [`/api/provision/:id`](./provisioning.md) | Public |
| `GET` | [`/api/provision/yaml`](./provisioning.md) | Public |
| `GET` | [`/api/projects/:project_id/repo_connection`](./github-sync.md) | Private |
| `PUT` | [`/api/projects/:project_id/repo_connection`](./github-sync.md) | Private |
| `DELETE` | [`/api/projects/:project_id/repo_connection`](./github-sync.md) | Private |
| `POST` | [`/api/projects/:project_id/repo_connection/syncs`](./github-sync.md) | Private |
| `POST` | [`/i/:trigger_id`, `/i/:project_id/:custom_path`](./webhooks.md) | Public |
| `GET` | [`/i/:trigger_id`, `/i/:project_id/:custom_path`](./webhooks.md) | Public |
| `GET` | [`/api/projects/:project_id/webhook_auth_methods`, `/api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md) | Private |
| `PUT` | [`/api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md) | Private |
| `DELETE` | [`/api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md) | Private |
| Any | [`/channels/:id`, `/channels/:id/*path`](./channels.md) | Public |
| `GET` | [`/api/projects/:project_id/channels`, `/api/projects/:project_id/channels/:id`](./channels.md) | Private |
| `PUT` | [`/api/projects/:project_id/channels/:id`](./channels.md) | Private |
| `DELETE` | [`/api/projects/:project_id/channels/:id`](./channels.md) | Private |
| `GET` | [`/api/projects/:project_id/channel_requests`, `/api/channel_requests/:id`](./channels.md) | Private |
| `GET` | [`/api/audit_events`](./audit-events.md) | Private |
| `GET`, `PUT`, `DELETE` | [`/api/auth_provider`](./authentication.md) | Private |

| `GET`, `POST` | [`/api/projects/:project_id/ai_sessions`](./ai-assistant.md) | Private |
| `GET` | [`/api/ai_sessions/:id`](./ai-assistant.md) | Private |
| `POST` | [`/api/ai_sessions/:id/messages`](./ai-assistant.md) | Private |
| `POST` | [`/api/ai_sessions/:id/messages/:message_id/retries`](./ai-assistant.md) | Private |
