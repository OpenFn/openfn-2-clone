/**
 * Projects, their members and their sandboxes on Lightning's API (API.md
 * "Projects" and "Sandboxes", JSON:API): the API's shapes, the mappers, the
 * keys, the hooks a wrapper calls, and how the stand-in answers.
 */
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CredentialProjectRef } from "../types/credentials";
import type { AddCollaboratorsResult, CollaboratorRow, CollaboratorValues, Digest, InviteValues } from "../types/project-settings";
import type { Project, ProjectRole } from "../types/projects";
import type { ResourceStatus } from "../types/resource";
import type { MergePreviewResult, MergeValues, MergeWorkflowRow, SandboxRow, SandboxValues } from "../types/sandboxes";
import type { ProjectOverview } from "../types/workflows";
import { urlSafeName } from "../utils/format";
import { ApiError, listAll, request, standIn, statusOf, useSave, withFieldNames } from "./client";
import { instanceQuery } from "./instance";
import { meQuery, standInAccount, standInRole } from "./me";
import { workflowKeys, workflowsQuery, type ApiWorkflow } from "./workflows";
import recorded from "./recorded/projects.json";
import recordedMembers from "./recorded/members.json";
import recordedSandboxes from "./recorded/sandboxes.json";

// The API's shapes.

/** A project as `GET /api/projects` lists it (the settings it also gives are left out until a page reads them). */
export interface ApiProject {
  id: string;
  attributes: { name: string; description: string | null; allow_support_access: boolean };
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

/**
 * A project in a workspace. `GET /api/projects` lists the roots and
 * `GET /api/projects/:project_id/sandboxes` each one's direct sandboxes, so the
 * parent is the list it came from: the API sends no `parent_id`.
 */
export interface WorkspaceProject {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
}

/** `POST …/sandboxes/:id/merge_previews`: what a merge would do, writing nothing. */
export interface ApiMergePreview {
  target_project_id: string;
  workflows: {
    name: string;
    source_workflow_id: string | null;
    target_workflow_id: string | null;
    change: "new" | "changed" | "unchanged" | "deleted";
    diverged: boolean;
  }[];
  /** The sandbox's credentials the target lacks, by the credential's own id. */
  credentials: { credential_id: string; name: string }[];
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
    lastUpdatedAt:
      own
        .map((w) => w.updated_at)
        .sort()
        .at(-1) ?? null,
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
 * member owns in the project, so the removal confirmation warns without naming them.
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

/** Every project under `id`, at any depth. */
export function projectsUnder(all: WorkspaceProject[], id: string): WorkspaceProject[] {
  return all.filter((p) => p.parentId === id).flatMap((p) => [p, ...projectsUnder(all, p.id)]);
}

/** The top of the tree `id` sits in. */
export function workspaceRootOf(all: WorkspaceProject[], id: string): WorkspaceProject | undefined {
  let p = all.find((x) => x.id === id);
  while (p?.parentId) {
    const parentId: string = p.parentId;
    p = all.find((x) => x.id === parentId);
  }
  return p;
}

/**
 * A card on the sandboxes page. `canManage` is Lightning's owner-or-admin
 * rule, on the root or on the sandbox. The API sends no colour or env, and
 * leaves out sandboxes scheduled for deletion, so there's nothing to restore.
 */
export function sandboxRow(p: WorkspaceProject, all: WorkspaceProject[], canManage: boolean): SandboxRow {
  return {
    id: p.id,
    name: p.name,
    color: null,
    env: null,
    scheduledDeletion: null,
    workflowsHref: `/projects/${p.id}/w`,
    editHref: p.parentId ? `/projects/${p.parentId}/sandboxes/${p.id}/edit` : null,
    canEdit: canManage,
    canDelete: canManage,
    canMerge: canManage,
    canCancelDeletion: false,
    restoreBlockedReason: null,
    activeDescendantCount: projectsUnder(all, p.id).length,
  };
}

/** A workflow in the merge dialog. A deleted one is the target's, so it goes by the target's id. */
export function mergeWorkflowRow(w: ApiMergePreview["workflows"][number]): MergeWorkflowRow {
  return {
    id: (w.change === "deleted" ? w.target_workflow_id : w.source_workflow_id) ?? w.name,
    name: w.name,
    isNew: w.change === "new",
    isChanged: w.change === "new" || w.change === "changed",
    isDiverged: w.diverged,
    isDeleted: w.change === "deleted",
  };
}

// Keys and requests.

export const projectKeys = {
  all: ["projects"] as const,
  members: (id: string) => ["projects", id, "members"] as const,
  /** Every project the caller can see and every sandbox under each. */
  workspaces: ["projects", "workspaces"] as const,
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
    try {
      await withFieldNames(send, atRow(i, { email: "email", first_name: "firstName", last_name: "lastName", role: "role" }));
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      // An email with an account is only invited because the API couldn't find its user; say so rather than "has already been taken".
      const entries = error.errors.map((e) => (e.code === "taken" && e.pointer?.endsWith("/email") ? { ...e, detail: HAS_ACCOUNT } : e));
      throw new ApiError(error.status ?? 422, error.code, error.message, entries);
    }
  }
}

const HAS_ACCOUNT = "This person has an account, but Lightning's API can only add people who are in one of your projects";

export interface ProjectMembers {
  status: ResourceStatus;
  collaborators: CollaboratorRow[];
  /** The viewer's role in the project, from its members; undefined while loading or when not a member. */
  viewerRole: ProjectRole | undefined;
}

/**
 * The Collaboration tab's members, and the viewer's role among them.
 * `canRemoveAs` is the host's rule for who may remove a member, given that role.
 */
export function useProjectMembers(projectId: string, canRemoveAs: (role: ProjectRole | undefined) => boolean): ProjectMembers {
  const me = useQuery(meQuery);
  const members = useQuery(membersQuery(projectId));
  const viewerRole = members.data?.find((m) => m.id === me.data?.id)?.attributes.role;
  return {
    status: statusOf(me, members),
    collaborators: (members.data ?? []).map((m) => collaboratorRow(m, me.data?.id, canRemoveAs(viewerRole))),
    viewerRole,
  };
}

/** The project as `GET /api/projects` lists it; null if the caller isn't a member, undefined while loading. */
export function useApiProject(projectId: string): ApiProject | null | undefined {
  const projects = useQuery(projectsQuery);
  if (!projects.data) return projects.isError ? null : undefined;
  return projects.data.find((p) => p.id === projectId) ?? null;
}

/**
 * The project settings page's project, for one the API lists but no fixture
 * holds. The API gives only the name and description; the rest are
 * Lightning's defaults for a new project (no limit, retain all, no MFA).
 */
export function settingsProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.attributes.name,
    description: p.attributes.description ?? "",
    parentId: null,
    color: null,
    concurrency: null,
    retentionPolicy: "retain_all",
    historyRetentionPeriod: null,
    dataclipRetentionPeriod: null,
    requiresMfa: false,
    members: [],
    lastUpdatedAt: "",
    insertedAt: "",
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
  const supportAccess = useSave([projectKeys.all], (on: boolean) =>
    request("PUT", `/api/projects/${encodeURIComponent(projectId)}/support_access`, { allow_support_access: on })
  );

