/**
 * A project's webhook auth methods on Lightning's API (API.md "Webhooks and
 * channels"), for the Webhook Security tab of project settings: the mapper,
 * the hooks a wrapper calls, and how the stand-in answers. The API's type,
 * the list's key and query, and the stand-in's list live in channels.ts,
 * whose form picks from the same list, so a save here reloads it there too.
 */
import { useQuery } from "@tanstack/react-query";
import type { ProjectRole } from "../types/projects";
import type { ReauthValues, WebhookAuthMethodRow, WebhookAuthMethodValues } from "../types/project-settings";
import type { ResourceStatus } from "../types/resource";
import { ApiError, request, standIn, statusOf, useSave } from "./client";
import { authMethodsQuery, authMethodStore, channelKeys, channelsQuery, projectPath, type ApiChannel, type ApiWebhookAuthMethod } from "./channels";
import { meQuery, standInAccount } from "./me";
import { membersQuery } from "./projects";
import recorded from "./recorded/channels.json";
import { useSessionActions } from "./session";
import { workflowsQuery, type ApiWorkflow } from "./workflows";

// Mapper.

/**
 * The tab's row. The list never sends a secret: an API key shows as
 * Lightning masks it (`mask_api_key`, its last five characters), and a
 * password, whose length the list doesn't give, as eight stars.
 */
export function authMethodRow(projectId: string, m: ApiWebhookAuthMethod, workflows: ApiWorkflow[], channels: ApiChannel[]): WebhookAuthMethodRow {
  const a = m.attributes;
  return {
    id: m.id,
    name: a.name,
    authType: a.auth_type,
    username: a.username,
    maskedSecret: a.auth_type === "api" ? (a.api_key_last_characters ? "*".repeat(15) + a.api_key_last_characters : "") : "********",
    triggers: a.triggers.map((t) => ({
      id: t.id,
      name: workflows.find((w) => w.id === t.workflow_id)?.name ?? "",
      href: `/projects/${projectId}/w/${t.workflow_id}?s=${t.id}`,
    })),
    channels: channels
      .filter((c) => c.attributes.client_auth_method_ids.includes(m.id))
      .map((c) => ({
        id: c.id,
        name: c.attributes.name,
        href: `/projects/${projectId}/channels/${c.id}/edit`,
      })),
  };
}

// Requests.

const methodPath = (projectId: string, id: string) => projectPath(projectId, `/webhook_auth_methods/${encodeURIComponent(id)}`);

/**
 * Lightning's API makes an API key itself, in the answer that creates the
 * method, and takes none from the browser, so there's no key to show before
 * the method exists. Once it does, Show reveals it.
 */
const NO_KEY_YET = "";

/** reauthenticate-user's words (webhook_auth_method_form_component.ex) for a wrong password or code. */
const INVALID = "Invalid! Please try again";

// What a wrapper calls.

export interface ProjectWebhookAuthMethods {
  status: ResourceStatus;
  authMethods: WebhookAuthMethodRow[];
  /** The viewer's role in the project, from its members, for who may manage the methods; undefined while loading or when not a member. */
  viewerRole: ProjectRole | undefined;
}

/** The Webhook Security tab's data: the methods, the workflows and channels they protect, and the viewer's role, loaded side by side. */
export function useProjectWebhookAuthMethods(projectId: string): ProjectWebhookAuthMethods {
  const methods = useQuery(authMethodsQuery(projectId));
  const workflows = useQuery(workflowsQuery);
  const channels = useQuery(channelsQuery(projectId));
  const me = useQuery(meQuery);
  const members = useQuery(membersQuery(projectId));
  return {
    status: statusOf(methods, workflows, channels, me, members),
    authMethods: (methods.data ?? []).map((m) => authMethodRow(projectId, m, workflows.data ?? [], channels.data ?? [])),
    viewerRole: members.data?.find((m) => m.id === me.data?.id)?.attributes.role,
  };
}

