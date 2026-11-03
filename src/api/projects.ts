/** Projects on Lightning's API (api/projects.md, JSON:API): the API's shape, its mapper, its keys and its requests. */
import type { CredentialProjectRef } from "../types/credentials";
import { listAll, standIn } from "./client";
import recorded from "./recorded/projects.json";

/** A project as `GET /api/projects` lists it. */
export interface ApiProject {
  id: string;
  attributes: { name: string; description: string | null };
}

export function projectRef(p: ApiProject): CredentialProjectRef {
  return { id: p.id, name: p.attributes.name };
}

export const projectKeys = {
  all: ["projects"] as const,
};

/** `GET /api/projects`: the projects the caller is a member of, every page. */
export const listProjects = () => listAll<ApiProject>("/api/projects", "data");

/** The query for the caller's projects, for any wrapper that needs them. */
export const projectsQuery = {
  queryKey: projectKeys.all,
  queryFn: listProjects,
};

standIn("GET", "/api/projects", () => recorded);