  return {
    // useSave doesn't carry the answer's type through.
    onAddCollaborators: (values: CollaboratorValues[]) => add([values]),
    onInviteCollaborators: async (values: InviteValues[]) => void (await invite([values])),
    onRemoveCollaborator: async (id: string) => void (await remove([id])),
    onSetFailureAlert: async (id: string, on: boolean) => void (await notify([id, { failure_alert: on }])),
    onSetDigest: async (id: string, digest: Digest) => void (await notify([id, { digest }])),
    onSetSupportAccess: async (on: boolean) => void (await supportAccess([on])),
  };
}

// Sandboxes.

const sandboxesPath = (projectId: string, rest = "") => `/api/projects/${encodeURIComponent(projectId)}/sandboxes${rest}`;
const projectPath = (projectId: string, rest = "") => `/api/projects/${encodeURIComponent(projectId)}${rest}`;

/** The query for every workspace the caller can see: the projects, then each one's sandboxes, a level at a time. */
export const workspacesQuery = {
  queryKey: projectKeys.workspaces,
  queryFn: async (): Promise<WorkspaceProject[]> => {
    const node = (p: ApiProject, parentId: string | null): WorkspaceProject => ({
      id: p.id,
      name: p.attributes.name,
      description: p.attributes.description,
      parentId,
    });
    const all = (await listProjects()).map((p) => node(p, null));
    // ponytail: one request per project in the instance, since the API lists only a project's direct sandboxes and sends no parent; one request when it does.
    let level = all;
    while (level.length > 0) {
      const lists = await Promise.all(
        level.map((parent) => listAll<ApiProject>(sandboxesPath(parent.id), "data").then((list) => list.map((p) => node(p, parent.id))))
      );
      level = lists.flat();
      all.push(...level);
    }
    return all;
  },
};

