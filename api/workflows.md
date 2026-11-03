# Workflows

Tokens: personal access token, or service account with `projects:write`.
Creating, changing and deleting need editor or above.

## The workflow object

```json
{
  "id": "…",
  "name": "Data processing pipeline",
  "project_id": "…",
  "concurrency": null,
  "enable_job_logs": true,
  "positions": null,
  "inserted_at": "…",
  "updated_at": "…",
  "jobs": [
    {
      "id": "…",
      "name": "Extract data",
      "body": "fn(state => state)",
      "adaptor": "@openfn/language-common@latest",
      "project_credential_id": null,
      "keychain_credential_id": null
    }
  ],
  "triggers": [
    {
      "id": "…",
      "type": "webhook",
      "enabled": true,
      "cron_expression": null,
      "cron_cursor_job_id": null,
      "custom_path": null,
      "comment": null,
      "webhook_reply": "before_start",
      "webhook_response_config": null
    }
  ],
  "edges": [
    {
      "id": "…",
      "source_trigger_id": "…",
      "source_job_id": null,
      "target_job_id": "…",
      "condition_type": "always",
      "condition_expression": null,
      "condition_label": null,
      "enabled": true
    }
  ]
}
```

- Trigger `type`: `webhook` or `cron`.
- Trigger `webhook_reply`: `before_start`, `after_completion` or `custom`.
- Edge `condition_type`: `always`, `on_job_success`, `on_job_failure` or
  `js_expression`.

