/**
 * The one way the replica reaches Lightning's API (D376). With `VITE_API=lightning`
 * it calls a real Lightning through Vite's `/api` proxy (vite.config.ts), on
 * Lightning's session cookie; by default it calls the stand-in, which replays
 * recorded answers (`recorded/`) after a short delay. A refused request throws
 * an `ApiError`: show its `message`, branch on its `code` (G199).
 */
import { RequestError } from "../utils/errors";
import credentials from "./recorded/credentials.json";
import projects from "./recorded/projects.json";

const live = import.meta.env["VITE_API"] === "lightning";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  return live ? fetchLightning<T>(method, path, body) : standIn<T>(method, path);
}

/** Every page of a paged list (api/conventions.md), following `links.next`. */
export async function listAll<T>(path: string, key: string): Promise<T[]> {
  const rows: T[] = [];
  let next: string | null = `${path}?page_size=100`;
  while (next) {
    const page: Record<string, unknown> & { links?: { next: string | null } } = await request("GET", next);
    rows.push(...(page[key] as T[]));
    // Lightning's links are absolute; keep them on this origin so they go through the proxy.
    const url: URL | null = page.links?.next ? new URL(page.links.next) : null;
    next = url ? url.pathname + url.search : null;
  }
  return rows;
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
 * branch on `code`, never on the wording (G199). Entries with a body pointer
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
const codeForStatus: Record<number, string> = { 401: "unauthenticated", 403: "forbidden", 404: "not_found" };

/** An error status and its body (a problem document, or anything else) as an ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<{ code: string; detail: string; title: string; errors: ProblemEntry[] }>;
  return new ApiError(
    status,
    problem.code ?? codeForStatus[status] ?? "internal",
    problem.detail ?? problem.title ?? `Lightning answered ${status}.`,
    Array.isArray(problem.errors) ? problem.errors : []
  );
}

// Lightning.

async function fetchLightning<T>(method: Method, path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
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

const recorded: Record<string, unknown> = {
  "GET /api/credentials": credentials,
  "GET /api/projects": projects,
};

let failure: ApiError | null = null;

/**
 * Makes the stand-in's next request fail with this problem, then clears. For
 * stories, tests and the console: `failNext({ status: 403, code: "forbidden" })`.
 */
export function failNext({ status, code, detail = "The server could not complete that request.", errors = [] }: { status: number; code: string; detail?: string; errors?: ProblemEntry[] }) {
  failure = new ApiError(status, code, detail, errors);
}

function standIn<T>(method: Method, path: string): Promise<T> {
  const fail = failure;
  failure = null;
  const key = `${method} ${path.split("?")[0]}`;
  return new Promise((resolve, reject) =>
    window.setTimeout(() => {
      if (fail) reject(fail);
      else if (key in recorded) resolve(structuredClone(recorded[key]) as T);
      else reject(new ApiError(404, "not_found", `The stand-in has no recorded answer for ${key}.`));
    }, LATENCY_MS)
  );
}
