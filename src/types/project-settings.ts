/** Project settings panels: collections, webhook auth, exports, GitHub sync. Types only: no data, no behaviour. */

import type { CredentialIndexData, KeychainCredentialRow } from "./credentials";
import type { CurrentProject, ProjectRole, RetentionPolicy } from "./projects";

export type WebhookAuthType = "basic" | "api";

export type ExportStatus = "enqueued" | "in_progress" | "completed" | "failed";

// ---------------------------------------------------------------------------
// The project settings page's contract (ProjectSettingsPageProps): one shape
// per tab, written by hand, so a tab's data can change without touching the
// others. Hosts send these; the replica maps its models onto them.

/** The sandbox's parent, for the banners and the "managed in the parent" links. */
export interface ParentProjectRef {
  name: string;
  /** The parent's settings page. */
  settingsHref: string;
}

/** The Setup tab: identity, concurrency, export and the danger zone. */
export interface SetupSettings {
  name: string;
  description: string;
  /** Project environment, shown read-only. */
  env: string;
  /** null runs workflows in parallel; 1 runs one at a time across the project. */
  concurrency: number | null;
  /** Why the plan doesn't allow changing it ("Not allowed on Free plans"), or null. The hosted plan supplies it. */
  concurrencyLimitMessage: string | null;
  /** "Export project": the project as YAML. */
  exportHref: string;
  /** "Delete project": the route that opens the deletion modal. */
  deleteHref: string;
  /** Days a deleted project (or sandbox) is kept before it's purged. */
  gracePeriodDays: number;
  /** When the project was scheduled for deletion, or null. Deleting a scheduled project deletes it at once. */
  scheduledDeletion: string | null;
  /** For a sandbox: where the user lands after deleting it, and how many child sandboxes go with it. */
  sandboxDeletion: { rootName: string; descendantCount: number } | null;
  canEditProject: boolean;
  canDeleteProject: boolean;
}

/** What Project Identity saves: the name as typed (the host derives the URL-safe name). */
export interface ProjectIdentityValues {
  rawName: string;
  description: string;
}

/** A collection in the Collections tab. */
export interface CollectionRow {
  id: string;
  name: string;
  /** Sum of the byte size of every item ("Used storage"). */
  byteSizeSum: number;
  /** "Download": every item as JSON. */
  downloadHref: string;
}

export interface CollectionsSettings {
  collections: CollectionRow[];
  /** Create, rename and delete (Lightning's `manage_collection`). */
  canManage: boolean;
}

/** A workflow trigger or channel an auth method protects, linked to where it's edited. */
export interface WebhookUsageRef {
  id: string;
  name: string;
  href: string;
}

export interface WebhookAuthMethodRow {
  id: string;
  name: string;
  authType: WebhookAuthType;
  /** Basic auth's username; null for an API key. */
  username: string | null;
  /** The password or API key as Lightning masks it, until the user re-authenticates to see it. */
  maskedSecret: string;
  triggers: WebhookUsageRef[];
  channels: WebhookUsageRef[];
}

export interface WebhookSecuritySettings {
  authMethods: WebhookAuthMethodRow[];
  canWrite: boolean;
}

/**
 * What the auth method form saves. An API key method sends no key: the host
 * keeps the one it handed out from `onGenerateApiKey`, as Lightning never
 * takes the key from the browser.
 */
export type WebhookAuthMethodValues =
  | { authType: "basic"; name: string; username: string; password: string }
  | { authType: "api"; name: string };

/** What re-authenticating before a secret is shown sends: the password, or a 2FA code. */
export interface ReauthValues {
  password: string;
  code: string;
}

export type Digest = "never" | "daily" | "weekly" | "monthly";

