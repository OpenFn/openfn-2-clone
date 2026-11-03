# Decoupling register

The [second decoupling experiment](https://github.com/OpenFn/context/tree/main/lightning/brandon/decoupling-experiment-v2)
designed a 16-service API for Lightning (`api-reqs/`). This register lists every
method from that design, one line each, and records where it stands in this API.

| Status | Meaning |
| --- | --- |
| **Public** | This API already has it, as designed. |
| **Private** | Lightning can do it in the app today, and this API specifies it as a Private endpoint, with an implementation note on how the code differs. |
| **Partial** | This API has it, but without something the design calls for. The endpoint's section lists the gap under "Planned additional scope". |
| **Planned** | Lightning can't do this yet, or the part that does this job isn't there. Specified as a Planned endpoint or field. |
| **Misfit** | Doesn't belong in this API. [Misfits](./misfits.md) says why. |

The design's paths are its own, not this API's: it has no `/api` prefix, and
it addresses some nested resources at the top level. The "This API" column
gives the route here.

The design was for a React app replacing Lightning's pages. Its sign-in,
account and AI methods map to routes that take a
[session token](./authentication.md#session-tokens), the planned token kind
for Lightning's own app. Where an existing or planned route already does a
method's job, the method maps to it rather than getting a route of its own,
and its notes say what part of that route does the job.

Rows in the design's verification tables that aren't methods (domain
libraries, background workers, "no public endpoint" notes) are left out.

## Summary

| Status | Methods |
| --- | --- |
| Public | 26 |
| Private | 114 |
| Partial | 38 |
| Planned | 7 |
| Misfit | 34 |
| **Total** | **219** |

## AccountService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `POST /session` | Private | [`POST /api/session`](./account.md#sign-in) | |
| `POST /session/totp` | Private | [`POST /api/session`](./account.md#sign-in) | Same route: send the MFA code with the sign-in, or after it. |
| `DELETE /session` | Private | [`DELETE /api/session`](./account.md#sign-out) | |
| `POST /session/sudo` | Private | [`POST /api/session`](./account.md#sign-in) | Same route: post the password or a code again to step up. |
| `POST /session/token_exchange` | Misfit | | [Not needed with a session cookie](./misfits.md#not-needed-with-a-session-cookie) |
| `GET /me` | Private | [`GET /api/me`](./account.md#get-the-current-user) | Memberships come from `GET /api/projects`; permissions from `GET /api/projects/:id`. |
| `POST /users` | Partial | [`POST /api/users`](./users.md#create-a-user) | No sign-up without a token yet. |
| `POST /setup/superuser` | Partial | [`POST /api/users`](./users.md#create-a-user) | The first account on a new instance becomes the superuser. |
| `PATCH /me` | Partial | [`PATCH /api/users/:id`](./users.md#update-a-user) | A person can't update themselves yet. |
| `PUT /me/password` | Partial | [`PATCH /api/users/:id`](./users.md#update-a-user) | `password`, with a stepped-up session. |
| `POST /password_resets` | Private | [`POST /api/password_resets`](./account.md#request-a-password-reset) | |
| `POST /password_resets/:token` | Private | [`PUT /api/password_resets/:token`](./account.md#reset-a-password) | |
| `POST /me/email_change` | Partial | [`PATCH /api/users/:id`](./users.md#update-a-user) | `email`, with a stepped-up session; applied once confirmed. |
| `POST /me/email_change/:token` | Private | [`PUT /api/confirmations/:token`](./account.md#confirm) | One route for every emailed link. |
| `POST /confirmations` | Private | [`POST /api/confirmations`](./account.md#resend-a-confirmation) | |
| `POST /confirmations/:token` | Private | [`PUT /api/confirmations/:token`](./account.md#confirm) | |
| `POST /me/mfa/totp` | Private | [`POST /api/me/mfa`](./account.md#start-setting-up-mfa) | |
| `POST /me/mfa/totp/activate` | Private | [`PUT /api/me/mfa`](./account.md#turn-on-mfa) | |
| `DELETE /me/mfa/totp` | Private | [`DELETE /api/me/mfa`](./account.md#turn-off-mfa) | |
| `GET /me/backup_codes` | Private | [`GET /api/me/mfa`](./account.md#get-your-mfa-settings) | Part of the MFA settings. |
| `POST /me/backup_codes` | Private | [`POST /api/me/mfa/backup_codes`](./account.md#make-new-backup-codes) | |
| `GET /me/tokens` | Private | [`GET /api/me/tokens`](./account.md#list-your-personal-access-tokens) | |
| `POST /me/tokens` | Private | [`POST /api/me/tokens`](./account.md#create-a-personal-access-token) | Session token only, stepped up. |
| `DELETE /me/tokens/:id` | Private | [`DELETE /api/me/tokens/:id`](./account.md#revoke-a-personal-access-token) | |
| `POST /me/deletion` | Partial | [`DELETE /api/users/:id`](./users.md#delete-a-user) | Private. A person can't delete themselves yet. |
| `DELETE /me/deletion` | Misfit | | [Cancelling your own deletion](./misfits.md#cancelling-your-own-deletion) |
| `DELETE /me` | Misfit | | [Immediate purges](./misfits.md#immediate-purges) |
| `PUT /me/consent` | Partial | [`PATCH /api/users/:id`](./users.md#update-a-user) | `consent`, with a session token. |

## AiAssistantService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/ai/sessions` | Private | [`GET /api/projects/:project_id/ai_sessions`](./ai-assistant.md#list-a-projects-ai-sessions) | |
| `POST /projects/:project_id/ai/sessions` | Private | [`POST /api/projects/:project_id/ai_sessions`](./ai-assistant.md#start-an-ai-session) | |
| `GET /ai/sessions/:id` | Private | [`GET /api/ai_sessions/:id`](./ai-assistant.md#get-an-ai-session) | |
| `PATCH /ai/sessions/:id` | Private | [`POST /api/ai_sessions/:id/messages`](./ai-assistant.md#send-a-message) | The job context rides on each message, as the design itself suggested. |
| `POST /ai/sessions/:id/messages` | Private | [`POST /api/ai_sessions/:id/messages`](./ai-assistant.md#send-a-message) | |
| `POST /ai/sessions/:id/messages/:message_id/retry` | Private | [`POST /api/ai_sessions/:id/messages/:message_id/retries`](./ai-assistant.md#retry-a-message) | |
| `GET /ai/sessions/:id/events` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `GET /me/ai/disclaimer` | Planned | [`GET /api/me`](./account.md#get-the-current-user) | `ai_disclaimer_accepted_at`. Lightning doesn't store the acceptance yet. |
| `PUT /me/ai/disclaimer` | Partial | [`PATCH /api/users/:id`](./users.md#update-a-user) | `ai_disclaimer_accepted`, with a session token. |
| `GET /ai/availability` | Private | [`GET /api/instance`](./account.md#get-the-instance) | `ai_assistant`. |
| `GET /projects/:project_id/ai/usage` | Partial | [`GET /api/projects/:id`](./projects.md#get-a-project) | No `limits` yet. |

## AuthorizationService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /me/permissions` | Partial | [`GET /api/projects/:id`](./projects.md#get-a-project) | No `permissions` yet. |
| `authenticate/1` | Misfit | | [In-process contracts](./misfits.md#in-process-contracts) |
| `authorize/3` | Misfit | | [In-process contracts](./misfits.md#in-process-contracts) |
| `scope/3` | Misfit | | [In-process contracts](./misfits.md#in-process-contracts) |
| `assert_elevated/1` | Misfit | | [In-process contracts](./misfits.md#in-process-contracts) |

## ChannelService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/channels` | Private | [`GET /api/projects/:project_id/channels`](./channels.md#list-a-projects-channels) | Counts ride on each row; the design's `summary` block is left out. |
| `GET /channels/:id` | Private | [`GET /api/projects/:project_id/channels/:id`](./channels.md#get-a-channel) | |
| `POST /projects/:project_id/channels` | Private | [`PUT /api/projects/:project_id/channels/:id`](./channels.md#create-or-replace-a-channel) | |
| `PATCH /channels/:id` | Private | [`PUT /api/projects/:project_id/channels/:id`](./channels.md#create-or-replace-a-channel) | |
| `DELETE /channels/:id` | Private | [`DELETE /api/projects/:project_id/channels/:id`](./channels.md#delete-a-channel) | |
| `GET /projects/:project_id/channel_requests` | Private | [`GET /api/projects/:project_id/channel_requests`](./channels.md#list-channel-requests) | |
| `GET /channel_requests/:id` | Private | [`GET /api/channel_requests/:id`](./channels.md#get-a-channel-request) | |
| `ANY /channels/:id/*` | Public | [`ANY /channels/:id/*path`](./channels.md#send-a-request-through-a-channel) | Live in Lightning but missing from this reference until now. |

## CollaborationService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `WS JOIN workflow:collaborate/:workflow_id[:vN]` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `WS SEND yjs.sync` / `yjs.update` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `GET workflow:collaborate/:workflow_id/session` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `POST workflow:collaborate/:workflow_id/save` | Misfit | | [Live connections](./misfits.md#live-connections). Saving outside the editor is `PATCH /api/projects/:project_id/workflows/:id`. |
| `POST workflow:collaborate/:workflow_id/save_and_sync` | Misfit | | [Live connections](./misfits.md#live-connections). Outside the editor: update the workflow, then `POST /api/projects/:project_id/repo_connection/syncs`. |
| `POST workflow:collaborate/:workflow_id/reset` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `POST workflow:collaborate/:workflow_id/ai_apply_lock` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `POST workflow:collaborate/:workflow_id/ai_apply_lock/release` | Misfit | | [Live connections](./misfits.md#live-connections) |
| `WS presence` | Misfit | | [Live connections](./misfits.md#live-connections) |

## CollectionsService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/collections` | Partial | [`GET /api/projects/:project_id/collections`](./collections.md#list-a-projects-collections) | Private. No storage size or sort yet. |
| `GET /collections` | Private | [`GET /api/collections`](./collections.md#list-every-collection) | |
| `POST /projects/:project_id/collections` | Public | [`PUT /api/projects/:project_id/collections/:id`](./collections.md#create-or-rename-a-collection) | |
| `GET /projects/:project_id/collections/:name` | Partial | [`GET /api/projects/:project_id/collections/:id`](./collections.md#get-a-collection) | Addressed by id, not name. No storage size yet. |
| `PATCH /projects/:project_id/collections/:name` | Public | [`PUT /api/projects/:project_id/collections/:id`](./collections.md#create-or-rename-a-collection) | |
| `DELETE /projects/:project_id/collections/:name` | Private | [`DELETE /api/projects/:project_id/collections/:id`](./collections.md#delete-a-collection) | |
| `GET /projects/:project_id/collections/:name/items` | Public | [`GET /collections/:name`](./collections.md#stream-items) | |
| `GET /projects/:project_id/collections/:name/items/:key` | Public | [`GET /collections/:name/:key`](./collections.md#get-one-item) | |
| `PUT /projects/:project_id/collections/:name/items/:key` | Public | [`PUT /collections/:name/:key`](./collections.md#put-one-item) | |
| `POST /projects/:project_id/collections/:name/items` | Public | [`POST /collections/:name`](./collections.md#put-many-items) | |
| `DELETE /projects/:project_id/collections/:name/items/:key` | Public | [`DELETE /collections/:name/:key`](./collections.md#delete-one-item) | |
| `DELETE /projects/:project_id/collections/:name/items` | Public | [`DELETE /collections/:name`](./collections.md#delete-many-items) | |
| `GET /projects/:project_id/collections/:name/export` | Misfit | | [Page-shaped aggregates](./misfits.md#page-shaped-aggregates) |
| `/collections/:name/...` (legacy item API) | Public | [`/collections/:name`](./collections.md#collection-items) | |

## CredentialService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /credentials` | Public | [`GET /api/credentials`](./credentials.md#list-credentials) | |
| `GET /projects/:project_id/credentials` | Public | [`GET /api/projects/:project_id/credentials`](./credentials.md#list-credentials) | The design's `include=keychains` is the separate keychain list. |
| `GET /credentials/:id` | Public | [`GET /api/credentials/:id`](./credentials.md#get-a-credential) | |
| `POST /credentials` | Public | [`PUT /api/credentials/:id`](./credentials.md#create-or-replace-a-credential), [`POST /api/credentials`](./credentials.md#create-a-credential-owned-by-you) | |
| `PATCH /credentials/:id` | Partial | [`PUT /api/credentials/:id`](./credentials.md#create-or-replace-a-credential) | Only the `main` environment, and an OAuth refresh token must be resent. |
| `GET /credentials/:id/environments` | Private | [`GET /api/credentials/:id/environments`](./credentials.md#list-a-credentials-environments) | |
| `PUT /credentials/:id/environments/:name` | Private | [`PUT /api/credentials/:id/environments/:name`](./credentials.md#set-an-environment) | |
| `DELETE /credentials/:id/environments/:name` | Private | [`DELETE /api/credentials/:id/environments/:name`](./credentials.md#delete-an-environment) | |
| `POST /credentials/:id/grants` | Private | [`PUT /api/projects/:project_id/credentials/:id`](./credentials.md#link-a-credential-to-a-project) | `PUT /api/credentials/:id` can already add links. |
| `DELETE /credentials/:id/grants/:project_id` | Private | [`DELETE /api/projects/:project_id/credentials/:id`](./credentials.md#unlink-a-credential-from-a-project) | |
| `GET /credentials/:id/dependent_workflows` | Partial | [`GET /api/workflows?credential_id=`](./workflows.md#list-workflows) | No `credential_id` filter yet. |
| `POST /credentials/:id/deletion` | Private | [`PUT /api/credentials/:id/scheduled_deletion`](./credentials.md#schedule-a-credentials-deletion) | |
| `DELETE /credentials/:id/deletion` | Private | [`DELETE /api/credentials/:id/scheduled_deletion`](./credentials.md#cancel-a-credentials-deletion) | |
| `DELETE /credentials/:id` | Public | [`DELETE /api/credentials/:id`](./credentials.md#delete-a-credential) | |
| `POST /credentials/:id/transfer` | Private | [`PUT /api/credentials/:id/transfer`](./credentials.md#start-a-transfer) | |
| `DELETE /credentials/:id/transfer` | Private | [`DELETE /api/credentials/:id/transfer`](./credentials.md#cancel-a-transfer) | |
| `POST /credential_transfers/confirm` | Private | [`PUT /api/confirmations/:token`](./account.md#confirm) | One route for every emailed link. |
| `GET /oauth_clients` | Private | [`GET /api/oauth_clients`](./credentials.md#list-oauth-clients) | |
| `GET /projects/:project_id/oauth_clients` | Private | [`GET /api/projects/:project_id/oauth_clients`](./credentials.md#list-oauth-clients) | |
| `POST /oauth_clients` | Private | [`PUT /api/oauth_clients/:id`](./credentials.md#create-or-replace-an-oauth-client) | |
| `PATCH /oauth_clients/:id` | Private | [`PUT /api/oauth_clients/:id`](./credentials.md#create-or-replace-an-oauth-client) | |
| `DELETE /oauth_clients/:id` | Private | [`DELETE /api/oauth_clients/:id`](./credentials.md#delete-an-oauth-client) | |
| `GET /projects/:project_id/keychain_credentials` | Private | [`GET /api/projects/:project_id/keychain_credentials`](./credentials.md#list-a-projects-keychain-credentials) | |
| `POST /projects/:project_id/keychain_credentials` | Private | [`PUT /api/projects/:project_id/keychain_credentials/:id`](./credentials.md#create-or-replace-a-keychain-credential) | |
| `PATCH /keychain_credentials/:id` | Private | [`PUT /api/projects/:project_id/keychain_credentials/:id`](./credentials.md#create-or-replace-a-keychain-credential) | |
| `DELETE /keychain_credentials/:id` | Private | [`DELETE /api/projects/:project_id/keychain_credentials/:id`](./credentials.md#delete-a-keychain-credential) | |
| `GET /oauth_clients/:id/authorize_url` | Misfit | | [Browser redirects](./misfits.md#browser-redirects) |
| `POST /oauth/callback` | Misfit | | [Browser redirects](./misfits.md#browser-redirects) |
| `GET /credentials/:id/oauth/status` | Partial | [`GET /api/credentials/:id`](./credentials.md#get-a-credential) | No `oauth` status yet. |
| `GET /credential_schemas` | Private | [`GET /api/credential_schemas`](./credentials.md#list-credential-schemas) | |
| `GET /credential_schemas/:type` | Private | [`GET /api/credential_schemas/:name`](./credentials.md#get-a-credential-schema) | |

## DataclipService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/dataclips` | Planned | [`GET /api/projects/:project_id/dataclips`](./dataclips.md#list-a-projects-dataclips) | Without the editor's next-cron-input marker. |
| `GET /dataclips/:id` | Private | [`GET /api/dataclips/:id`](./dataclips.md#get-a-dataclip) | |
| `GET /dataclips/:id/body` | Private | [`GET /api/dataclips/:id`](./dataclips.md#get-a-dataclip) | The body is part of the dataclip here, not a separate resource. |
| `PATCH /dataclips/:id` | Private | [`PATCH /api/dataclips/:id`](./dataclips.md#rename-a-dataclip) | |

## GithubSyncService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/repo_connection` | Private | [`GET /api/projects/:project_id/repo_connection`](./github-sync.md#get-a-projects-repo-connection) | |
| `POST /projects/:project_id/repo_connection` | Private | [`PUT /api/projects/:project_id/repo_connection`](./github-sync.md#connect-or-reconnect-a-repo) | |
| `PUT /projects/:project_id/repo_connection` | Private | [`PUT /api/projects/:project_id/repo_connection`](./github-sync.md#connect-or-reconnect-a-repo) | |
| `DELETE /projects/:project_id/repo_connection` | Private | [`DELETE /api/projects/:project_id/repo_connection`](./github-sync.md#disconnect-a-repo) | |
| `POST /projects/:project_id/repo_connection/sync` | Private | [`POST /api/projects/:project_id/repo_connection/syncs`](./github-sync.md#sync-to-github) | |
| `GET /github/installations` | Private | [`GET /api/me/github_repos`](./account.md#list-your-github-repos) | Installations ride on each repo. |
| `GET /github/installations/:installation_id/repos` | Private | [`GET /api/me/github_repos`](./account.md#list-your-github-repos) | |
| `GET /github/repos/*repo/branches` | Private | [`GET /api/me/github_repos/:owner/:name/branches`](./account.md#list-a-repos-branches) | |
| `GET /projects/:project_id/provision` | Public | [`GET /api/provision/:id`, `GET /api/provision/yaml`](./provisioning.md#export-a-project) | |
| `POST /provision` | Public | [`POST /api/provision`](./provisioning.md#deploy-a-project) | |

## InstanceAdminService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /setup` | Private | [`GET /api/instance`](./account.md#get-the-instance) | `needs_setup`. |
| `POST /setup/superuser` | Partial | [`POST /api/users`](./users.md#create-a-user) | The first account on a new instance becomes the superuser. |
| `GET /admin/users` | Partial | [`GET /api/users`](./users.md#list-users) | No search across names, sort, or deletion and support fields yet. |
| `GET /admin/users/:id` | Partial | [`GET /api/users/:id`](./users.md#get-a-user) | No deletion and support fields yet. |
| `POST /admin/users` | Public | [`POST /api/users`](./users.md#create-a-user) | |
| `PATCH /admin/users/:id` | Partial | [`PATCH /api/users/:id`](./users.md#update-a-user) | Can't set `support_user` or `disabled` yet. |
| `POST /admin/users/:id/deletion` | Private | [`DELETE /api/users/:id`](./users.md#delete-a-user) | |
| `DELETE /admin/users/:id/deletion` | Private | [`DELETE /api/users/:id/scheduled_deletion`](./users.md#cancel-a-users-deletion) | |
| `DELETE /admin/users/:id` | Misfit | | [Immediate purges](./misfits.md#immediate-purges) |
| `GET /admin/projects` | Partial | [`GET /api/projects`](./projects.md#list-projects) | Only the service account lists every project; a superuser still sees only their own. |
| `GET /admin/projects/:id` | Partial | [`GET /api/projects/:id`](./projects.md#get-a-project) | No settings fields yet. |
| `POST /admin/projects` | Partial | [`PUT /api/projects/:id`](./projects.md#create-or-replace-a-project) | No colour, environment or concurrency yet. |
| `PATCH /admin/projects/:id` | Partial | [`PUT /api/projects/:id`](./projects.md#create-or-replace-a-project) | As for creating. Moving a project under a new parent stays out ([misfit](./misfits.md#re-parenting-a-project)). |
| `POST /admin/projects/:id/deletion` | Private | [`DELETE /api/projects/:id`](./projects.md#delete-a-project) | |
| `DELETE /admin/projects/:id/deletion` | Private | [`DELETE /api/projects/:id/scheduled_deletion`](./projects.md#cancel-a-projects-deletion) | |
| `DELETE /admin/projects/:id` | Misfit | | [Immediate purges](./misfits.md#immediate-purges) |
| `GET /admin/audit` | Private | [`GET /api/audit_events`](./audit-events.md#list-audit-events) | |

## ProjectService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects` | Partial | [`GET /api/projects`](./projects.md#list-projects) | No sort or health stats yet. |
| `POST /projects` | Partial | [`PUT /api/projects/:id`](./projects.md#create-or-replace-a-project) | Creating needs a superuser; colour and environment aren't accepted yet. |
| `GET /projects/:id` | Partial | [`GET /api/projects/:id`](./projects.md#get-a-project) | No settings fields yet. |
| `PATCH /projects/:id` | Partial | [`PUT /api/projects/:id`](./projects.md#create-or-replace-a-project) | Name and description only. |
| `PUT /projects/:id/data_retention` | Private | [`PUT /api/projects/:id/data_retention`](./projects.md#set-a-projects-data-retention) | |
| `PUT /projects/:id/mfa_requirement` | Private | [`PUT /api/projects/:id/mfa_requirement`](./projects.md#require-mfa-on-a-project) | |
| `PUT /projects/:id/support_access` | Private | [`PUT /api/projects/:id/support_access`](./projects.md#allow-support-access-to-a-project) | |
| `GET /projects/:id/members` | Partial | [`GET /api/projects/:project_id/members`](./projects.md#list-a-projects-members) | Private. No alert preferences yet. |
| `POST /projects/:id/members` | Private | [`PUT /api/projects/:project_id/members/:user_id`](./projects.md#add-a-member-or-change-their-role) | One member per call. |
| `POST /projects/:id/invitations` | Private | [`POST /api/projects/:project_id/invitations`](./projects.md#invite-someone-new-to-a-project) | |
| `GET /projects/:id/members/:member_id/removability` | Misfit | | [Confirm-dialog previews](./misfits.md#confirm-dialog-previews) |
| `PATCH /projects/:id/members/:member_id` | Private | [`PUT /api/projects/:project_id/members/:user_id/notifications`](./projects.md#set-your-notifications-for-a-project) | |
| `DELETE /projects/:id/members/:member_id` | Private | [`DELETE /api/projects/:project_id/members/:user_id`](./projects.md#remove-a-member) | |
| `POST /projects/:id/deletion` | Private | [`DELETE /api/projects/:id`](./projects.md#delete-a-project) | |
| `DELETE /projects/:id/deletion` | Private | [`DELETE /api/projects/:id/scheduled_deletion`](./projects.md#cancel-a-projects-deletion) | |
| `DELETE /projects/:id` | Misfit | | [Immediate purges](./misfits.md#immediate-purges) |

## RunService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/work_orders` | Partial | [`GET /api/projects/:project_id/work_orders`](./work-orders.md#list-and-get-work-orders) | No text search, sort or nested runs yet. |
| `GET /work_orders/:id` | Public | [`GET /api/work_orders/:id`](./work-orders.md#list-and-get-work-orders) | |
| `GET /runs/:id` | Public | [`GET /api/runs/:id`](./runs.md#list-and-get-runs) | Steps come from `GET /api/runs/:id/steps`. |
| `GET /runs/:id/steps` | Private | [`GET /api/runs/:id/steps`](./runs.md#list-a-runs-steps) | |
| `GET /runs/:id/logs` | Public | [`GET /api/log_lines?run_id=`](./log-lines.md#list-log-lines) | |
| `POST /projects/:project_id/workflows/:workflow_id/runs` | Private | [`POST /api/projects/:project_id/workflows/:workflow_id/work_orders`](./work-orders.md#run-a-workflow) | |
| `POST /runs/:id/retry` | Partial | [`POST /api/runs/:id/retries`](./runs.md#retry-a-run) | Private. Can't retry from the start without naming a step yet. |
| `POST /projects/:project_id/work_orders/retry` | Private | [`POST /api/projects/:project_id/work_orders/retries`](./work-orders.md#retry-many-work-orders) | |
| `GET /projects/:project_id/work_orders/retriable_jobs` | Misfit | | [Confirm-dialog previews](./misfits.md#confirm-dialog-previews) |
| `POST /runs/:id/cancel` | Private | [`PATCH /api/runs/:id`](./runs.md#cancel-a-run) | |
| `POST /work_orders/:id/cancel` | Private | [`PATCH /api/work_orders/:id`](./work-orders.md#cancel-a-work-order) | |
| `POST /projects/:project_id/work_orders/cancel` | Private | [`POST /api/projects/:project_id/work_orders/cancellations`](./work-orders.md#cancel-many-work-orders) | |
| `POST /projects/:project_id/history/exports` | Private | [`POST /api/projects/:project_id/history_exports`](./work-orders.md#export-history) | |
| `GET /projects/:project_id/history/exports` | Private | [`GET /api/projects/:project_id/history_exports`](./work-orders.md#list-history-exports) | |
| `GET /projects/:project_id/history/exports/:id` | Private | [`GET /api/projects/:project_id/history_exports/:id`](./work-orders.md#get-a-history-export) | |
| `run:<id>` follow channel | Misfit | | [Live connections](./misfits.md#live-connections) |
| Worker leg | Misfit | | [Worker protocol](./misfits.md#worker-protocol) |

## SandboxService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/sandboxes` | Partial | [`GET /api/projects/:project_id/sandboxes`](./projects.md#list-a-projects-sandboxes) | Private. Direct sandboxes only, and none scheduled for deletion. |
| `POST /projects/:project_id/sandboxes` | Private | [`PUT /api/projects/:project_id/sandboxes/:id`](./projects.md#create-a-sandbox) | |
| `PATCH /sandboxes/:id` | Partial | [`PUT /api/projects/:id`](./projects.md#create-or-replace-a-project) | No colour or environment yet. |
| `DELETE /sandboxes/:id` | Private | [`DELETE /api/projects/:id`](./projects.md#delete-a-project) | |
| `POST /sandboxes/:id/restore` | Private | [`DELETE /api/projects/:id/scheduled_deletion`](./projects.md#cancel-a-projects-deletion) | |
| `GET /sandboxes/:id/merge/targets` | Misfit | | [Confirm-dialog previews](./misfits.md#confirm-dialog-previews) |
| `GET /sandboxes/:id/merge/preview` | Private | [`POST /api/projects/:project_id/sandboxes/:id/merge_previews`](./projects.md#preview-a-sandbox-merge) | |
| `POST /sandboxes/:id/merge` | Partial | [`POST /api/projects/:project_id/sandboxes/:id/merges`](./projects.md#merge-a-sandbox) | Private. Can't delete target workflows or pick credentials yet. |

## SsoService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /auth/providers` | Private | [`GET /api/instance`](./account.md#get-the-instance) | `sign_in_providers`. |
| `POST /sso/authorizations` | Private | [`GET /api/instance`](./account.md#get-the-instance) | Send the browser to the provider's `start_url`. |
| `GET /sso/callback` | Misfit | | [Browser redirects](./misfits.md#browser-redirects) |
| `GET /sso/pending-signup` | Planned | [`GET /api/session`](./account.md#get-the-session) | `pending_signup`. Lightning has no pending sign-up: an unknown email is refused. |
| `POST /sso/pending-signup/confirm` | Partial | [`POST /api/users`](./users.md#create-a-user) | `from_sign_in`, with a session token. |
| `DELETE /sso/pending-signup` | Planned | [`DELETE /api/session`](./account.md#sign-out) | Signing out drops it. Lightning has no pending sign-up yet. |
| `GET /me/identities` | Planned | [`GET /api/me`](./account.md#get-the-current-user) | `identities`. Lightning doesn't store linked identities yet. |
| `DELETE /me/identities/:id` | Planned | [`DELETE /api/me/identities/:id`](./account.md#unlink-a-sign-in-provider) | |
| `GET /auth/provider-config` | Private | [`GET /api/auth_provider`](./authentication.md#get-the-sign-in-provider) | |
| `PUT /auth/provider-config` | Private | [`PUT /api/auth_provider`](./authentication.md#set-the-sign-in-provider) | |
| `DELETE /auth/provider-config` | Private | [`DELETE /api/auth_provider`](./authentication.md#remove-the-sign-in-provider) | |
| `POST /auth/provider-config/test` | Misfit | | [Form helpers](./misfits.md#form-helpers) |
| `POST /me/github-connection/authorize` | Misfit | | [Browser redirects](./misfits.md#browser-redirects) |
| `GET /oauth/github/callback` | Misfit | | [Browser redirects](./misfits.md#browser-redirects) |
| `GET /me/github-connection` | Private | [`GET /api/me`](./account.md#get-the-current-user) | `github`. |
| `DELETE /me/github-connection` | Private | [`DELETE /api/me/github_connection`](./account.md#disconnect-github) | |

## TriggerService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/webhook_auth_methods` | Private | [`GET /api/projects/:project_id/webhook_auth_methods`](./webhooks.md#list-a-projects-webhook-auth-methods) | |
| `POST /projects/:project_id/webhook_auth_methods` | Private | [`PUT /api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md#create-or-replace-a-webhook-auth-method) | |
| `GET /webhook_auth_methods/:id` | Private | [`GET /api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md#get-a-webhook-auth-method) | |
| `PATCH /webhook_auth_methods/:id` | Private | [`PUT /api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md#create-or-replace-a-webhook-auth-method) | |
| `DELETE /webhook_auth_methods/:id` | Private | [`DELETE /api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md#delete-a-webhook-auth-method) | |
| `POST /webhook_auth_methods/:id/reveal` | Private | [`GET /api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md#get-a-webhook-auth-method) | Returns the secret to a stepped-up session. |
| `GET /webhook_auth_methods/:id/triggers` | Private | [`GET /api/projects/:project_id/webhook_auth_methods/:id`](./webhooks.md#get-a-webhook-auth-method) | `triggers` on the auth method. |
| `GET /triggers/:trigger_id/webhook_auth_methods` | Partial | [`GET /api/workflows/:id`](./workflows.md#the-workflow-object) | No `webhook_auth_method_ids` on triggers yet. |
| `PUT /triggers/:trigger_id/webhook_auth_methods` | Partial | [`PATCH /api/projects/:project_id/workflows/:id`](./workflows.md#update-a-workflow) | As above. |
| `POST /triggers/cron/preview` | Misfit | | [Form helpers](./misfits.md#form-helpers) |
| `POST /i/*path` | Public | [`POST /i/:trigger_id`](./webhooks.md#trigger-a-workflow) | |
| `GET /i/*path` | Public | [`GET /i/:trigger_id`](./webhooks.md#check-a-webhook) | |

## WorkflowService

| Method | Status | This API | Notes |
| --- | --- | --- | --- |
| `GET /projects/:project_id/workflows` | Partial | [`GET /api/projects/:project_id/workflows`](./workflows.md#list-workflows) | No search, sort, paging or run stats yet. |
| `GET /workflows/:id` | Public | [`GET /api/workflows/:id`](./workflows.md#get-a-workflow) | Old versions come from snapshots. |
| `POST /projects/:project_id/workflows` | Partial | [`POST /api/projects/:project_id/workflows`](./workflows.md#create-a-workflow) | Can't start from a template yet. |
| `PUT /workflows/:id` | Public | [`PATCH /api/projects/:project_id/workflows/:id`](./workflows.md#update-a-workflow) | |
| `POST /projects/:project_id/workflows/validate` | Planned | [`POST /api/projects/:project_id/workflows/validations`](./workflows.md#validate-a-workflow) | |
| `DELETE /workflows/:id` | Private | [`DELETE /api/projects/:project_id/workflows/:id`](./workflows.md#delete-a-workflow) | |
| `PUT /workflows/:id/triggers_enabled` | Public | [`PATCH /api/projects/:project_id/workflows/:id`](./workflows.md#update-a-workflow) | Send the triggers with `enabled` set. |
| `GET /workflows/:id/snapshots` | Private | [`GET /api/workflows/:id/snapshots`](./workflows.md#list-a-workflows-snapshots) | |
| `GET /workflows/:id/snapshots/:lock_version` | Private | [`GET /api/workflows/:id/snapshots/:snapshot_id`](./workflows.md#get-a-snapshot) | Addressed by snapshot id, as provisioning does. |
| `GET /workflows/:id/versions` | Private | [`GET /api/workflows/:id/versions`](./workflows.md#list-a-workflows-versions) | |
| `GET /workflows/:id/context` | Misfit | | [Page-shaped aggregates](./misfits.md#page-shaped-aggregates) |
| `GET /templates` | Private | [`GET /api/workflow_templates`](./workflows.md#list-workflow-templates) | |
| `PUT /workflows/:id/template` | Private | [`PUT /api/workflows/:id/template`](./workflows.md#publish-a-workflow-as-a-template) | |
