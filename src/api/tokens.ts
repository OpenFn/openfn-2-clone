/**
 * Personal access tokens on Lightning's API (API.md "Your account"): the
 * API's shape, its mapper, its keys, the hooks a wrapper calls, and how the
 * stand-in answers.
 */
import { useQuery } from "@tanstack/react-query";
import type { ResourceStatus } from "../types/resource";
import type { ApiToken } from "../types/tokens";
import { request, standIn, statusOf, useSave } from "./client";
import recorded from "./recorded/tokens.json";

// The API's shape.

/** A token as `GET /api/me/tokens` lists it: `token` is masked to its first and last five characters, except in the answer that creates it. */
export interface ApiAccessToken {
  id: string;
  token: string;
  inserted_at: string;
  last_used_at: string | null;
}

// Mappers.

/** A row of the tokens table. The API masks the token itself, so the row shows its mask as sent. */
export function tokenRow(t: ApiAccessToken): ApiToken {
  return { id: t.id, masked: t.token, insertedAt: t.inserted_at, lastUsedAt: t.last_used_at };
}

// Keys and requests.

export const tokenKeys = {
  all: ["tokens"] as const,
};

/** `GET /api/me/tokens`: the caller's own, newest first, not paged. */
const listTokens = () => request<{ data: ApiAccessToken[] }>("GET", "/api/me/tokens").then((r) => r.data);

/**
 * `POST /api/me/tokens`, answering with the whole token, which is never shown
 * again. Lightning refuses it with 403 `step_up_required` unless the person
 * entered their password in the last five minutes; the page shows that refusal.
 */
const createToken = () => request<{ data: ApiAccessToken }>("POST", "/api/me/tokens").then((r) => r.data.token);

// What a wrapper calls.

export interface Tokens {
  status: ResourceStatus;
  tokens: ApiToken[];
}

/** The tokens page's data: the viewer's tokens, newest first. */
export function useTokens(): Tokens {
  const tokens = useQuery({ queryKey: tokenKeys.all, queryFn: listTokens });
  return { status: statusOf(tokens), tokens: (tokens.data ?? []).map(tokenRow) };
}

/**
 * The tokens page's saves. Each resolves once the list has reloaded, and
 * rejects with the `ApiError` the page shows. `generate` resolves with the
 * new token, whole, for the banner.
 */
export function useTokenSaves() {
  const generate = useSave([tokenKeys.all], createToken);
  const remove = useSave([tokenKeys.all], (id: string) => request("DELETE", `/api/me/tokens/${encodeURIComponent(id)}`));
  return {
    // useSave doesn't carry the answer's type through.
    generate: () => generate([]) as Promise<string>,
    onDelete: async (id: string) => void (await remove([id])),
  };
}

// The stand-in: the recorded tokens (their masks redacted), changed as Lightning would change them.

let stored = recorded.data as ApiAccessToken[];
const mask = (token: string) => `${token.slice(0, 5)}…${token.slice(-5)}`;

standIn("GET", "/api/me/tokens", () => ({ data: stored }));
standIn("POST", "/api/me/tokens", () => {
  // An obviously fake token, never a real one.
  const token: ApiAccessToken = {
    id: crypto.randomUUID(),
    token: `demo.fake-token-not-real.${crypto.randomUUID().slice(0, 8)}`,
    inserted_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    last_used_at: null,
  };
  stored = [{ ...token, token: mask(token.token) }, ...stored];
  return { data: token };
});
standIn("DELETE", "/api/me/tokens/:id", ({ id }) => {
  stored = stored.filter((t) => t.id !== id);
});
