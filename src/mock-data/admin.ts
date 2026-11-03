/**
 * Fixtures for the superuser admin views (/settings/*): audit trail, the
 * OpenID Connect auth provider, collections, plus the few admin-only user and
 * project fields the shared users / projects fixtures don't carry.
 * Static fixtures only: nothing here talks to a backend.
 */
import { fullName } from "../utils/format";
import { users } from "./users";
import { projects } from "./projects";
import type { Project } from "../types/projects";
import type { User } from "../types/users";
import { collections } from "./project-settings";
import type { AdminCollectionRow, AdminProjectRow, AuditEvent, AuthProvider, LiveDashboardData } from "../types/admin";

// ---------------------------------------------------------------------------
// Projects (admin-only fields)

/** Projects scheduled for deletion (project id -> ISO date). */
export const projectScheduledDeletions: Record<string, string> = {};

function projectOwnerName(project: Project): string {
  const owner = project.members.find((m) => m.role === "owner");
  const user = owner && users.find((u) => u.id === owner.userId);
  return user ? fullName(user) : "";
}

/** Every project, with its owner's name and deletion date (ProjectLive.Index). */
export function adminProjectRows(): AdminProjectRow[] {
  return projects.map((p) => ({
    ...p,
    ownerName: projectOwnerName(p),
    scheduledDeletion: projectScheduledDeletions[p.id] ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Audit trail

const amy = users.find((u) => u.id === "user-amy")!;
const sizwe = users.find((u) => u.id === "user-sizwe")!;
const esther = users.find((u) => u.id === "user-esther")!;

function actor(user: User) {
  return { actorId: user.id, actorLabel: fullName(user), actorIdentifier: user.email };
}

const WORKFLOW_A = "4935cd15-2b6f-4d0e-9d6c-0a1f2e3b4c5d";
const WORKFLOW_B = "1f188a4a-7c3e-4a1b-8f2d-6e5d4c3b2a10";
const CREDENTIAL = "c7a9e2d4-5b6f-4c8a-9e1d-2f3a4b5c6d7e";

function snapshot(id: string, at: string, workflowId: string, user: User, snapshotId: string): AuditEvent {
  return {
    id,
    insertedAt: at,
    event: "snapshot_created",
    itemType: "workflow",
    itemId: workflowId,
    ...actor(user),
    changes: { before: null, after: { snapshot_id: snapshotId } },
  };
}

export const auditEvents: AuditEvent[] = [
  snapshot("audit-01", "2026-10-14T18:36:12Z", WORKFLOW_A, amy, "9779ec1f-abcf-4991-a963-1612d94132cc"),
  snapshot("audit-02", "2026-10-14T18:36:08Z", WORKFLOW_A, amy, "4727cd6e-cf96-489e-9977-38616fb4f7cb"),
  {
    id: "audit-03",
    insertedAt: "2026-10-14T17:02:44Z",
    event: "updated",
    itemType: "credential",
    itemId: CREDENTIAL,
    ...actor(esther),
    changes: { before: { name: "dhis2 play" }, after: { name: "DHIS2 play server" } },
    credentialBodies: {
      "body:main": "AQpBRVMuR0NNLlYxlG1Y0rJ2nqS8e5XGv3m2kUuA7k4dXxk1qWZp9t0=",
    },
  },
  {
    id: "audit-04",
    insertedAt: "2026-10-14T16:55:01Z",
    event: "added_to_project",
    itemType: "credential",
    itemId: CREDENTIAL,
    ...actor(esther),
    changes: { before: null, after: { project_id: projects[1]!.id } },
  },
  {
    id: "audit-05",
    insertedAt: "2026-10-14T16:54:30Z",
    event: "created",
    itemType: "credential",
    itemId: CREDENTIAL,
    ...actor(esther),
    changes: { before: null, after: null },
  },
  snapshot("audit-06", "2026-10-14T15:20:00Z", WORKFLOW_B, sizwe, "408b8521-d1ab-4af5-81b2-ed981bc38029"),
  snapshot("audit-07", "2026-10-14T15:18:41Z", WORKFLOW_B, sizwe, "3adb3075-65fc-442b-bac1-9e1ef5591264"),
  {
    id: "audit-08",
    insertedAt: "2026-10-14T11:03:19Z",
    event: "collaborator_role_changed",
    itemType: "project",
    itemId: projects[0]!.id,
    ...actor(amy),
    changes: { before: { role: "viewer" }, after: { role: "editor" } },
  },
  {
    id: "audit-09",
    insertedAt: "2026-10-13T09:47:10Z",
    event: "history_retention_period_updated",
    itemType: "project",
    itemId: projects[1]!.id,
    ...actor(esther),
    changes: { before: { history_retention_period: "90" }, after: { history_retention_period: "30" } },
  },
  {
    id: "audit-10",
    insertedAt: "2026-10-13T09:12:55Z",
    event: "updated",
    itemType: "user",
    itemId: "5be1c0d2-3f4a-4b6c-8d9e-0f1a2b3c4d5e",
    ...actor(sizwe),
    changes: { before: { last_name: "Vewer" }, after: { last_name: "Viewer" } },
  },
  snapshot("audit-11", "2026-10-12T14:30:02Z", WORKFLOW_A, amy, "41de325a-a01a-45bb-b8f6-b5701a406106"),
  {
    id: "audit-12",
    insertedAt: "2026-10-12T08:01:00Z",
    event: "token_refreshed",
    itemType: "credential",
    itemId: CREDENTIAL,
    actorId: "7d2c9b1e-0000-4000-8000-000000000000",
    actorLabel: "Lightning",
    actorIdentifier: null,
    changes: { before: null, after: null },
  },
  snapshot("audit-13", "2026-10-10T10:15:33Z", WORKFLOW_B, sizwe, "846cf691-7881-4f66-bd9e-de0872ff892c"),
  {
    id: "audit-14",
    insertedAt: "2026-10-09T13:40:00Z",
    event: "created",
    itemType: "user",
    itemId: "5be1c0d2-3f4a-4b6c-8d9e-0f1a2b3c4d5e",
    ...actor(sizwe),
    changes: {
      before: null,
      after: { email: "viewer@openfn.org", first_name: "Vikram", last_name: "Viewer", role: "user" },
    },
  },
];

/** Auditing.list_all page size. */
export const auditPageSize = 10;

// ---------------------------------------------------------------------------
// Authentication (OpenID Connect provider)

/** LightningWeb.Endpoint.struct_url(), the default redirect host. */
export const instanceUrl = "http://localhost:4000";

/** The configured provider; null means none is set up yet. */
export const authProvider: AuthProvider | null = {
  id: "auth-provider-google",
  name: "google",
  discoveryUrl: "https://accounts.google.com/.well-known/openid-configuration",
  clientId: "1081234567890-abc123def456.apps.googleusercontent.com",
  hasClientSecret: true,
  redirectHost: instanceUrl,
  allowUnverifiedEmail: false,
};

export const emptyAuthProvider: AuthProvider = {
  id: null,
  name: "",
  discoveryUrl: "",
  clientId: "",
  hasClientSecret: false,
  redirectHost: instanceUrl,
  allowUnverifiedEmail: false,
};

// ---------------------------------------------------------------------------
// Collections

/**
 * The instance's collections are the per-project ones from project-settings.ts
 * (the admin page lists every project's collections together).
 */

/** Every collection on the instance, with its project's name (CollectionLive.Index). */
export function adminCollectionRows(): AdminCollectionRow[] {
  return collections.map((c) => ({ ...c, projectName: projects.find((p) => p.id === c.projectId)?.name ?? "" }));
}

/** Project options for the collection form's select. */
export const collectionProjectOptions: [label: string, value: string][] = projects
  .map((p): [string, string] => [p.name, p.id])
  .sort((a, b) => a[0].localeCompare(b[0]));

// ---------------------------------------------------------------------------
// Phoenix LiveDashboard (static approximation of its home page)

export const liveDashboard: LiveDashboardData = {
  systemInfo:
    "Erlang/OTP 28 [erts-16.4] [source] [64-bit] [smp:4:4] [ds:4:4:10] [async-threads:1] [jit:ns] [x86_64-pc-linux-gnu]",
  versions: { elixir: "1.18.4", phoenix: "1.7.24", dashboard: "0.8.7" },
  uptime: "9m",
  totalInput: "3.0 MB",
  totalOutput: "3.9 MB",
  runQueues: { total: 1, cpu: 1, io: 0 },
  limits: [
    { label: "Atoms", used: 101185, limit: 1048576 },
    { label: "Ports", used: 40, limit: 65536 },
    { label: "Processes", used: 806, limit: 1048576 },
  ],
  memory: [
    { label: "Atoms", value: 3.1, color: "bg-[#4dc274]" },
    { label: "Binary", value: 13.8, color: "bg-[#5f8fd2]" },
    { label: "Code", value: 103.5, color: "bg-[#7d4fb0]" },
    { label: "ETS", value: 15.4, color: "bg-[#f8c42a]" },
    { label: "Processes", value: 44.9, color: "bg-[#f1774d]" },
    { label: "Other", value: 49.1, color: "bg-[#9a9aa3]" },
  ],
  tabs: [
    "Home",
    "OS Data",
    "Memory Allocators",
    "Metrics",
    "Request Logger",
    "Applications",
    "Processes",
    "Ports",
    "Sockets",
    "ETS",
    "Ecto Stats",
  ],
};
