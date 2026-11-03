# GitHub sync

A project can be connected to a GitHub repository. Lightning adds a GitHub
Action and a [GitHub sync token](./authentication.md) to the repo, so changes
pushed to the branch deploy to the project, and a sync commits the project to
the branch. Connecting and disconnecting write to the repo as the person doing
it, so that person must have connected their GitHub account in the app.
Checking the repo and syncing use Lightning's GitHub App installation instead.

## The repo connection object

```json
{
  "data": {
    "type": "repo_connections",
    "id": "…",
    "attributes": {
      "repo": "openfn/malaria-programme",
      "branch": "main",
      "github_installation_id": "12345678",
      "config_path": "./openfn-a1b2c3d4-config.json",
      "verified": false,
      "problems": ["missing_deploy_yml"],
      "inserted_at": "…",
      "updated_at": "…"
    },
    "relationships": {},
    "links": { "self": "https://.../api/projects/…/repo_connection" }
  }
}
```

`verified` and `problems` come from checking the repo on GitHub: whether the
pull and deploy workflows, the config file and the repo secret are all there.
`problems` can hold `missing_pull_yml`, `missing_deploy_yml`,
`missing_config` and `missing_api_secret`. The token Lightning stores in the
repo is never returned.

## Get a project's repo connection

Status: **Private**

```
GET /api/projects/:project_id/repo_connection
```

Tokens: personal access token. A project with no connection answers 404
`not_found`. GitHub being unreachable doesn't fail the request; `verified` is
`false` and `problems` says why.

> Implementation note: `Lightning.VersionControl.get_repo_connection_for_project/1`
> loads the connection and `Lightning.VersionControl.verify_github_connection/1`
> checks the repo. The settings page reaches both on mount. Differences:
>
> - the check stops at the first thing missing and returns a `GithubError`
>   (`file_not_found` or `repo_secret_not_found`, with a message naming the
>   file), so the route can report one problem, not a list. Telling
>   `missing_pull_yml` from `missing_deploy_yml` and `missing_config` means
>   reading the message or changing the check.
> - a GitHub failure comes back as an error, not a `verified: false` result.
>   The route has to fold it into `problems`.
> - the stored `config_path` is nil when Lightning wrote the default config;
>   `ProjectRepoConnection.config_path/1` gives the real path. v2 (CLI
>   workspace) connections also have `sync_version` and `workspace_path`,
>   which the spec doesn't show.

## Connect or reconnect a repo

Status: **Private**

```
PUT /api/projects/:project_id/repo_connection
```

Tokens: personal access token of a project owner or admin, who has connected
their GitHub account.

| Field | Type | Notes |
| --- | --- | --- |
| `github_installation_id` | string | Required. The GitHub App installation that can reach the repo. |
| `repo` | string | Required. `owner/name`. |
| `branch` | string | Required. |
| `sync_direction` | string | `pull` (the project is the source: sync it to the repo now) or `deploy` (the repo is the source). Defaults to `pull`. |
| `config_path` | string | Required for `deploy`. Where the project's config is in the repo. |

Creates the connection, or replaces it, and writes the GitHub workflows,
config and secret to the repo again. Answers 201 when it creates and 200 when it
replaces.

Notable errors:

- 422 `invalid` with a `required` entry at `#/config_path` for `deploy` without
  one.
- 402 `exceeds_limit` when the plan doesn't include GitHub sync.
- 503 `service_unavailable` when GitHub refuses or doesn't answer. Nothing is
  saved.

> Implementation note: `Lightning.VersionControl.create_github_connection/2`
> creates, and `Lightning.VersionControl.reconfigure_github_connection/3`
> reconnects. They back the `save` and `reconnect` events of
> `LightningWeb.ProjectLive.GithubSyncComponent`. Both check the plan limit,
> write the workflows, secret and config with the caller's GitHub token, start
> a sync for `pull`, and roll the database back if GitHub fails. Differences:
>
> - neither checks authorisation. The component checks
>   `:write_github_connection` (owner or admin) on its mount-time assign.
> - reconnecting only takes `sync_direction`, `workspace_path` and
>   `local_alias`. It can't change the repo, branch or installation, so a PUT
>   that changes those has to remove and create.
> - the changeset requires `accept: true` (the "please tick the box" field).
>   The route has to set it.
> - create doesn't check the installation belongs to the caller, as
>   `fetch_repo_branches/3` does. Writes use the caller's own token, so GitHub
>   still refuses a repo they can't reach.
> - a project family can't use the same repo and branch twice. Create returns
>   `:branch_used_in_project_tree` for that, and the export pre-flight returns
>   a plain string when workflow or job names collide. The spec lists neither.
> - only create and a moved `workspace_path` record an audit event.
> - files already pushed stay in the repo when a later GitHub step fails.

## Disconnect a repo

Status: **Private**

```
DELETE /api/projects/:project_id/repo_connection
```

Tokens: personal access token of a project owner or admin.

Removes the connection, and then tries to remove the deploy workflow, config
and secret from the repo. It answers 204 with no body even if GitHub can't be
reached, so check the repo if that matters.

> Implementation note: `Lightning.VersionControl.remove_github_connection/2`,
> from the component's `delete-connection` event. It deletes the row with an
> audit event, then cleans up the repo with the caller's GitHub token and
> ignores the result. Differences: it does no authorisation check (the
> component checks `:write_github_connection`), and it skips the clean-up
> silently when the caller has no GitHub account connected. The shared
> `openfn-pull.yml` on the default branch is left in place, and a v2
> connection's `openfn.yaml` too.

## Sync to GitHub

Status: **Private**

```
POST /api/projects/:project_id/repo_connection/syncs
```

Tokens: personal access token of a project owner, admin or editor.

Body: `{"commit_message": "…"}`, optional. Starts the GitHub Action that
commits the latest version of every workflow to the branch. It runs on GitHub,
so this answers 202 with no body as soon as the Action has started. Each call
starts a new run.

A plan limit answers 402 `exceeds_limit`.

> Implementation note: `Lightning.VersionControl.initiate_sync/2`, from the
> component's `initiate-sync` event. It checks the plan limit, exports the
> project once to catch errors the Action would hide, then dispatches the
> pull workflow through the GitHub App installation. Differences: it takes no
> actor, so it does no authorisation check and records no audit event. The
> component checks `:initiate_github_sync`, which allows owners, admins,
> editors and support users with no membership. The commit message is
> required; the app always sends "user <email> initiated a sync from
> Lightning", so the route needs a default. A failed export comes back as a
> plain string, an error the spec doesn't list.
