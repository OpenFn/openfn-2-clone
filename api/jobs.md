# Jobs

## List and get jobs

Status: **Public**

Tokens: personal access token, or service account with `projects:write`. Read
only.

```
GET /api/jobs
GET /api/jobs?project_id=:project_id
GET /api/projects/:project_id/jobs
GET /api/jobs/:id
GET /api/projects/:project_id/jobs/:id
```

Lists are paged. Without a project they cover every project you can access;
the service account can access every project. A `project_id` you may not
access answers 403 `forbidden`, whether or not the project exists.

On the nested route, a job that isn't in the path's project answers 404 to a
caller who can access the project. On `/api/jobs/:id`, an unknown or malformed
id answers 403 `forbidden`, except to the service account, which hears 404 or
400. See [who hears 404](./errors.md#who-hears-404).

Each job:

```json
{
  "type": "jobs",
  "id": "…",
  "attributes": { "name": "Extract data" },
  "relationships": {},
  "links": { "self": "https://.../api/jobs/…" }
}
```

A list returns `{"data": [...], "included": [], "links": {...}}`. A single job
returns `{"data": <job>, "included": [], "links": {"self": …}}`.
