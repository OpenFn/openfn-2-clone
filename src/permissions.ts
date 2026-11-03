/**
 * What a user may do, as one flat set of booleans. Pages call
 * `permissionsFor(project, user)` (or `usePermissions(project)`) once and pass
 * the booleans they need down to components, the way Lightning's views assign
 * `can_*` flags at mount and hand them to their components.
 *
 * The rules mirror Lightning's policies:
 * - Lightning.Policies.ProjectUsers (lib/lightning/policies/project_users.ex):
 *   admin actions need owner or admin, editor actions owner, admin or editor,
 *   `:delete_project` owner only.
 * - Lightning.Policies.Credentials: keychain credentials need owner or admin.
 * - Lightning.Policies.Collections `:manage_collection`: owner or admin.
 * - Lightning.Policies.Sandboxes `:provision_sandbox`: owner, admin or editor.
 * - Lightning.Policies.Users: a credential or OAuth client is edited by its owner.
 *
 * Not modelled: support users (no fixture user has `support_user`) and the
 * project MFA requirement (no fixture project sets it), which Lightning also
 * folds into these answers.
 */
import type { ProjectRole } from "./types/projects";
import type { Project } from "./types/projects";
import type { User } from "./types/users";

export interface Permissions {
  // Instance (the user's own role).
  /** Superusers get the Admin menu and /settings/*. */
  canAccessAdmin: boolean;
  /** Superusers may make an OAuth client global (`OauthClientFormModal`). */
  canCreateGlobalOauthClient: boolean;

  // ProjectUsers: any role.
  canAccessProject: boolean;
  canEditFailureAlerts: boolean;
  canEditDigestAlerts: boolean;
  // ProjectUsers: owner only.
  canDeleteProject: boolean;
  // ProjectUsers admin actions.
  canEditProject: boolean;
  canEditDataRetention: boolean;
  canEditRunSettings: boolean;
  canAddProjectUser: boolean;
  canRemoveProjectUser: boolean;
  canWriteWebhookAuthMethod: boolean;
  /** `:write_github_connection` (settings.ex assigns it as `can_install_github`). */
  canInstallGithub: boolean;
  // ProjectUsers editor actions.
  canCreateWorkflow: boolean;
  canEditWorkflow: boolean;
  canDeleteWorkflow: boolean;
  canRunWorkflow: boolean;
  canCreateProjectCredential: boolean;
  canInitiateGithubSync: boolean;
  canCreateChannel: boolean;
  /** `:update_channel` (channel_live/index.ex assigns it as `can_edit_channel`). */
  canEditChannel: boolean;
  canDeleteChannel: boolean;

  // Credentials policy.
  canCreateKeychainCredential: boolean;
  canEditKeychainCredential: boolean;
  // Collections policy.
  /** `:manage_collection` (settings.ex assigns it as `can_create_collection`). */
  canCreateCollection: boolean;
  // Sandboxes policy.
  /** `:provision_sandbox` (sandbox_live/index.ex assigns it as `can_create_sandbox`). */
  canCreateSandbox: boolean;

  /**
   * Whether the "Require MFA" switch is interactive. In Lightning this is the
   * usage limiter's answer, not a role check; the replica gates it on owner,
   * which is what the demo has always shown.
   */
  canRequireMfa: boolean;
}

/** The user's role in a project, if they're a member. */
export function roleIn(project: Project, userId: string): ProjectRole | undefined {
  return project.members.find((m) => m.userId === userId)?.role;
}

/** Everything `user` may do, in `project` when there is one. */
export function permissionsFor(project: Project | undefined, user: User): Permissions {
  const role = project && roleIn(project, user.id);
  const member = role !== undefined;
  const owner = role === "owner";
  const admin = owner || role === "admin";
  const editor = admin || role === "editor";
  const superuser = user.role === "superuser";

  return {
    canAccessAdmin: superuser,
    canCreateGlobalOauthClient: superuser,

    canAccessProject: member,
    canEditFailureAlerts: member,
    canEditDigestAlerts: member,
    canDeleteProject: owner,

    canEditProject: admin,
    canEditDataRetention: admin,
    canEditRunSettings: admin,
    canAddProjectUser: admin,
    canRemoveProjectUser: admin,
    canWriteWebhookAuthMethod: admin,
    canInstallGithub: admin,

    canCreateWorkflow: editor,
    canEditWorkflow: editor,
    canDeleteWorkflow: editor,
    canRunWorkflow: editor,
    canCreateProjectCredential: editor,
    canInitiateGithubSync: editor,
    canCreateChannel: editor,
    canEditChannel: editor,
    canDeleteChannel: editor,

    canCreateKeychainCredential: admin,
    canEditKeychainCredential: admin,
    canCreateCollection: admin,
    canCreateSandbox: editor,
    canRequireMfa: owner,
  };
}

/** Lightning.Policies.Users `:edit_credential` / `:delete_credential`: only the owner. */
export function canEditCredential(record: { ownerId: string }, user: Pick<User, "id">): boolean {
  return record.ownerId === user.id;
}
