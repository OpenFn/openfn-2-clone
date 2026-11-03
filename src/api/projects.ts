/**
 * Projects and their members on Lightning's API (API.md "Projects",
 * JSON:API): the API's shapes, the mappers, the keys, the hooks a wrapper
 * calls, and how the stand-in answers.
 */
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CredentialProjectRef } from "../types/credentials";
import type { AddCollaboratorsResult, CollaboratorRow, CollaboratorValues, Digest, InviteValues } from "../types/project-settings";
import type { ProjectRole } from "../types/projects";
import type { ResourceStatus } from "../types/resource";
import type { ProjectOverview } from "../types/workflows";
import { ApiError, listAll, request, standIn, statusOf, useSave, withFieldNames } from "./client";
import { meQuery } from "./me";
import { workflowsQuery, type ApiWorkflow } from "./workflows";
import recorded from "./recorded/projects.json";
import recordedMembers from "./recorded/members.json";

// The API's shapes.

/** A project as `GET /api/projects` lists it. */
export interface ApiProject {
  id: string;
  attributes: { name: string; description: string | null };
}

/** A member as `GET /api/projects/:project_id/members` lists them; `id` is the user's. */
export interface ApiMember {
  id: string;
  attributes: {
    role: ProjectRole;
    email: string;
    first_name: string;
    last_name: string;
    failure_alert: boolean;
    digest: Digest;
  };
}

// Mappers.

export function projectRef(p: ApiProject): CredentialProjectRef {
  return { id: p.id, name: p.attributes.name };
}

/**
 * A row of the projects dashboard. The project list has no counts or role, so
 * they come from the project's members and the caller's workflows; null for
 * the last update when the project has no workflows, as Lightning shows it.
 */
export function projectOverview(p: ApiProject, role: ProjectRole, members: ApiMember[], workflows: ApiWorkflow[]): ProjectOverview {
  const own = workflows.filter((w) => w.project_id === p.id);
  return {
    id: p.id,
    name: p.attributes.name,
    role,
    workflowsCount: own.length,
    collaboratorsCount: members.length,
    lastUpdatedAt: own.map((w) => w.updated_at).sort().at(-1) ?? null,
  };
}

/** settings.ex `remove_user_tooltip/5`, but for a sandbox's parent's owners and admins, whom Lightning refuses to remove itself. */
function removeBlockedReason(m: ApiMember, viewerId: string | undefined, canRemove: boolean): string | null {
  if (!canRemove) return "You do not have permission to remove a user";
  if (m.id === viewerId) return "You cannot remove yourself";
  if (m.attributes.role === "owner") return "You cannot remove an owner";
  return null;
}

/**
 * A row of the Collaboration tab. The API doesn't say which credentials a
 * member owns in the project, so the removal confirmation names none.
 */
export function collaboratorRow(m: ApiMember, viewerId: string | undefined, canRemove: boolean): CollaboratorRow {
  const a = m.attributes;
  return {
    id: m.id,
    firstName: a.first_name,
    lastName: a.last_name,
    email: a.email,
    role: a.role,
    failureAlert: a.failure_alert,
    digest: a.digest,
    isCurrentUser: m.id === viewerId,
    removeBlockedReason: removeBlockedReason(m, viewerId, canRemove),
    // The API doesn't say which credentials a member owns, so the confirmation warns without naming them.
    ownedCredentialNames: null,
  };
}

// Keys and requests.

export const projectKeys = {
  all: ["projects"] as const,
  members: (id: string) => ["projects", id, "members"] as const,
};

/** `GET /api/projects`: the projects the caller is a member of, every page. */
export const listProjects = () => listAll<ApiProject>("/api/projects", "data");

/** The query for the caller's projects, for any wrapper that needs them. */
export const projectsQuery = {
  queryKey: projectKeys.all,
  queryFn: listProjects,
};

