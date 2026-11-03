/** The signed-in person on Lightning's API (API.md "Your account"): the API's shape, its key and its query. */
import { request, standIn } from "./client";
import recorded from "./recorded/me.json";

/** `GET /api/me`, as much of it as the pages use. */
export interface ApiMe {
  id: string;
  attributes: { first_name: string; last_name: string; email: string };
}

export const meKeys = {
  all: ["me"] as const,
};

/** The query for the signed-in person, for any wrapper that needs them. */
export const meQuery = {
  queryKey: meKeys.all,
  queryFn: () => request<{ data: ApiMe }>("GET", "/api/me").then((r) => r.data),
};

standIn("GET", "/api/me", () => recorded);
