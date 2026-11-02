# Credentials

Credential bodies (the secrets) are never returned by any endpoint.

## The credential object

```json
{
  "id": "c0ffee00-1234-4abc-8def-0123456789ab",
  "name": "Acme DHIS2",
  "schema": "raw",
  "external_id": null,
  "user_id": "604f0cd2-37fb-4833-a5e1-821555b5b314",
  "project_credentials": [
    {
      "id": "…",
      "project_id": "a1b2c3d4-…",
      "credential_id": "c0ffee00-…",
      "inserted_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "projects": [
    { "id": "a1b2c3d4-…", "name": "malaria-programme", "description": "…" }
  ],
  "inserted_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

Links to projects you can't see are left out. A service account token without
`projects:write` sees every link, but `projects` is empty.

Planned additional scope: `scheduled_deletion` (a timestamp, or `null`),
`transfer_status` (`pending`, `completed` or `null`) and `environments` (the
names of its environments, such as `[{"name": "main"}]`), `owner` (`id` and
`email`, which the credentials lists show), and `has_activity_in_projects`
(`true` once any run step has used it, which decides whether it can still be
deleted outright). For an `oauth` credential, `oauth`: `oauth_client_id` and
the client's `name` (the type the lists show), the `scopes` granted,
`expires_at`, and
`reauthorization_required` when the provider has refused its refresh token and
the owner must connect it again in the app. Reading it never refreshes the
token.

## Get a credential

Status: **Public**

```
GET /api/credentials/:id
```

Tokens: personal access token, or service account with `credentials:write`.

Returns `{"credential": <credential>}`. You can see a credential if you own it
or it is linked to a project whose credentials you may list. Anyone else gets
403 `forbidden`, whether or not it exists or the id is a UUID. A service
account with `credentials:write` can see every credential, so only it hears
404 `not_found` for an unknown id and 400 `invalid_parameter` for one that
isn't a UUID.

## Create or replace a credential

Status: **Public**

```
PUT /api/credentials/:id
```

Tokens: personal access token, or service account with `credentials:write`.

Creates the credential under `:id`, or replaces the name, schema and `main`
body of the credential that has it.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. Unique among the owner's credentials. |
| `schema` | string | The credential type, for example `raw`, `http` or `dhis2`. The body is checked against it. |
| `owner` | string (email) | A service account must name an existing user. A person may only name themselves, or leave it out. |
| `credential_bodies` | array | Exactly one entry: `{"name": "main", "body": {…}}`, where `body` is an object. |
| `project_credentials` | array of `{project_id}` | Optional. Projects to link. Links are only ever added; links the credential already has stay even if you leave them out. |
| `id` | UUID | Optional. Must match the path if sent. |

```bash
curl -X PUT https://lightning.example.org/api/credentials/$CREDENTIAL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme DHIS2",
    "schema": "raw",
    "owner": "ada@example.com",
    "credential_bodies": [
      {"name": "main", "body": {"username": "admin", "password": "district"}}
    ],
    "project_credentials": [{"project_id": "'"$PROJECT_ID"'"}]
  }'
