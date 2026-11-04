/** Workflows on Lightning's API (API.md "Workflows"): the API's shape, its key and its query. */
import { request, standIn } from "./client";
import recorded from "./recorded/workflows.json";

/** A workflow as `GET /api/workflows` lists it, as much of it as the pages use (recorded without its jobs, edges and triggers). */
export interface ApiWorkflow {
  id: string;
  name: string;
  project_id: string;
  updated_at: string;
}

export const workflowKeys = {
  all: ["workflows"] as const,
};

/** The query for every workflow the caller can see, across projects; not paged. */
export const workflowsQuery = {
  queryKey: workflowKeys.all,
  queryFn: () => request<{ workflows: ApiWorkflow[] }>("GET", "/api/workflows").then((r) => r.workflows),
};

standIn("GET", "/api/workflows", () => recorded);