const isAdmin = (role: ProjectRole | undefined) => role === "owner" || role === "admin";
const isEditor = (role: ProjectRole | undefined) => isAdmin(role) || role === "editor";

export interface Workspace {
  status: ResourceStatus;
  /** The project in the URL, once loaded. */
  project: WorkspaceProject | undefined;
  /** The workspace the project sits in, root first. */
  tree: WorkspaceProject[];
  /** "parent/child" for a sandbox. */
  label: string;
  root: SandboxRow | undefined;
  rootIsSandbox: boolean;
  sandboxes: SandboxRow[];
  /** The viewer's role in the project in the URL. */
  viewerRole: ProjectRole | undefined;
  gracePeriodDays: number | null;
  /** Where the sandbox may merge: live projects of the workspace outside it, where the viewer is owner, admin or editor (index.ex `get_merge_target_options`). */
  mergeTargets: (sandboxId: string) => { id: string; name: string }[];
}

/**
 * The sandboxes page's data: the workspace the project sits in, and each
 * project's members for the viewer's role there, loaded side by side.
 */
export function useWorkspace(projectId: string): Workspace {
  const me = useQuery(meQuery);
  const workspaces = useQuery(workspacesQuery);
  const instance = useQuery(instanceQuery);
  const all = workspaces.data ?? [];
  const top = workspaceRootOf(all, projectId);
  const tree = top ? [top, ...projectsUnder(all, top.id)] : [];
  const members = useQueries({ queries: tree.map((p) => membersQuery(p.id)) });
  const roleIn = (id: string) => members[tree.findIndex((p) => p.id === id)]?.data?.find((m) => m.id === me.data?.id)?.attributes.role;
  const row = (p: WorkspaceProject) => sandboxRow(p, all, (top !== undefined && isAdmin(roleIn(top.id))) || isAdmin(roleIn(p.id)));
  const project = all.find((p) => p.id === projectId);
  const status = statusOf(me, workspaces, instance, ...members);
  const label: string[] = [];
  for (let p = project; p; p = all.find((x) => x.id === p!.parentId)) label.unshift(p.name);
  return {
    status: status.state === "ready" && !project ? { state: "notFound" } : status,
    project,
    tree,
    label: label.join("/"),
    root: top && row(top),
    // `GET /api/projects` lists only roots, so a viewer who can see only a sandbox sees nothing here: tracked as a gap.
    rootIsSandbox: false,
    // By name, not by tree (projects.ex `list_descendants`).
    sandboxes: tree
      .slice(1)
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map(row),
    viewerRole: roleIn(projectId),
    gracePeriodDays: instance.data?.purge_deleted_after_days ?? null,
    mergeTargets: (sandboxId) => {
      const own = [sandboxId, ...projectsUnder(all, sandboxId).map((p) => p.id)];
      return tree.filter((p) => !own.includes(p.id) && isEditor(roleIn(p.id))).map((p) => ({ id: p.id, name: p.name }));
    },
  };
}

/** The sandbox's parent, from the workspaces already loaded: the sandbox routes sit under it. */
async function parentOf(queryClient: ReturnType<typeof useQueryClient>, sandboxId: string): Promise<string> {
  const parentId = (await queryClient.query(workspacesQuery)).find((p) => p.id === sandboxId)?.parentId;
  if (!parentId) throw new ApiError(404, "not_found", "Sandbox not found");
  return parentId;
}

const toName = (pointer: string) => (pointer === "#/name" ? "#/rawName" : undefined);

/** `POST …/merge_previews`; a null target asks for the parent. */
async function previewMerge(queryClient: ReturnType<typeof useQueryClient>, id: string, targetId: string | null) {
  const path = sandboxesPath(await parentOf(queryClient, id), `/${encodeURIComponent(id)}/merge_previews`);
  return request<ApiMergePreview>("POST", path, targetId ? { target_project_id: targetId } : {});
}

/**
 * The sandboxes page's saves. Each resolves once the workspaces, members and
 * dashboard have reloaded; a merge also reloads the workflows.
 */
