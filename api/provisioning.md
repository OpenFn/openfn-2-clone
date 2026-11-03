# Provisioning

Provisioning reads and writes a whole project (workflows, jobs, triggers,
edges, credential links, collections and channels) as one document. It is
what the OpenFn CLI uses for deploys.

Tokens: personal access token, a GitHub sync token for its own project, or
service account with `projects:write` to export. Deploying to an existing
project needs owner or admin, and creating a new project needs a superuser.
Exporting needs any role on the project; a superuser who isn't a member is
refused. The service account can't deploy: it gets 403 `forbidden` whatever
the body names, or 403 `insufficient_scope` naming `projects:write` without
that grant. Deploying with a service account is planned.

## Deploy a project

Status: **Public**

```
POST /api/provision
```

Send the full project document. Every entity must have a UUID `id`, generated
by you for new ones. Send all existing entities, not just the changed ones:
jobs, triggers and edges you leave out of a workflow are deleted. To delete a
workflow or collection, include it with `"delete": true`. Credential links
and channels can't be removed this way.

```json
{
  "id": "f6ba9a8c-b687-473a-908e-e250686f1eed",
  "name": "my-project",
  "workflows": [
    {
      "id": "f206aa85-4fce-492e-94eb-ffd32c75d178",
      "name": "workflow-one",
      "jobs": [
        { "id": "18ed71de-…", "name": "job-one", "adaptor": "@openfn/language-common@latest", "body": "fn(s => s)" }
      ],
      "triggers": [{ "id": "e0b9f357-…", "type": "webhook", "enabled": true }],
      "edges": [
        { "id": "c239d994-…", "source_trigger_id": "e0b9f357-…", "target_job_id": "18ed71de-…", "condition_type": "always" }
      ]
    }
  ]
}
```

The project's `id` is read from the body only, never the query. An `id` no
project has, or none at all, asks to create a project.

Answers 201 with `{"data": <project document>}` and a `Location` header
pointing at `/api/provision/:id`. While the adaptor catalogue is still loading
it answers 503 `not_ready`.

Notable errors:

- 403 `forbidden` to a caller who may not deploy to the project the body
  names, whether or not it exists and whether or not the id is a UUID. A
  caller who may not create projects gets this for an unknown id or none.
- 400 `malformed` when the body isn't a JSON object.
- 422 `invalid` when the document isn't valid. A missing `id` is a `required`
  entry at `#/id`, and, to a superuser, an `id` that isn't a UUID is an entry
  at `#/id` too. A value that must be unique and is taken, such as two jobs
  with one name, or a project credential, collection or channel id another
  project uses, is a `taken` entry at its position.
- 402 `exceeds_limit` with an entry at `#/id` when an otherwise valid document
  would exceed a plan limit. A document that is also invalid answers the 422
  instead.
- 409 `scheduled_for_deletion` when the project is being deleted, and 409
  `concurrent_edit` when another request changed what the deploy writes, to a
  caller who may deploy.

## Export a project

Status: **Public**

```
GET /api/provision/:id
GET /api/provision/:id?snapshots[]=:snapshot_id
```

Answers 200 `{"data": <project document>}`. The document includes `workflows`
(with `lock_version`), `project_credentials` (`id`, `name`, `owner`),
`collections` (`id`, `name`) and `channels`. Pass `snapshots[]` to get those
workflow versions instead of the current ones.

Notable errors:

- 403 `forbidden` to a caller who isn't a member, or hasn't met the project's
  MFA requirement, whether or not the project exists and whether or not the id
  is a UUID. A GitHub sync token gets this for any project but its own.
- 404 `not_found` for an id that names no project, and 400
  `invalid_parameter` for one that isn't a UUID. Only a superuser and the
  service account hear these.
- 400 `invalid_parameter` when `snapshots[]` isn't a list of UUIDs.
- 409 `scheduled_for_deletion` when the project is being deleted, to a caller
  who may read it.

## Export a project as YAML

Status: **Public**

```
GET /api/provision/yaml?id=:id
```

Answers 200 with `Content-Type: text/yaml`. Takes `snapshots[]` and answers
errors like the JSON export, except that an `id` entry names the query
parameter rather than the path. A missing `id` answers 400
`invalid_parameter`.
