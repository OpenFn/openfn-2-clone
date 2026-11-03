/**
 * Fixtures for project settings (live/project_live/settings.ex): the
 * per-project values the shared projects.ts doesn't carry, plus the lists
 * each settings panel shows (collections, webhook auth methods, history
 * exports, the GitHub connection). Static only: nothing here talks to a
 * backend.
 */

import { credentialIndexDataFor, credentials, credentialsFixture, keychainRowsFor, type CredentialsFixture } from "./credentials";
import { findProject, projects } from "./projects";
import { findUser } from "./users";
import { permissionsFor } from "../permissions";
import type { CollaboratorRow, GithubRepoConnection, ProjectSettingsPageData, WebhookAuthMethodRow } from "../types/project-settings";
import type { Collection, ProjectFile, ProjectSettings, VcsFixture, WebhookAuthMethod } from "./models/project-settings";
import type { Project, ProjectMember } from "../types/projects";
import type { User } from "../types/users";
import { fullName } from "../utils/format";

const OPENHIE = "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa";
const DHIS2 = "1f0b7c2e-9d3a-4a4b-8f5e-2c6d7e8f9a01";

/** Options for both retention selects (Project.data_retention_options/0). */
export const dataRetentionPeriods = [7, 14, 30, 90, 180, 365];

// ---------------------------------------------------------------------------
// Project-level settings

const settingsByProject: Record<string, ProjectSettings> = {
  [OPENHIE]: { env: "main", allowSupportAccess: false },
  [DHIS2]: { env: "main", allowSupportAccess: true },
};

export function projectSettingsFor(projectId: string): ProjectSettings {
  return settingsByProject[projectId] ?? { env: "main", allowSupportAccess: false };
}

// ---------------------------------------------------------------------------
// Collections (#collections)

export const collections: Collection[] = [
  {
    id: "col-patients",
    projectId: OPENHIE,
    name: "patient-registrations",
    byteSizeSum: 2_457_600,
    previewJson: JSON.stringify(
      { key: "patient-00042", value: { given: "Amina", family: "Okafor", facility: "FAC-118", registered: "2026-10-12" } },
      null,
      2
    ),
  },
  {
    id: "col-facilities",
    projectId: OPENHIE,
    name: "facility-lookup",
    byteSizeSum: 48_230,
    previewJson: JSON.stringify({ key: "FAC-118", value: { name: "Kibera Health Centre", district: "Nairobi" } }, null, 2),
  },
  {
    id: "col-cursor",
    projectId: OPENHIE,
    name: "sync-cursors",
    byteSizeSum: 0,
    previewJson: null,
  },
];

export function collectionsIn(projectId: string): Collection[] {
  return collections.filter((c) => c.projectId === projectId);
}

// ---------------------------------------------------------------------------
// Webhook auth methods (#webhook_security)

export const webhookAuthMethods: WebhookAuthMethod[] = [
  {
    id: "wam-commcare",
    projectId: OPENHIE,
    name: "CommCare forwarder",
    authType: "basic",
    username: "commcare",
    password: "fixture-password",
    triggers: [{ workflowId: "wf-openhie", workflowName: "OpenHIE Workflow", triggerId: "trg-openhie" }],
    channels: [],
  },
  {
    id: "wam-partner-api",
    projectId: OPENHIE,
    name: "Partner API key",
    authType: "api",
    apiKey: "fixture0000000000000000000000000000key01",
    triggers: [],
    channels: [{ id: "5c3e9a1d-7b2f-4e8a-9c6d-1f0e2d3c4b5a", name: "SHR proxy" }],
  },
  {
    id: "wam-unused",
    projectId: OPENHIE,
    name: "Legacy basic auth",
    authType: "basic",
    username: "legacy",
    password: "fixture-password",
    triggers: [],
    channels: [],
  },
];

export function webhookAuthMethodsIn(projectId: string): WebhookAuthMethod[] {
  return webhookAuthMethods.filter((m) => m.projectId === projectId);
}

// ---------------------------------------------------------------------------
// History exports (#history-exports)

