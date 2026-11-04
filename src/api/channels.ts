/**
 * A project's channels on Lightning's API (API.md "Webhooks and channels",
 * JSON:API), with the two lists the channel form picks from: the project's
 * webhook auth methods and the credentials linked to it. The API's shapes,
 * the mappers, the keys, the hooks a wrapper calls, and how the stand-in
 * answers. Its own file because projects.ts is already long; the keys sit
 * under `projectKeys`.
 */
import { useQuery } from "@tanstack/react-query";
import type { ChannelFormValues, ChannelRow } from "../types/channels";
import type { ResourceStatus } from "../types/resource";
import { ApiError, listAll, request, standIn, statusOf, useSave, withFieldNames, type ProblemEntry } from "./client";
import type { ApiCredential } from "./credentials";
// The stand-in's `GET /api/credentials` lives there.
import "./credentials";
import { projectKeys } from "./projects";
import recorded from "./recorded/channels.json";

// The API's shapes.

/** A channel as `GET /api/projects/:project_id/channels` lists it. */
export interface ApiChannel {
  id: string;
  attributes: {
    name: string;
    destination_url: string;
    enabled: boolean;
    lock_version: number;
    /** The proxy URL client systems call. */
    url: string;
    client_auth_method_ids: string[];
    /** The credential's id (not the project credential's), or null. */
    destination_credential_id: string | null;
    request_count: number;
    last_activity: string | null;
    inserted_at: string;
    updated_at: string;
  };
}

/** A webhook auth method as `GET /api/projects/:project_id/webhook_auth_methods` lists it (webhookAuthMethods.ts saves them). */
export interface ApiWebhookAuthMethod {
  id: string;
  attributes: {
    name: string;
    auth_type: "basic" | "api";
    /** Basic auth's username; null for an API key, or for a viewer who can't manage the methods. */
    username: string | null;
    /** An API key's last five characters; null for basic auth, or for a viewer who can't manage the methods. */
    api_key_last_characters: string | null;
    /** The workflow triggers it protects. */
    triggers: { id: string; workflow_id: string }[];
    /** Only in a stepped-up read of one method. */
    password?: string;
    /** Only in a stepped-up read of one method, or the answer that creates it. */
    api_key?: string;
  };
}

// Mappers.

export function channelRow(c: ApiChannel, logsHref: string): ChannelRow {
  const a = c.attributes;
  return {
    id: c.id,
    name: a.name,
    enabled: a.enabled,
    destinationUrl: a.destination_url,
    proxyUrl: a.url,
    requestCount: a.request_count,
    lastActivityAt: a.last_activity,
    logsHref: `${logsHref}?filters[channel_id]=${c.id}`,
  };
}

export function channelFormValues(c: ApiChannel): ChannelFormValues & { id: string; proxyUrl: string } {
  const a = c.attributes;
  return {
    id: c.id,
    proxyUrl: a.url,
    name: a.name,
    enabled: a.enabled,
    destinationUrl: a.destination_url,
    destinationCredentialId: a.destination_credential_id ?? "",
    clientAuthMethodIds: a.client_auth_method_ids,
  };
}

// Keys.

export const channelKeys = {
  all: (projectId: string) => [...projectKeys.all, projectId, "channels"] as const,
  authMethods: (projectId: string) => [...projectKeys.all, projectId, "webhook_auth_methods"] as const,
  credentials: (projectId: string) => [...projectKeys.all, projectId, "credentials"] as const,
};

// Requests.

export const projectPath = (projectId: string, rest: string) => `/api/projects/${encodeURIComponent(projectId)}${rest}`;
const channelPath = (projectId: string, id: string) => projectPath(projectId, `/channels/${encodeURIComponent(id)}`);

// Queries, shared with the Webhook Security tab (webhookAuthMethods.ts).

export const channelsQuery = (projectId: string) => ({
  queryKey: channelKeys.all(projectId),
  queryFn: () => listAll<ApiChannel>(projectPath(projectId, "/channels"), "data"),
});

export const authMethodsQuery = (projectId: string) => ({
  queryKey: channelKeys.authMethods(projectId),
  queryFn: () => listAll<ApiWebhookAuthMethod>(projectPath(projectId, "/webhook_auth_methods"), "data"),
});

/** Where Lightning's pointers land on the channel form. */
const toFormFields = (pointer: string) => {
  if (pointer === "#/name") return "#/name";
  if (pointer === "#/destination_url") return "#/destinationUrl";
  if (pointer === "#/destination_credential_id") return "#/destinationCredentialId";
  if (pointer.startsWith("#/client_auth_method_ids")) return "#/clientAuthMethodIds";
  return undefined;
};

/**
 * `PUT …/channels/:id`: creates the channel under a new id, or replaces the
 * one being edited. Its `lock_version` makes Lightning refuse with 409
 * `concurrent_edit` if someone else saved it since it loaded.
 */
const saveChannel = (projectId: string, values: ChannelFormValues, editing?: ApiChannel) =>
  withFieldNames(
    request("PUT", channelPath(projectId, editing?.id ?? crypto.randomUUID()), {
      ...(editing && { lock_version: editing.attributes.lock_version }),
      name: values.name,
      destination_url: values.destinationUrl,
      enabled: values.enabled,
      destination_credential_id: values.destinationCredentialId || null,
      client_auth_method_ids: values.clientAuthMethodIds,
    }),
    toFormFields
  );

// What a wrapper calls.

export interface ChannelIndex {
  status: ResourceStatus;
  channels: ApiChannel[];
  totalRequests: number;
  credentialOptions: { id: string; name: string }[];
  authMethodOptions: { id: string; name: string }[];
}

