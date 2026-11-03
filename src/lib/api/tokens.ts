/** Personal access tokens (api/account.md): the API's shape, the mapper, the query keys, and the hooks a route calls. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { canRetry, request } from "@/lib/api/client";

// The API's shape.

/** A token as `GET /api/me/tokens` lists it: `token` is masked to its first and last few characters, except in the answer that creates it. */
export type ApiToken = { id: string; token: string; inserted_at: string; last_used_at: string | null };

// The mapper.

/** A token, as the tokens page shows it. The server masks it; the mask is shown as sent. */
export type Token = { id: string; masked: string; createdAt: string; lastUsedAt: string | null };

export const toToken = (t: ApiToken): Token => ({ id: t.id, masked: t.token, createdAt: t.inserted_at, lastUsedAt: t.last_used_at });

// Query keys.

export const tokenKeys = { all: ["tokens"] as const };

// What a route calls.

/** `retryable` is false for a refusal (4xx), which asking again won't change. */
export type LoadStatus = { state: "loading" } | { state: "ready" } | { state: "error"; message: string; retryable: boolean };

const selectTokens = (answer: { data: ApiToken[] }) => answer.data.map(toToken);

/** Your tokens, newest first. A failed reload keeps the tokens already on screen; trying again shows as loading. */
export function useTokens() {
  const query = useQuery({
    queryKey: tokenKeys.all,
    queryFn: () => request<{ data: ApiToken[] }>("GET", "/api/me/tokens"),
    select: selectTokens,
  });
  const status: LoadStatus = query.data
    ? { state: "ready" }
    : query.isError && !query.isFetching
      ? { state: "error", message: query.error.message, retryable: canRetry(query.error) }
      : { state: "loading" };
  return { status, tokens: query.data ?? [], retry: () => void query.refetch() };
}

/**
 * Generate and revoke. Each resolves once the list has reloaded, and rejects with the `ApiError`, or with the
 * reload's error if the list couldn't be reloaded. `create` resolves with the whole new token, which is never shown
 * again. A refusal reloads the list too: a token already gone goes.
 */
export function useTokenSaves() {
  const queryClient = useQueryClient();
  const thenReload = async <T>(send: Promise<T>) => {
    try {
      return await send;
    } finally {
      await queryClient.refetchQueries({ queryKey: tokenKeys.all }, { throwOnError: true });
    }
  };
  const create = useMutation({
    mutationFn: () => thenReload(request<{ data: ApiToken }>("POST", "/api/me/tokens")).then((answer) => answer.data.token),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => thenReload(request<void>("DELETE", `/api/me/tokens/${encodeURIComponent(id)}`)),
  });
  return { create: () => create.mutateAsync(), revoke: (id: string) => revoke.mutateAsync(id) };
}
