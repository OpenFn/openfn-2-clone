# API migration assessment

How hard is it to finish moving Lightning onto the API in this folder? To find
out, we built every Private endpoint in Lightning, on the `full-api-test`
branch of OpenFn/lightning, following the conventions of Stuart's API refactor.
Then we scored each endpoint on what the work actually took.

Done means a new React client, signed in as a person, can call every Private
endpoint. That held for every Private endpoint. The three Planned endpoints
were scored but not built.

## The short version

- **102 endpoints scored**: 91 built, 8 partly built and 3 Planned (not built).
  The 8 partial ones work for a person on a session or personal token. What's
  missing is mostly the service account acting as the caller, or a piece of
  state Lightning doesn't store yet.
- **The typical endpoint is a 3.** 83 of 102 scored 3 or 4. Only 2 scored 1:
  the session-token mechanism itself, which is now built, and the Planned
  `DELETE /api/me/identities/:id`, which needs an identity model Lightning
  doesn't have.
- **The pattern isn't the hard part.** Stuart's pipeline, Target, policies and
  problem documents fitted almost everything (72 of 102 endpoints scored 4 or 5
  on fit). What holds the scores down is that Lightning's logic often lives in
  a LiveView or channel handler rather than a context function. So each
  endpoint needed a small context change, plus a handful of product decisions
  the spec doesn't settle yet.
- **Most of what would raise the scores is decisions, not code.** The builders
  logged 106 open questions, and they cluster into a few themes (below).
  Settle those, and a large share of the 3s become 4s.

## The framework

Each endpoint gets four scores from 1 to 5. Its overall score is the
**lowest** of the four, because one hard dimension is enough to make the work
manual.

| Dimension | Asks | 5 looks like | 1 looks like |
| --- | --- | --- | --- |
| **Existing logic** | Does Lightning already do this? | A context function does exactly what the spec says; the endpoint just calls it | New domain logic or a new subsystem |
| **Pattern fit** | Does it drop into the API's conventions? | Route, grant, policy, Target, fallback and JSON exactly like other routes | New infrastructure: a new auth mechanism, streaming, async jobs, an external service |
| **Clarity** | Is the spec settled? | The spec is clear and matches how Lightning works | The spec conflicts with Lightning, or the core behaviour is undecided |
| **Guardrails** | How much of the risk is already handled by things we've proven? | Reuses a tested context function and an existing policy rule; tests cover every refusal path; LiveView is untouched | New security-relevant logic or irreversible side effects without tests behind them |

Guardrails scores what the migration has to *invent*, not how sensitive the
area is. MFA or credential secrets can score a 5 if the endpoint only exposes
logic Lightning already has and tests.

The overall score reads like this:

| Score | Meaning | How we'd do it |
| --- | --- | --- |
| **5** | Automatable | An agent builds it and the tests prove it; light review |
| **4** | Mostly mechanical | An agent builds it; review one small helper or rule |
| **3** | Assisted | An agent builds it; a person reviews a context change or a judgement call |
| **2** | Guided | A person makes a product or security decision first, then an agent builds it |
| **1** | Manual | Needs design work: a new subsystem or a model Lightning doesn't have |

## What the numbers say

| Overall | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Endpoints | 2 | 16 | 56 | 27 | 1 |

By area:

| Area | Endpoints | Average | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sessions and the current user | 6 | 2.5 | 1 | 1 | 4 | 0 | 0 |
| Credentials | 9 | 2.8 | 0 | 3 | 5 | 1 | 0 |
| Work orders and runs | 10 | 3.4 | 0 | 0 | 6 | 4 | 0 |
| Account | 19 | 3.2 | 1 | 2 | 8 | 8 | 0 |
| Projects and members | 10 | 3.1 | 0 | 2 | 6 | 1 | 1 |
| Sandboxes and GitHub sync | 8 | 3.0 | 0 | 3 | 2 | 3 | 0 |
| Webhook auth and channels | 10 | 3.3 | 0 | 1 | 5 | 4 | 0 |
| Workflows | 7 | 2.9 | 0 | 1 | 6 | 0 | 0 |
| AI assistant | 5 | 2.6 | 0 | 2 | 3 | 0 | 0 |
| OAuth clients, keychain, schemas, collections, users | 14 | 3.4 | 0 | 1 | 7 | 6 | 0 |
| Dataclips and audit events | 4 | 3.0 | 0 | 0 | 4 | 0 | 0 |

