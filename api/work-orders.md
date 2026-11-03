# Work orders

## List and get work orders

Status: **Public**

Tokens: personal access token, or service account with `projects:write`. Read
only.

```
GET /api/work_orders
GET /api/work_orders?project_id=:project_id
GET /api/projects/:project_id/work_orders
GET /api/work_orders/:id
GET /api/projects/:project_id/work_orders/:id
```

Lists are paged and take these filters:

| Parameter | Notes |
| --- | --- |
| `id` | Comma-separated work order ids. |
| `workflow_id` | UUID. |
| `state` | Comma-separated: `rejected`, `pending`, `running`, `success`, `failed`, `crashed`, `cancelled`, `killed`, `exception`, `lost`. These are work order states, not run states: the History page labels `pending` "Enqueued". |
| `inserted_after`, `inserted_before` | ISO 8601. |
| `updated_after`, `updated_before` | ISO 8601, on `updated_at`. A run changing state moves the work order's `last_activity` but not its `updated_at`, so these don't filter by activity. |

Every bad filter is reported together in one 400 `invalid_parameter`. The
service account must send `project_id`, in the path or the query; without it
the answer is 400 `invalid_parameter` with a `required` entry. A `project_id`
you may not access answers 403 `forbidden`, whether or not the project exists,
and is checked before the other filters. Only superusers and the service
account hear 404 for an unknown `project_id`, or 400 for one that isn't a UUID.
Lists are ordered by `last_activity`, newest first.