/** The channels page's data: the channels, and what the form picks from, loaded side by side. */
export function useChannelIndex(projectId: string): ChannelIndex {
  const channels = useQuery(channelsQuery(projectId));
  const authMethods = useQuery(authMethodsQuery(projectId));
  const credentials = useQuery({
    queryKey: channelKeys.credentials(projectId),
    queryFn: () => listAll<ApiCredential>(`/api/credentials?project_id=${encodeURIComponent(projectId)}`, "credentials"),
  });
  const list = channels.data ?? [];
  return {
    status: statusOf(channels, authMethods, credentials),
    channels: list,
    // Every page is loaded, so this is the whole project's, as the list's `meta.total_requests` is.
    totalRequests: list.reduce((sum, c) => sum + c.attributes.request_count, 0),
    // The stand-in ignores `?project_id`, so keep only the project's.
    credentialOptions: (credentials.data ?? []).filter((c) => c.projects.some((p) => p.id === projectId)).map((c) => ({ id: c.id, name: c.name })),
    authMethodOptions: (authMethods.data ?? []).map((m) => ({ id: m.id, name: m.attributes.name })),
  };
}

/** The channels page's saves. Each resolves once the channel list has reloaded. */
export function useChannelSaves(projectId: string) {
  const changes = [channelKeys.all(projectId)];
  const save = useSave(changes, (values: ChannelFormValues, editing?: ApiChannel) => saveChannel(projectId, values, editing));
  const toggle = useSave(changes, (id: string, enabled: boolean) => request("PUT", channelPath(projectId, id), { enabled }));
  const remove = useSave(changes, (id: string) => request("DELETE", channelPath(projectId, id)));
  return {
    /** Saves the form: a new channel, or `editing`. */
    onSave: async (values: ChannelFormValues, editing?: ApiChannel) => void (await save([values, editing])),
    onToggle: async (id: string, enabled: boolean) => void (await toggle([id, enabled])),
    onDelete: async (id: string) => void (await remove([id])),
  };
}

// The stand-in: the recorded channels, changed as Lightning would change them.

const channelStore: Record<string, ApiChannel[]> = Object.fromEntries(Object.entries(recorded.channels).map(([id, page]) => [id, page.data as ApiChannel[]]));
/** The stand-in's webhook auth methods, which webhookAuthMethods.ts's stand-in changes. */
export const authMethodStore = recorded.webhook_auth_methods as Record<string, ApiWebhookAuthMethod[]>;
const channelsOf = (projectId: string) => (channelStore[projectId] ??= []);
const invalid = (errors: ProblemEntry[]) => new ApiError(422, "invalid", "The request is not valid. See errors.", errors);

standIn("GET", "/api/projects/:project_id/channels", ({ project_id }) => ({
  data: [...channelsOf(project_id!)].sort((x, y) => x.attributes.name.localeCompare(y.attributes.name)),
  links: { next: null },
}));
standIn("GET", "/api/projects/:project_id/webhook_auth_methods", ({ project_id }) => ({
  data: [...(authMethodStore[project_id!] ?? [])].sort((x, y) => x.attributes.name.localeCompare(y.attributes.name)),
  links: { next: null },
}));
standIn("PUT", "/api/projects/:project_id/channels/:id", ({ project_id, id }, b) => {
  const body = b as Partial<Pick<ApiChannel["attributes"], "name" | "destination_url" | "enabled" | "destination_credential_id" | "client_auth_method_ids">>;
  const list = channelsOf(project_id!);
  const current = list.find((c) => c.id === id);
  const lockVersion = (b as { lock_version?: number }).lock_version;
  if (current && lockVersion !== undefined && lockVersion !== current.attributes.lock_version) {
    throw new ApiError(409, "concurrent_edit", "Another request changed or deleted this record. Fetch it again and retry.");
  }
  const next = { ...current?.attributes, ...body };
  // The changeset's checks together; the name's uniqueness only once they pass, as the database's constraint does.
  const errors: ProblemEntry[] = [
    ...(next.name ? [] : [{ pointer: "#/name", code: "required", detail: "can't be blank" }]),
    ...(/^https?:\/\/[^/]/.test(next.destination_url ?? "") ? [] : [{ pointer: "#/destination_url", code: "format", detail: "must be either a http or https URL" }]),
  ];
  if (errors.length > 0) throw invalid(errors);
  if (list.some((c) => c.id !== id && c.attributes.name === next.name)) {
    throw invalid([{ pointer: "#/name", code: "taken", detail: "A channel with this name already exists in this project" }]);
  }
  const now = new Date().toISOString();
  const channel: ApiChannel = {
    id: id!,
    attributes: {
      enabled: true,
      destination_credential_id: null,
      client_auth_method_ids: [],
      request_count: 0,
      last_activity: null,
      inserted_at: now,
      ...next,
      name: next.name!,
      destination_url: next.destination_url!,
      url: `http://localhost:4000/channels/${id}`,
      lock_version: (current?.attributes.lock_version ?? 0) + 1,
      updated_at: now,
    },
  };
  if (current) Object.assign(current, channel);
  else list.push(channel);
  return { data: channel };
});
standIn("DELETE", "/api/projects/:project_id/channels/:id", ({ project_id, id }) => {
  const list = channelsOf(project_id!);
  if (!list.some((c) => c.id === id)) throw new ApiError(404, "not_found", "Not found.");
  channelStore[project_id!] = list.filter((c) => c.id !== id);
});