/** A project member in the Collaboration tab. */
export interface CollaboratorRow {
  /** The project user's id, which the actions name. */
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ProjectRole;
  failureAlert: boolean;
  digest: Digest;
  /** The viewer's own row: "Well hello, you!", and the only row whose alerts they can change. */
  isCurrentUser: boolean;
  /** Why this member can't be removed ("You cannot remove an owner"), or null when they can. */
  removeBlockedReason: string | null;
  /** Credentials this member owns in the project, named in the removal confirmation; null when the host can't say which, and the confirmation warns without naming them. */
  ownedCredentialNames: string[] | null;
}

export interface CollaborationSettings {
  collaborators: CollaboratorRow[];
  supportAccess: boolean;
  canEditProject: boolean;
  canAddProjectUser: boolean;
  /** Why no one else can be added (the plan's collaborator limit), or null. */
  addBlockedReason: string | null;
  /** Whether the plan sends failure alerts at all; "Unavailable" when not. */
  canReceiveFailureAlerts: boolean;
}

/** One row of "Add collaborators". */
export interface CollaboratorValues {
  email: string;
  role: ProjectRole;
}

/** One row of "Invite new users". */
export interface InviteValues extends CollaboratorValues {
  firstName: string;
  lastName: string;
}

/** The host's answer to "Add collaborators": the emails with no OpenFn account, to invite next. */
export interface AddCollaboratorsResult {
  toInvite: CollaboratorValues[];
}

export interface SecuritySettings {
  requiresMfa: boolean;
  canEditProject: boolean;
  /** The plan allows requiring MFA (Lightning's `limit_mfa`). */
  canRequireMfa: boolean;
}

/** A connected repository, as the Sync to GitHub tab lists it. */
export interface GithubRepoConnection {
  repo: string;
  branch: string;
  githubInstallationId: string;
  configPath: string;
  /** true = "v2 (new)", false = "v1 (legacy)". */
  syncVersion: boolean;
}

export interface GithubSyncSettings {
  /** Whether GitHub sync is configured on this Lightning instance. */
  enabled: boolean;
  connection: GithubRepoConnection | null;
  /** Whether the viewer has linked their OpenFn account to GitHub. */
  userConnected: boolean;
  /** Starts linking the viewer's account (GitHub's OAuth page). */
  connectAccountHref: string;
  canInstall: boolean;
  canInitiateSync: boolean;
}

/** The Data Storage tab's form: what it shows and what it saves. */
export interface DataStorageValues {
  historyRetentionPeriod: number | null;
  dataclipRetentionPeriod: number | null;
  retentionPolicy: RetentionPolicy;
}

export interface DataStorageSettings extends DataStorageValues {
  /** Allowed periods in days (the plan can narrow these). */
  periods: number[];
  /** What the plan's retention limit allows, shown by the history period ("Upgrade for longer retention"), or null. */
  limitMessage: string | null;
  canEdit: boolean;
}

/** A history export in the History Exports tab. */
export interface HistoryExportRow {
  id: string;
  insertedAt: string;
  /** null until the export finishes. */
  fileName: string | null;
  /** The full name of who asked for it. */
  requestedBy: string;
  status: ExportStatus;
  /** null until the export completes. */
  downloadHref: string | null;
}

/** The Credentials tab: the shared credential index, plus the project's keychain credentials. */
export interface CredentialsSettings extends CredentialIndexData {
  keychainCredentials: KeychainCredentialRow[];
  canCreateProjectCredential: boolean;
  canCreateKeychainCredential: boolean;
  canEditKeychainCredential: boolean;
}

/** What the host sends the project settings page, one field per tab (ProjectSettingsPageProps adds the picker label, the deletion modal and the actions). */
export interface ProjectSettingsPageData {
  project: CurrentProject;
  /** A sandbox's parent; null for a top-level project. */
  parent: ParentProjectRef | null;
  setup: SetupSettings;
  credentials: CredentialsSettings;
  collections: CollectionsSettings;
  webhookSecurity: WebhookSecuritySettings;
  collaboration: CollaborationSettings;
  security: SecuritySettings;
  githubSync: GithubSyncSettings;
  dataStorage: DataStorageSettings;
  historyExports: HistoryExportRow[];
}
