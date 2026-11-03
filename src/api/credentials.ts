/** Credentials on Lightning's API (api/credentials.md): the API's shape, its mapper and its requests (D376). */
import type { CredentialRow } from "../types/credentials";
import { listAll } from "./client";

/** A credential as `GET /api/credentials` sends it. */
export interface ApiCredential {
  id: string;
  name: string;
  /** Lightning `main` sends the adaptor's package name (`@openfn/language-dhis2`), or `raw` / `oauth` (F613). */
  schema: string;
  external_id: string | null;
  user_id: string;
  projects: { id: string; name: string; description: string | null }[];
  inserted_at: string;
  updated_at: string;
}

/**
 * One of the viewer's own credentials as a Credentials table row. Every
 * credential `GET /api/credentials` lists is the caller's, so the viewer owns
 * it. What the API doesn't send yet (api/credentials.md's planned scope, and
 * `workflowsUsing`, F615) gets the answer for a credential with none: one
 * `main` environment, nothing pending, no runs.
 */
export function ownCredentialRow(c: ApiCredential, viewerEmail: string): CredentialRow {
  return {
    id: c.id,
    name: c.name,
    schema: c.schema.replace(/^@openfn\/language-/, ""),
    oauthClient: null,
    ownerEmail: viewerEmail,
    projects: c.projects.map((p) => ({ id: p.id, name: p.name, workflowsUsing: [] })),
    externalId: c.external_id,
    environments: ["main"],
    transferStatus: null,
    scheduledDeletion: null,
    hasActivityInProjects: false,
    canEdit: true,
  };
}

/** `GET /api/credentials`: the caller's own, every page. */
export const listCredentials = () => listAll<ApiCredential>("/api/credentials", "credentials");
