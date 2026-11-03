# Webhooks

Webhook triggers start a workflow from an HTTP request. They don't use bearer
tokens. If the trigger has an authentication method set, send its API key in
the `x-api-key` header or use HTTP Basic, as configured. Managing those methods
is [below](#webhook-auth-methods).

## Trigger a workflow

Status: **Public**

```
POST /i/:trigger_id
POST /i/:project_id/:custom_path
```

The body (JSON) becomes the first step's input. Answers depend on the
trigger's `webhook_reply` setting:

- `before_start` (default): 200 `{"work_order_id": "…"}` straight away.
- `after_completion`: waits for the run to finish and answers with its result,
  or 504 `timeout` if it takes too long.
- `custom`: not implemented yet; answers like `before_start`.

Responses carry `x-meta-work-order-id` and, when a run was created,
`x-meta-run-id`.

If the work order is saved but the run isn't started (for example because of
a run limit), the answer carries the `work_order_id` and the reason: a 200 with
an `error` member, or a 429 for an `after_completion` trigger. Don't resend in
that case; the payload is stored.

Errors are problem documents: 400 `malformed` for a JSON body that doesn't
parse (`bad_request` for a form body that isn't UTF-8), 401 `unauthenticated`
when the trigger needs credentials and none were sent (with an
`ApiKey header="x-api-key"` challenge when it takes an API key), 404
`not_found` for an unknown trigger or wrong credentials, 403
`trigger_disabled`, 413 `content_too_large` for a body over the instance's
size limit, 415 `unsupported_media_type` for a body Lightning doesn't read,
422 `invalid` when the work order can't be saved, 429 for any rate or plan
limit (`too_many_runs`, `too_many_requests` or `exceeds_limit`; webhooks keep
429 where the rest of the API answers 402), and 503 `service_unavailable`
with `retry-after` when the database can't be reached. A 429 from the rate
limiter carries no `retry-after`.

## Check a webhook

Status: **Public**

```
GET /i/:trigger_id
GET /i/:project_id/:custom_path
```

Takes the same credentials as `POST`. Answers 200 if the trigger exists, even
if it is disabled:

```json
{ "message": "OpenFn webhook trigger found. Make a POST request to execute this workflow." }
```

## Webhook auth methods

A webhook auth method is a username and password, or an API key, that a
project's webhook triggers and channels can require. It belongs to the project.
Attach it to a trigger with the trigger's `webhook_auth_method_ids` (see
[Workflows](./workflows.md#the-workflow-object)). Secrets are returned only when
an API key is created, and to a stepped-up session token (below).

```json
{
  "data": {
    "type": "webhook_auth_methods",
    "id": "…",
    "attributes": {
      "name": "partner-api",
      "auth_type": "api",
      "username": null,
      "api_key_last_characters": "f00d1",
      "triggers": [{ "id": "…", "workflow_id": "…" }],
      "inserted_at": "…",
      "updated_at": "…"
    },
    "relationships": {},
    "links": { "self": "https://.../api/projects/…/webhook_auth_methods/…" }
  }
}
```

`auth_type` is `basic` or `api`. `username` is set for `basic`.

### List a project's webhook auth methods

Status: **Private**

```
GET /api/projects/:project_id/webhook_auth_methods
```

Tokens: personal access token. Paged. Methods scheduled for deletion are left
out.

> Implementation note: `Lightning.WebhookAuthMethods.list_for_project/1`, which
> the project settings page (`LightningWeb.ProjectLive.Settings`, Webhook
> security panel) shows to any project member. Differences: it returns every
> method in one list ordered by name, with no paging, and doesn't preload
> `triggers`. It takes a project struct and checks nothing, so the route has
> to check membership.

### Get a webhook auth method

Status: **Private**

```
GET /api/projects/:project_id/webhook_auth_methods/:id
```

Tokens: personal access token of a project owner or admin.

With a [session token](./authentication.md#session-tokens) stepped up, it also
returns the secret: `api_key`, or `password` for `basic`, so a person can see
it again in the app.

> Implementation note: `Lightning.WebhookAuthMethods.find_for_project/3`, with
> `include: [:triggers]`, behind the settings page's `show_modal` event.
> Differences:
>
> - It returns the secrets decrypted on the struct; the route has to drop
>   them unless the token is stepped up.
> - Step-up today is `sudo_mode?` in `WebhookAuthMethodFormComponent`: the
>   `reauthenticate-user` event checks the password or a TOTP code, keeps the
>   result only in that component's state, and records no audit event.
> - It doesn't leave out methods scheduled for deletion, and checks nothing.
>   The page gates it on `:write_webhook_auth_method` (owner or admin) in
>   `Lightning.Policies.ProjectUsers`.

### Create or replace a webhook auth method

Status: **Private**

```
PUT /api/projects/:project_id/webhook_auth_methods/:id
```

Tokens: personal access token of a project owner or admin.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. Unique within the project. |
| `auth_type` | string | Required on create, and can't change. `basic` or `api`. |
| `username` | string | Required for `basic` on create, and can't change. |
| `password` | string | Required for `basic` on create. 8 to 72 characters. Leave it out of a replace to keep it. |

For `api`, Lightning generates the key. Answers 201 on create and 200 on
replace. The 201 for an `api` method is the only response that carries the
whole key, as `api_key`. Store it then.

> Implementation note: `Lightning.WebhookAuthMethods.create_auth_method/2` and
> `update_auth_method/3`, both with `actor:`, which record a `created` or
> `updated` audit event. The app reaches them through the `save` event of
> `LightningWeb.WorkflowLive.WebhookAuthMethodFormComponent`. Differences:
>
> - Lightning picks the id on create, so PUT can't be idempotent yet.
> - The create changeset casts `project_id`, `api_key` and
>   `scheduled_deletion` from the attributes. The route has to set the
>   project from the path and drop the others, or a caller can choose its
>   own key.
> - A replace only changes `name` (`WebhookAuthMethod.update_changeset/2`),
>   so a `password` can't be changed at all, not just kept.
> - The update changeset has no unique constraint on `name`, so a duplicate
>   name raises `Ecto.ConstraintError` instead of returning an error.
> - Neither function checks authorisation. The page checks
>   `:write_webhook_auth_method` (owner or admin) only when it opens the
>   form, and hides the panel's actions in a sandbox; the functions don't.

### Delete a webhook auth method

Status: **Private**

```
DELETE /api/projects/:project_id/webhook_auth_methods/:id
```

Tokens: personal access token of a project owner or admin.

Schedules the method for deletion. Lightning detaches it from its triggers and
channels straight away, and deletes it after the instance's retention period.
Answers 204 with no body. Deleting one that is already scheduled answers 409
`scheduled_for_deletion`.

> Implementation note: `Lightning.WebhookAuthMethods.schedule_for_deletion/2`,
> from the `perform_deletion` event of
> `LightningWeb.WorkflowLive.WebhookAuthMethodDeleteModal`. It records a
> `deleted` audit event and one for each trigger and channel it detaches; the
> Oban `purge_deleted` job removes the row later. Differences: it checks no
> authorisation (the page checks `:write_webhook_auth_method`, owner or
> admin, when it opens the modal), and an already scheduled method comes back
> as a changeset error on `scheduled_deletion` that the route has to turn
> into the 409.
