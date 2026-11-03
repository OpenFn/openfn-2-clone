/**
 * Projects and their members on Lightning's API (API.md "Projects",
 * JSON:API): the API's shapes, the mappers, the keys, the hooks a wrapper
 * calls, and how the stand-in answers.
 */
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CredentialProjectRef } from "../types/credentials";
import type { ProjectRole } from "../types/projects";
import type { ResourceStatus } from "../types/resource";
import type { ProjectOverview } from "../types/workflows";
import { listAll, request, standIn, statusOf, useSave, withFieldNames } from "./client";
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
    digest: "never" | "daily" | "weekly" | "monthly";
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
    await createProject(me.attributes.email, project);
  });
  return {
    onCreate: async (project: { name: string; description: string }) => void (await create([project])),
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
