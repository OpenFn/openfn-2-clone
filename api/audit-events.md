# Audit events

Lightning records an audit event when someone changes a project, workflow,
credential, user and some other records. Events are never changed or deleted.

## List audit events

Status: **Private**

```
GET /api/audit_events
```

Tokens: personal access token of a superuser, or service account with
`audit:read` (a [planned grant](./authentication.md)). Paged, newest first.

| Parameter | Notes |
| --- | --- |
| `item_type` | For example `project`, `workflow` or `credential`. |
| `item_id` | UUID. |
| `actor_id` | UUID. |
| `event` | For example `created`, `updated` or `deleted`. |
| `inserted_after`, `inserted_before` | ISO 8601. |

Each event:

```json
{
  "type": "audit_events",
  "id": "…",
  "attributes": {
    "event": "updated",
    "item_type": "project",
    "item_id": "…",
    "actor_type": "user",
    "actor_id": "…",
    "actor_display": "Ada Lovelace (ada@example.com)",
    "changes": {
      "before": { "description": "Malaria reporting" },
      "after": { "description": "Malaria case reporting" }
    },
    "metadata": {},
    "inserted_at": "…"
  },
  "relationships": {},
  "links": {}
}
```

- `actor_type` is `user`, `service_account`, `trigger` or
  `project_repo_connection`. `actor_display` names the actor, or says it has
  been deleted.
- `changes` holds only the fields that changed. A `created` event has no
  `before`.
- Credential bodies recorded in an event's `metadata` are left out.

> Implementation note: `Lightning.Auditing.list_all/1`, which the superuser
> page at `/settings/audit` (`LightningWeb.AuditLive.Index`) calls with the
> URL's paging params. It is paged with `Repo.paginate/2`, newest first, and
> joins users, triggers and repo connections to name the actor. Differences:
>
> - it takes no filters. The route has to add `item_type`, `item_id`,
>   `actor_id`, `event` and the date range.
> - it does no authorisation check. The page is limited to superusers by the
>   `:ensure_admin` hook.
> - `actor_display` is a map of `identifier` (an email, or the service
>   account's id from `metadata`) and `label` (a name, "GitHub", the trigger
>   type, "Service account" or "(User deleted)"), not one string.
> - credential events keep their bodies, encrypted and base64 encoded, in
>   `metadata.credential_bodies`, and the page shows them. The route has to
>   drop them.