export const projectFiles: ProjectFile[] = [
  {
    id: "pf-3",
    projectId: OPENHIE,
    insertedAt: "2026-10-14T08:55:00Z",
    path: null,
    createdByUserId: "user-amy",
    status: "in_progress",
  },
  {
    id: "pf-2",
    projectId: OPENHIE,
    insertedAt: "2026-10-09T13:20:00Z",
    path: "exports/openhie-project/history-2026-10-09T13-20.zip",
    createdByUserId: "user-esther",
    status: "completed",
  },
  {
    id: "pf-1",
    projectId: OPENHIE,
    insertedAt: "2026-09-30T07:02:00Z",
    path: "exports/openhie-project/history-2026-09-30T07-02.zip",
    createdByUserId: "user-amy",
    status: "completed",
  },
];

export function projectFilesIn(projectId: string): ProjectFile[] {
  return projectFiles.filter((f) => f.projectId === projectId);
}

// ---------------------------------------------------------------------------
// Sync to GitHub (#vcs)

/**
 * Fixture flag: openhie-project shows Lightning's demo state ("Version
 * Control is not configured for this Lightning instance"); dhis2-project
 * shows a connected repo (github_sync_component.html.heex `:show`).
 */
const vcsByProject: Record<string, VcsFixture> = {
  [OPENHIE]: { githubEnabled: false, connection: null },
  [DHIS2]: {
    githubEnabled: true,
    connection: {
      repo: "openfn/dhis2-reporting",
      branch: "main",
      githubInstallationId: "41872203",
      configPath: "./openfn-1f0b7c2e-9d3a-4a4b-8f5e-2c6d7e8f9a01-config.json",
      syncVersion: true,
    },
  },
};

export function vcsFor(projectId: string): VcsFixture {
  return vcsByProject[projectId] ?? { githubEnabled: false, connection: null };
}

/** Days before a deleted project is purged (Lightning.Config.purge_deleted_after_days). */
export const purgeDeletedAfterDays = 7;

// ---------------------------------------------------------------------------
// The page's props, from the fixtures

/** What the replica holds for one project, as the server would: the parts the settings page changes. */
export interface SettingsFixture {
  project: Project;
  supportAccess: boolean;
  collections: Collection[];
  authMethods: WebhookAuthMethod[];
  connection: GithubRepoConnection | null;
  credentials: CredentialsFixture;
}

export function settingsFixtureFor(project: Project): SettingsFixture {
  return {
    project,
    supportAccess: projectSettingsFor(project.id).allowSupportAccess,
    collections: collectionsIn(project.id),
    authMethods: webhookAuthMethodsIn(project.id),
    connection: vcsFor(project.id).connection,
    credentials: credentialsFixture(),
  };
}

/** A new API key, as WebhookAuthMethods.build makes one. */
export function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

// webhook_auth_method_form_component.ex `mask_password` / `mask_api_key`.
const maskPassword = (v = "") => "*".repeat(v.length);
const maskApiKey = (v = "") => "*".repeat(Math.min(15, Math.max(0, v.length - 5))) + v.slice(-5);

function authMethodRow(projectId: string, m: WebhookAuthMethod): WebhookAuthMethodRow {
  return {
    id: m.id,
    name: m.name,
    authType: m.authType,
    username: m.username ?? null,
    maskedSecret: m.authType === "basic" ? maskPassword(m.password) : maskApiKey(m.apiKey),
    triggers: m.triggers.map((t) => ({ id: t.triggerId, name: t.workflowName, href: `/projects/${projectId}/w/${t.workflowId}?s=${t.triggerId}` })),
    channels: m.channels.map((c) => ({ id: c.id, name: c.name, href: `/projects/${projectId}/channels/${c.id}/edit` })),
  };
}

/** settings.ex `remove_user_tooltip/5`: why a member can't be removed, or null. */
function removeBlockedReason(member: ProjectMember, viewer: User, canRemove: boolean, parent: Project | undefined): string | null {
  if (!canRemove) return "You do not have permission to remove a user";
  if (member.userId === viewer.id) return "You cannot remove yourself";
  if (member.role === "owner") return "You cannot remove an owner";
  const parentRole = parent?.members.find((m) => m.userId === member.userId)?.role;
  if (parentRole === "owner" || parentRole === "admin") return "Cannot remove a user who is admin or owner on the parent project";
  return null;
}

function collaboratorRow(project: Project, member: ProjectMember, viewer: User, canRemove: boolean): CollaboratorRow {
  const user = findUser(member.userId);
  return {
    id: member.userId,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? member.userId,
    email: user?.email ?? "",
    role: member.role,
    failureAlert: member.failureAlert,
    digest: member.digest,
    isCurrentUser: member.userId === viewer.id,
    removeBlockedReason: removeBlockedReason(member, viewer, canRemove, findProject(project.parentId ?? undefined)),
    ownedCredentialNames: credentials
      .filter((c) => c.ownerId === member.userId && c.projectIds.includes(project.id))
      .map((c) => c.name),
  };
}