Which dimension set the overall score (an endpoint can tie on several):

| Dimension | Endpoints where it was the lowest |
| --- | --- |
| Existing logic | 85 |
| Guardrails | 58 |
| Clarity | 52 |
| Pattern fit | 35 |

Almost nothing reached a 5, and that's worth understanding rather than
worrying about. A 5 needs a context function that already does *exactly* what
the endpoint does. Lightning was built around LiveView, so its logic is usually
right next to the right shape but not quite: a policy rule that only knows
about users, a function that raises instead of returning an error, a
cast-assoc list the form builds by hand. Nearly every endpoint needed one of
those small fixes, and each one caps the score at 3 or 4.

## What's holding the scores down

These are the themes behind the 2s and 3s, roughly in order of how many
endpoints they touch.

1. **Logic that lives in the UI, not a context.** Merge previews, channel
   access lists, OAuth client project links, the GitHub repo list and channel
   error categories were all rebuilt for the API, because the existing code sat
   in a LiveView or channel handler. The API now has its own copy in a context
   function. The usual "what would raise it" is to point the LiveView at that
   same function, so there's one implementation. That's straightforward work,
   and it's the biggest lever on the scores.
2. **The service account as a caller.** Several writes assume the actor is a
   person with a name and a user id: invitations (the email says who invited
   you), sandboxes, OAuth clients and keychain credentials (each needs an
   owner), and audit events. Those endpoints work for people but refuse the
   service account for now. This doesn't affect the React client, which always
   acts as a person.
3. **Audit events Lightning has never written.** Creating and revoking
   personal access tokens, turning MFA on and off, changing SSO, disconnecting
   GitHub, and cancelling runs all happen without an audit event today, in
   LiveView as well as the API. The builders matched today's behaviour and
   flagged each one.
4. **State the spec expects but Lightning doesn't store.** AI disclaimer
   acceptance (`must_accept`), sign-in identities, a pending sign-up, and a
   pending credential transfer recipient. Each needs a column, or the spec
   changed to drop it.
5. **PUT semantics on partial bodies.** On channels, data retention, templates
   and repo connections, the builders had to decide whether a field the body
   leaves out means "keep" or "clear". They chose the safe option each time and
   flagged it.
