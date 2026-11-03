# Dataclips

A dataclip is the input or output of a step, or a saved input.

## List a project's dataclips

Status: **Planned**

```
GET /api/projects/:project_id/dataclips
```

Tokens: personal access token. Paged, newest first.

Lists dataclips without their bodies. Each entry is the dataclip object with
`body` left out. Filters:

| Parameter | Notes |
| --- | --- |
| `q` | A name, an id, or the start of an id. |
| `type` | One of the types below. |
| `named` | `true` for saved inputs only. |
| `job_id` | Only dataclips that can be the input to this job. Leaves out wiped ones. |
| `inserted_after`, `inserted_before` | ISO 8601. |

A `job_id` from another project answers 400 `invalid_parameter`.

## Get a dataclip

Status: **Private**

```
GET /api/dataclips/:id
```

Tokens: personal access token.

```json
{
  "data": {
    "type": "dataclips",
    "id": "…",
    "attributes": {
      "name": null,
      "type": "step_result",
      "project_id": "…",
      "wiped_at": null,
      "inserted_at": "…",
      "updated_at": "…",
      "body": { "data": {} }
    },
    "relationships": {},
    "links": { "self": "https://.../api/dataclips/…" }
  },
  "included": [],
  "links": { "self": "https://.../api/dataclips/…" }
}
```

`type` is `http_request`, `global`, `step_result`, `saved_input` or `kafka`.
For `http_request` and `kafka`, `body` is `{"data": …, "request": …}`. Once a
dataclip has been wiped, under the project's retention policy or because the
project doesn't save dataclips, `wiped_at` is set and the body's contents are
`null`.

> Implementation note: `Lightning.Invocation.get_dataclip_with_body!/1`, which
> the app reaches through a session-cookie route, `GET /dataclip/body/:id`.
> Differences: it returns the body as a JSON string (`body_json`) rather than
> an object and raises for a missing id. The cookie route sends the bare body
> with no wrapper, honours `If-Modified-Since`, and scrubs credential values out
> of `step_result` and `http_request` bodies first. The API route must scrub
> the same way.

## Rename a dataclip

Status: **Private**

```
PATCH /api/dataclips/:id
```

Tokens: personal access token of a project owner, admin or editor.

Body: `{"name": "<string or null>"}`. A name saves the dataclip so the
retention policy doesn't wipe it, and `null` removes the name. Answers 200 with
the dataclip.

> Implementation note: `Lightning.Invocation.update_dataclip_name/3`, through
> a session-cookie route, `PATCH /projects/:project_id/dataclips/:dataclip_id`
> (`LightningWeb.DataclipController.update_name/2`). Differences: the cookie
> route answers in its own shape.
