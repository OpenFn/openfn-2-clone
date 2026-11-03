/** Projects on Lightning's API (api/projects.md, JSON:API): the API's shape, its mapper and its requests. */
import type { CredentialProjectRef } from "../types/credentials";
import { listAll } from "./client";

/** A project as `GET /api/projects` lists it. */
export interface ApiProject {
  id: string;
  attributes: { name: string; description: string | null };
}

export function projectRef(p: ApiProject): CredentialProjectRef {
  return { id: p.id, name: p.attributes.name };
}

/** `GET /api/projects`: the projects the caller is a member of, every page. */
export const listProjects = () => listAll<ApiProject>("/api/projects", "data");
