/**
 * The one way the app reaches Lightning's API. With `VITE_API=lightning` it calls Lightning; otherwise the stand-in
 * in `fake-api/`, which answers the same way. A refused request throws an `ApiError`: show its `message` (the
 * server's `detail`), branch on its `code`, never on the words.
 */
import { fakeFetch } from "@/fake-api";

export { failNext, resetFakeApi } from "@/fake-api";

const send = import.meta.env.VITE_API === "lightning" ? fetch : fakeFetch;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** A request Lightning refused, from its problem document (api/errors.md). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Lightning refused it with this `code` (`"step_up_required"`). */
export const isApiError = (error: unknown, code: string): error is ApiError => error instanceof ApiError && error.code === code;

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await send(path, {
    method,
    headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // 204 has no body; a proxy's error page isn't JSON.
  const answer: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (response.ok) return answer as T;
  const problem = (answer ?? {}) as { code?: string; detail?: string; title?: string };
  throw new ApiError(response.status, problem.code ?? "internal", problem.detail ?? problem.title ?? `Lightning answered ${response.status}.`);
}
