# Users

Tokens: service account only. `users:read` for `GET`, `users:write` for `POST`
and `PATCH`. A service account without the grant gets 403
`insufficient_scope` naming it, and so does a GitHub sync token. A personal
access token, a superuser's included, gets 403 `forbidden` on every route,
whether or not the user exists and whether or not the id is a UUID.

Personal access token support is planned. Access will depend on the user's
instance role: today, only superusers can manage users, in the app. Planned
additional scope on some sections lets people create and change their own
account.

## The user object

```json
{
  "data": {
    "type": "users",
    "id": "604f0cd2-37fb-4833-a5e1-821555b5b314",
    "attributes": {
      "email": "ada@example.com",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "role": "superuser"
    },
    "links": { "self": "https://.../api/users/604f0cd2-…" }
  }
}
```

Planned additional scope: `support_user` (whether they can open projects that
allow support access), `disabled`, `scheduled_deletion` (a timestamp, or
`null`), and `has_activity_in_projects` (whether they have created runs, which
keeps them from ever being removed; superusers and the service account only).

## List users

Status: **Public**

```
GET /api/users
GET /api/users?email=ada@example.com
```

Paged. `email` matches without regard to case. An `email` that isn't a single
string answers 400 `invalid_parameter`.

Planned additional scope: `q`, matching any part of a first name, last name,
email or role without regard to case, and `sort`: `email`, `first_name`,
`last_name`, `role`, `support_user`, `disabled` or `scheduled_deletion`, with a
`-` prefix for descending. Users with no `scheduled_deletion` sort last.

## Get a user

Status: **Public**

```
GET /api/users/:id
```

An id that names no user answers 404 `not_found`, and one that isn't a UUID
400 `invalid_parameter` with a `path` entry. `PATCH` answers these the same
way, before it reads the body.

## Create a user

Status: **Public**

```
POST /api/users
```

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | Required. Unique, without regard to case. |
| `password` | string | Required. 12 to 72 characters. |
| `first_name` | string | Required. |
| `last_name` | string | Required. |
| `role` | string | `user` or `superuser`. Defaults to `user`. |
| `confirmed` | boolean | `true` marks the email as already verified. |

Any other key answers 422 with an `unknown_key` entry, alongside every other
error in the body. A body that isn't a JSON object answers 400 `malformed`.
Lightning doesn't email users it creates.

Answers 201 with the user. An email already taken, in any case, is a `taken`
entry at `#/email` in a 422 `invalid`. It names nothing about the user who
holds it. To make a retry safe, look the user up with `?email=` on
[List users](#list-users) after a `taken` answer.

Planned additional scope:

- Without a token, on an instance that allows sign-up, anyone can create an
  account for themselves. They send `email`, `password`, `first_name`,
  `last_name` and `terms_accepted: true`, and get role `user`. Lightning emails
  them a confirmation link. On an instance with no superuser yet (`needs_setup`
  on [`GET /api/instance`](./account.md#get-the-instance)), the account made
  this way is the superuser. Either way the response also signs the person
  in, as Lightning's sign-up and first setup forms do.
- With a session whose `state` is `signup_pending`, `{"from_sign_in": true}`
  creates the account from what the provider gave, already confirmed and
  linked to the provider, and signs the person in.

## Update a user

Status: **Public**

```
PATCH /api/users/:id
```

Takes any of `first_name`, `last_name`, `role`, `password` and `confirmed`.
The email can't be changed: sending `email` or any other key answers 422 with
an `unknown_key` entry. `confirmed` only ever confirms. A new role or password
signs the user out of every browser session. Answers 200 with the user.

Planned additional scope:

- `support_user` and `disabled`. Disabling a user signs them out of every
  browser session. Their access tokens are kept but refused while they are
  disabled.
- `email`, changed at once with no confirmation, and `scheduled_deletion` (a
  timestamp, or `null`), as Lightning's user form lets a superuser do. Setting
  `scheduled_deletion` revokes the user's access tokens. A superuser's
  `scheduled_deletion` is always `null`.
- A person can update their own account, with a personal access token or a
  session token:
  - `first_name`, `last_name` and `contact_preference` (`critical` or `any`:
    which emails they get), with either token.
  - `email`, with a session token stepped up. It isn't changed until the person
    follows the link sent to the new address; until then it is
    `pending_email` on `GET /api/me`. The old address is told.
  - `password`, with a session token stepped up. It ends every other session
    and revokes their personal access tokens. An account that only signs in
    through a provider can set its first password this way.
  - `consent` and `ai_disclaimer_accepted` (`true`), with a session token. On
    instances with a consent extension, `consent` holds the person's choices.
  - `experimental_features` (`true` or `false`), with either token. It is the
    profile page's experimental features switch, read back on `GET /api/me`.

  A person can't change their own `role`, `confirmed`, `support_user` or
  `disabled`.

## Delete a user

Status: **Private**

```
DELETE /api/users/:id
```

Tokens: service account with `users:write`.

Schedules the user for deletion. The user is disabled, signed out of every
session and their access tokens revoked straight away. They are removed after
the instance's retention period, unless they have created runs, project files
or keychain credentials, in which case they stay disabled. Answers 204 with no
body. A user who is already scheduled answers 409 `scheduled_for_deletion`
(see [Immediate purges](./misfits.md#immediate-purges)).

Planned additional scope: a person can schedule their own deletion with a
session token stepped up. They are signed out straight away, so only a
superuser or the service account can cancel it.

> Implementation note: `Lightning.Accounts.schedule_user_deletion/2` takes the
> user and their email, which the app asks for as a confirmation. Differences:
> it takes no actor, so it records no audit event, it refuses superusers, and
> it emails the user. The route should pass the user's own email and the
> caller as actor.
> `Lightning.Accounts.purge_user/1` deletes at once (the users list's "Delete
> now" on a scheduled user), but refuses a user who has created runs, so it
> doesn't suit the API.

## Cancel a user's deletion

Status: **Private**

```
DELETE /api/users/:id/scheduled_deletion
```

Tokens: service account with `users:write`.

Cancels a scheduled deletion and re-enables the user. Answers 200 with the user.
A user who isn't scheduled answers 404 `not_found`.

> Implementation note: `Lightning.Accounts.cancel_scheduled_deletion/1` takes a
> user id. Differences: it takes no actor and records no audit event, raises
> for a missing user, and succeeds for one who isn't scheduled.

The current user and their own tokens are in [Account](./account.md#the-current-user).