export function useSandboxSaves(projectId: string) {
  const queryClient = useQueryClient();

  const create = useSave([projectKeys.all], async ({ rawName, color }: SandboxValues) => {
    const send = request("PUT", sandboxesPath(projectId, `/${crypto.randomUUID()}`), { name: urlSafeName(rawName), color });
    await withFieldNames(send, toName);
  });

  // `PUT /api/projects/:id` replaces the name and the description, so the description goes back as it was.
  const update = useSave([projectKeys.all], async (id: string, { rawName, color }: SandboxValues) => {
    if (color !== null) throw new ApiError(422, "not_supported", "Lightning's API can't change a sandbox's colour yet.");
    const current = (await queryClient.query(workspacesQuery)).find((p) => p.id === id);
    if (!current) throw new ApiError(404, "not_found", "Sandbox not found");
    await withFieldNames(request("PUT", projectPath(id), { name: urlSafeName(rawName), description: current.description }), toName);
  });

  const remove = useSave([projectKeys.all], (id: string) => request("DELETE", projectPath(id)));
  const cancelDeletion = useSave([projectKeys.all], (id: string) => request("DELETE", projectPath(id, "/scheduled_deletion")));

  /**
   * `POST …/merges` with the ticked workflows, then, as Lightning's page does,
   * `DELETE /api/projects/:id` to schedule the sandbox for deletion. The API
   * never deletes a target's workflow and links every credential the target
   * lacks, so a choice that needs otherwise is refused before anything runs.
   * Resolves with whether the sandbox was scheduled.
   */
  const merge = useSave([projectKeys.all, workflowKeys.all], async (id: string, values: MergeValues): Promise<boolean> => {
    if (values.deletedWorkflowIds.length > 0)
      throw new ApiError(422, "not_supported", "Lightning's API can't delete a workflow from the target in a merge yet.");
    const preview = await previewMerge(queryClient, id, values.targetId);
    if (preview.credentials.some((c) => !values.credentialIds.includes(c.credential_id))) {
      throw new ApiError(422, "not_supported", "Lightning's API can't leave out a credential in a merge yet.");
    }
    const path = sandboxesPath(await parentOf(queryClient, id), `/${encodeURIComponent(id)}/merges`);
    await request("POST", path, { target_project_id: values.targetId, workflow_ids: values.workflowIds });
    return request("DELETE", projectPath(id)).then(
      () => true,
      () => false
    );
  });

  return {
    onCreateSandbox: async (values: SandboxValues) => void (await create([values])),
    onUpdateSandbox: async (id: string, values: SandboxValues) => void (await update([id, values])),
    onDeleteSandbox: async (id: string) => void (await remove([id])),
    onCancelDeletion: async (id: string) => void (await cancelDeletion([id])),
    /** What merging into the target would do. The API doesn't say which collections a merge creates. */
    onPreviewMerge: async (id: string, targetId: string | null): Promise<Omit<MergePreviewResult, "targets">> => {
      const preview = await previewMerge(queryClient, id, targetId);
      return {
        targetId: preview.target_project_id,
        workflows: preview.workflows.map(mergeWorkflowRow),
        credentials: preview.credentials.map((c) => ({ id: c.credential_id, name: c.name })),
        collectionsToAdd: [],
      };
    },
    // useSave doesn't carry the answer's type through.
    onMergeSandbox: (id: string, values: MergeValues) => merge([id, values]) as Promise<boolean>,
  };
}

// The stand-in: the recorded projects and members, changed as Lightning would change them.

const projectStore = recorded.data as ApiProject[];
const memberStore = Object.fromEntries(Object.entries(recordedMembers).map(([id, page]) => [id, page.data as ApiMember[]]));

