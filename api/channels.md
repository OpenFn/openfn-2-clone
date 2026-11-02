# Channels

A channel is a proxy. Lightning forwards requests sent to the channel's URL on
to a destination, adding the destination's credential on the way, and records
each request so it can be looked at later. Channels belong to a project.

## Send a request through a channel

Status: **Public**

```
ANY /channels/:id
ANY /channels/:id/*path
```

Like webhooks, this doesn't use bearer tokens. If the channel has client auth
methods, send one of their API keys in the `x-api-key` header or use HTTP
Basic. With none, the channel is open.

Lightning removes the client's credential, adds the destination's, and
forwards the method, `*path`, query string and body to the channel's
`destination_url`. The destination's response comes back as it is, except
that Lightning drops any `set-cookie` header and adds its own security headers
(a sandboxing `content-security-policy`, `x-frame-options: DENY` and others).
An `x-request-id` of 20 to 200 characters is passed through, or Lightning
makes one.

Lightning's own errors are [problem documents](./errors.md), and carry the
same security headers:

- 404 `not_found` for an unknown or disabled channel, or an id that isn't a
  UUID.
- 401 `unauthenticated` when the channel needs credentials and none of its
  methods match, whether credentials were sent or not. It challenges with
  `ApiKey header="x-api-key"` when the channel takes an API key, and never
  with Basic.
- 502 `bad_gateway` when the destination credential can't be used, for
  example because it has no values for the project's environment (`main` for
  a project that doesn't set one). The request is recorded, and wasn't sent.
- 500 `internal` when Lightning can't save the channel's snapshot.

A destination that can't be reached answers 502 or 504, and one in a private
network range answers 403 (`CHANNEL_BLOCK_PRIVATE_NETWORKS`, on by default).
Those come from the proxy library, not Lightning's own error codes. Any status
the destination itself answers passes through untouched.

## The channel object

```json
{
  "data": {
    "type": "channels",
    "id": "…",
    "attributes": {
      "name": "dhis2-proxy",
      "destination_url": "https://dhis2.example.org/api",
      "enabled": true,
      "lock_version": 3,
      "url": "https://.../channels/…",
      "client_auth_method_ids": ["…"],
      "destination_credential_id": "…",
      "request_count": 1204,
      "last_activity": "…",
      "inserted_at": "…",
      "updated_at": "…"
    },
    "relationships": {},
    "links": { "self": "https://.../api/projects/…/channels/…" }
  }
}
```

