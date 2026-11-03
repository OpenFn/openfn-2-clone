/**
 * A stand-in for Lightning's API, so the app runs with no server. `fakeFetch` takes the same arguments as `fetch`
 * and answers as api/ says Lightning would, after a short wait, with problem documents for refusals (api/errors.md).
 * Only `lib/api/client.ts` imports this; going real deletes the folder. Treats you as stepped up.
 */

type Problem = { status: number; code: string; detail: string };
type Handler = (params: Record<string, string>, body: unknown) => Response;

const WAIT_MS = 300;

// An obviously fake token: never a real one. The API masks a listed token to its first and last five characters.
const fakeToken = () => `demo.fake-token-not-real.${crypto.randomUUID()}`;
const mask = (token: string) => `${token.slice(0, 5)}…${token.slice(-5)}`;
const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

type StoredToken = { id: string; token: string; inserted_at: string; last_used_at: string | null };

const seed = (): StoredToken[] => [
  { id: "7c0e6a52-3a8e-4bb4-9d55-2d1f0f8f1a01", token: "demo.…f1a01", inserted_at: "2026-10-28T09:12:44Z", last_used_at: null },
  { id: "a3b2d1c4-5e6f-4a7b-8c9d-0e1f2a3b4c5d", token: "demo.…b4c5d", inserted_at: "2026-09-14T16:40:02Z", last_used_at: null },
];

let tokens = seed();
const failures = new Map<string, Problem>();

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const problem = ({ status, code, detail }: Problem) => json(status, { type: "about:blank", status, title: code, code, detail });

const routes: Record<string, Handler> = {
  // Newest first, not paged.
  "GET /api/me/tokens": () => json(200, { data: tokens }),
  // The whole token, this once. The list keeps only its mask.
  "POST /api/me/tokens": () => {
    const created = { id: crypto.randomUUID(), token: fakeToken(), inserted_at: now(), last_used_at: null };
    tokens = [{ ...created, token: mask(created.token) }, ...tokens];
    return json(201, { data: created });
  },
  "DELETE /api/me/tokens/:id": ({ id }) => {
    if (!tokens.some((t) => t.id === id)) return problem({ status: 404, code: "not_found", detail: "This token doesn't exist." });
    tokens = tokens.filter((t) => t.id !== id);
    return new Response(null, { status: 204 });
  },
};

/** The route a request matches (`"DELETE /api/me/tokens/:id"`) and its path parameters. */
function match(method: string, path: string): [string, Record<string, string>] | undefined {
  for (const key of Object.keys(routes)) {
    const [routeMethod, pattern] = key.split(" ");
    if (routeMethod !== method) continue;
    const names: string[] = [];
    const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, name: string) => (names.push(name), "([^/]+)")) + "$");
    const found = path.match(regex);
    if (found) return [key, Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(found[i + 1])]))];
  }
}

export async function fakeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  const found = match(init.method ?? "GET", path);
  if (!found) return problem({ status: 404, code: "not_found", detail: "No such route." });
  const [key, params] = found;
  const failure = failures.get(key);
  if (failure) {
    failures.delete(key);
    return problem(failure);
  }
  return routes[key](params, init.body ? JSON.parse(String(init.body)) : undefined);
}

/** For stories and tests: the next request to this route (`"POST /api/me/tokens"`) is refused with this problem. */
export function failNext(route: string, failure: Problem) {
  failures.set(route, failure);
}

/** For stories and tests: back to the starting data, nothing set to fail. */
export function resetFakeApi() {
  tokens = seed();
  failures.clear();
}