Planned additional scope: `webhook_auth_method_ids` on webhook triggers, the
[webhook auth methods](./webhooks.md#webhook-auth-methods) a request must pass.
Sending it in an update replaces the trigger's set. Each id must belong to the
workflow's project.

Planned additional scope: `lock_version`, the version of the workflow's latest
[snapshot](#workflow-snapshots). A snapshot with the same `lock_version` is the
current one.

## List workflows

Status: **Public**

```
GET /api/workflows
GET /api/workflows?project_id=:project_id
GET /api/projects/:project_id/workflows
```

Returns `{"workflows": [<workflow>, …]}` for every project you can access, or
for one project. Not paged. The service account can access every project. A
`project_id` you may not access answers 403 `forbidden`, whether or not the
project exists; see [who hears 404](./errors.md#who-hears-404).

Planned additional scope:

- `credential_id`: only workflows with a job that uses this credential. Use it
  before unlinking or deleting a credential to see what would lose it.
- `q` (a name search), `sort` (`name` or `updated_at`), and paging.
- `include=stats`: adds a `stats` object to each workflow, covering the last
  30 days:
  - `last_work_order` and `last_failed_work_order`: `{state, updated_at}` of
    the latest work order, and of the latest one in a failure state, or `null`.
  - `work_orders`: counts by outcome, `success`, `failed`, `pending` and
    `cancelled`. `work_orders_count` (their sum) and
    `failed_work_orders_count` sit beside it in `stats`.
  - `runs`: counts `success`, `failed` and `pending`.
  - `step_count` and `step_success_rate` (a percentage to two decimals, of
    finished steps).

  Work orders are in the window by last activity, runs and steps by when they
  were created. With it, `sort` also takes `last_work_order_updated_at`,
  `work_orders_count` and `failed_work_orders_count`. The project's metric
  cards are sums of `work_orders` and `runs` across its workflows.

> Implementation note: `Lightning.DashboardStats.get_workflows_stats/1`
> computes `include=stats` for a list of workflows in batched queries, and
> `sort_workflow_stats/3` and `aggregate_project_metrics/1` do the sorting and
> the project totals. They name the fields `workorders_count`,
> `failed_workorders_count`, `grouped_workorders_count` and
> `grouped_runs_count`.

## Get a workflow

Status: **Public**

```
GET /api/workflows/:id
GET /api/projects/:project_id/workflows/:id
```

Returns `{"workflow": <workflow>}`.

On the nested route, a workflow that isn't in the path's project, or is marked
deleted, answers 404 to a caller who can access the project. On
`/api/workflows/:id`, a caller who may not access the workflow's project
answers 403 `forbidden`, and so does an unknown or malformed id, unless the
caller is the service account, which hears 404 or 400.

## Create a workflow

Status: **Public**

```
POST /api/projects/:project_id/workflows
```

Send the workflow with its `name`, `jobs`, `triggers` and `edges`. Give each
job and trigger an `id` of your choosing so edges can refer to them. Lightning
replaces those ids with new UUIDs in the response.

```json
{
  "name": "Data processing pipeline",
  "jobs": [
    { "id": "extract", "name": "Extract data", "adaptor": "@openfn/language-common@latest", "body": "fn(state => state)" }
  ],
  "triggers": [{ "id": "webhook", "type": "webhook", "enabled": true }],
  "edges": [
    { "source_trigger_id": "webhook", "target_job_id": "extract", "condition_type": "always" }
  ]
}
```

Rules: every job and trigger has an id, edges form no cycle, at most one
trigger is enabled, and exactly one enabled edge leaves the triggers. An edge
from a trigger must be `always` or `js_expression`. Answers 201
`{"workflow": <workflow>}`. A name another workflow in the project has answers
422 `invalid` with a `taken` entry. Every error in the body comes back in one 422. Enabling a trigger beyond
the plan's limit answers 402 `exceeds_limit`, checked only once the body is
valid.

Planned additional scope: `template_id`, to start from a
[workflow template](#list-workflow-templates) instead of sending `jobs`,
`triggers` and `edges`. Lightning gives the copy new ids.

## Validate a workflow

Status: **Planned**

```
POST /api/projects/:project_id/workflows/validations
```

Tokens: as for creating a workflow.

Send a workflow as you would to create one, or with an `id` as you would to
update one. Lightning checks it with the same rules and saves nothing. Answers
204 with no body if it would be accepted, and the same 422 `invalid` the write
would give if not. Plan limits aren't checked, since nothing is enabled.

## Update a workflow

Status: **Public**

```
PATCH /api/projects/:project_id/workflows/:id
PUT /api/projects/:project_id/workflows/:id
```

Send the fields to change. A list you send (`jobs`, `triggers`, `edges`)
replaces the stored one, so send every item you want to keep. New jobs and
triggers need UUIDs you generate. Triggers can be changed or added but not
removed. A body `id` or `project_id` that differs from the path answers 422,
and so does a job or trigger id another workflow uses (a `taken` entry).
Answers 200 `{"workflow": <workflow>}`.

`PUT` is an update like `PATCH`: it never creates, so an unknown id answers
404 to a caller who may change the project's workflows. A caller who may not
answers 403 `forbidden` whatever the id.

A workflow open in the editor answers 409 `being_edited`, before the body is
read. A save that loses a race with another change answers 409
`concurrent_edit`.

## Delete a workflow

Status: **Private**

```
DELETE /api/projects/:project_id/workflows/:id
```

Tokens: personal access token of a project owner, admin or editor.

Marks the workflow deleted. Its triggers are disabled straight away, and it no
longer appears in lists or answers `GET`. Its run history stays until the
project's retention policy removes it. Answers 204 with no body. A workflow
open in the editor answers 409 `being_edited`.

> Implementation note: `Lightning.Workflows.mark_for_deletion/3` soft deletes
> the workflow, disables and unbinds its triggers, and records the audit event.
> The policy action is `:delete_workflow` (owners, admins and editors).
> `Lightning.Workflows.delete_workflow/1` is a separate hard delete that only
> works once the workflow has no history. Neither checks whether the workflow
> is open in the editor; the route has to. The project's workflow list doesn't
> filter out soft-deleted workflows yet.

## Workflow snapshots

Every save that changes a workflow keeps a snapshot of it, numbered by
`lock_version`. A run records the snapshot it ran, so an old run can be read
against the workflow as it was.

### List a workflow's snapshots

Status: **Private**

```
GET /api/workflows/:id/snapshots
```

Tokens: personal access token. Paged, newest first.

```json
{
  "data": [{ "id": "…", "lock_version": 7, "inserted_at": "…", "latest": true }],
  "links": { "self": "…", "first": "…", "last": "…", "next": "…", "prev": null }
}
```

These are the ids `GET /api/provision/:id?snapshots[]=` takes.

> Implementation note: `Lightning.Workflows.Snapshot.get_all_for/1`, reached
> through the workflow channel's `request_versions` event, which adds the
> `latest` flag by comparing each `lock_version` with the workflow's.
> Differences:
>
> - it takes a loaded workflow and checks nothing; the channel relies on the
>   join's `:access_read` check, so the route has to check project access.
> - it returns every full snapshot, unpaged, ordered by `inserted_at`. The
>   channel reply leaves out the snapshot `id`, which the route must return.

### Get a snapshot

Status: **Private**

```
GET /api/workflows/:id/snapshots/:snapshot_id
```

Tokens: personal access token.

Returns `{"snapshot": <workflow>}`: the workflow object as it was, with its
`lock_version`. A snapshot can't be changed.

> Implementation note: `Lightning.Collaboration.WorkflowResolver.resolve/3`
> with a `version:` option (`resolve_version/3`) builds the workflow from a
> snapshot when the editor joins a pinned version. The channel checks
> `:access_read` first. Differences:
>
> - it looks the snapshot up by `lock_version`, not by id.
>   `Lightning.Workflows.Snapshot.get_all_by_ids/2` reads by id but scopes to
>   the project only, so the route has to check the snapshot's `workflow_id`.
> - the built workflow drops `positions` and has no `concurrency` or
>   `enable_job_logs`, since a snapshot doesn't store them.

## List a workflow's versions

Status: **Private**

```
GET /api/workflows/:id/versions
```

Tokens: personal access token. Paged, newest first.

```json
{ "data": [{ "hash": "a1b2c3d4e5f6", "source": "cli", "inserted_at": "…" }] }
```

Each save records a hash of the workflow and where the save came from: `app`
or `cli`. Comparing hashes tells a CLI whether the app and its local copy have
moved apart. Consecutive saves from the same source keep one entry.

> Implementation note: `Lightning.WorkflowVersions.history_for/1`, which the
> provisioning API already returns as a workflow's `version_history`.
> Differences:
>
> - it returns `"source:hash"` strings oldest first, with no `inserted_at`,
>   and isn't paged. The route has to query `workflow_versions` itself.
> - it does no authorisation check.
> - `record_version/3` never squashes the first entry, so the first two
>   entries can share a source.

## Workflow templates

A template is a workflow published for anyone on the instance to start from.

### List workflow templates

Status: **Private**

```
GET /api/workflow_templates
```

Tokens: personal access token. Paged. Takes `q` (name and description) and
`tags` (comma-separated).

```json
{
  "data": [
    {
      "id": "…",
      "name": "DHIS2 to FHIR",
      "description": "…",
      "tags": ["dhis2", "fhir"],
      "workflow_id": "…",
      "code": "<the workflow as YAML>"
    }
  ]
}
```

> Implementation note: `Lightning.WorkflowTemplates.list_templates/0`, through
> the workflow channel's `list_templates` event. Differences: it returns every
> template ordered by name, unpaged, and takes no filters. The editor searches
> on the client, so the route has to add `q`, `tags` and paging.

### Publish a workflow as a template

Status: **Private**

```
PUT /api/workflows/:id/template
```

Tokens: personal access token of a support user who can open the project.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. At most 255 characters. |
| `description` | string | Optional. At most 1000 characters. |
| `tags` | array of strings | Optional. |

Publishes the workflow as it is now. A workflow has at most one template, so
publishing again updates it. Answers 201 when it creates and 200 when it
updates.

> Implementation note: `Lightning.WorkflowTemplates.create_template/1`, through
> the workflow channel's `publish_template` event. The channel checks
> `:publish_template` (support users who are members, or whose project allows
> support access). Differences:
>
> - the client builds `code` (v2 YAML) and `positions` and sends them, so
>   nothing on the server publishes "the workflow as it is now". The route can
>   use `Lightning.Workflows.YamlFormat.V2.serialize_workflow/1`.
> - it returns `{:ok, template}` either way and doesn't say whether it created
>   or updated, so the route can't pick 201 or 200 from it alone.
> - it reads `workflow_id` from a string key only.
