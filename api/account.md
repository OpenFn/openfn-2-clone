# Account

These routes are for Lightning's own app: signing in and out, and a person
managing their own account. Most of them take only a
[session token](./authentication.md#session-tokens), because they need a person
at the keyboard rather than a script. Managing other people's accounts is in
[Users](./users.md).

## Get the instance

Status: **Private**

```
GET /api/instance
```

Tokens: none needed.

What the app needs to know before anyone signs in:

```json
{
  "data": {
    "needs_setup": false,
    "allow_signup": true,
    "url": "https://lightning.example.org",
    "release": { "label": "v2.19.1", "commit": "a1b2c3d", "image_tag": "v2.19.1", "branch": null },
    "admin_email": "support@example.org",
    "purge_deleted_after_days": 7,
    "sign_in_providers": [
      { "name": "github", "kind": "social", "start_url": "https://.../authenticate/github" },
      { "name": "keycloak", "kind": "external", "start_url": "https://.../authenticate/keycloak" }
    ],
    "ai_assistant": true,
    "github_sync": true,
    "github_connect_url": "https://github.com/login/oauth/authorize?client_id=…&redirect_uri=…"
  }
}
```

- `needs_setup` is `true` until the instance has a superuser. While it is, the
  first account made with `POST /api/users` becomes the superuser.
- To sign in with a provider, or link it to the account you're signed in to,
  send the browser to its `start_url`. Lightning sends it on to the provider and
  back, sets the session cookie, and returns to the app.
- `ai_assistant` and `github_sync` say whether the instance has them set up.
- `url` is the instance's own base URL. A sign-in provider's `redirect_uri` is
  built from it.
- `release` is the running build. `label` is the version shown under the logo;
  on an `edge` image Lightning shows `commit` instead. `commit`, `image_tag`
  and `branch` are `null` when the build doesn't set them.
- `admin_email` is the instance's support address, behind the user menu's
  Support link. It is `null` without a session token.
- `purge_deleted_after_days` is the retention period: how long a project or
  user scheduled for deletion is kept before it is removed. Deletion dialogs
  say "N day(s) from today", or "today" when it is `0`.
- `github_connect_url` is where to send the browser to connect, or reconnect,
  the person's GitHub account for [GitHub sync](./github-sync.md). GitHub
  returns them to Lightning. It is `null` when `github_sync` is `false`.

> Implementation note: no one function builds this, but each field has one:
> `Lightning.Accounts.has_one_superuser?/0`,
> `Lightning.Config.check_flag?/1` with `:allow_signup`,
> `Lightning.AuthProviders.get_handlers/0`, `Lightning.AiAssistant.enabled?/0`,
> `Lightning.VersionControl.github_enabled?/0`, `LightningWeb.Endpoint.url/0`,
> `Lightning.release/0`, `Lightning.Config.instance_admin_email/0` and
> `Lightning.Config.purge_deleted_after_days/0`. Differences:
>
> - First setup only happens when the `:allow_first_setup` flag is on, and it
>   is off when a service account is configured. `needs_setup` must check both.
> - Sign-in providers are OIDC handlers only, and the login page uses just the
>   first one. GitHub isn't a sign-in provider: its OAuth app only connects an
>   account for GitHub sync. Nothing has a `kind` yet.
> - A handler's start page is `/authenticate/:provider`
>   (`LightningWeb.OidcController.show/2`), and it only signs in. Linking a
>   provider to a signed-in account doesn't exist.
> - The version chip (`LightningWeb.Components.Common.version_chip/1`) is in
>   the sidebar footer, first setup included. The Support link shows only to
>   signed-in users who aren't superusers.
> - At `0` days the nightly purge jobs aren't scheduled at all
>   (`Lightning.Config.Bootstrap`), so "today" means never removed.
> - The GitHub link is built by a private helper in
>   `LightningWeb.Components.GithubComponents` from the `:github_app`
>   `client_id` and the `/oauth/github/callback` URL, and opens in a new tab.

## Sessions

### Sign in

Status: **Private**

```
POST /api/session
```

Tokens: none, or a session token to step it up.

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | Required to sign in. |
| `password` | string | Required to sign in, or to step up. |
| `mfa_code` | string | A six-digit code from the person's authenticator. |
| `backup_code` | string | One of their backup codes, used up when it is accepted. Send this or `mfa_code`. |

Answers 201 with the session and sets the session cookie. If the account has
MFA and no code was sent, answers 401 `mfa_required` and sets a cookie that is
only good for sending the code: post again with just `mfa_code` or
`backup_code`.

Signed in, post `password` or `mfa_code` again to step up the session for five
minutes, which a few routes require. Every refused sign-in answers the same 401
`invalid_credentials`, whether the email is unknown, the password is wrong, or the
account is disabled, so it can't be used to find accounts.

> Implementation note: `Lightning.Accounts.get_user_by_email_and_password/2`,
> `Lightning.Accounts.login_blocked?/1` and
> `LightningWeb.UserAuth.log_in_user/2`, through the session-cookie route
> `POST /users/log_in` (`LightningWeb.UserSessionController.create/2`). With
> MFA, `UserAuth.mark_totp_pending/1` flags the session and
> `POST /users/two-factor` checks `Accounts.valid_user_totp?/2` or
> `Accounts.valid_user_backup_code?/2`. Differences:
>
> - A disabled account, or one scheduled for deletion, gets its own message
>   once the password matches. The route must answer `invalid_credentials`.
> - Step-up is `LightningWeb.ReAuthenticateLive.New`, which calls
>   `Accounts.generate_sudo_session_token/1` after a password or TOTP code, not
>   a backup code. The sudo token travels as a `sudo_token` query parameter and
>   only the sudo routes store it in the session.
> - A pending-MFA session is a full session token with a flag, not a separate
>   cookie. `remember_me` sets a 60-day cookie; the spec has no such field.

### Get the session

Status: **Private**

```
GET /api/session
```

Tokens: session token.

```json
{
  "data": {
    "state": "signed_in",
    "user_id": "…",
    "stepped_up_until": null,
    "csrf_token": "…",
    "pending_signup": null
  }
}
```

`state` is `signed_in`, `mfa_required`, `confirmation_required` or
`signup_pending`. `confirmation_required` means the account's email still
isn't confirmed and the instance requires it. From 48 hours after sign-up,
every other route answers 401 until the person confirms it. They can still
resend the link with `POST /api/confirmations`.
`signup_pending`
means someone signed in with a provider for the first time; `pending_signup`
holds the `email`, `first_name` and `last_name` the provider gave. To create the
account, send `POST /api/users` with `{"from_sign_in": true}`. To decline, sign
out.

> Implementation note: `LightningWeb.UserAuth.fetch_current_user/2`
> (through `Lightning.Accounts.get_user_by_session_token/1`) and
> `UserAuth.totp_pending?/1` give `signed_in` and `mfa_required`,
> `Lightning.Accounts.locked_out?/1` gives `confirmation_required` (behind the
> `:require_email_verification` flag), and
> `Plug.CSRFProtection.get_csrf_token/0` the token. Differences:
>
> - `signup_pending` doesn't exist. A provider sign-in for an unknown email
>   is refused ("Could not find user account") rather than held for sign-up.
> - Nothing stores when a step-up ends. The sudo token's `inserted_at` plus
>   five minutes would give `stepped_up_until`.
> - A locked-out account gets a bare 401 from JSON routes
>   (`UserAuth.require_authenticated_api_resource/2`), and HTML routes send it
>   to `/users/confirm-required` (`LightningWeb.ConfirmationLockout`). This
>   route has to keep answering for it. The page also lets the person correct
>   a mistyped address (`Accounts.request_email_correction/2`, rate limited),
>   which no route here covers.

### Sign out

Status: **Private**

```
DELETE /api/session
```

Tokens: session token.

Ends the session, drops a pending sign-up, and closes the person's open
connections. Answers 204 with no body, even if there was no session.

> Implementation note: `LightningWeb.UserAuth.log_out_user/1`, through the
> session-cookie route `GET /users/log_out`. It deletes the session and sudo
> tokens (`Lightning.Accounts.delete_session_token/1`,
> `Accounts.delete_sudo_session_token/1`), clears the remember-me cookie and
> hangs up the person's LiveView connections on every device. Differences: it
> answers with a redirect to `/users/log_in`, and it leaves the
> `LightningWeb.UserSocket` (channel) connections open.

## Password resets

### Request a password reset

Status: **Private**

```
POST /api/password_resets
```

Tokens: none needed.

Body: `{"email": "ada@example.com"}`. If an account has the email, Lightning
emails it a link. Always answers 202 with no body, so it can't be used to find
accounts.

> Implementation note:
> `Lightning.Accounts.deliver_user_reset_password_instructions/2`, after
> `Accounts.get_user_by_email/1`, through the session-cookie route
> `POST /users/reset_password`. Differences: the second argument is a
> function that builds the link from the token, so the route has to point it
> at the app's reset page. Nothing limits how often it sends, unlike the
> confirmation emails.

### Reset a password

Status: **Private**

```
PUT /api/password_resets/:token
```

Tokens: none needed.

Body: `{"password": "…"}`, 12 to 72 characters. `:token` is from the emailed
link, which works once, for a day. Signs the person out everywhere and doesn't
sign them in. Answers 204 with no body. A used or expired token answers 404
`not_found`.

> Implementation note: `Lightning.Accounts.get_user_by_reset_password_token/1`
> then `Accounts.reset_user_password/2`, through the session-cookie route
> `PUT /users/reset_password/:token`. Differences:
>
> - It deletes every token the person has, personal access tokens included,
>   not just their sessions, and disconnects their sockets. The spec should
>   say so, or the route should keep the `api` tokens.
> - It also checks `password_confirmation` when one is sent.

## Confirmations

Lightning emails a link to confirm a new account, a new email address, or a
credential transfer. These routes handle all three.

### Resend a confirmation

Status: **Private**

```
POST /api/confirmations
```

Tokens: none, or a session token.

Body: `{"email": "…"}`, or nothing when signed in. Sends the account
confirmation email again. With an email it always answers 202 with no body.
Signed in, it answers 202 when the email is sent, 429 `too_many_requests`
after three in 15 minutes, and 503 `service_unavailable` when it can't be
sent.

> Implementation note:
> `Lightning.Accounts.deliver_user_confirmation_instructions/1` for an email
> (`POST /users/confirm`), and `Accounts.remind_account_confirmation/1` when
> signed in (`GET /users/send-confirmation-email`). Differences: both are rate
> limited per account (three emails in 15 minutes) and return
> `{:error, :rate_limited}`, which the signed-in cookie route tells the person
> about. The by-email version also returns `{:error, :already_confirmed}`.
> `LightningWeb.UserConfirmationRequiredLive` shows the throttled message for
> `:rate_limited` and a send-failed message for any other error.

### Confirm

Status: **Private**

```
PUT /api/confirmations/:token
```

Tokens: session token of the person the link was sent to.

No body. Confirms what the token is for: the account, the new email address
(which then replaces the old one), or a credential transfer (which then moves
the credential to its recipient). Each token works once. Answers 200 with
`{"data": {"confirmed": "account"}}`, or `email` or `credential_transfer`. A
used or expired token, or one sent to someone else, answers 404 `not_found`.

> Implementation note: three functions, one per kind, each behind its own
> session-cookie route: `Lightning.Accounts.confirm_user/1`
> (`POST /users/confirm/:token`), `Accounts.update_user_email/2`
> (`GET /profile/confirm_email/:token`) and
> `Lightning.Credentials.confirm_transfer/2`
> (`GET /credentials/transfer/:token`). Differences:
>
> - The tokens don't say what they are for, so one route has to try each.
> - `confirm_user/1` doesn't check whose token it is. The controller does,
>   with `Accounts.get_user_by_confirmation_token/1`, and the route must too.
> - `update_user_email/2` only matches tokens made for the user it's given,
>   and records no audit event. `confirm_transfer/2` answers
>   `{:error, :not_owner}` for anyone but the credential's owner.
> - Each returns its own errors (`:error`, or a reason atom), which the route
>   maps to 404.

## The current user

### Get the current user

Status: **Private**

```
GET /api/me
```

Tokens: personal access token or session token.

Returns the user the token belongs to, in the same shape as
[`GET /api/users/:id`](./users.md#get-a-user). Use it to check which account a
token is for. A service account token answers 403 `forbidden`, since a service
account isn't a user and the route isn't open to its tokens. The projects you are a member of are `GET /api/projects`.

With a session token it adds what the account page shows:

- `mfa_enabled` and `has_password`.
- `inserted_at`, when the account was created, and `confirmed_at`, when its
  email was confirmed, or `null`.
- `contact_preference`: `critical` or `any`, which emails they get.
- `experimental_features`: whether they have turned on experimental features,
  which shows Channels in the project menu and the Channel Logs tab in
  History.
- `has_activity_in_projects`: whether they have started runs, which the
  account deletion dialog mentions.
- `pending_email`: a new address waiting to be confirmed, or `null`.
- `identities`: the sign-in providers linked to the account, each
  `{"id", "provider"}`.
- `github`: `{"connected", "expires_at"}` for the person's GitHub connection.
- `ai_disclaimer_accepted_at`: when they last accepted the AI assistant's
  disclaimer. It lasts 24 hours.
- `consent`: their stored choices, on instances with a consent extension.

Changing these is [`PATCH /api/users/:id`](./users.md#update-a-user) on your
own id. Planned additional scope: `experimental_features` there too, with either
token.

> Implementation note: the token's user is already resolved
> (`Lightning.Accounts.get_user_by_api_token/1` or
> `Accounts.get_user_by_session_token/1`), and `LightningWeb.API.UserJSON`
> renders the `GET /api/users/:id` shape. The account page (`ProfileLive.Edit`)
> reads the rest from the `User` record. Differences:
>
> - `mfa_enabled` is a field and `has_password` is `hashed_password` not being
>   nil. `experimental_features` is
>   `Lightning.Accounts.experimental_features_enabled?/1` over `preferences`,
>   changed with `Accounts.update_user_preferences/2`, and
>   `has_activity_in_projects` is `Accounts.has_activity_in_projects?/1`. `github` comes from `github_oauth_token`, with
>   `Lightning.VersionControl.oauth_token_valid?/1` for `connected`.
> - `pending_email` is only the `sent_to` of an unexpired `change:<email>`
>   token. No function reads it.
> - `identities`, `ai_disclaimer_accepted_at` and `consent` aren't stored
>   anywhere yet.

## Personal access tokens

### List your personal access tokens

Status: **Private**

```
GET /api/me/tokens
```

Tokens: personal access token or session token.

```json
{
  "data": [
    { "id": "…", "token": "eyJhb…xyz12", "inserted_at": "…", "last_used_at": "…" }
  ]
}
```

`token` is masked: only its first and last few characters. Not paged.

> Implementation note: `Lightning.Accounts.list_api_tokens/1`, newest first,
> shown by `LightningWeb.TokensLive.Index` at `/profile/tokens`. Differences:
> it returns whole tokens, which the LiveView masks to `...` and the last ten
> characters, so the route must mask them. `last_used_at` is never written
> (`UserToken.last_used_changeset/1` has no caller), so it is always null.

### Create a personal access token

Status: **Private**

```
POST /api/me/tokens
```

Tokens: session token, stepped up.

No body. Answers 201 with the token entry, where `token` is the whole token.
It is never shown again.

> Implementation note: `Lightning.Accounts.generate_api_token/1`, from the
> `generate_new_token` event in `LightningWeb.TokensLive.Index`. Differences:
>
> - It returns only the token string, not the stored entry, so the route has
>   to look the entry up for its id.
> - `/profile/tokens` isn't a sudo route, so today it needs no step-up.
> - It records no audit event.

### Revoke a personal access token

Status: **Private**

```
DELETE /api/me/tokens/:id
```

Tokens: personal access token or session token.

Revokes one of your tokens straight away, on every route. A token can revoke
itself, for rotation. Answers 204 with no body. A token that isn't yours
answers 404 `not_found`.

> Implementation note: `Lightning.Accounts.get_token!/1` then
> `Accounts.delete_token/1`, from `LightningWeb.TokensLive.Index` and
> `LightningWeb.Components.TokenDeletionModal`. Differences:
>
> - `get_token!/1` raises for a missing id and loads a token of any kind, not
>   only `api`.
> - Ownership is the `:delete_api_token` action in `Lightning.Policies.Users`,
>   checked by the LiveView, not by `delete_token/1`. The route has to check it
>   and answer 404.
> - It records no audit event.

## MFA

### Get your MFA settings

Status: **Private**

```
GET /api/me/mfa
```

Tokens: session token. Backup codes need it stepped up.

```json
{ "data": { "enabled": true, "backup_codes": [{ "code": "K7QH2MZPX", "used_at": null }] } }
```

Without a stepped-up session, `backup_codes` is `null`.

> Implementation note: `enabled` is the user's `mfa_enabled`, and
> `Lightning.Accounts.list_user_backup_codes/1` gives the codes, shown by
> `LightningWeb.BackupCodesLive.Index` at `/profile/auth/backup_codes`, a sudo
> route. Differences: none beyond the shape. Codes are nine characters.

### Start setting up MFA

Status: **Private**

```
POST /api/me/mfa
```

Tokens: session token.

No body. Answers 201 with `{"data": {"secret": "…", "otpauth_uri": "otpauth://…"}}`
to show as a QR code. Nothing is saved yet.

> Implementation note: the `show-mfa-options` event in
> `LightningWeb.ProfileLive.MfaComponent` calls `NimbleTOTP.secret/0` and
> `NimbleTOTP.otpauth_uri/3` (issuer `OpenFn`, label `OpenFn:<email>`).
> Differences: the secret stays in the LiveView's state, so nothing has to
> come back from the client. The route has to return it, as the spec says.

### Turn on MFA

Status: **Private**

```
PUT /api/me/mfa
```

Tokens: session token.

Body: `{"secret": "…", "code": "123456"}`, the secret from starting set-up and
a code from the authenticator. Answers 200 with the settings. The first time,
it creates ten backup codes and steps the session up so the app can show them.
A code that doesn't match answers 422 `invalid` with a `mismatch` entry at
`#/code`. Sending a new secret replaces the old one.

> Implementation note: `Lightning.Accounts.upsert_user_totp/2`, from the
> `save_totp` event in `LightningWeb.ProfileLive.MfaComponent`. It sets
> `mfa_enabled` and makes ten backup codes when the person has none.
> Differences:
>
> - It takes a `UserTOTP` with the secret already on it; `code` is the only
>   field it casts, so the route has to put the secret on first.
> - A wrong code is a changeset error on `code` ("invalid code", or "should be
>   a 6 digit number"), which the route maps to `mismatch`.
> - The step-up isn't part of it: the LiveView calls
>   `Accounts.generate_sudo_session_token/1` when MFA was off. Turning MFA
>   off keeps the old backup codes, so turning it on again makes no new ones.

### Turn off MFA

Status: **Private**

```
DELETE /api/me/mfa
```

Tokens: session token, stepped up.

Answers 204 with no body. A project that requires MFA turns the person away
until they set it up again.

> Implementation note: `Lightning.Accounts.delete_user_totp/1`, from the
> `disable_mfa` event in `LightningWeb.ProfileLive.MfaComponent`. Differences:
> it takes the `UserTOTP`, not the user, and `/profile` isn't a sudo route, so
> today turning MFA off needs no step-up. It leaves the backup codes in place
> and records no audit event.

### Make new backup codes

Status: **Private**

```
POST /api/me/mfa/backup_codes
```

Tokens: session token, stepped up.

Replaces every backup code. The old ones stop working at once. Answers 201 with
the settings.

> Implementation note: `Lightning.Accounts.regenerate_user_backup_codes/1`,
> from the `regenerate-backup-codes` event in
> `LightningWeb.BackupCodesLive.Index`, a sudo route. Differences: it doesn't
> check the person has MFA on, so the route should.

## Sign-in providers

Linking a provider is done in the browser, through its `start_url` from
[`GET /api/instance`](#get-the-instance). The linked ones are `identities` on
`GET /api/me`.

### Unlink a sign-in provider

Status: **Planned**

```
DELETE /api/me/identities/:id
```

Tokens: session token.

Answers 204 with no body. If it is the last way the person can sign in (no
password and no other provider), answers 422 `invalid` with a `required` entry
at `path` `id`: set a password first.

## GitHub

A person connects their GitHub account in the browser, from the account page,
by following `github_connect_url` from [`GET /api/instance`](#get-the-instance).
Lightning then uses it to set up [GitHub sync](./github-sync.md). Whether it is
connected is `github` on `GET /api/me`.

### Disconnect GitHub

Status: **Private**

```
DELETE /api/me/github_connection
```

Tokens: session token.

Forgets the person's GitHub token and asks GitHub to revoke it. Answers 204
with no body, even if GitHub can't be reached. Existing repo connections keep
working, since they use their own token.

> Implementation note: `Lightning.VersionControl.delete_github_oauth_grant/1`,
> from the `disconnect-github` event in
> `LightningWeb.ProfileLive.GithubComponent`. It asks GitHub to delete the
> app grant, logs any failure, and clears `github_oauth_token` either way.
> Differences: it fails only if saving the user fails, and it records no
> audit event.

### List your GitHub repos

Status: **Private**

```
GET /api/me/github_repos
```

Tokens: session token. Paged, by name.

The repos Lightning's GitHub App can reach through the person's GitHub
account, across all their installations:

```json
{ "data": [{ "full_name": "openfn/malaria-programme", "default_branch": "main", "installation_id": "12345678" }] }
```

A missing or expired GitHub connection answers 403 `forbidden`; connect it
again.

> Implementation note: `Lightning.VersionControl.fetch_user_installations/1`
> with the person's GitHub token, then
> `VersionControl.fetch_installation_repos/1` for each installation. A private
> helper in `LightningWeb.ProjectLive.GithubSyncComponent` joins them.
> Differences:
>
> - `fetch_installation_repos/1` takes only an installation id and uses the
>   app's own credential, so the route must only pass ids from the person's
>   installations.
> - It fetches every repo (100 a page, all pages), so the route pages them
>   itself. A failed installation becomes an empty list.
> - No connection is a `Lightning.VersionControl.GithubError`, not a 403.

### List a repo's branches

Status: **Private**

```
GET /api/me/github_repos/:owner/:name/branches
```

Tokens: session token.

Answers 200 with `{"data": [{"name": "main"}, …]}`, by name. A repo the
person's GitHub account can't reach answers 404 `not_found`.

> Implementation note: `Lightning.VersionControl.fetch_repo_branches/3`,
> which first checks the installation is one of the person's. Differences:
>
> - It takes an installation id as well as the repo, so the route has to find
>   the installation that holds `:owner/:name`.
> - It asks GitHub for one page, so a repo with more than 30 branches is cut
>   short. Sorting by name is done in the LiveView.
> - Someone else's installation is `{:error, :unauthorized_installation}`.
