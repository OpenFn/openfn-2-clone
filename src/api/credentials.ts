/**
 * Credentials on Lightning's API (API.md "Credentials"): the API's shape, its
 * mappers, its keys, the hooks a wrapper calls, and how the stand-in answers.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CredentialActions, CredentialRow, CredentialSchemaResult, CredentialSecretsResult, CredentialTypeOption, CredentialValues, SchemaField } from "../types/credentials";
import type { ResourceStatus } from "../types/resource";
import { ApiError, listAll, request, standIn, statusOf, useSave, withFieldNames } from "./client";
import { projectKeys, projectRef, projectsQuery } from "./projects";
import recordedCredentials from "./recorded/credentials.json";
import recordedEnvironments from "./recorded/credential-environments.json";
import recordedSchemas from "./recorded/credential-schemas.json";
import recordedProjects from "./recorded/projects.json";

// The API's shapes.

/** A credential as `GET /api/credentials` sends it. Its bodies never come back. */
export interface ApiCredential {
  id: string;
  name: string;
  /** The adaptor's package name (`@openfn/language-dhis2`), `raw` or `oauth`. */
  schema: string;
  external_id: string | null;
  user_id: string;
  projects: { id: string; name: string; description: string | null }[];
  scheduled_deletion: string | null;
  transfer_status: "pending" | "completed" | null;
  inserted_at: string;
  updated_at: string;
}

/** A credential type as `GET /api/credential_schemas` lists it. */
export interface ApiCredentialSchemaName {
  name: string;
  title: string;
}

/** `GET /api/credential_schemas/:name`: the type's JSON Schema; `null` for raw. */
export interface ApiCredentialSchema extends ApiCredentialSchemaName {
  schema: JsonSchema | null;
}

interface JsonSchemaProperty {
  title?: string;
  type?: string;
  format?: string;
  writeOnly?: boolean;
  anyOf?: { type?: string }[];
}

