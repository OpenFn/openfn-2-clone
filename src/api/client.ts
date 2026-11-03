/**
 * The one way the replica reaches Lightning's API. With `VITE_API=lightning`
 * it calls a real Lightning through Vite's `/api` proxy (vite.config.ts), on
 * Lightning's session cookie; by default it calls the stand-in, which answers
 * the way Lightning would, from recorded answers (`recorded/`), after a short
 * delay. A refused request throws an `ApiError`: show its `message`, branch on
 * its `code`.
 */
import { useMutation, useQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import type { ResourceStatus } from "../types/resource";
import { RequestError } from "../utils/errors";

/** Calling a real Lightning (`VITE_API=lightning`) rather than the stand-in. */
export const live = import.meta.env["VITE_API"] === "lightning";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  return live ? fetchLightning<T>(method, path, body) : answerFromStandIn<T>(method, path, body);
}

/** Every page of a paged list (api/conventions.md), following `links.next`. */
export async function listAll<T>(path: string, key: string): Promise<T[]> {
  const rows: T[] = [];
  let next: string | null = `${path}${path.includes("?") ? "&" : "?"}page_size=100`;
  while (next) {
    const page: Record<string, unknown> & { links?: { next: string | null } } = await request("GET", next);
    rows.push(...(page[key] as T[]));
    // Lightning's links are absolute; keep them on this origin so they go through the proxy.
    const url: URL | null = page.links?.next ? new URL(page.links.next) : null;
    next = url ? url.pathname + url.search : null;
  }
  return rows;
}

/**
 * Where the page stands while these queries load, for its `status` prop:
 * loading until each has data, then the first refusal by its code. A refetch
 * that fails keeps the rows already on screen.
 */
export function statusOf(...queries: UseQueryResult[]): ResourceStatus {
  const failed = queries.find((q) => q.data === undefined && q.isError);
  if (failed) {
    const error = failed.error;
    if (error instanceof ApiError && error.code === "not_found") return { state: "notFound" };
    if (error instanceof ApiError && error.code === "forbidden") return { state: "forbidden" };
    return {
      state: "error",
      message: error?.message ?? "Something went wrong.",
    };
  }
  return queries.every((q) => q.data !== undefined) ? { state: "ready" } : { state: "loading" };
}

/**
 * A save for a page's `on*` action: it resolves once every query under
 * `changes` has reloaded, and rejects with the ApiError the form shows.
 * List every key whose data the save can change, on any page.
 */
export function useSave<A extends unknown[]>(changes: QueryKey[], fn: (...args: A) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: A) => fn(...args),
    // A save of several requests can fail after some went through, so reload either way.
    onSettled: () => Promise.all(changes.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  }).mutateAsync;
}

/** The same refusal, with each body pointer Lightning sent moved to the form's field name (`#/recipient` → `#/receiverEmail`). */
export async function withFieldNames(send: Promise<unknown>, field: (pointer: string) => string | undefined, placeUnplaced = false): Promise<void> {
  try {
    await send;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    throw new ApiError(
      error.status ?? 422,
      error.code,
      error.message,
      // An error placed at a path or query parameter has no body pointer; `placeUnplaced` puts it on `field("")`.
      error.errors.map((e) => (e.pointer ? { ...e, pointer: field(e.pointer) ?? e.pointer } : placeUnplaced && field("") ? { ...e, pointer: field("")! } : e))
    );
  }
}

// Errors.

/** One entry of a problem document's `errors` (api/errors.md): a `code`, a `detail` and one location. */
export interface ProblemEntry {
  code: string;
  detail: string;
  pointer?: string;
  parameter?: string;
  header?: string;
  path?: string;
}

/**
 * A request Lightning refused. Show `message` (the problem's `detail`) and
 * branch on `code`, never on the wording. Entries with a body pointer
 * become `fieldErrors`, keyed by the pointer without `#/` (`#/name` → `name`,
 * `#/members/0/email` → `members.0.email`).
 */
export class ApiError extends RequestError {
  readonly code: string;
  readonly errors: ProblemEntry[];