- `url` is where clients send requests.
- `client_auth_method_ids` are the project's
  [webhook auth methods](./webhooks.md#webhook-auth-methods) a client must
  pass. Empty means anyone can call the channel.
- `destination_credential_id` is a credential linked to the project, or
  `null`.

## List a project's channels

Status: **Private**

```
GET /api/projects/:project_id/channels
```

Tokens: personal access token. Paged, by name.

The response's `meta` carries the whole project's totals, whatever page you
asked for: `total_channels` and `total_requests` (every request recorded for
any of the project's channels). They are what the Channels page shows above
the table.

> Implementation note:
> `Lightning.Channels.list_channels_for_project_with_stats/1`, which the
> Channels page (`LightningWeb.ChannelLive.Index`) calls. Differences:
>
> - It isn't paged. It returns every channel, by name.
> - The totals come from a second call,
>   `Lightning.Channels.get_channel_stats_for_project/1`, which the page
>   also makes and which returns `%{total_channels:, total_requests:}`.
> - Each entry is `%{channel:, request_count:, last_activity:}`, and
>   `last_activity` is the latest request's `started_at`. The auth methods
>   aren't preloaded, so the route has to add them for
>   `client_auth_method_ids` and `destination_credential_id`.
> - It takes a project id and checks nothing. The page relies on the
>   `:project_scope` mount hook for project access.

## Get a channel

Status: **Private**

```
GET /api/projects/:project_id/channels/:id
```

Tokens: personal access token.

> Implementation note: `Lightning.Channels.get_channel_for_project/3`, with
> `include: [:client_auth_methods, :destination_auth_method]` as the edit
> form loads it. Differences: it returns `nil` for a channel in another
> project, and does no access check of its own. It doesn't compute
> `request_count` or `last_activity`; only the list query does.

## Create or replace a channel

Status: **Private**

```
PUT /api/projects/:project_id/channels/:id
```

Tokens: personal access token of a project owner, admin or editor.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. Unique within the project. |
| `destination_url` | string | Required. An HTTP or HTTPS URL. |
| `enabled` | boolean | Defaults to `true`. |
| `client_auth_method_ids` | array of UUIDs | The full set. Each must be one of the project's webhook auth methods. |
| `destination_credential_id` | UUID or `null` | Must be linked to the project. |
| `lock_version` | integer | Optional. Send the one you read to refuse the write if someone changed the channel since. |

Answers 201 on create and 200 on replace. Each change to the channel's
configuration bumps `lock_version`, and each request records the version it
used.

Notable errors:

- 422 `invalid` with a `taken` entry at `#/name` when the project has a
  channel with the name.
- 409 `concurrent_edit` when `lock_version` doesn't match.
- 422 `invalid` with a `not_found` entry at
  `#/client_auth_method_ids/N` or `#/destination_credential_id` for an id from
  another project.

Provisioning creates and changes channels too, but can't delete them.

> Implementation note: `Lightning.Channels.create_channel/2` and
> `Lightning.Channels.update_channel/3`, both taking `actor:` and writing an
> audit event, reached from the channel form's `save` event
> (`LightningWeb.ChannelLive.FormComponent`). Differences:
>
> - Neither checks authorisation. The page checks `:create_channel` and
>   `:update_channel` in `Lightning.Policies.ProjectUsers`, which allow
>   owners, admins and editors.
> - Lightning picks the id on create, so `PUT` can't create a channel at the
>   caller's id yet.
> - Auth methods are nested join rows, not id lists:
>   `client_auth_methods` (each with a `webhook_auth_method_id`, or an `id`
>   and `delete: true` to drop one) and `destination_auth_method` (with a
>   `project_credential_id`). The form diffs the selection against the
>   existing rows; the route has to do the same to replace the full set.
> - `destination_credential_id` is a project credential id, not a credential
>   id.
> - `lock_version` isn't cast from the attributes. The check uses the version
>   on the loaded struct, so the route has to put the caller's version there.
>   A mismatch comes back as an error on `lock_version`, not a raise.
> - A taken name is an error on `name`; an out-of-project id is an error on
>   the nested auth method row.

## Delete a channel

Status: **Private**

```
DELETE /api/projects/:project_id/channels/:id
```

Tokens: personal access token of a project owner, admin or editor.

Deletes the channel and every request recorded for it. Answers 204 with no
body. If a request arrives while it is deleting, answers 409
`concurrent_edit`; send the `DELETE` again.

> Implementation note: `Lightning.Channels.delete_channel/2`, from the
> Channels page's `delete_channel` event. It takes `actor:` and records a
> `deleted` audit event. Differences:
>
> - It doesn't check authorisation. The page checks `:delete_channel`
>   (owners, admins and editors).
> - It deletes the recorded requests in batches before, and outside, the
>   transaction that deletes the channel. If that transaction fails, the
>   history is already gone.
> - A request recorded between the two steps hits the `RESTRICT` foreign key,
>   and nothing turns that into an error result, so it raises. The route has
>   to catch it to answer 409.

## List channel requests

Status: **Private**

```
GET /api/projects/:project_id/channel_requests
GET /api/projects/:project_id/channel_requests?channel_id=:channel_id
```

Tokens: personal access token. Paged, newest first.

```json
{
  "type": "channel_requests",
  "id": "…",
  "attributes": {
    "channel_id": "…",
    "request_id": "…",
    "state": "success",
    "path": "/trackedEntityInstances",
    "error_message": null,
    "started_at": "…",
    "completed_at": "…"
  },
  "relationships": {},
  "links": { "self": "https://.../api/channel_requests/…" }
}
```

`state` is `pending`, `success`, `failed`, `timeout` or `error`.

> Implementation note: `Lightning.Channels.list_channel_requests/3`, which
> takes the project, a `Lightning.Channels.SearchParams` with `channel_id`,
> and Scrivener page params, and is what History's Channels tab
> (`LightningWeb.RunLive.ChannelLogsComponent`) calls. Differences:
>
> - `path` and `error_message` aren't on the request. They come from its
>   preloaded `destination_response` or `error` event.
> - `SearchParams.new/1` drops a `channel_id` that isn't a UUID, so the list
>   comes back unfiltered instead of an error.
> - It checks nothing; the page relies on the `:project_scope` mount hook.

## Get a channel request

Status: **Private**

```
GET /api/channel_requests/:id
```

Tokens: personal access token.

Adds to the list entry:

- `client_identity`: the caller's IP address, the first `x-forwarded-for`
  entry or else the connection's address.
- `client_auth`: `type` (`api`, `basic` or `null` when the channel was open),
  and the webhook auth method that matched, as `method_id` and `method_name`.
  `method_name` is `null` when the method has since been deleted.
- `destination_credential`: `id` (a project credential id) and `name`, or
  `null` when the channel had no destination credential. `name` is `null` when
  the credential has since been deleted.
- `channel_snapshot`: the channel's `name`, `destination_url` and
  `lock_version` when the request was made.
- `request` and `response`: method, `path` and `query_string` (request),
  status, headers and body. The
  `authorization`, `x-api-key`, `cookie` and `set-cookie` headers read
  `[REDACTED]`. A body that is large or binary is cut to a preview, with its
  full `body_size`.
- `error_category`: `credential` (the request wasn't sent, so it is safe to
  retry), `transport` (no response came back), or `null`.
- `timing`: microseconds in total (`latency_us`) and spent queuing,
  connecting, sending, waiting for the first byte and receiving.

Under the project's retention policy, the caller's address, path, query
string, headers and bodies are wiped, and `wiped` is `true`.

> Implementation note:
> `Lightning.Channels.get_channel_request_for_project/2`, which
> `LightningWeb.ChannelRequestLive.Show` calls. Differences:
>
> - It needs the project id, which `GET /api/channel_requests/:id` doesn't
>   give, so the route has to find the project first or look the request up
>   another way.
> - `error_category` is worked out in the web layer, by
>   `LightningWeb.ChannelRequestLive.Helpers.error_category/1` from the
>   event's `error_message`. Unknown codes give `nil`.
> - Request, response and timing fields (`request_query_string`,
>   `latency_us`, `queue_us`, `connect_us`, `request_send_us`, `ttfb_us`,
>   `response_duration_us`) are on the preloaded events, not the request.
>   The page reads the `destination_response` event, else the `error` one
>   (`Helpers.primary_event/1`).
> - `client_identity`, `client_auth_type`, `client_webhook_auth_method_id`
>   and `destination_credential_id` are columns on the request; the function
>   preloads `client_webhook_auth_method` and `destination_credential` with
>   its `credential` for the names. The page's labels ("CommCare key (API
>   key)", "None", "(deleted)") are built by
>   `Helpers.format_client_auth/1` and `Helpers.format_destination_auth/1`.
> - The page shows the request only to users with experimental features on.