interface JsonSchema {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/** A credential's stored environment, as `GET /api/credentials/:id/environments` lists it: its name only. */
interface ApiEnvironment {
  name: string;
}

// Mappers.

const packagePrefix = "@openfn/language-";

/** The page's short name (`dhis2`) for the API's schema. */
const shortSchema = (schema: string) => schema.replace(packagePrefix, "");
/** The API's schema for the page's short name. */
const apiSchema = (schema: string) => (schema === "raw" || schema === "oauth" ? schema : packagePrefix + schema);

/**
 * One of the viewer's own credentials as a Credentials table row. Every
 * credential `GET /api/credentials` lists is the caller's, so the viewer owns
 * it. What the API doesn't send gets the answer for a credential with none:
 * one `main` environment, no workflows using it, no runs.
 */
export function ownCredentialRow(c: ApiCredential, viewerEmail: string): CredentialRow {
  return {
    id: c.id,
    name: c.name,
    schema: shortSchema(c.schema),
    oauthClient: null,
    ownerEmail: viewerEmail,
    projects: c.projects.map((p) => ({
      id: p.id,
      name: p.name,
      workflowsUsing: [],
    })),
    externalId: c.external_id,
    environments: ["main"],
    transferStatus: c.transfer_status,
    scheduledDeletion: c.scheduled_deletion,
    hasActivityInProjects: false,
    canEdit: true,
  };
}

/** "Add a credential"'s adaptors: every type but Raw JSON, which the page adds itself. */
export function credentialTypeOptions(types: ApiCredentialSchemaName[]): CredentialTypeOption[] {
  return types.filter((t) => t.name !== "raw").map((t) => ({ key: shortSchema(t.name), name: t.title }));
}

/** A type's form fields, drawn as Lightning's JsonSchemaBodyComponent draws them (`input_type`). */
export function schemaFields(schema: JsonSchema | null): SchemaField[] {
  const required = new Set(schema?.required ?? []);
  return Object.entries(schema?.properties ?? {}).map(([key, p]) => ({
    key,
    label: p.title ?? key,
    kind: fieldKind(p),
    required: required.has(key),
    placeholder: null,
    // ponytail: Lightning also warns for a type it doesn't recognise (Credentials.Schema.warning); add it when a schema has one.
    unrecognizedType: null,
  }));
}

function fieldKind(p: JsonSchemaProperty): SchemaField["kind"] {
  if (p.format === "uri") return "url";
  if (p.type === "string") return p.writeOnly ? "password" : "text";
  if (p.type === "integer") return "integer";
  if (p.type === "object") return "object";
  if (p.type === "boolean") return "boolean";
  return "text";
}

// Keys and requests.

export const credentialKeys = {
  all: ["credentials"] as const,
  types: ["credential_schemas"] as const,
  type: (name: string) => ["credential_schemas", name] as const,
};

/** `GET /api/credentials`: the caller's own, every page. */
export const listCredentials = () => listAll<ApiCredential>("/api/credentials", "credentials");

const listTypes = () => request<{ data: ApiCredentialSchemaName[] }>("GET", "/api/credential_schemas").then((r) => r.data);

const path = (id: string, rest = "") => `/api/credentials/${encodeURIComponent(id)}${rest}`;

/** An environment's body as the form holds it (JSON text) for the API; "" when the form had nothing stored to show. */
const parsed = (body: string): object | null => {
  const value: unknown = body.trim() ? JSON.parse(body) : null;
  // A schema's form sends its fields even when they're all empty.
  const blank = typeof value === "object" && value !== null && Object.values(value).every((v) => v === "" || v === null);
  return blank ? null : (value as object | null);
};

/** Lightning places an error in a body at `#/credential_bodies/<index>/…`; the form shows it on `environments.<name>`. */
/**
 * Where the form shows each of Lightning's body errors: a body's error at
 * `#/credential_bodies/<index>/…` on `environments.<name>`, a project link's
 * on `projectIds`, and `external_id` on `externalId`.
 */
const toFormFields = (environmentNames: string[]) => (pointer: string) => {
  const index = /^#\/credential_bodies\/(\d+)/.exec(pointer)?.[1];
  if (index !== undefined) return environmentNames[Number(index)] === undefined ? undefined : `#/environments/${environmentNames[Number(index)]}`;
  if (pointer.startsWith("#/project_credentials")) return "#/projectIds";
  if (pointer === "#/external_id") return "#/externalId";
  return undefined;
};

/** A refusal the form shows at one field, worded for the person, for what the API can't do yet. */
const refuseAt = (field: string, message: string) =>
  new ApiError(422, "invalid", "Please fix the errors below.", [
    {
      pointer: `#/${field.replaceAll(".", "/")}`,
      code: "not_supported",
      detail: message,
    },
  ]);

const NOT_SENT_BACK = "Type it again: Lightning's API doesn't send a stored secret back";

/**
 * `POST /api/credentials`. OAuth needs a sign-in the API can't start yet, so
 * an OAuth credential is refused before anything is sent.
 */
async function createCredential(v: CredentialValues): Promise<void> {
  if (v.schema === "oauth") throw new ApiError(422, "not_supported", "OAuth credentials can't be added through Lightning's API yet.");
  const send = request("POST", "/api/credentials", {
    name: v.name,
    schema: apiSchema(v.schema),
    external_id: v.externalId || null,
    credential_bodies: v.environments.map((e) => ({
      name: e.name,
      body: parsed(e.body),
    })),
    project_credentials: v.projectIds.map((id) => ({ project_id: id })),
  });
  await withFieldNames(send, toFormFields(v.environments.map((e) => e.name)));
}

/**
 * The API saves a credential in parts: its name and `main` body
 * (`PUT /api/credentials/:id`, which needs that body), each other environment,
 * and each project link. Bodies never come back from the API, so an
 * environment left blank keeps what's stored, except `main`, which the first
 * request needs.
 */
async function updateCredential(before: ApiCredential, v: CredentialValues): Promise<void> {
  // ponytail: the parts are separate requests, so a refusal halfway leaves the earlier parts saved; one request when the API takes a whole credential.
  if ((v.externalId || null) !== before.external_id) throw refuseAt("externalId", "Lightning's API can't change this yet");
  const main = v.environments.find((e) => e.name === "main");
  const mainBody = main && parsed(main.body);
  if (!main || !mainBody) throw refuseAt("environments.main", NOT_SENT_BACK);
  const renamedBlank = v.environments.find((e) => e.previousName && e.previousName !== e.name && !parsed(e.body));
  if (renamedBlank) throw refuseAt(`environments.${renamedBlank.name}`, NOT_SENT_BACK);

  await withFieldNames(request("PUT", path(before.id), { name: v.name, schema: before.schema, credential_bodies: [{ name: "main", body: mainBody }] }), toFormFields(["main"]));

  // Renaming writes the body under the new name and deletes the old one.
  const stored = await request<{ data: ApiEnvironment[] }>("GET", path(before.id, "/environments")).then((r) => r.data.map((e) => e.name));
  for (const e of v.environments) {
    const body = parsed(e.body);
    if (e.name !== "main" && body)
      await withFieldNames(request("PUT", path(before.id, `/environments/${encodeURIComponent(e.name)}`), { body }), () => `#/environments/${e.name}`, true);
  }
  for (const name of stored) {
    if (!v.environments.some((e) => e.name === name)) await request("DELETE", path(before.id, `/environments/${encodeURIComponent(name)}`));
  }

  const had = new Set(before.projects.map((p) => p.id));
  const wants = new Set(v.projectIds);
  for (const id of wants) if (!had.has(id)) await request("PUT", `/api/projects/${id}/credentials/${before.id}`);
  for (const id of had) if (!wants.has(id)) await request("DELETE", `/api/projects/${id}/credentials/${before.id}`);
}

/** `PUT /api/credentials/:id/transfer`. Lightning names the field `recipient`; the form calls it `receiverEmail`. */
async function transferCredential(id: string, email: string): Promise<void> {
  await withFieldNames(request("PUT", path(id, "/transfer"), { recipient: email }), (pointer) => (pointer === "#/recipient" ? "#/receiverEmail" : undefined));
}

// What a wrapper calls.

export interface CredentialIndex {
  status: ResourceStatus;
  credentials: CredentialRow[];
  projects: { id: string; name: string }[];
  credentialTypes: CredentialTypeOption[];
}

/** The Credentials page's data: the viewer's credentials, the projects they can share with, and the adaptors, loaded side by side. */
export function useCredentialIndex(viewerEmail: string): CredentialIndex {
  const credentials = useQuery({
    queryKey: credentialKeys.all,
    queryFn: listCredentials,
  });
  const projects = useQuery(projectsQuery);
  const types = useQuery({
    queryKey: credentialKeys.types,
    queryFn: listTypes,
    staleTime: Infinity,
  });
  return {
    status: statusOf(credentials, projects, types),
    credentials: (credentials.data ?? []).map((c) => ownCredentialRow(c, viewerEmail)).sort((a, b) => a.name.localeCompare(b.name)),
    projects: (projects.data ?? []).map(projectRef),
    credentialTypes: credentialTypeOptions(types.data ?? []),
  };
}

type CredentialSaves = Pick<
  CredentialActions,
  | "onCreateCredential"
  | "onUpdateCredential"
  | "onLoadCredentialSecrets"
  | "onLoadCredentialSchema"
  | "onDeleteCredential"
  | "onCancelCredentialDeletion"
  | "onTransferCredential"
  | "onRevokeCredentialTransfer"
>;

/** A credential's projects show on the Projects page too. */
const changedBySave = [credentialKeys.all, projectKeys.all];

/**
 * The Credentials page's saves. Each resolves once the lists it changed have
 * reloaded, and rejects with the `ApiError` the form shows.
 */
export function useCredentialSaves(): CredentialSaves {
  const queryClient = useQueryClient();
  const credential = (id: string) => {
    const found = queryClient.getQueryData<ApiCredential[]>(credentialKeys.all)?.find((c) => c.id === id);
    if (!found) throw new ApiError(404, "not_found", "Credential not found");
    return found;
  };

  const create = useSave(changedBySave, (v: CredentialValues) => createCredential(v));
  const update = useSave(changedBySave, (id: string, v: CredentialValues) => updateCredential(credential(id), v));
  const remove = useSave(changedBySave, (id: string, now: boolean) => (now ? request("DELETE", path(id)) : request("PUT", path(id, "/scheduled_deletion"))));
  const cancelDeletion = useSave(changedBySave, (id: string) => request("DELETE", path(id, "/scheduled_deletion")));
  const transfer = useSave(changedBySave, (id: string, email: string) => transferCredential(id, email));
  const revokeTransfer = useSave(changedBySave, (id: string) => request("DELETE", path(id, "/transfer")));

  return {
    onCreateCredential: async (v) => void (await create([v])),
    onUpdateCredential: async (id, v) => void (await update([id, v])),
    onDeleteCredential: async (id, { now }) => void (await remove([id, now])),
    onCancelCredentialDeletion: async (id) => void (await cancelDeletion([id])),
    onTransferCredential: async (id, email) => void (await transfer([id, email])),
    onRevokeCredentialTransfer: async (id) => void (await revokeTransfer([id])),
    // The bodies never come back, so each environment opens blank (see updateCredential).
    onLoadCredentialSecrets: async (id): Promise<CredentialSecretsResult> => {
      const { data } = await request<{ data: ApiEnvironment[] }>("GET", path(id, "/environments"));
      return {
        environments: data.map((e) => ({
          name: e.name,
          body: "",
          oauth: null,
        })),
      };
    },
    onLoadCredentialSchema: async (key): Promise<CredentialSchemaResult> => {
      const name = apiSchema(key);
      const type = await queryClient.query({
        queryKey: credentialKeys.type(name),
        queryFn: () => request<{ data: ApiCredentialSchema }>("GET", `/api/credential_schemas/${encodeURIComponent(name)}`).then((r) => r.data),
        staleTime: Infinity,
      });
      return { fields: schemaFields(type.schema) };
    },
  };
}

// The stand-in: the recorded credentials, changed as Lightning would change them.

const now = () => new Date().toISOString();
/** Lightning's retention period before a scheduled credential is deleted. */
const RETENTION_DAYS = 7;
const store = {
  credentials: recordedCredentials.credentials as ApiCredential[],
  environments: structuredClone(recordedEnvironments) as Record<string, string[]>,
};
const found = (id: string) => {
  const c = store.credentials.find((x) => x.id === id);
  if (!c) throw new ApiError(403, "forbidden", "You may not do this (or it might not exist).");
  return c;
};
const projectNamed = (id: string) => {
  const p = recordedProjects.data.find((x) => x.id === id);
  return { id, name: p?.attributes.name ?? id, description: null };
};
const nameTaken = (name: unknown, id?: string) => {
  if (store.credentials.some((c) => c.name === name && c.id !== id)) {
    throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ pointer: "#/name", code: "taken", detail: "you have another credential with the same name" }]);
  }
};
type Body = Record<string, unknown>;

