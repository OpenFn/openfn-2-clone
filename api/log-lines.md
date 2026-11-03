# Log lines

## List log lines

Status: **Public**

Tokens: personal access token, or service account with `projects:write`. Read
only.

```
GET /api/log_lines
```

Paged. Filters:

| Parameter | Notes |
| --- | --- |
| `project_id`, `workflow_id`, `job_id`, `work_order_id`, `run_id` | UUIDs. |
| `level` | `success`, `always`, `info`, `warn`, `error` or `debug`. |
| `timestamp_after`, `timestamp_before` | ISO 8601. |

Newest first by `timestamp`. Every bad filter is reported together in one 400
`invalid_parameter`. The service account must send `project_id`; without it
the answer is 400 `invalid_parameter` with a `required` entry. A `project_id`
you may not access answers 403 `forbidden`, whether or not the project exists,
and is checked before the other filters. Only superusers and the service
account hear 404 for an unknown `project_id`, or 400 for one that isn't a UUID.

Each log line:

```json
{
  "type": "log_lines",
  "id": "…",
  "attributes": {
    "source": "JOB",
    "level": "info",
    "message": "…",
    "timestamp": "…",
    "step_id": "…",
    "run_id": "…"
  }
}
```