```

Answers 201 `{"credential": <credential>}` when it creates one, 200 when it
replaces one.

Only the owner and a service account may replace a credential. An id that
isn't a UUID answers 400 `invalid_parameter` to anyone, since anyone may
create one.

Notable errors:

- 403 `forbidden` when the id belongs to a credential you may not edit, even
  one you can see through a project.
- 409 `scheduled_for_deletion` when the credential is being deleted.
- 403 `forbidden` when a person names an owner other than themselves. This is
  answered the same way whether or not the email has an account.
- 422 `invalid` with entries such as `taken` at `#/name` when the owner
  already has a credential with this name, `not_allowed` at `#/owner` when a
  replace names a different owner (Lightning never moves a credential between
  owners), `not_found` at `#/owner`, `one_body` at `#/credential_bodies`,
  `unknown_key` for a field not listed above, or `not_found` or `no_access` at
  `#/project_credentials/N/project_id` (the owner isn't a member of that
  project, or you can't link credentials there).
- 503 `not_ready` with `Retry-After` when Lightning can't check the schema yet.

Planned additional scope:

- Credentials with environments other than `main`, set through
  [the environment routes](#list-a-credentials-environments). A replace leaves
  the other environments as they are.
- For an `oauth` credential, a body without `refresh_token` keeps the stored
  one, so a client doesn't have to hold it.

## List credentials

Status: **Public**

```
GET /api/credentials
GET /api/credentials?project_id=:project_id
GET /api/projects/:project_id/credentials
```

Tokens: personal access token, or service account with `credentials:write`.
A service account must name a project; without one it gets 403 `forbidden`.

Without a project, lists your own credentials. With a project, lists every
credential linked to it, whoever owns it; you need a role in the project, or
support access to it. Returns `{"credentials": [<credential>, …], "links": …}`.
Paged, by name.

## Create a credential (owned by you)

Status: **Public**

```
POST /api/credentials
```

Tokens: personal access token. A service account gets 403 `forbidden`; it
creates through `PUT`, naming an owner.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. |
| `credential_bodies` | array of `{name, body}` | The secret values, for example `[{"name": "main", "body": {…}}]`. |
| `schema` | string | Required. The credential type. |
| `project_credentials` | array of `{project_id}` | Optional. You must be an editor or above on each project. |

Answers 201 `{"credential": <credential>}`. Lightning picks the id. Prefer
`PUT` if you need to retry safely. A name you already hold answers 422
`invalid` with a `taken` entry at `#/name`, and it answers 503 `not_ready`
while Lightning can't check the schema yet.

## Delete a credential

Status: **Public**

```
DELETE /api/credentials/:id
```

Tokens: personal access token. Only the owner can delete, so a service
account gets 403 `forbidden`. Service account support is planned.

Answers 204 with no body. Anyone who doesn't own the credential gets 403
`forbidden`, whether or not it exists or the id is a UUID; nobody hears 404.
This also deletes a credential that is scheduled for deletion, which is the
app's "Delete now".

A credential that has been used by runs (`has_activity_in_projects`) can't be
deleted, and answers 409 `in_use`. `Lightning.Credentials.delete_credential/2`
checks `has_activity_in_projects?/1` first, which is also what the app asks
before offering "Delete now".

To delete a credential that has been used, schedule its deletion instead
(below).

## Schedule a credential's deletion

Status: **Private**

```
PUT /api/credentials/:id/scheduled_deletion
```

Tokens: personal access token of the owner, or service account with
`credentials:write`.

No body. Unlinks the credential from every project straight away, so jobs using
it stop getting it, and revokes any OAuth tokens at the provider. Lightning
empties its bodies after the instance's retention period, and deletes it then
unless runs have used it. Until then every other route on the credential
answers 409 `scheduled_for_deletion`, except deleting it at once and
cancelling the deletion. Answers 200 with the credential.
Scheduling one that is already scheduled changes nothing.

This differs from projects, where `DELETE` schedules, because
`DELETE /api/credentials/:id` already deletes at once.

> Implementation note: `Lightning.Credentials.schedule_credential_deletion/2`,
> through `LightningWeb.Components.CredentialDeletionModal`. It sets
> `scheduled_deletion` to now plus `purge_deleted_after_days`, removes every
> project link (jobs lose the credential), revokes OAuth tokens and emails the
> owner. The Oban `purge_deleted` job in `Lightning.Credentials` empties the
> bodies and deletes those no step has used. Differences:
>
> - only the owner may (`:delete_credential` in `Lightning.Policies.Users`).
>   There is no service account path.
> - scheduling again isn't a no-op: it moves the date and emails the owner
>   again.
> - it records no audit event for the scheduling itself, only one per OAuth
>   token it revokes.

## Cancel a credential's deletion

Status: **Private**

```
DELETE /api/credentials/:id/scheduled_deletion
```

Tokens: as for scheduling.

Answers 200 with the credential. The project links removed when it was
scheduled are not restored. A credential that isn't scheduled answers 404
`not_found`.

> Implementation note: `Lightning.Credentials.cancel_scheduled_deletion/2`,
> through the `cancel_credential_deletion` event in
> `LightningWeb.CredentialLive.CredentialIndexComponent`. It checks the actor
> owns the credential and records an `updated` audit event. Differences: only
> the owner may; it raises on an unknown id (`get_credential!/1`); and a
> credential that isn't scheduled succeeds with no change instead of 404.

## Link a credential to a project

Status: **Private**

```
PUT /api/projects/:project_id/credentials/:id
```

Tokens: personal access token of the credential's owner who is an editor or
above in the project, or service account with `credentials:write`.

No body. Links the credential to the project and to the project's sandboxes.
Answers 201 with the credential when it links, and 200 if it was already
linked.

Notable errors:

- 422 `invalid` with a `no_access` entry at `path` `project_id` when the owner
  isn't a member of the project.
- 422 `invalid` with a `taken` entry when another credential linked to the
  project has the same `external_id`.

> Implementation note: `Lightning.Credentials.update_credential/3` with a
> `project_credentials` entry `%{"project_id" => id}`, through the `save`
> event in `LightningWeb.CredentialLive.CredentialFormComponent`. It records
> an `added_to_project` audit event and copies the link to the project's
> sandboxes. Differences:
>
> - it takes the credential's whole list of links, which the form builds with
>   `LightningWeb.CredentialLive.Helpers.prepare_projects_associations/3`.
>   Leaving out a link the credential has raises, since `cast_assoc` replaces
>   the list.
> - it checks only that the actor owns the credential, not that the owner is
>   a member of the project or an editor there. The form only offers the
>   owner's projects, and the API's `create` checks
>   `:create_project_credential` itself.
> - an `external_id` clash is a changeset error on `external_id`.

## Unlink a credential from a project

Status: **Private**

```
DELETE /api/projects/:project_id/credentials/:id
```

Tokens: personal access token of the credential's owner, or of a project owner
or admin, or service account with `credentials:write`.

Jobs in the project that use the credential lose it. Links to the project's
sandboxes stay. Answers 204 with no body. A credential that isn't linked
answers 404 `not_found`. To see which workflows would lose it first, use
`GET /api/workflows?credential_id=:id&project_id=:project_id`.

> Implementation note: `Lightning.Credentials.update_credential/3` with the
> link marked `"delete" => "true"`, through the same form. Jobs lose the
> credential through the foreign key (`on_delete: :nilify_all`), and it
> records a `removed_from_project` audit event. Sandbox links stay.
> Differences: only the credential's owner may, so a project owner or admin
> can't unlink someone else's credential (removing that person from the
> project does drop their links, in `Lightning.Projects`). It takes the whole
> list of links, as for linking.

## Credential environments

A credential has a body per environment, such as `main` and `staging`, so a
project and its sandboxes can use different secrets. It has between one and
five. Bodies are never returned.

### List a credential's environments

Status: **Private**

```
GET /api/credentials/:id/environments
```

Tokens: personal access token of the owner, or service account with
`credentials:write`.

```json
{ "data": [{ "name": "main", "inserted_at": "…", "updated_at": "…" }] }
```

> Implementation note: no context function lists them. The credential form
> (`LightningWeb.CredentialLive.CredentialFormComponent`) preloads
> `credential_bodies` and reads each `name`, and
> `Lightning.Credentials.get_credential_body/2` fetches one. Differences: the
> route has to select the names and timestamps without loading the encrypted
> bodies, and check ownership itself.

### Set an environment

Status: **Private**

```
PUT /api/credentials/:id/environments/:name
```

Tokens: as for listing.

Body: `{"body": {…}}`, checked against the credential's `schema`. Creates the
environment or replaces its body. A name is lowercase letters, digits, `-`
and `_`, starting with a letter or digit, at most 32 characters. Answers 201
when it creates and 200 when it replaces, with the environment.

Notable errors: 422 `invalid` with an `exceeds_limit` entry at `path` `name`
for a sixth environment, or `too_many_secrets` at `#/body`.

> Implementation note: `Lightning.Credentials.update_credential/3` with
> `credential_bodies: [%{"name" => name, "body" => body}]`, through the form's
> `save` event. It inserts or updates that body and leaves the others. The
> body is typed against the schema, and
> `Lightning.Credentials.CredentialBody.changeset/2` checks the name format
> and the `max_credential_sensitive_values` limit. Differences:
>
> - the five-environment limit is only in the form's `add_environment`
>   event, not in the context.
> - when only bodies change it records no audit event, since events come from
>   changes to the credential row.
> - it returns the credential, not the environment, and doesn't say whether
>   it created.

### Delete an environment

Status: **Private**

```
DELETE /api/credentials/:id/environments/:name
```

Tokens: as for listing.

Answers 204 with no body. Deleting the last environment answers 422 `invalid`
with a `required` entry at `path` `name`.

> Implementation note: `Lightning.Credentials.update_credential/3` with
> `delete_environments: [name]`, through the form's `delete_environment` and
> `save` events. Differences: the rule that one environment must remain is
> only in the form, so the context deletes the last one too. A name that
> doesn't exist succeeds quietly, and it records no audit event.

## Transfer a credential

A credential can be given to another user. The owner starts a transfer, then
confirms it from an email.

### Start a transfer

Status: **Private**

```
PUT /api/credentials/:id/transfer
```

Tokens: personal access token of the owner.

Body: `{"recipient": "grace@example.com"}`. The recipient must be a member of
every project the credential is linked to. Lightning emails the owner a link to
confirm, and ownership moves once they follow it. Answers 200 with the
credential, `transfer_status` `pending`. Starting the same transfer again
changes nothing.

Notable errors:

- 422 `invalid` with a `not_found` entry at `#/recipient` when no user has the
  email, or `no_access` when they aren't a member of every linked project.
- 501 `not_implemented` when the instance doesn't allow transfers.

> Implementation note: `Lightning.Credentials.validate_credential_transfer/3`
> then `Lightning.Credentials.initiate_credential_transfer/3`, through the
> `transfer-credential` event in
> `LightningWeb.CredentialLive.TransferCredentialModal`. It sets
> `transfer_status` to `pending` and emails the owner a signed link to
> `/credentials/transfer/:token`, valid for
> `credential_transfer_token_validity_in_days`. Differences:
>
> - the recipient checks (the user exists, isn't you, and is a member of every
>   linked project) are in `validate_credential_transfer/3`.
>   `initiate_credential_transfer/3` checks only ownership, so the route must
>   call both.
> - starting again signs a new token and sends another email rather than
>   changing nothing.
> - `allow_credential_transfer` is read only by the form, not the context.
> - it records no audit event; `transfered` is recorded on confirmation.

### Cancel a transfer

Status: **Private**

```
DELETE /api/credentials/:id/transfer
```

Tokens: personal access token of the owner.

Answers 200 with the credential. A credential with no pending transfer answers
404 `not_found`.

> Implementation note: `Lightning.Credentials.revoke_transfer/2`, through the
> `revoke-transfer` event in the same modal. It checks ownership and returns
> `:not_pending` when no transfer is pending. Differences: it records no audit
> event. The token is stateless, so if the owner starts another transfer
> before an old link expires, that old link works again and transfers to its
> first recipient.

## OAuth clients

An OAuth client holds the app registration (client id and secret, endpoints and
scopes) that `oauth` credentials use to get tokens. Its owner can link it to
projects, and a superuser can make it global, which lists it in every project.
`client_secret` is never returned. `mandatory_scopes` and `optional_scopes` are
comma-separated strings, as Lightning stores them; the credential form splits
them on commas into the scope checkboxes, with the mandatory ones always
selected.

```json
{
  "id": "…",
  "name": "Google Sheets",
  "client_id": "1234.apps.googleusercontent.com",
  "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_endpoint": "https://oauth2.googleapis.com/token",
  "revocation_endpoint": "https://oauth2.googleapis.com/revoke",
  "userinfo_endpoint": null,
  "introspection_endpoint": null,
  "scopes_doc_url": null,
  "mandatory_scopes": "openid,email",
  "optional_scopes": "https://www.googleapis.com/auth/spreadsheets",
  "global": false,
  "user_id": "…",
  "project_ids": ["…"],
  "inserted_at": "…",
  "updated_at": "…"
}
```

### List OAuth clients

Status: **Private**

```
GET /api/oauth_clients
GET /api/projects/:project_id/oauth_clients
```

Tokens: personal access token, or service account with `credentials:write`.

Without a project, lists your own clients and the global ones. With a project,
lists the clients linked to it and the global ones. Paged.

> Implementation note: `Lightning.OauthClients.list_clients/1`, given a
> `Lightning.Accounts.User` or a `Lightning.Projects.Project`, which the
> credentials pages call on mount. Differences: it isn't paged, and it does
> no authorisation check, so the route has to check access to the project.

### Create or replace an OAuth client

Status: **Private**

```
PUT /api/oauth_clients/:id
```

Tokens: personal access token, or service account with `credentials:write`.
Replacing needs the owner.

Takes the fields above except `user_id`, plus `client_secret`.
`name`, `client_id`, `client_secret`, `authorization_endpoint` and
`token_endpoint` are required on create; leave `client_secret` out of a replace
to keep it. Endpoints must be URLs. `global` needs a superuser. Linking a
project needs editor or above in it. Answers 201 on create and 200 on replace.

> Implementation note: `Lightning.OauthClients.create_client/3` and
> `Lightning.OauthClients.update_client/4`, through the `save` event in
> `LightningWeb.CredentialLive.OauthClientFormComponent`. Both check the actor
> owns the client and record `created` or `updated` audit events, plus
> `added_to_project` and `removed_from_project` for links. Leaving
> `client_secret` out of an update keeps it. Differences:
>
> - `global` is cast only when the caller passes `allow_global: true`, which
>   the page does for superusers. Otherwise it is dropped, not refused.
> - links are `project_oauth_clients` entries, the whole list each time, as
>   for credentials. The context checks no role in the project; the page's
>   gate is `:create_project_credential` on the current project.
> - Lightning picks the id on create.
> - only people: ownership compares user ids (`:delete_credential` in
>   `Lightning.Policies.Users`), so there is no service account path.

### Delete an OAuth client

Status: **Private**

```
DELETE /api/oauth_clients/:id
```

Tokens: personal access token of the owner, or service account with
`credentials:write`.

Answers 204 with no body. Credentials that used the client stay, but can't get
new tokens until they are given another client.

> Implementation note: `Lightning.OauthClients.delete_client/2`, through the
> `delete_oauth_client` event in
> `LightningWeb.CredentialLive.CredentialIndexComponent`. It checks the actor
> owns the client, removes its project links and records a `deleted` audit
> event. Credentials keep their row; the foreign key sets their
> `oauth_client_id` to null. Differences: owner only, with no service account
> path, and the page loads the client with `get_client!/1`, which raises on
> an unknown id.

## Keychain credentials

A keychain credential picks one of a project's credentials for each run, by
reading a value from the run's input with a JSONPath. It belongs to the
project, not to a person.

```json
{
  "id": "…",
  "project_id": "…",
  "name": "Per-district DHIS2",
  "path": "$.district",
  "default_credential_id": "…",
  "default_credential_name": "Acme DHIS2",
  "created_by": { "id": "…", "email": "ada@example.com" },
  "inserted_at": "…",
  "updated_at": "…"
}
```

### List a project's keychain credentials

Status: **Private**

```
GET /api/projects/:project_id/keychain_credentials
```

Tokens: personal access token of any project member, as the app shows the
list to every member, or service account with `credentials:write`. Paged.

> Implementation note:
> `Lightning.Credentials.list_keychain_credentials_for_project/1`, which the
> project's credentials tab and the workflow editor call. It preloads
> `created_by` and `default_credential`, which give `created_by` and
> `default_credential_name`. Differences: it isn't paged and does no
> authorisation check. `:view_keychain_credential` in
> `Lightning.Policies.Credentials` (owners, admins, and support users where
> the project allows support, subject to the project's MFA rule) exists, but
> nothing asks it for the list.

### Create or replace a keychain credential

Status: **Private**

```
PUT /api/projects/:project_id/keychain_credentials/:id
```

Tokens: personal access token of a project owner or admin, or service account
with `credentials:write`.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. Unique within the project. At most 255 characters. |
| `path` | string | Required. A JSONPath starting with `$`. At most 500 characters. |
| `default_credential_id` | UUID | Optional. Used when the path matches nothing. Must be linked to the project. |

Answers 201 on create and 200 on replace.

> Implementation note: `Lightning.Credentials.create_keychain_credential/3`,
> on a struct from `new_keychain_credential/2`, and
> `Lightning.Credentials.update_keychain_credential/3`, through
> `LightningWeb.CredentialLive.KeychainCredentialFormComponent`. Both ask
> `Lightning.Policies.Credentials`: owners and admins, and support users where
> the project allows support, subject to the project's MFA rule.
> `Lightning.Credentials.KeychainCredential.changeset/2` enforces the field
> rules above. Differences: Lightning picks the id on create, and it records
> no audit event.

### Delete a keychain credential

Status: **Private**

```
DELETE /api/projects/:project_id/keychain_credentials/:id
```

Tokens: as for creating.

Answers 204 with no body. Jobs that used it are left without a credential.

> Implementation note: `Lightning.Credentials.delete_keychain_credential/2`,
> through the `delete_keychain_credential` event in
> `LightningWeb.CredentialLive.CredentialIndexComponent`, with the same
> policy as creating. Jobs lose it through the foreign key
> (`on_delete: :nilify_all`). Differences: it records no audit event.

## Credential schemas

A schema describes the body of one type of credential. `PUT
/api/credentials/:id` checks bodies against the credential's `schema`.

### List credential schemas

Status: **Private**

```
GET /api/credential_schemas
```

Tokens: personal access token, or service account with `credentials:write`.

```json
{ "data": [{ "name": "@openfn/language-dhis2", "title": "DHIS2" }, { "name": "raw", "title": "Raw JSON" }] }
```

A schema's name is its adaptor's package name. Short names such as `dhis2`
are accepted where a schema is named, and stored in full.

> Implementation note: `Lightning.Adaptors.packages/1`, filtered to packages
> with `has_schema`, which the credential form turns into its type list and
> adds `raw` to. Differences: there is no display title, only the short name
> from `Lightning.Adaptors.PackageName.short_name/1`. The form also hides
> `@openfn/language-googlesheets` and `@openfn/language-gmail`, which use
> OAuth. Before the adaptor catalogue first loads it returns
> `{:error, :not_ready}`, which the route should answer as 503.

### Get a credential schema

Status: **Private**

```
GET /api/credential_schemas/:name
```

Tokens: as for listing.

Answers 200 with `{"data": {"name": …, "title": …, "schema": {…}}}`, where
`schema` is a JSON Schema. `raw` has none, since it takes any object. Names are
not UUIDs; an unknown name answers 404 `not_found`.

> Implementation note: `Lightning.Credentials.get_schema/1`, which resolves a
> short name with `Lightning.Adaptors.resolve_name/2` and parses
> `Lightning.Adaptors.schema/2` into a `Lightning.Credentials.Schema`.
> Differences: the route wants the raw JSON from `Lightning.Adaptors.schema/2`,
> not the parsed struct. `raw` and `oauth` aren't adaptors, so they come back
> `:not_found`; an adaptor without a schema gives `{}`. A package name holds a
> `/`, so the path segment has to be encoded. `:not_ready` should answer 503.