/** The top of a sandbox's tree, where Lightning sends the user after deleting it. */
export function rootOf(project: Project): Project {
  const parent = findProject(project.parentId ?? undefined);
  return parent ? rootOf(parent) : project;
}

function descendantCount(projectId: string): number {
  return projects.filter((p) => p.parentId === projectId).reduce((n, p) => n + 1 + descendantCount(p.id), 0);
}

/** Everything ProjectSettingsPage shows, as Lightning's settings.ex would send it. */
export function projectSettingsPropsFor(
  { project, supportAccess, collections, authMethods, connection, credentials: credentialLists }: SettingsFixture,
  viewer: User
): ProjectSettingsPageData {
  const perms = permissionsFor(project, viewer);
  const parent = findProject(project.parentId ?? undefined);
  const settingsHref = `/projects/${project.id}/settings`;
  return {
    project: { id: project.id, parentId: project.parentId, color: project.color },
    parent: parent ? { name: parent.name, settingsHref: `/projects/${parent.id}/settings` } : null,
    setup: {
      name: project.name,
      description: project.description,
      env: projectSettingsFor(project.id).env,
      concurrency: project.concurrency,
      concurrencyLimitMessage: null,
      exportHref: `/download/yaml?id=${project.id}`,
      deleteHref: `${settingsHref}/delete`,
      gracePeriodDays: purgeDeletedAfterDays,
      scheduledDeletion: null,
      sandboxDeletion: parent ? { rootName: rootOf(project).name, descendantCount: descendantCount(project.id) } : null,
      canEditProject: perms.canEditProject,
      canDeleteProject: perms.canDeleteProject,
    },
    credentials: {
      ...credentialIndexDataFor(credentialLists, project, viewer),
      keychainCredentials: keychainRowsFor(credentialLists, project),
      canCreateProjectCredential: perms.canCreateProjectCredential,
      canCreateKeychainCredential: perms.canCreateKeychainCredential,
      canEditKeychainCredential: perms.canEditKeychainCredential,
      canCreateGlobalOauthClient: perms.canCreateGlobalOauthClient,
    },
    collections: {
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        byteSizeSum: c.byteSizeSum,
        downloadHref: `/download/collections/${project.id}/${c.name}`,
      })),
      canManage: perms.canCreateCollection,
    },
    webhookSecurity: {
      authMethods: authMethods.map((m) => authMethodRow(project.id, m)),
      canWrite: perms.canWriteWebhookAuthMethod,
    },
    collaboration: {
      collaborators: project.members.map((m) => collaboratorRow(project, m, viewer, perms.canRemoveProjectUser)),
      supportAccess,
      canEditProject: perms.canEditProject,
      canAddProjectUser: perms.canAddProjectUser,
      addBlockedReason: null,
      canReceiveFailureAlerts: true,
    },
    security: {
      requiresMfa: project.requiresMfa,
      canEditProject: perms.canEditProject,
      canRequireMfa: perms.canRequireMfa,
    },
    githubSync: {
      enabled: vcsFor(project.id).githubEnabled,
      connection,
      userConnected: viewer.githubConnected,
      connectAccountHref: "https://github.com/login/oauth/authorize",
      canInstall: perms.canInstallGithub,
      canInitiateSync: perms.canInitiateGithubSync,
    },
    dataStorage: {
      historyRetentionPeriod: project.historyRetentionPeriod,
      dataclipRetentionPeriod: project.dataclipRetentionPeriod,
      retentionPolicy: project.retentionPolicy,
      periods: dataRetentionPeriods,
      limitMessage: null,
      canEdit: perms.canEditDataRetention,
    },
    historyExports: projectFilesIn(project.id).map((f) => {
      const user = findUser(f.createdByUserId);
      return {
        id: f.id,
        insertedAt: f.insertedAt,
        fileName: f.path ? (f.path.split("/").pop() ?? f.path) : null,
        requestedBy: user ? fullName(user) : "",
        status: f.status,
        downloadHref: f.status === "completed" ? `/project_files/${f.id}/download` : null,
      };
    }),
  };
}