standIn("GET", "/api/projects", () => ({ ...recorded, data: projectStore }));
standIn("PUT", "/api/projects/:id", ({ id }, b) => {
  // An existing sandbox: its name and description replaced.
  const sandbox = sandboxStore.find((s) => s.id === id);
  if (sandbox) {
    const { name, description } = b as { name: string; description: string | null };
    refuseTakenName(sandbox.parent_id, name, sandbox.id);
    Object.assign(sandbox.attributes, { name, description });
    return { data: sandbox };
  }
  // Lightning lets only a superuser create a project through the API.
  if (standInRole() !== "superuser") throw new ApiError(403, "forbidden", "You may not do this (or it might not exist).");
  const body = b as { name: string; description: string | null; members: { email: string; role: ProjectRole }[] };
  const project: ApiProject = { id: id!, attributes: { name: body.name, description: body.description, allow_support_access: false } };
  projectStore.push(project);
  projectStore.sort((x, y) => x.attributes.name.localeCompare(y.attributes.name));
  // Each member's user, as already recorded in another project.
  memberStore[id!] = body.members.flatMap(({ email, role }) => {
    const user = Object.values(memberStore)
      .flat()
      .find((m) => m.attributes.email === email);
    return user ? [{ ...user, attributes: { ...user.attributes, role } }] : [];
  });
  return { data: project };
});
standIn("PUT", "/api/projects/:id/support_access", ({ id }, b) => {
  const project = projectStore.find((p) => p.id === id);
  if (!project) throw new ApiError(404, "not_found", "Not found.");
  project.attributes.allow_support_access = (b as { allow_support_access: boolean }).allow_support_access;
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

// The stand-in's sandboxes, recorded from the real Lightning, each with its parent.

type StandInSandbox = ApiProject & { parent_id: string; attributes: { scheduled_deletion: string | null } };
const sandboxStore: StandInSandbox[] = Object.entries(recordedSandboxes.sandboxes).flatMap(([parent_id, list]) => list.map((p) => ({ ...p, parent_id, attributes: { allow_support_access: false, ...p.attributes } })));
Object.assign(memberStore, Object.fromEntries(Object.entries(recordedSandboxes.members).map(([id, list]) => [id, list as ApiMember[]])));

const sandboxesUnder = (id: string): StandInSandbox[] => sandboxStore.filter((s) => s.parent_id === id).flatMap((s) => [s, ...sandboxesUnder(s.id)]);
const standInRoleIn = (projectId: string) => memberStore[projectId]?.find((m) => m.attributes.email === standInAccount.user?.email)?.attributes.role;
const forbidden = () => new ApiError(403, "forbidden", "You may not do this (or it might not exist).");
const refuseTakenName = (parentId: string, name: string, selfId?: string) => {
  if (sandboxStore.some((s) => s.parent_id === parentId && s.attributes.name === name && s.id !== selfId)) {
    throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ pointer: "#/name", code: "taken", detail: "has already been taken" }]);
  }
};
const liveSandbox = (parentId: string, id: string) => {
  const sandbox = sandboxStore.find((s) => s.id === id && s.parent_id === parentId && !s.attributes.scheduled_deletion);
  if (!sandbox) throw new ApiError(404, "not_found", "Not found.");
  return sandbox;
};

standIn("GET", "/api/projects/:project_id/sandboxes", ({ project_id }) => ({
  data: sandboxStore
    .filter((s) => s.parent_id === project_id && !s.attributes.scheduled_deletion)
    .sort((x, y) => x.attributes.name.localeCompare(y.attributes.name)),
  links: { next: null },
}));
// Its creator owns it; the parent's members keep their roles, owners as admins (sandboxes.ex `provision`).
standIn("PUT", "/api/projects/:project_id/sandboxes/:id", ({ project_id, id }, b) => {
  const role = standInRoleIn(project_id!);
  if (role !== "owner" && role !== "admin" && role !== "editor") throw forbidden();
  const { name } = b as { name: string };
  refuseTakenName(project_id!, name);
  const sandbox: StandInSandbox = { id: id!, parent_id: project_id!, attributes: { name, description: null, allow_support_access: false, scheduled_deletion: null } };
  sandboxStore.push(sandbox);
  memberStore[id!] = (memberStore[project_id!] ?? []).map((m) => {
    const own = m.attributes.email === standInAccount.user?.email ? "owner" : m.attributes.role === "owner" ? "admin" : m.attributes.role;
    return { ...m, attributes: { ...m.attributes, role: own } };
  });
  return { data: sandbox };
});
standIn("DELETE", "/api/projects/:id", ({ id }) => {
  const sandbox = sandboxStore.find((s) => s.id === id);
  if (!sandbox) throw forbidden();
  const at = new Date().toISOString();
  for (const s of [sandbox, ...sandboxesUnder(sandbox.id)]) s.attributes.scheduled_deletion = at;
});
standIn("DELETE", "/api/projects/:id/scheduled_deletion", ({ id }) => {
  const sandbox = sandboxStore.find((s) => s.id === id && s.attributes.scheduled_deletion);
  if (!sandbox) throw new ApiError(404, "not_found", "Not found.");
  for (const s of [sandbox, ...sandboxesUnder(sandbox.id)]) s.attributes.scheduled_deletion = null;
  return { data: sandbox };
});
// A merge preview replays the recorded one, for whichever sandbox and target.
standIn("POST", "/api/projects/:project_id/sandboxes/:id/merge_previews", ({ project_id, id }, b) => {
  liveSandbox(project_id!, id!);
  const target = (b as { target_project_id?: string }).target_project_id ?? project_id!;
  return { ...recordedSandboxes.merge_preview, target_project_id: target };
});
standIn("POST", "/api/projects/:project_id/sandboxes/:id/merges", ({ project_id, id }, b) => {
  liveSandbox(project_id!, id!);
  const target = (b as { target_project_id?: string }).target_project_id ?? project_id!;
  return { data: [...projectStore, ...sandboxStore].find((p) => p.id === target) };
});
