# Conventions

## Identifiers

Every id is a UUID. A path id that isn't a UUID answers 400
`invalid_parameter` with a `path` entry naming the segment, but only to a
caller who may learn which records exist. Anyone else hears 403 `forbidden`,
as for any record they can't reach. See [order of checks](./errors.md#order-of-checks).

## Content type

Send bodies as `Content-Type: application/json`. A body in a format Lightning
doesn't read answers 415 `unsupported_media_type`. Invalid JSON, or JSON that
isn't an object, answers 400 `malformed`.

Send only the keys a route accepts. A route can refuse any other key with a
422 `invalid` whose entry has the code `unknown_key`.

## Idempotent writes

The `PUT` endpoints for projects, credentials and collections create the
resource under the id in the path if it doesn't exist, or replace it if it
does. They answer 201 when they create and 200 when they replace. Sending the
same body twice changes nothing and writes no second audit event, so they are
safe to retry.

## Pagination

List endpoints that page take:

| Parameter | Default | Notes |
| --- | --- | --- |
| `page` | 1 | |
| `page_size` | 10 | At most 100. Larger values are cut to 100. |

A value below 1, or one that isn't a number, is ignored and the default
applies. Paged responses carry `links`:

```json
"links": {
  "self": "https://.../api/runs?page=2&page_size=10&state=failed",
  "first": "https://.../api/runs?page=1&page_size=10&state=failed",
  "last": "https://.../api/runs?page=7&page_size=10&state=failed",
  "next": "https://.../api/runs?page=3&page_size=10&state=failed",
  "prev": "https://.../api/runs?page=1&page_size=10&state=failed"
}
```

The links carry only the filters the server applied. `next` and `prev` are
`null` at the ends. Runs, work orders and log lines also return a `meta` object
with `total_entries`, `total_pages`, `page_number` and `page_size`.

## Dates

Timestamps are ISO 8601 in UTC, for example `2026-01-01T00:00:00Z`. Date
filters take the same format.

## Sorting, search and includes

Planned. Several endpoints have these as planned additional scope, and they
work the same way wherever they appear:

- `sort` takes one field name from the endpoint's list. A `-` prefix sorts
  descending, for example `sort=-last_activity`.
- `q` is a case-insensitive text search over the fields the endpoint names.
- `include` adds related data to each entry, for example `include=stats`.

An unknown `sort` field or `include` value answers 400 `invalid_parameter`.

## Bulk actions

Planned. Routes that act on many work orders at once take either `filter`, the
same filters as the list endpoint, or a list of ids, never both. With `filter`,
Lightning works out the set when it receives the request, so it acts on what
matches then, not on what a client listed earlier.