6. **Rate limits and session rules.** The session-token mechanism needed
   choices the spec doesn't make: how same-origin is checked, 10 failed
   sign-ins per 15 minutes per account, 5 MFA codes per pending sign-in, and no
   per-IP limit (Lightning can't see client IPs behind the load balancer). It
   passed two security reviews, but these numbers deserve a deliberate yes.

## Decisions for product

Settling these would move the most scores. Each one is written up with the
endpoint it affects in the table below.

- **Session rules:** sign off on the rate limits and the same-origin rule, and
  on whether signing out should also close the person's live editor
  connections.
- **Service account reach:** may it invite people, create sandboxes, own OAuth
  clients and keychain credentials, and delete workflows? If yes, who is the
  owner of what it creates?
- **Audit coverage:** which account and security actions should now write
  audit events, in both the app and the API?
- **AI assistant:** store disclaimer acceptance or drop `must_accept`; decide
  whether the API exposes the global assistant (workflow YAML and page
  context), which the spec has no fields for.
- **Identity model:** one sign-in provider per person or several, and whether a
  person can have no password. That unblocks `DELETE /api/me/identities/:id`.
- **Credential rules:** may project owners and admins unlink someone else's
  credential (new compared with the app)? Should a transfer store its pending
  recipient, so a repeat start is a no-op and an old link can't come back?
- **Cancelling a project's deletion:** today only superusers can cancel a root
  project's deletion; the spec gives it to the owner, and the build follows the
  spec.
- **PUT on partial bodies:** one rule for the whole API, keep or clear, written
  into conventions.md.

## How we measured it

1. **Foundation first.** Session tokens came first, because nothing else is
   usable from a React client without them. That covered the cookie session on
   the shared bearer pipeline, CSRF, the same-origin check and step-up, plus
   `/api/session`, `/api/instance` and `/api/me`. Two reviewers (security and
   contract) checked it before anything was built on top.
2. **Ten areas in parallel.** Each area was built on its own branch and
   worktree, with its own test database. One agent built, a second reviewed for
   security and spec conformance (including whether the builder's scores were
   honest), and the builder fixed what the review found. Reviews turned up 50
   issues, most of them races and missing refusal tests, and they were fixed
   before merge.
3. **Blind calibration.** A separate scorer per area read the actual diff and
   scored every endpoint without seeing the builder's scores. The two agreed
   exactly on 73 of 100 endpoints, were one point apart on 26 and two apart on
   one. The independent scores were slightly harsher, and they're the ones used
   here. The builder's overall score is kept in the table as a second opinion.
4. **Merge and integration review.** The ten branches merged with only small
   conflicts, mostly rows two areas both appended to the same test table. A
   final reviewer looked across areas and found what the per-area reviewers
   couldn't see. The most important find: several areas had changed shared
   context functions to return a new "lost a race" error, but left the
   LiveView pages that call those functions alone, so a page could crash on a
   race. That's fixed, and it's the clearest example of what Guardrails is
   measuring. The API work is safest when it doesn't change shared code, and
   when it does, someone has to check every caller.

## Where it stands

The work is on the `full-api-test` branch of OpenFn/lightning. It hasn't
been reviewed by a person and isn't meant to merge as one piece. Think of it
as a full-size prototype that tells us the cost.

- **About 35,000 lines across 287 files.** Roughly 8,000 are the API layer
  (controllers, JSON, helpers), 3,400 are context and policy changes under
  `lib/lightning`, 22,000 are tests, and 170 touch existing LiveView pages and
  controllers.
- **Tests:** Lightning's full suite ran 8,106 tests. 16 fail, and the same 16
  fail on the base branch: in this container the Node worker can't start, and
  permission tests don't work when running as root. None come from this work.
  Credo and the warnings-as-errors compile both pass.
- **Every new route is in `API.md`**, and the route-coverage tests hold the
  table to the router.
- **Deferred:** a handful of duplicated helpers (stale-write checks, GitHub
  error mapping) across about 10 context modules. Merging them is a
  refactor with no behaviour change, and it belongs in its own PR.

## Every endpoint

Scores are Existing logic, Pattern fit, Clarity and Guardrails, then the
overall score (the lowest of the four). "Builder" is the overall score the
building agent gave itself. "What would raise it" is the one decision, piece
of code or test that would move the score up.

### Sessions and the current user

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| Session token mechanism | Built | 1 | 1 | 2 | 3 | **1** | 1 | A product or security sign-off on the builder's choices (Sec-Fetch-Site/Origin as the same-origin test, 10 failures per 15 minutes per email with no per-IP limit, 5 MFA codes per pending sign-in, failing open when the limiter is down), written into the spec. |
| `POST /api/session` | Built | 2 | 2 | 3 | 3 | **2** | 3 | Settling remember_me (dropped here) and the rate-limit numbers in the spec, and moving the step-up and pending-MFA handling into an Accounts-level function shared with the LiveView sign-in. |
| `GET /api/session` | Built | 3 | 3 | 4 | 4 | **3** | 4 | A decision on signup_pending (build it or drop it from the spec) so the response shape stops promising a state Lightning can't produce. |
| `DELETE /api/session` | Built | 3 | 3 | 4 | 3 | **3** | 4 | A LiveView regression test showing log_out_user still revokes the sudo token, plus a decision on closing UserSocket channel connections, which the spec raised. |
| `GET /api/instance` | Built | 3 | 3 | 4 | 4 | **3** | 4 | Agreeing the provider kind values with the spec (it shows "social" and a GitHub sign-in that Lightning doesn't have), and when exactly admin_email shows. |
| `GET /api/me` | Built | 3 | 4 | 3 | 4 | **3** | 4 | A product decision to either store identities, the AI disclaimer and consent, or remove them from the spec, instead of sending placeholder values. |

### Credentials

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `PUT /api/credentials/:id/scheduled_deletion` | Built | 3 | 4 | 4 | 3 | **3** | 3 | Keep the owner-only policy and the existing refuse_scheduled path, so LiveView's scheduling code is untouched and the service-account path for this irreversible action is the only new authorization. |
| `DELETE /api/credentials/:id/scheduled_deletion` | Built | 4 | 5 | 4 | 3 | **3** | 3 | Reuse an existing policy rule rather than the new owner-or-operator rule, which also changes who LiveView lets cancel. |
| `PUT /api/projects/:project_id/credentials/:id` | Built | 3 | 3 | 4 | 3 | **3** | 3 | Add a context function that links one project (with the membership check), so the controller doesn't rebuild the cast_assoc list or need the rerun-on-unique-conflict flow. |
| `DELETE /api/projects/:project_id/credentials/:id` | Built | 3 | 3 | 4 | 3 | **3** | 2 | Product sign-off that project admins may unlink others' credentials, plus a LiveView path using the same unlink_credential/2, so the new authorization path is shared rather than API-only. |
| `GET /api/credentials/:id/environments` | Built | 3 | 5 | 4 | 3 | **3** | 3 | A separate read rule, or reuse of the existing credential view rule, instead of gating reads on the new edit rule, with its own policy tests. |
| `PUT /api/credentials/:id/environments/:name` | Built | 2 | 3 | 3 | 3 | **2** | 3 | A dedicated put_environment context function that returns the body and whether it was created, with the limit decision recorded as a product call and the form moved onto it. |
| `DELETE /api/credentials/:id/environments/:name` | Built | 2 | 3 | 3 | 3 | **2** | 3 | Settle in the spec that an unknown name answers 404, and give the delete its own context function instead of extending update_credential's shared transaction. |
| `PUT /api/credentials/:id/transfer` | Partial | 4 | 3 | 2 | 3 | **2** | 2 | A product decision on repeat starts (store the pending recipient so a repeat is a no-op, or change the spec) and on the stateless-token reuse problem. |
| `DELETE /api/credentials/:id/transfer` | Built | 4 | 4 | 4 | 4 | **4** | 4 | Deal with the known gap that an old stateless transfer link works again after a re-start, or record an audit event on revoke. |

### Work orders and runs

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `POST /api/projects/:project_id/workflows/:workflow_id/work_orders` | Built | 3 | 4 | 4 | 3 | **3** | 3 | Keep the delete-race lock out of the shared create_for (or show it's safe for the LiveView path with a LiveView-level test), and move the new input validation into Manual's changeset so both UIs share it. |
| `POST /api/projects/:project_id/work_orders/retries` | Built | 3 | 3 | 3 | 3 | **3** | 3 | Settle with product what discarded means (with a job, work orders that never reached it drop out of both counts) and whether sync vs background should differ. Also add a test that the new SearchParams fields, which SearchParams.new/1 now casts from URL params, don't change the History page. |
| `PATCH /api/work_orders/:id` | Built | 4 | 4 | 4 | 4 | **4** | 4 | Have cancel_many return the work order (or an audited actor) so the controller doesn't need its own pre-check and re-fetch. |
| `POST /api/projects/:project_id/work_orders/cancellations` | Built | 3 | 3 | 3 | 3 | **3** | 2 | Get a product decision on what cancelled counts (runs or work orders, and a snapshot count for the async path), and add tests for the over-100-runs sync case. |
| `POST /api/projects/:project_id/history_exports` | Built | 3 | 3 | 4 | 3 | **3** | 3 | Confirm that a body with no filter should export the whole history, and add a test that the new optional SearchParams fields serialize and deserialize safely in ExportWorker for LiveView-originated exports. |
| `GET /api/projects/:project_id/history_exports` | Built | 3 | 5 | 5 | 4 | **3** | 3 | Nothing major. A unit test for paginate_project_files in the Projects context would back the new function. |
| `GET /api/projects/:project_id/history_exports/:id` | Built | 3 | 4 | 4 | 4 | **3** | 3 | Reuse or reconcile with Policies.Exports :download so there is one rule for who may download an export, and specify the download route in the spec. |
| `PATCH /api/runs/:id` | Built | 4 | 4 | 5 | 4 | **4** | 4 | Record an actor or audit event in cancel_run (the spec notes neither does) so the API action is traceable. |
| `POST /api/runs/:id/retries` | Built | 4 | 4 | 5 | 4 | **4** | 4 | Move the step-membership and wiped checks into WorkOrders.retry/3 so it returns errors instead of raising, and both callers share them. |
| `GET /api/runs/:id/steps` | Built | 4 | 5 | 4 | 4 | **4** | 4 | Confirm inserted_at is the right ordering (vs started_at), and add a test for a run with no steps. |

### Account

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `POST /api/password_resets` | Built | 4 | 4 | 4 | 4 | **4** | 3 | A decision on rate limiting resets (the spec notes there is none), plus a shared tokenless-route pattern so it fits the standard flow. |
| `PUT /api/password_resets/:token` | Built | 3 | 4 | 3 | 3 | **3** | 3 | A product sign-off on whether a reset revokes personal access tokens, and a test that the cookie reset route still behaves the same after the refactor. |
| `POST /api/confirmations` | Built | 4 | 3 | 4 | 4 | **3** | 3 | A shared plug or policy for routes a confirmation-pending session may use, instead of reading the session inside the controller. |
| `PUT /api/confirmations/:token` | Built | 3 | 3 | 3 | 3 | **3** | 3 | Tokens that record what they are for (or one context function that dispatches on kind), so the route stops guessing by trying each in turn. |
| `GET /api/me/tokens` | Built | 4 | 5 | 4 | 4 | **4** | 4 | Agreeing the mask format with the LiveView (which shows the last ten characters) and either writing last_used_at or dropping the field. |
| `POST /api/me/tokens` | Built | 4 | 5 | 4 | 4 | **4** | 3 | Recording an audit event for token creation and making the LiveView route require step-up too, so the two paths match. |
| `DELETE /api/me/tokens/:id` | Built | 3 | 5 | 5 | 3 | **3** | 3 | Moving the LiveView TokensLive onto revoke_api_token, so there is one tested ownership path instead of two. |
| `GET /api/me/mfa` | Built | 4 | 5 | 5 | 4 | **4** | 5 | Nothing significant beyond reusing an existing policy rule. It is close to a straight wrapper. |
| `POST /api/me/mfa` | Built | 4 | 4 | 4 | 4 | **4** | 4 | A context function for starting set-up that both LiveView and the API call. |
| `PUT /api/me/mfa` | Built | 3 | 4 | 2 | 3 | **2** | 2 | A product decision recorded in the spec on step-up for enabling MFA, and a LiveView test for the secret-replacement fix. |
| `DELETE /api/me/mfa` | Built | 4 | 5 | 4 | 3 | **3** | 4 | Requiring step-up on the LiveView path as well and adding an audit event, so the two paths cannot drift apart. |
| `POST /api/me/mfa/backup_codes` | Built | 2 | 5 | 4 | 3 | **2** | 3 | Handling :concurrent_edit in BackupCodesLive.Index and adding a LiveView regression test for the rewritten function. |
| `DELETE /api/me/github_connection` | Built | 5 | 5 | 5 | 4 | **4** | 4 | An audit event for the disconnect, or reusing an existing policy rule instead of adding one. |
| `GET /api/me/github_repos` | Built | 3 | 3 | 4 | 3 | **3** | 2 | Moving the installation-repo join into a VersionControl context function that GithubSyncComponent shares, with paging done there. |
| `GET /api/me/github_repos/:owner/:name/branches` | Built | 3 | 3 | 4 | 3 | **3** | 3 | A context lookup from repo to installation, and paging in fetch_repo_branches so repos with more than 30 branches are not cut short. |
| `GET /api/auth_provider` | Built | 5 | 5 | 4 | 4 | **4** | 4 | Settling in the spec whether allow_unverified_email is exposed and whether session tokens are allowed. |
| `PUT /api/auth_provider` | Built | 3 | 4 | 3 | 3 | **3** | 3 | A context function for saving and validating that both the LiveView form and the API use, plus a spec decision on allow_unverified_email. |
| `DELETE /api/auth_provider` | Built | 4 | 5 | 5 | 4 | **4** | 3 | Moving the LiveView disable event onto delete/1 and recording an audit event. |
| `DELETE /api/me/identities/:id` | Not built (Planned) | 1 | 3 | 2 | 2 | **1** | – | Product deciding the identity model (one or several providers, users without a password) and a Lightning context that stores and lists identities. |

### Projects and members

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `DELETE /api/projects/:id` | Built | 3 | 3 | 4 | 3 | **3** | 3 | Reusing the existing `:delete_project` and `:delete_sandbox` rules instead of a new policy module, plus context-level tests for the sandbox service-account clause. |
| `DELETE /api/projects/:id/scheduled_deletion` | Built | 3 | 3 | 4 | 3 | **3** | 3 | Getting product sign-off that triggers stay disabled after a cancel, and covering the new context function with more than the two context tests. |
| `PUT /api/projects/:id/data_retention` | Built | 3 | 4 | 3 | 4 | **3** | 3 | Agreeing the PUT semantics in the spec (a missing period means null; only changed periods are held to the plan) and moving the plan check into the context. |
| `PUT /api/projects/:id/mfa_requirement` | Built | 4 | 4 | 4 | 4 | **4** | 4 | Getting product confirmation that turning MFA off on a plan without the feature should answer 402. |
| `PUT /api/projects/:id/support_access` | Built | 5 | 5 | 5 | 5 | **5** | 5 | Nothing; it is already a 5. |
| `GET /api/projects/:project_id/members` | Built | 3 | 5 | 5 | 4 | **3** | 4 | A context test for `paginate_project_users`, or an existing paged query to reuse. |
| `PUT /api/projects/:project_id/members/:user_id` | Built | 3 | 4 | 3 | 4 | **3** | 3 | Deciding, and testing, whether a sandbox's inherited parent admins can be demoted through this route. |
| `DELETE /api/projects/:project_id/members/:user_id` | Built | 3 | 4 | 2 | 3 | **2** | 4 | Product sign-off on refusing self-removal (or dropping it), plus context tests for `remove_project_user` and the changed `delete_project_user!` behaviour. |
| `PUT /api/projects/:project_id/members/:user_id/notifications` | Built | 3 | 4 | 5 | 4 | **3** | 3 | A context-level test for `set_notification_prefs`, or reusing the per-field function. |
| `POST /api/projects/:project_id/invitations` | Partial | 4 | 4 | 2 | 3 | **2** | 2 | Settling with product whether the service account may invite, and changing either the spec or the code so they agree. |

### Sandboxes and GitHub sync

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `GET /api/projects/:project_id/sandboxes` | Built | 4 | 5 | 4 | 4 | **4** | 3 | A context-level test for paginate_sandboxes/2, so the filter is pinned below the controller. |
| `PUT /api/projects/:project_id/sandboxes/:id` | Built | 3 | 3 | 3 | 3 | **3** | 3 | A product decision on whether the service account may create sandboxes. It needs provision/3 to take a non-User actor, or the spec changed to match the person-only rule. |
| `POST /api/projects/:project_id/sandboxes/:id/merge_previews` | Built | 2 | 3 | 3 | 3 | **2** | 2 | Point the LiveView merge modal at Sandboxes.merge_preview/2 so there is one implementation, and add context unit tests for its pairing and divergence rules. |
| `POST /api/projects/:project_id/sandboxes/:id/merges` | Partial | 3 | 3 | 2 | 3 | **2** | 3 | Settle the credential-linking and service-account questions in the spec, and add a context test for merge/4's new target lock and its :target_deleted path. |
| `GET /api/projects/:project_id/repo_connection` | Built | 3 | 4 | 4 | 3 | **3** | 3 | A unit test for check_github_connection/1, and github_unavailable added to the spec's problems list. |
| `PUT /api/projects/:project_id/repo_connection` | Built | 2 | 2 | 2 | 3 | **2** | 2 | Context tests for replace_github_connection/3's selective cleanup, and the replace semantics (what is kept, what is cleaned up) written into the spec. |
| `DELETE /api/projects/:project_id/repo_connection` | Built | 4 | 4 | 4 | 4 | **4** | 4 | Confirm in the spec that a caller without a connected GitHub account gets 403, not a silent skip of the cleanup. |
| `POST /api/projects/:project_id/repo_connection/syncs` | Built | 4 | 4 | 4 | 4 | **4** | 4 | Add the export_conflict 409 to the spec, and decide whether the API should record an audit event for a sync, as the LiveView doesn't. |

### Webhook auth and channels

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `GET /api/projects/:project_id/webhook_auth_methods` | Built | 4 | 4 | 3 | 4 | **3** | 3 | Product signing off on hiding username and key ending from non-admins in the list, and the spec saying so. |
| `GET /api/projects/:project_id/webhook_auth_methods/:id` | Built | 5 | 5 | 4 | 4 | **4** | 4 | The spec saying what reading a method scheduled for deletion should answer. |
| `PUT /api/projects/:project_id/webhook_auth_methods/:id` | Built | 3 | 3 | 3 | 3 | **3** | 3 | A product decision on whether a password should be changeable on replace, so the not_allowed refusal stops being a workaround. |
| `DELETE /api/projects/:project_id/webhook_auth_methods/:id` | Built | 4 | 5 | 4 | 4 | **4** | 4 | Moving the already-scheduled check into the context function so the page and the API refuse it the same way. |
| `GET /api/projects/:project_id/channels` | Built | 3 | 5 | 5 | 4 | **3** | 3 | Lightning already having a paged stats query, so the route only called it. |
| `GET /api/projects/:project_id/channels/:id` | Built | 3 | 5 | 4 | 4 | **3** | 3 | Having the stats in an existing single-channel fetch, or the spec dropping request_count and last_activity from the single read. |
| `PUT /api/projects/:project_id/channels/:id` | Built | 3 | 3 | 2 | 3 | **2** | 2 | Product settling the PUT semantics for fields the body leaves out, and moving the join-row diff into a Channels context function the form shares. |
| `DELETE /api/projects/:project_id/channels/:id` | Built | 3 | 5 | 4 | 3 | **3** | 3 | Deleting the history inside the transaction, or another decision that makes a failed delete leave nothing lost, plus a LiveView test for the new branch. |
| `GET /api/projects/:project_id/channel_requests` | Built | 5 | 5 | 4 | 4 | **4** | 4 | The spec stating the 400 for a malformed channel_id. |
| `GET /api/channel_requests/:id` | Built | 4 | 4 | 4 | 4 | **4** | 3 | Moving error_category out of the LiveView helpers into the context, so the API doesn't depend on web-layer LiveView code. |

### Workflows

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `DELETE /api/projects/:project_id/workflows/:id` | Built | 3 | 5 | 4 | 4 | **3** | 3 | Have LiveView's delete handler show the new :concurrent_edit result explicitly, or confirm the shared context change, so the lock can be called a no-op for LiveView. |
| `GET /api/workflows/:id/snapshots` | Built | 3 | 5 | 4 | 4 | **3** | 3 | A context-level test of paginate_for's ordering when two snapshots share a lock_version; the only coverage today is through the controller. |
| `GET /api/workflows/:id/snapshots/:snapshot_id` | Built | 3 | 5 | 4 | 4 | **3** | 3 | Product sign-off that leaving out concurrency, enable_job_logs and updated_at (rather than sending null) is the intended snapshot shape. |
| `GET /api/workflows/:id/versions` | Built | 3 | 5 | 4 | 4 | **3** | 3 | Settle whether the record_version first-entry squash quirk should be fixed or documented as API behaviour. |
| `GET /api/workflow_templates` | Built | 3 | 4 | 4 | 4 | **3** | 3 | Confirm the product choices: tags means every tag (AND), and session tokens are admitted alongside personal access tokens. Also add a context unit test for paginate_templates. |
| `PUT /api/workflows/:id/template` | Built | 2 | 4 | 3 | 3 | **2** | 3 | Product sign-off that a republish clears fields the body leaves out, and that server-built YAML replaces the client-built code the editor sends today. Ideally the editor's publish_template channel event would also go through publish_workflow, so there is one code path. |
| `POST /api/projects/:project_id/workflows/validations` | Not built (Planned) | 3 | 4 | 3 | 4 | **3** | 3 | Decide how `taken` is detected without saving (rolled-back transaction or pre-checks). Also decide whether the update form checks :edit_workflow and refuses being_edited like the real update. |

### AI assistant

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `GET /api/projects/:project_id/ai_sessions` | Built | 3 | 5 | 3 | 4 | **3** | 3 | A product decision confirming the builder's divergences from the cookie route: scoping to the path's project, requiring job_id or workflow_id, and matching unsaved workflows. Also a context-level test of page_sessions/3. |
| `POST /api/projects/:project_id/ai_sessions` | Partial | 2 | 3 | 2 | 3 | **2** | 1 | Product sign-off on the session kind for a saved job and on checking quota for the first message, and on recording the disclaimer, plus a test showing the channel's create paths behave as before. |
| `GET /api/ai_sessions/:id` | Built | 3 | 4 | 4 | 4 | **3** | 4 | Deciding and testing what happens to orphaned sessions (the channel lets the owner read them), and unit tests of get_project_id/1. |
| `POST /api/ai_sessions/:id/messages` | Partial | 2 | 3 | 2 | 3 | **2** | 1 | Product sign-off on per-message attachments and on refusing with 402, a server-side record of disclaimer acceptance so must_accept can exist, and regression tests showing channel-sent messages still process as before. |
| `POST /api/ai_sessions/:id/messages/:message_id/retries` | Built | 3 | 4 | 3 | 3 | **3** | 3 | Confirming that only failed user messages may be retried, and deciding how to retry channel-sent messages, which have no per-message context. |

### OAuth clients, keychain, schemas, collections, users

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `GET /api/oauth_clients` | Built | 4 | 4 | 3 | 4 | **3** | 3 | A spec decision on what the service account gets without a project (it owns no clients) and whether links to unseen projects are hidden. |
| `GET /api/projects/:project_id/oauth_clients` | Built | 4 | 4 | 4 | 4 | **4** | 3 | A context test showing paginate_clients returns the same set as list_clients/1. |
| `PUT /api/oauth_clients/:id` | Partial | 3 | 2 | 2 | 3 | **2** | 2 | Product sign-off on the service-account exclusion, refusing (not dropping) global, and keeping hidden links. Ideally move link reconciliation into OauthClients with context tests. |
| `DELETE /api/oauth_clients/:id` | Partial | 4 | 5 | 3 | 4 | **3** | 3 | Fix the spec's token line to match the owner-only decision (no service account). |
| `GET /api/projects/:project_id/keychain_credentials` | Built | 4 | 5 | 4 | 4 | **4** | 4 | Confirm that any member, not only owners/admins, should see keychain credentials, given the stricter :view_keychain_credential rule exists. |
| `PUT /api/projects/:project_id/keychain_credentials/:id` | Partial | 3 | 4 | 3 | 3 | **3** | 3 | Product decision on service-account creation (for example, a nullable created_by) so the policy matches the spec. |
| `DELETE /api/projects/:project_id/keychain_credentials/:id` | Built | 4 | 5 | 4 | 4 | **4** | 4 | A context test showing the service-account actor passes authorize_keychain for delete. |
| `GET /api/credential_schemas` | Built | 3 | 4 | 4 | 4 | **3** | 3 | Share one exclusion list between the credential form and list_schema_names, and settle what the display title should be. |
| `GET /api/credential_schemas/:name` | Built | 3 | 4 | 4 | 4 | **3** | 3 | A context-level test for fetch_schema_document, or reuse of get_schema's resolution path. |
| `GET /api/projects/:project_id/collections` | Built | 4 | 4 | 5 | 4 | **4** | 4 | A context test for the paged query, or folding it into list_project_collections. |
| `GET /api/collections` | Built | 4 | 4 | 4 | 4 | **4** | 4 | Reuse an existing instance-wide rule such as :access_admin_space, or say why a new one was needed. |
| `DELETE /api/projects/:project_id/collections/:id` | Built | 3 | 5 | 4 | 3 | **3** | 3 | Have /1 and /2 share one implementation and add context tests for the audit row and the hook call. |
| `DELETE /api/users/:id` | Built | 3 | 4 | 3 | 3 | **3** | 3 | Spec sign-off on the 409 superuser response, and a context test that the LiveView call path (actor nil) is unchanged. |
| `DELETE /api/users/:id/scheduled_deletion` | Built | 4 | 5 | 4 | 4 | **4** | 4 | Make cancel_scheduled_deletion take an actor so the API and LiveView share one path. |

### Dataclips and audit events

| Endpoint | Status | Logic | Fit | Clarity | Guardrails | **Overall** | Builder | What would raise it |
|---|---|---|---|---|---|---|---|---|
| `GET /api/dataclips/:id` | Built | 3 | 5 | 4 | 3 | **3** | 3 | A regression test pinning the cookie route's scrub_dataclip_body! output after the shared scrubber refactor, plus a product sign-off on returning a secret-bearing number as a scrubbed string. |
| `PATCH /api/dataclips/:id` | Built | 3 | 5 | 4 | 3 | **3** | 4 | Tests on the existing cookie route (DataclipController.update_name) for the new length limit and same-name rename, so the shared context changes are pinned for LiveView too. |
| `GET /api/audit_events` | Built | 3 | 3 | 3 | 3 | **3** | 3 | Product/security sign-off on the new audit:read grant and on which secret fields are stripped from changes, ideally as a context-level list each audit module declares rather than a hardcoded map in the JSON view. |
| `GET /api/projects/:project_id/dataclips` | Not built (Planned) | 3 | 4 | 3 | 4 | **3** | 3 | Settle what job_id means (every input-eligible dataclip, or the last-N/selectable set the editor uses) and move the uuid-prefix match into SQL so it can be paged. |