On the nested route, a work order that isn't in the path's project answers 404
to a caller who can access the project. On `/api/work_orders/:id`, an unknown or
malformed id answers 403 `forbidden`, except to the service account, which
hears 404 or 400. See [who hears 404](./errors.md#who-hears-404).

Each work order:

```json
{
  "type": "work_orders",
  "id": "…",
  "attributes": { "state": "success", "last_activity": "…", "inserted_at": "…", "updated_at": "…" },
  "relationships": {},
  "links": { "self": "https://.../api/work_orders/…" }
}
```

Planned additional scope:

- `workflow_id`, `dataclip_id` (the input) and `dataclip_wiped` (`true` once
  the input's body has been wiped) in each work order's attributes.
- `last_activity_after`, `last_activity_before`: ISO 8601, on `last_activity`.
  The History page's default is the last 30 days.
- `search`: text to find in work orders, with `search_fields`, a
  comma-separated choice of `id`, `dataclip_name`, `body` (the input) and `log`.
  Defaults to all four. `id` matches part of the work order's, its runs' or
  their steps' ids, not dataclip ids. `dataclip_name` matches part of the
  input's name. `body` and `log` match words starting with the text in the
  steps' inputs and the runs' log lines. A search counts at most 50 matches,
  and `meta` says when it stopped counting.
- `sort`: `inserted_at` or `last_activity`, with a `-` prefix for descending.
  Defaults to `-last_activity`.
- `include=runs`: adds each work order's runs, in the same shape as
  `GET /api/runs/:id`, newest first.

## Run a workflow

Status: **Private**

```
POST /api/projects/:project_id/workflows/:workflow_id/work_orders
```

Tokens: personal access token of a project owner, admin or editor.

Starts a work order by hand, the way the app's Run button does.

| Field | Type | Notes |
| --- | --- | --- |
| `job_id` | UUID | The job to start from. Send this or `trigger_id`. |
| `trigger_id` | UUID | Start from the job this trigger leads to. |
| `dataclip_id` | UUID | Optional. An existing input to reuse. |
| `body` | object | Optional. A new input. Send this or `dataclip_id`, not both. Defaults to `{}`. |

Answers 201 with the work order, in the same shape as
`GET /api/work_orders/:id`. Like a webhook, the response carries
`x-meta-work-order-id` and `x-meta-run-id` headers.

Notable errors:

- 422 `invalid` with an entry at `#/job_id` or `#/trigger_id` when neither or
  both are sent, or the id isn't in this workflow.
- 422 `invalid` with an `exclusive` entry when both `dataclip_id` and `body`
  are sent.
- 422 `invalid` with a `dataclip_wiped` entry when the dataclip's body has been
  wiped.
- 429 `too_many_runs` or 402 `exceeds_limit` for run limits.

> Implementation note: the app calls this through a session-cookie route,
> `POST /projects/:project_id/workflows/:workflow_id/runs`
> (`LightningWeb.WorkflowController.create_run/2`), which builds a
> `Lightning.WorkOrders.Manual` and calls `Lightning.WorkOrders.create_for/1`.
> Differences:
>
> - The input field is `custom_body`, a JSON string, not `body` as an object.
> - It answers `{"data": {"workorder_id", "run_id", "dataclip"}}`, not the
>   work order resource.
> - It needs both the `:edit_workflow` and `:run_workflow` policy actions.
> - The spec's input checks are new: today `job_id` wins if both ids are sent,
>   a trigger starts its first edge's job, `dataclip_id` silently wins over a
>   body, and a wiped dataclip isn't refused.

## Retry many work orders

Status: **Private**

```
POST /api/projects/:project_id/work_orders/retries
```

Tokens: personal access token of a project owner, admin or editor.

Send one of:

| Field | Type | Notes |
| --- | --- | --- |
| `filter` | object | The filters of the list endpoint. Retries every work order that matches when Lightning receives the request. |
| `work_order_ids` | array of UUIDs | At most 100. |

and optionally:

| Field | Type | Notes |
| --- | --- | --- |
| `job_id` | UUID | Retry from this job instead of each work order's start. All the work orders must be from the job's workflow. |

Each work order gets a new run, as for
[retrying a run](./runs.md#retry-a-run). Work orders whose input has been
wiped, or whose workflow has been deleted, are skipped. Answers 202 with
`{"enqueued": 40, "discarded": 2}`. Large sets are retried in the background.

Notable errors:

- 422 `invalid` with an `exclusive` entry when both `filter` and
  `work_order_ids` are sent, or a `required` entry when neither is.
- 422 `invalid` with a `mismatch` entry at `#/job_id` when the work orders
  are from more than one workflow.
- 429 `too_many_runs` or 402 `exceeds_limit` for run limits, counted on the
  work orders that can be retried.

> Implementation note: the History page's `bulk-rerun` event calls
> `Lightning.WorkOrders.retry_many/2`, or `retry_many/3` with a job. For a
> filter it first calls `Lightning.Invocation.search_workorders_for_retry/2`.
> Differences:
>
> - The filter is a History page `Lightning.WorkOrders.SearchParams`, not the
>   list endpoint's filters.
> - `retry_many` doesn't check the work orders belong to the project. The app
>   only passes ids from its own page or search; the route must scope them.
> - Without a job, every set goes to the background in Oban jobs of 100, and
>   a later failure is only logged. With a job, it retries one by one, in the
>   request.
> - With a job, nothing checks the work orders share its workflow. A work
>   order whose last run never reached the job is dropped from both counts.
> - The event needs the `:run_workflow` policy action (owner, admin, editor).
>   Nothing is audited.

## Cancel a work order

Status: **Private**

```
PATCH /api/work_orders/:id
```

Tokens: personal access token of a project owner, admin or editor.

Body: `{"state": "cancelled"}`. Cancels every run of the work order that no
worker has claimed yet. Answers 200 with the work order. A work order with no
such run answers 422 `invalid` with a `not_allowed` entry at `#/state`, as for
[cancelling a run](./runs.md#cancel-a-run).

> Implementation note: the History page's `cancel` event calls
> `Lightning.WorkOrders.cancel_many/2` with one work order and the project id,
> which calls `Lightning.Runs.cancel_available_for_work_orders/3`. Differences:
>
> - It answers `{:ok, count}` of runs cancelled, not the work order. `0` is
>   the spec's `not_allowed` case.
> - It cancels at most 100 runs per call.
> - It takes the project id and ignores runs outside it, so the route must
>   look up the work order's project first.
> - The event needs the `:run_workflow` policy action (owner, admin, editor).
>   Nothing is audited.

## Cancel many work orders

Status: **Private**

```
POST /api/projects/:project_id/work_orders/cancellations
```

Tokens: personal access token of a project owner, admin or editor.

Takes `filter` or `work_order_ids`, as for retrying many. Cancels the runs no
worker has claimed yet. Answers 202 with `{"cancelled": 12}`. Large sets are
cancelled in the background.

> Implementation note: the History page's `bulk-cancel` event. Selected work
> orders go to `Lightning.WorkOrders.cancel_many/2`, in the request. For a
> filter it calls `Lightning.Invocation.search_workorders_for_cancel/2`, then
> `Lightning.WorkOrders.cancel_many_async/2`, which queues one
> `CancelManyWorkOrdersJob` that cancels 100 runs at a time until none are
> left. Differences:
>
> - The filter is a History page `Lightning.WorkOrders.SearchParams`, not the
>   list endpoint's filters.
> - The synchronous path cancels at most 100 runs and ignores the rest.
> - The background path can only count work orders, not runs, so the app
>   says how many work orders it is cancelling.
> - The event needs the `:run_workflow` policy action (owner, admin, editor).
>   Nothing is audited.

## History exports

An export is a zip of work orders, with their inputs, outputs and logs.
Lightning builds it in the background.

```json
{
  "data": {
    "type": "history_exports",
    "id": "…",
    "attributes": {
      "state": "completed",
      "filename": "….zip",
      "created_by_id": "…",
      "created_by_name": "Ada Lovelace",
      "download_url": "https://.../api/projects/…/history_exports/…/download",
      "inserted_at": "…",
      "updated_at": "…"
    },
    "relationships": {},
    "links": { "self": "https://.../api/projects/…/history_exports/…" }
  }
}
```

`state` is `enqueued`, `in_progress`, `completed` or `failed`. `filename` and
`download_url` are `null` until the export is `completed`. `created_by_id` and
`created_by_name` are the user who asked for it. Fetch `download_url` with the
same token.

### Export history

Status: **Private**

```
POST /api/projects/:project_id/history_exports
```

Tokens: personal access token of a project owner, admin or editor.

Body: `{"filter": {…}}`, the filters of the list endpoint. Answers 202 with
the export, `state` `enqueued`. Lightning also emails you when it is ready.

> Implementation note: the History page's `confirm-export` event calls
> `Lightning.Invocation.export_workorders/3`. In one transaction it records a
> `requested` audit event, inserts a `Lightning.Projects.File` and queues
> `Lightning.WorkOrders.ExportWorker` (one attempt), which emails the user
> when it completes. Differences:
>
> - The filter is a History page `Lightning.WorkOrders.SearchParams`, not the
>   list endpoint's filters.
> - It does no authorisation. The event needs the `:run_workflow` policy
>   action (owner, admin, editor).
> - A failed export is marked `failed` but sends no email.

### List history exports

Status: **Private**

```
GET /api/projects/:project_id/history_exports
```

Tokens: personal access token. Any project member, viewers included. Paged,
newest first.

> Implementation note: `Lightning.Projects.list_project_files/2`, shown on the
> project settings History Exports tab. It preloads `created_by`, and the tab
> shows the basename of each file's `path` as the filename. Differences: it isn't paged and
> doesn't filter on `type` (`:export` is the only type today). It does no
> authorisation; the tab is shown to every project member.

### Get a history export

Status: **Private**

```
GET /api/projects/:project_id/history_exports/:id
```

Tokens: personal access token. Any project member, viewers included, can get
an export and download it.

> Implementation note: no function gets one export; the settings tab reads
> it from `Lightning.Projects.list_project_files/2`. The download is the
> session-cookie route `GET /project_files/:id/download`
> (`LightningWeb.ProjectFileController.download/2`), authorised by
> `Lightning.Policies.Exports` `:download`. Differences:
>
> - That route takes the file id alone, with no project in the URL.
> - With cloud storage it redirects to a signed storage URL instead of
>   serving the file.