  constructor(status: number, code: string, detail: string, errors: ProblemEntry[] = []) {
    const fieldErrors: Record<string, string[]> = {};
    for (const e of errors) {
      if (!e.pointer) continue;
      const key = e.pointer.replace(/^#\//, "").replaceAll("/", ".");
      (fieldErrors[key] ??= []).push(e.detail);
    }
    super(detail, { status, fieldErrors });
    this.name = "ApiError";
    this.code = code;
    this.errors = errors;
  }
}

// For an answer that isn't a problem document (a proxy's 502, an empty body).
const codeForStatus: Record<number, string> = {
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
};

/** An error status and its body (a problem document, or anything else) as an ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<{
    code: string;
    detail: string;
    title: string;
    errors: ProblemEntry[];
  }>;
  return new ApiError(
    status,
    problem.code ?? codeForStatus[status] ?? "internal",
    problem.detail ?? problem.title ?? `Lightning answered ${status}.`,
    Array.isArray(problem.errors) ? problem.errors : []
  );
}

// Lightning.

/** The session's CSRF token, which every write sends (API.md "Authenticate"). Read once, and again when Lightning says it no longer matches. */
let csrfToken: Promise<string> | null = null;

/** The token, or "" when signed out: signing in is a write with no session to take one from. */
function readCsrfToken(): Promise<string> {
  const token = send<{ data: { csrf_token: string } }>("GET", "/api/session", undefined, {}).then(
    (s) => s.data.csrf_token,
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) return "";
      throw error;
    }
  );
  // Only a token is worth keeping for the next write.
  token.then(
    (value) => value || (csrfToken = null),
    () => (csrfToken = null)
  );
  return token;
}

/** Keeps the token a new session came with (`POST /api/session` sends it), or forgets an ended session's (null). */
export function renewCsrfToken(token: string | null) {
  csrfToken = token ? Promise.resolve(token) : null;
}

const withToken =(token: string): Record<string, string> => (token ? { "x-csrf-token": token } : {});

async function fetchLightning<T>(method: Method, path: string, body: unknown): Promise<T> {
  if (method === "GET") return send<T>(method, path, body, {});
  csrfToken ??= readCsrfToken();
  try {
    return await send<T>(method, path, body, withToken(await csrfToken));
  } catch (error) {
    // Signing in renews the session, and with it the token.
    if (!(error instanceof ApiError && error.code === "invalid_header")) throw error;
    csrfToken = readCsrfToken();
    return send<T>(method, path, body, withToken(await csrfToken));
  }
}

async function send<T>(method: Method, path: string, body: unknown, headers: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...headers,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, "unreachable", "Couldn't reach Lightning.");
  }
  const json: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) throw toApiError(response.status, json);
  return json as T;
}

// The stand-in.

/** Delay to make loading states visible, in ms. */
const LATENCY_MS = 500;

/** How the stand-in answers one route: the path's `:params` and the body in, the answer out, or a thrown ApiError. */
type StandInHandler = (params: Record<string, string>, body: unknown) => unknown;

const routes: {
  method: Method;
  pattern: RegExp;
  names: string[];
  handler: StandInHandler;
}[] = [];

/**
 * Teaches the stand-in a route, answered as Lightning would. Each resource
 * file registers its own, beside the API type they answer with:
 * `standIn("PUT", "/api/credentials/:id", ({ id }, body) => …)`.
 */
export function standIn(method: Method, route: string, handler: StandInHandler) {
  const names: string[] = [];
  const pattern = new RegExp(`^${route.replace(/:(\w+)/g, (_, name: string) => (names.push(name), "([^/]+)"))}$`);
  routes.push({ method, pattern, names, handler });
}

let failure: ApiError | null = null;

/**
 * Makes the stand-in's next request fail with this problem, then clears. For
 * stories, tests and the console: `failNext({ status: 403, code: "forbidden" })`.
 */
export function failNext({
  status,
  code,
  detail = "The server could not complete that request.",
  errors = [],
}: {
  status: number;
  code: string;
  detail?: string;
  errors?: ProblemEntry[];
}) {
  failure = new ApiError(status, code, detail, errors);
}

function answerFromStandIn<T>(method: Method, path: string, body: unknown): Promise<T> {
  const fail = failure;
  failure = null;
  const pathname = path.split("?")[0]!;
  return new Promise((resolve, reject) =>
    window.setTimeout(() => {
      if (fail) return reject(fail);
      for (const route of routes) {
        const match = route.method === method ? route.pattern.exec(pathname) : null;
        if (!match) continue;
        const params = Object.fromEntries(route.names.map((name, i) => [name, decodeURIComponent(match[i + 1]!)]));
        try {
          return resolve(structuredClone(route.handler(params, body)) as T);
        } catch (error) {
          return reject(error);
        }
      }
      reject(new ApiError(404, "not_found", `The stand-in has no answer for ${method} ${pathname}.`));
    }, LATENCY_MS)
  );
}