const membersPath = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/members`;

/** The query for a project's members, every page. */
export const membersQuery = (projectId: string) => ({
  queryKey: projectKeys.members(projectId),
  queryFn: () => listAll<ApiMember>(membersPath(projectId), "data"),
});

/**
 * `PUT /api/projects/:id` with a new id creates a project, its creator its
 * owner, without emailing them, as Lightning's Create project form does.
 * Lightning lets only a superuser create one this way; anyone else hears 403.
 */
async function createProject(ownerEmail: string, { name, description }: { name: string; description: string }): Promise<void> {
  const send = request("PUT", `/api/projects/${crypto.randomUUID()}`, {
    name,
    description,
    members: [{ email: ownerEmail, role: "owner" }],
    notify: false,
  });
  // The form calls the name it shows the person `rawName`.
  await withFieldNames(send, (pointer) => (pointer === "#/name" ? "#/rawName" : undefined));
}

// What a wrapper calls.

export interface ProjectsOverview {
  status: ResourceStatus;
  firstName: string;
  projects: ProjectOverview[];
}

/**
 * The projects dashboard's data: the caller's name, their projects, and each
 * project's members and workflows, loaded side by side. A project the caller
 * isn't a member of (an operator sees every one) isn't on their dashboard.
 */
export function useProjectsOverview(): ProjectsOverview {
  const me = useQuery(meQuery);
  const projects = useQuery(projectsQuery);
  const workflows = useQuery(workflowsQuery);
  const members = useQueries({ queries: (projects.data ?? []).map((p) => membersQuery(p.id)) });
  const viewerId = me.data?.id;
  return {
    status: statusOf(me, projects, workflows, ...members),
    firstName: me.data?.attributes.first_name ?? "",
    projects: (projects.data ?? []).flatMap((p, i) => {
      const list = members[i]?.data ?? [];
      const role = list.find((m) => m.id === viewerId)?.attributes.role;
      return role ? [projectOverview(p, role, list, workflows.data ?? [])] : [];
    }),
  };
}

/** The projects dashboard's save: it resolves once the project lists have reloaded. */
export function useProjectSaves() {
  const queryClient = useQueryClient();
  const create = useSave([projectKeys.all], async (project: { name: string; description: string }) => {
    const me = await queryClient.query({ ...meQuery, staleTime: "static" });
    if (!me) throw new ApiError(401, "unauthenticated", "Authentication is required.");
    await createProject(me.attributes.email, project);
  });
  return {
    onCreate: async (project: { name: string; description: string }) => void (await create([project])),
  };
}

const memberPath = (projectId: string, userId: string, rest = "") => `${membersPath(projectId)}/${encodeURIComponent(userId)}${rest}`;

/** Lightning blames a body key of the `i`th request; the form shows it on that row (`#/email` → `#/2/email`). */
const atRow = (i: number, fields: Record<string, string>) => (pointer: string) => {
  const field = fields[pointer.replace(/^#\//, "")];
  return field === undefined ? undefined : `#/${i}/${field}`;
};

/**
 * Adds each person who has an account, as `PUT …/members/:user_id`. The API
 * finds a user by id only, so an email is known when its user is a member of
 * one of the caller's projects; any other email goes back to be invited.
 */
async function addMembers(projectId: string, known: Map<string, string>, values: CollaboratorValues[]): Promise<AddCollaboratorsResult> {
  // ponytail: one request per person, so a refusal partway leaves the earlier ones added; one request when the API adds several.
  for (const [i, v] of values.entries()) {
    const userId = known.get(v.email.toLowerCase());
    if (userId) await withFieldNames(request("PUT", memberPath(projectId, userId), { role: v.role }), atRow(i, { role: "role" }));
  }
  return { toInvite: values.filter((v) => !known.has(v.email.toLowerCase())) };
}

/** `POST …/invitations`, one per person. */
async function inviteMembers(projectId: string, values: InviteValues[]): Promise<void> {
  for (const [i, v] of values.entries()) {
    const send = request("POST", `/api/projects/${encodeURIComponent(projectId)}/invitations`, {
      email: v.email,
      first_name: v.firstName,
      last_name: v.lastName,
      role: v.role,
    });
    await withFieldNames(send, atRow(i, { email: "email", first_name: "firstName", last_name: "lastName", role: "role" }));
  }
}

export interface ProjectMembers {
  status: ResourceStatus;
  collaborators: CollaboratorRow[];
}

/** The Collaboration tab's members. `canRemove` is the viewer's permission, from the host. */
export function useProjectMembers(projectId: string, canRemove: boolean): ProjectMembers {
  const me = useQuery(meQuery);
  const members = useQuery(membersQuery(projectId));
  return {
    status: statusOf(me, members),
    collaborators: (members.data ?? []).map((m) => collaboratorRow(m, me.data?.id, canRemove)),
  };
}

/**
 * The Collaboration tab's saves. Each resolves once the project's members, and
 * the dashboard's counts, have reloaded.
 */
export function useProjectMemberSaves(projectId: string) {
  const queryClient = useQueryClient();
  /** Every user the caller can see, by email: the members of each of their projects. */
  const knownUsers = async () => {
    const projects = await queryClient.query(projectsQuery);
    const lists = await Promise.all(projects.map((p) => queryClient.query(membersQuery(p.id))));
    return new Map(lists.flat().map((m) => [m.attributes.email.toLowerCase(), m.id]));
  };
  const member = (id: string) => {
    const found = queryClient.getQueryData<ApiMember[]>(projectKeys.members(projectId))?.find((m) => m.id === id);
    if (!found) throw new ApiError(404, "not_found", "Not found.");
    return found.attributes;
  };
  const notifications = (id: string, change: { failure_alert?: boolean; digest?: Digest }) => {
    const { failure_alert, digest } = member(id);
    return request("PUT", memberPath(projectId, id, "/notifications"), { failure_alert, digest, ...change });
  };

  const add = useSave([projectKeys.all], async (values: CollaboratorValues[]) => addMembers(projectId, await knownUsers(), values));
  const invite = useSave([projectKeys.all], (values: InviteValues[]) => inviteMembers(projectId, values));
  const remove = useSave([projectKeys.all], (id: string) => request("DELETE", memberPath(projectId, id)));
  const notify = useSave([projectKeys.members(projectId)], notifications);

  return {
    // useSave doesn't carry the answer's type through.
    onAddCollaborators: (values: CollaboratorValues[]) => add([values]),
    onInviteCollaborators: async (values: InviteValues[]) => void (await invite([values])),
    onRemoveCollaborator: async (id: string) => void (await remove([id])),
    onSetFailureAlert: async (id: string, on: boolean) => void (await notify([id, { failure_alert: on }])),
    onSetDigest: async (id: string, digest: Digest) => void (await notify([id, { digest }])),
  };
}

// The stand-in: the recorded projects and members, changed as Lightning would change them.

const projectStore = recorded.data as ApiProject[];
const memberStore = Object.fromEntries(Object.entries(recordedMembers).map(([id, page]) => [id, page.data as ApiMember[]]));

standIn("GET", "/api/projects", () => ({ ...recorded, data: projectStore }));
standIn("PUT", "/api/projects/:id", ({ id }, b) => {
  const body = b as { name: string; description: string | null; members: { email: string; role: ProjectRole }[] };
  const project: ApiProject = { id: id!, attributes: { name: body.name, description: body.description } };
  projectStore.push(project);
  projectStore.sort((x, y) => x.attributes.name.localeCompare(y.attributes.name));
  // Each member's user, as already recorded in another project.
  memberStore[id!] = body.members.flatMap(({ email, role }) => {
    const user = Object.values(memberStore).flat().find((m) => m.attributes.email === email);
    return user ? [{ ...user, attributes: { ...user.attributes, role } }] : [];
  });
  return { data: project };
});
standIn("GET", "/api/projects/:project_id/members", ({ project_id }) => ({ data: memberStore[project_id!] ?? [], links: { next: null } }));
const membersOf = (projectId: string) => (memberStore[projectId] ??= []);
const anyUser = (find: (m: ApiMember) => boolean) => Object.values(memberStore).flat().find(find);
standIn("PUT", "/api/projects/:project_id/members/:user_id", ({ project_id, user_id }, b) => {
  const { role } = b as { role: ProjectRole };
  const list = membersOf(project_id!);
  const current = list.find((m) => m.id === user_id);
  if (current) return { data: Object.assign(current, { attributes: { ...current.attributes, role } }) };
  const user = anyUser((m) => m.id === user_id);
  if (!user) throw new ApiError(404, "not_found", "Not found.");
  const added = { ...user, attributes: { ...user.attributes, role, failure_alert: false, digest: "never" as const } };
  list.push(added);
  return { data: added };
});
standIn("DELETE", "/api/projects/:project_id/members/:user_id", ({ project_id, user_id }) => {
  memberStore[project_id!] = membersOf(project_id!).filter((m) => m.id !== user_id);
});
standIn("PUT", "/api/projects/:project_id/members/:user_id/notifications", ({ project_id, user_id }, b) => {
  const m = membersOf(project_id!).find((x) => x.id === user_id);
  if (!m) throw new ApiError(404, "not_found", "Not found.");
  Object.assign(m.attributes, b);
  return { data: m };
});
standIn("POST", "/api/projects/:project_id/invitations", ({ project_id }, b) => {
  const body = b as { email: string; first_name: string; last_name: string; role: ProjectRole };
  if (anyUser((m) => m.attributes.email.toLowerCase() === body.email.toLowerCase())) {
    throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ pointer: "#/email", code: "taken", detail: "has already been taken" }]);
  }
  const member: ApiMember = { id: crypto.randomUUID(), attributes: { ...body, failure_alert: false, digest: "never" } };
  membersOf(project_id!).push(member);
  return { data: member };
});
