# Authentication

Apart from the token endpoints, webhooks and a few account routes, every
endpoint takes a token. Most take a bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Lightning accepts these kinds of token. Each endpoint section says which ones
it takes.

| Token | Who holds it | How to get one |
| --- | --- | --- |
| Personal access token | A person | Create one in the app under your user profile. It acts as that person, with their project roles. |
| Service account access token | Automation | Trade a signed assertion at `POST /api/oauth/token` (see below). It lasts five minutes and carries scopes. |
| Run token | A running job | Issued by Lightning to a run. Only used by the collections item API. |
| GitHub sync token | Lightning's GitHub integration | Created when a project is connected to a repository. Only used by provisioning, for that project. Any other route answers it 403 `insufficient_scope`. |
| Session token (planned) | A person using Lightning's own app | Sign in with `POST /api/session` (see below). Sent as a cookie, not a header. |

## Session tokens

Planned. A session token is how Lightning's own app calls the API for the
person using it. The other tokens are for clients outside Lightning, and a
script holding one may not have a person behind it. A session token always
does, so it is the only kind that can sign a person in, change how they prove
who they are, or use the AI assistant.

- [`POST /api/session`](./account.md#sign-in) signs in with a password, and an
  MFA code when the account has MFA. Signing in through a provider ends with
  Lightning setting the same session.
- It is a cookie, so the browser sends it on its own, including when the app
  sends the browser through a provider's sign-in page and back. Lightning only
  accepts it on requests from its own pages, and writes also need the
  `x-csrf-token` header, from [`GET /api/session`](./account.md#get-the-session).
- It acts as the person, with their project roles, like a personal access
  token. Wherever an endpoint takes a personal access token, it takes a session
  token too.
- **Stepped up**: a few routes, such as turning off MFA, need the person to
  have entered their password or an MFA code in the last five minutes. Post it
  to `POST /api/session` again. Without it they answer 403
  `step_up_required`.
- A project that requires MFA turns away a session whose person hasn't set it
  up, as it does their other tokens.
- [`DELETE /api/session`](./account.md#sign-out) signs out. Changing a
  password, or a superuser disabling the account, ends every session.

## Service account tokens

A service account signs in with an RSA key pair instead of a password. The
instance operator sets the public key as `SERVICE_ACCOUNT_PUBLIC_KEY`, and your
automation keeps the private key. Each instance has at most one service
account. Changing or removing the key revokes every token already issued, and
so does changing `WORKER_RUNS_PRIVATE_KEY`, which signs the access tokens.

`SERVICE_ACCOUNT_PUBLIC_KEY` takes raw PEM, PEM with literal `\n`, or the PEM
file base64-encoded on one line. It must be an RSA key of at least 2048 bits. A
bad value stops Lightning at boot with a message naming the variable. While it
is set, the web app's first setup page is turned off, so the first superuser
comes from [`POST /api/users`](./users.md).

The service account isn't a user. It can't own credentials, so `POST` and
`DELETE /api/credentials` answer it 403 `forbidden`. It can't provision through
`POST /api/provision`, and it can't use the `/collections` item API that jobs
read and write. It is the only caller `/api/users` accepts.

### Discover the token endpoint

Status: **Public**

```
GET /.well-known/oauth-authorization-server
```

Returns RFC 8414 metadata. Use its `token_endpoint` value exactly as given,
because it is also the `aud` of your assertion.

### Request a token

Status: **Public**

```
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded
```

This is the OAuth 2.0 client credentials grant with `private_key_jwt` client
authentication ([RFC 7523](https://www.rfc-editor.org/rfc/rfc7523#section-2.2)).
The body must be form encoded. JSON is refused.

| Field | Value |
| --- | --- |
| `grant_type` | `client_credentials` |
| `client_assertion_type` | `urn:ietf:params:oauth:client-assertion-type:jwt-bearer` |
| `client_assertion` | A JWT signed with RS256 by the private key |
| `scope` | Space-separated scopes, sent once. Required: a request with no `scope` is refused. |
| `client_id` | Optional. If sent, it must be the service account's id. |

The assertion's claims:

| Claim | Value |
| --- | --- |
| `iss`, `sub` | Both the service account's id: the public key's RFC 7638 thumbprint. Write `e`, `kty` and `n` as JSON in that order with no spaces, hash with SHA-256, then base64url encode. |
| `aud` | The `token_endpoint` from the metadata document, exactly. |
| `iat` | Now, as an integer in seconds. At most five seconds ahead of Lightning's clock. |
| `exp` | An integer, at most 60 seconds after `iat`. |
| `jti` | 1 to 255 bytes with no NUL character, new for every assertion. Once Lightning issues a token for a `jti` it refuses that `jti` again. An assertion it refuses doesn't use up its `jti`. |

The header's `alg` must be `RS256`.

A successful response:

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "projects:write credentials:write collections:write"
}
```

There is no refresh token. Sign a new assertion when you need a new token.
Each token issued records a `token_issued` audit event with the scopes it
carries.

An expired access token answers 401 `invalid_token` with
`WWW-Authenticate: Bearer error="invalid_token", error_description="The access token expired"`.
Any other bad token gets `Bearer error="invalid_token"` with no description.

Failures follow OAuth's error format,
`{"error": "<code>", "error_description": "<why>"}`, rather than the problem
documents the rest of the API uses, whatever `Accept` says.
`error_description` says what to fix, so a client can show it. A 401 from the
token endpoint has no `WWW-Authenticate` header.

| Status | `error` | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | The body isn't form encoded or can't be parsed, `grant_type`, `client_assertion_type`, `client_assertion` or `scope` is missing or sent more than once, or `grant_type` is in the query string. |
| 413 | `invalid_request` | The body is too large. |
| 400 | `unsupported_grant_type` | `grant_type` isn't `client_credentials`. |
| 400 | `invalid_scope` | `scope` is missing or empty, or names a scope that doesn't exist. |
| 401 | `invalid_client` | The assertion was refused: not a JWT, wrong `iss`, `sub`, `aud` or `client_id`, a bad signature, missing or bad `exp`, `iat` or `jti`, expired, living longer than 60 seconds, issued in the future, or a `jti` used before. `error_description` says which. |

### Node.js example

No extra packages needed:

```js
import { createHash, createPrivateKey, createPublicKey, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const lightning = 'https://lightning.example.org';
const key = createPrivateKey(readFileSync('service-account.key'));

const { token_endpoint } = await fetch(
  `${lightning}/.well-known/oauth-authorization-server`
).then(r => r.json());

const { e, kty, n } = createPublicKey(key).export({ format: 'jwk' });
const id = createHash('sha256').update(JSON.stringify({ e, kty, n })).digest('base64url');

const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${encode({ alg: 'RS256' })}.${encode({
  iss: id, sub: id, aud: token_endpoint, iat: now, exp: now + 60, jti: randomUUID(),
})}`;
const signature = sign('sha256', Buffer.from(unsigned), key).toString('base64url');

const { access_token } = await fetch(token_endpoint, {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: `${unsigned}.${signature}`,
    scope: 'projects:write credentials:write collections:write',
  }),
}).then(r => r.json());
```

## Scopes

Lightning's own docs call these token grants. A service account token can
only do what its scopes allow. Within those scopes it acts on every project as
if it held every role, but it never appears as a project member.

| Scope | Allows |
| --- | --- |
| `users:read` | Listing and reading users |
| `users:write` | Creating and changing users, superusers included. It doesn't include `users:read`. |
| `projects:write` | Reading, creating and changing projects, and reading what's in them: workflows, jobs, work orders, runs and log lines. Also creating and changing workflows. |
| `credentials:write` | Reading, creating and replacing credentials, and which projects they're linked to |
| `collections:write` | Reading, creating and renaming collections |

Projects, credentials and collections have no read scopes. Their `GET` routes
need the same `:write` scope as their `PUT` routes.

A token without the scope a route needs answers 403 `insufficient_scope`
before Lightning looks for the record, so the answer is the same whether or not
it exists. The body's `scope` and the `WWW-Authenticate` header both name it.

Planned: an `audit:read` scope, for [audit events](./audit-events.md). Planned
endpoints on projects, credentials and collections use the scopes above.

## Single sign-on provider

An instance can let people sign in through one OpenID Connect provider, as well
as with a password. These routes set it up. The client secret is never
returned.

```json
{
  "data": {
    "name": "keycloak",
    "discovery_url": "https://sso.example.org/realms/main/.well-known/openid-configuration",
    "client_id": "lightning",
    "redirect_uri": "https://lightning.example.org/authenticate/keycloak/callback",
    "inserted_at": "…",
    "updated_at": "…"
  }
}
```

`redirect_uri` is where the provider sends people back, worked out from the
`name`. Register it with the provider.

### Get the sign-in provider

Status: **Private**

```
GET /api/auth_provider
```

Tokens: personal access token of a superuser. Answers 404 `not_found` when
none is set up.

> Implementation note: `Lightning.AuthProviders.get_existing/0`, which the
> superuser page at `/settings/authentication`
> (`LightningWeb.AuthProvidersLive.Index`) loads on mount. Differences: it
> returns the stored `client_secret`, which the route must leave out, and an
> `allow_unverified_email` flag the spec doesn't show. It does no authorisation
> check; the page relies on the `:ensure_admin` hook.

### Set the sign-in provider

Status: **Private**

```
PUT /api/auth_provider
```

Tokens: personal access token of a superuser.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. Lowercase letters, digits, hyphens and underscores. Part of `redirect_uri`. |
| `discovery_url` | string | Required. An HTTPS URL. |
| `client_id` | string | Required. |
| `client_secret` | string | Required when setting up. Leave it out to keep the stored one. |

Lightning fetches the discovery document before it saves, and the new settings
apply to the next sign-in. Answers 201 when it sets one up and 200 when it
replaces one. A discovery document that can't be fetched, or has no
authorization or token endpoint, answers 422 `invalid` with a
`discovery_failed` entry at `#/discovery_url`.

> Implementation note: `Lightning.AuthProviders.create/1` and
> `Lightning.AuthProviders.update/2`, through the form's `save` event in
> `LightningWeb.AuthProvidersLive.FormComponent`. Differences:
>
> - the name and URL format checks, and building `redirect_uri`, are in
>   `Lightning.AuthProviders.AuthConfigForm.change/2`, not the schema
>   changeset. `create/1` and `update/2` only check required fields, so the
>   route has to run the form changeset first.
> - saving doesn't fetch the discovery document. Only the page's `test` event
>   does, through `AuthConfigForm.validate_provider/1`, and it also refuses a
>   plain HTTP URL. The route has to call it before saving. The page's Test
>   button checks the unsaved form, new or existing, without saving it, and
>   saving doesn't wait for a passing test. This route has no way to check
>   without saving.
> - the page builds `redirect_uri` from a redirect host the user can edit. The
>   route should use the instance's own URL.
> - `update/2` refreshes the cached sign-in handler, but under the new name
>   only, so a rename leaves the old one cached for up to 30 minutes.
>   `create/1` caches nothing; the handler is built on first use.
> - there's an `allow_unverified_email` flag the spec doesn't have.
> - it takes no actor and records no audit event.

### Remove the sign-in provider

Status: **Private**

```
DELETE /api/auth_provider
```

Tokens: personal access token of a superuser.

Turns off single sign-on at once. Answers 204 with no body.

> Implementation note: `Lightning.AuthProviders.remove_handler/1` then
> `Lightning.AuthProviders.delete!/1`, through the form's `disable` event.
> Differences: `delete!/1` takes the record and raises on failure, so the route
> has to look it up with `get_existing/0` and answer 404 itself. It takes no
> actor and records no audit event.