standIn("GET", "/api/credentials", () => ({
  credentials: store.credentials,
  links: { next: null },
}));
standIn("POST", "/api/credentials", (_, b) => {
  const body = b as Body;
  nameTaken(body["name"]);
  const id = crypto.randomUUID();
  const links = (body["project_credentials"] as { project_id: string }[]) ?? [];
  const credential: ApiCredential = {
    id,
    name: String(body["name"]),
    schema: String(body["schema"]),
    external_id: (body["external_id"] as string | null) ?? null,
    user_id: recordedCredentials.credentials[0]?.user_id ?? "",
    projects: links.map((l) => projectNamed(l.project_id)),
    scheduled_deletion: null,
    transfer_status: null,
    inserted_at: now(),
    updated_at: now(),
  };
  store.credentials.push(credential);
  store.environments[id] = ((body["credential_bodies"] as { name: string }[]) ?? []).map((e) => e.name);
  return { credential };
});
standIn("PUT", "/api/credentials/:id", ({ id }, b) => {
  const c = found(id!);
  nameTaken((b as Body)["name"], id);
  Object.assign(c, { name: (b as Body)["name"], updated_at: now() });
  return { credential: c };
});
standIn("DELETE", "/api/credentials/:id", ({ id }) => {
  found(id!);
  store.credentials = store.credentials.filter((c) => c.id !== id);
});
standIn("PUT", "/api/credentials/:id/scheduled_deletion", ({ id }) => {
  const c = found(id!);
  // Scheduling also unlinks it from every project.
  Object.assign(c, {
    scheduled_deletion: c.scheduled_deletion ?? new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString(),
    projects: [],
  });
  return { credential: c };
});
standIn("DELETE", "/api/credentials/:id/scheduled_deletion", ({ id }) => {
  const c = found(id!);
  c.scheduled_deletion = null;
  return { credential: c };
});
standIn("GET", "/api/credentials/:id/environments", ({ id }) => ({
  data: (store.environments[found(id!).id] ?? []).map((name) => ({ name })),
}));
standIn("PUT", "/api/credentials/:id/environments/:name", ({ id, name }) => {
  const names = (store.environments[found(id!).id] ??= []);
  if (!names.includes(name!)) names.push(name!);
  return { data: { name } };
});
standIn("DELETE", "/api/credentials/:id/environments/:name", ({ id, name }) => {
  store.environments[found(id!).id] = (store.environments[id!] ?? []).filter((n) => n !== name);
});
standIn("PUT", "/api/projects/:project_id/credentials/:id", ({ project_id, id }) => {
  const c = found(id!);
  if (!c.projects.some((p) => p.id === project_id)) c.projects.push(projectNamed(project_id!));
  return { credential: c };
});
standIn("DELETE", "/api/projects/:project_id/credentials/:id", ({ project_id, id }) => {
  const c = found(id!);
  c.projects = c.projects.filter((p) => p.id !== project_id);
});
// Lightning answers so when the instance doesn't allow transfers, as the one recorded doesn't.
const noTransfers = () => {
  throw new ApiError(501, "not_implemented", "This is not available on this instance.");
};
standIn("PUT", "/api/credentials/:id/transfer", noTransfers);
standIn("DELETE", "/api/credentials/:id/transfer", noTransfers);
standIn("GET", "/api/credential_schemas", () => recordedSchemas.list);
standIn("GET", "/api/credential_schemas/:name", ({ name }) => {
  const document = (recordedSchemas.documents as Record<string, ApiCredentialSchema>)[name!];
  if (name === "raw") return { data: { name, title: "Raw JSON", schema: null } };
  if (!document) throw new ApiError(404, "not_found", "Not found.");
  return { data: document };
});