/** The Webhook Security tab's saves. Each resolves once the methods (and, for a delete, the channels) have reloaded. */
export function useWebhookAuthMethodSaves(projectId: string) {
  const { stepUp } = useSessionActions();
  const methods = [channelKeys.authMethods(projectId)];
  const create = useSave(methods, (values: WebhookAuthMethodValues) =>
    request(
      "PUT",
      methodPath(projectId, crypto.randomUUID()),
      values.authType === "basic"
        ? {
            auth_type: "basic",
            name: values.name,
            username: values.username,
            password: values.password,
          }
        : { auth_type: "api", name: values.name },
    ),
  );
  const rename = useSave(methods, (id: string, name: string) => request("PUT", methodPath(projectId, id), { name }));
  // Deleting detaches it from its channels too.
  const remove = useSave([...methods, channelKeys.all(projectId)], (id: string) => request("DELETE", methodPath(projectId, id)));
  return {
    onCreateWebhookAuthMethod: async (values: WebhookAuthMethodValues) => void (await create([values])),
    onRenameWebhookAuthMethod: async (id: string, name: string) => void (await rename([id, name])),
    onDeleteWebhookAuthMethod: async (id: string) => void (await remove([id])),
    onGenerateApiKey: () => Promise.resolve(NO_KEY_YET),
    /** Steps the session up with the password or code, as Lightning's form does, then reads the method, which a stepped-up session gets with its secret. */
    onRevealWebhookSecret: async (id: string, { password, code }: ReauthValues) => {
      try {
        await stepUp(password ? { password } : { code });
      } catch (error) {
        if (error instanceof ApiError && (error.code === "invalid_credentials" || error.code === "invalid")) throw new ApiError(401, error.code, INVALID);
        throw error;
      }
      const { data } = await request<{ data: ApiWebhookAuthMethod }>("GET", methodPath(projectId, id));
      return data.attributes.password ?? data.attributes.api_key ?? "";
    },
  };
}

// The stand-in: the recorded methods (channels.ts lists them), changed as Lightning would change them.

const secrets: Record<string, string> = {
  ...recorded.webhook_auth_method_secrets,
};
const methodsOf = (projectId: string) => (authMethodStore[projectId] ??= []);
const invalid = (errors: { pointer: string; code: string; detail: string }[]) => new ApiError(422, "invalid", "The request is not valid. See errors.", errors);
const blank = (key: string) => ({
  pointer: `#/${key}`,
  code: "required",
  detail: "can't be blank",
});

standIn("GET", "/api/projects/:project_id/webhook_auth_methods/:id", ({ project_id, id }) => {
  const method = methodsOf(project_id!).find((m) => m.id === id);
  if (!method) throw new ApiError(404, "not_found", "Not found.");
  if (standInAccount.steppedUpUntil < Date.now()) return { data: method };
  const secret = method.attributes.auth_type === "basic" ? { password: secrets[id!] } : { api_key: secrets[id!] };
  return {
    data: { ...method, attributes: { ...method.attributes, ...secret } },
  };
});
standIn("PUT", "/api/projects/:project_id/webhook_auth_methods/:id", ({ project_id, id }, b) => {
  const body = b as {
    name?: string;
    auth_type?: "basic" | "api";
    username?: string;
    password?: string;
  };
  const list = methodsOf(project_id!);
  const current = list.find((m) => m.id === id);
  if (current) {
    if (!body.name) throw invalid([blank("name")]);
    if (list.some((m) => m.id !== id && m.attributes.name === body.name))
      throw invalid([
        {
          pointer: "#/name",
          code: "taken",
          detail: "must be unique within the project",
        },
      ]);
    current.attributes = { ...current.attributes, name: body.name };
    return { data: current };
  }
  const basic = body.auth_type === "basic";
  // The changeset's checks together; the name's uniqueness only once they pass, as the database's constraint does.
  const errors = [
    ...(body.name ? [] : [blank("name")]),
    ...(basic && !body.username ? [blank("username")] : []),
    ...(basic && !body.password ? [blank("password")] : []),
    ...(basic && body.password && body.password.length < 8
      ? [
          {
            pointer: "#/password",
            code: "too_short",
            detail: "should be at least 8 character(s)",
          },
        ]
      : []),
  ];
  if (errors.length > 0) throw invalid(errors);
  if (list.some((m) => m.attributes.name === body.name))
    throw invalid([
      {
        pointer: "#/name",
        code: "taken",
        detail: "must be unique within the project",
      },
    ]);
  const apiKey = basic ? undefined : crypto.randomUUID().replaceAll("-", "").repeat(2);
  secrets[id!] = basic ? body.password! : apiKey!;
  const method: ApiWebhookAuthMethod = {
    id: id!,
    attributes: {
      name: body.name!,
      auth_type: basic ? "basic" : "api",
      username: basic ? body.username! : null,
      api_key_last_characters: apiKey ? apiKey.slice(-5) : null,
      triggers: [],
    },
  };
  list.push(method);
  return {
    data: {
      ...method,
      attributes: {
        ...method.attributes,
        ...(apiKey && { api_key: apiKey }),
      },
    },
  };
});
standIn("DELETE", "/api/projects/:project_id/webhook_auth_methods/:id", ({ project_id, id }) => {
  const list = methodsOf(project_id!);
  if (!list.some((m) => m.id === id)) throw new ApiError(404, "not_found", "Not found.");
  authMethodStore[project_id!] = list.filter((m) => m.id !== id);
});
