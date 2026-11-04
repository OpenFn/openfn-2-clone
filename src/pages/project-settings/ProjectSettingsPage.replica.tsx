import { useState } from "react";
import { useDocumentTitle } from "../../utils/useDocumentTitle";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCollectionSaves, useProjectCollections } from "../../api/collections";
import { settingsProject, useApiProject, useProjectMemberSaves, useProjectMembers } from "../../api/projects";
import { useProjectWebhookAuthMethods, useWebhookAuthMethodSaves } from "../../api/webhookAuthMethods";
import { useToast } from "../../components/primitives/Toast";
import { projectLabel } from "../../components/shell/projectPickerItems";
import { projectSettingsPropsFor, rootOf, settingsFixtureFor, type SettingsFixture } from "../../mock-data/project-settings";
import { findProject, projects } from "../../mock-data/projects";
import { simulateRequest } from "../../mock-data/request";
import { permissionsForRole } from "../../permissions";
import type { Project } from "../../types/projects";
import { useCurrentUser } from "../../session/session";
import { RequestError } from "../../utils/errors";
import { urlSafeName } from "../../utils/format";
import { credentialReplicaActions } from "../profile/credentialsReplica";
import ProjectSettingsPage from "./ProjectSettingsPage";

/** new_collaborator_component.ex `generate_flash_message`: existing accounts are added, the rest are invited. */
function addedMessage(existing: number, unknown: number) {
  if (unknown === 0) return `Collaborator${existing === 1 ? "" : "s"} added successfully`;
  if (existing === 0) {
    return unknown === 1
      ? "This collaborator does not have an OpenFn account. Invite them to join OpenFn and grant access to the project."
      : "These collaborators do not have OpenFn accounts. Invite them to join OpenFn and grant them access to the project.";
  }
  const total = existing + unknown;
  return `${existing} out of ${total} collaborator${total === 1 ? "" : "s"} have OpenFn accounts and have been added to your project. You can invite others to join OpenFn and grant them access to this project.`;
}

/**
 * The replica's side of ProjectSettingsPage: one project's settings held in
 * state as the server would, the deletion route, and the success toasts
 * (Lightning's flashes) and navigation. The collaborators come from
 * Lightning's API (or its stand-in), and so does who may add and remove them;
 * so do the collections and the webhook auth methods, and who may manage
 * them. Everything else stays on the fixture until the API serves it.
 * Lightning replaces this file with a LiveView wrapper.
 */
export default function ProjectSettingsPageReplica() {
  useDocumentTitle("Project settings");
  const { projectId = "" } = useParams();
  const apiProject = useApiProject(projectId);
  // The fixtures' ids aren't always Lightning's, so the rest of the project is also found by its name on the API;
  // a project no fixture holds opens with what the API gives, and its other tabs empty.
  const project =
    findProject(projectId) ??
    projects.find((p) => p.name === apiProject?.attributes.name) ??
    (apiProject ? settingsProject(apiProject) : undefined);
  if (!project) return apiProject === undefined ? null : <Navigate to="/projects" replace />;
  // Keyed so another project starts from its own fixtures.
  return <Replica key={project.id} project={project} apiProjectId={projectId} />;
}

/** `apiProjectId` is the project's id on the API, which the members, collections and webhook auth methods are read and saved under. */
function Replica({ project: initial, apiProjectId }: { project: Project; apiProjectId: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const viewer = useCurrentUser();
  const [fixture, setFixture] = useState<SettingsFixture>(() => settingsFixtureFor(initial));
  const { project } = fixture;
  const settingsPath = `/projects/${project.id}/settings`;
  const props = projectSettingsPropsFor(fixture, viewer);
  // Who may add and remove collaborators comes from the viewer's role in the API's members, as the members do.
  const members = useProjectMembers(apiProjectId, (role) => permissionsForRole(role, viewer).canRemoveProjectUser);
  const memberSaves = useProjectMemberSaves(apiProjectId);
  const asMember = permissionsForRole(members.viewerRole, viewer);
  const collections = useProjectCollections(apiProjectId);
  const collectionSaves = useCollectionSaves(apiProjectId);
  const authMethods = useProjectWebhookAuthMethods(apiProjectId);
  const authMethodSaves = useWebhookAuthMethodSaves(apiProjectId);

  // Every change applies to the latest state, so two quick edits don't overwrite each other.
  const update = (change: (f: SettingsFixture) => Partial<SettingsFixture>) => setFixture((f) => ({ ...f, ...change(f) }));
  const patchProject = (changes: Partial<Project>) => update((f) => ({ project: { ...f.project, ...changes } }));
  const updateProject = async (changes: Partial<Project>) => {
    await simulateRequest();
    patchProject(changes);
    toast("Project updated successfully");
  };
  const updateCredentials = (change: (c: SettingsFixture["credentials"]) => Partial<SettingsFixture["credentials"]>) =>
    update((f) => ({ credentials: { ...f.credentials, ...change(f.credentials) } }));

  return (
    <ProjectSettingsPage
      {...props}
      collaboration={{
        ...props.collaboration,
        collaborators: members.collaborators,
        canAddProjectUser: asMember.canAddProjectUser,
        canEditProject: asMember.canEditProject,
      }}
      collaborationStatus={members.status}
      collections={{ collections: collections.collections, canManage: permissionsForRole(collections.viewerRole, viewer).canCreateCollection }}
      collectionsStatus={collections.status}
      webhookSecurity={{ authMethods: authMethods.authMethods, canWrite: permissionsForRole(authMethods.viewerRole, viewer).canWriteWebhookAuthMethod }}
      webhookSecurityStatus={authMethods.status}
      projectLabel={projectLabel(project, projects)}
      deleting={pathname.endsWith("/settings/delete")}
      onSaveIdentity={({ rawName, description }) => updateProject({ name: urlSafeName(rawName), description })}
      onSaveConcurrency={(concurrency) => updateProject({ concurrency })}
      onDeleteProject={async (nameConfirmation) => {
        await simulateRequest();
        // Lightning checks the typed name again on the server (project_deletion_modal.ex, settings.ex).
        if (nameConfirmation !== project.name) {
          throw new RequestError(project.parentId ? "does not match the sandbox name" : "doesn't match the project name");
        }
        if (project.parentId) {
          toast(`Sandbox ${project.name} and all its associated descendants deleted`);
          navigate(`/projects/${rootOf(project).id}/w`);
        } else {
          toast("Project scheduled for deletion");
          navigate("/projects");
        }
      }}
      onCloseDelete={() => navigate(settingsPath)}
      onCreateCollection={async (rawName) => {
        await collectionSaves.onCreateCollection(rawName);
        toast("Collection created");
      }}
      onRenameCollection={async (id, rawName) => {
        await collectionSaves.onRenameCollection(id, rawName);
        toast("Collection updated");
      }}
      onDeleteCollection={async (id) => {
        await collectionSaves.onDeleteCollection(id);
        toast("Collection deleted");
      }}
      onPreviewCollection={collectionSaves.onPreviewCollection}
      onCreateWebhookAuthMethod={async (values) => {
        await authMethodSaves.onCreateWebhookAuthMethod(values);
        toast("Webhook auth method created successfully");
      }}
      onRenameWebhookAuthMethod={async (id, name) => {
        await authMethodSaves.onRenameWebhookAuthMethod(id, name);
        toast("Webhook auth method updated successfully");
      }}
      onDeleteWebhookAuthMethod={async (id) => {
        await authMethodSaves.onDeleteWebhookAuthMethod(id);
        toast("Your Webhook Authentication method has been deleted.");
      }}
      onGenerateApiKey={authMethodSaves.onGenerateApiKey}
      onRevealWebhookSecret={authMethodSaves.onRevealWebhookSecret}
      onAddCollaborators={async (values) => {
        const result = await memberSaves.onAddCollaborators(values);
        toast(addedMessage(values.length - result.toInvite.length, result.toInvite.length));
        return result;
      }}
      onInviteCollaborators={async (values) => {
        await memberSaves.onInviteCollaborators(values);
        toast(`Invite${values.length > 1 ? "s" : ""} sent successfully`);
      }}
      onRemoveCollaborator={async (id) => {
        await memberSaves.onRemoveCollaborator(id);
        toast("Collaborator removed");
      }}
      onSetSupportAccess={async (on) => {
        await simulateRequest();
        update(() => ({ supportAccess: on }));
        toast(on ? "Granted access to support users successfully" : "Revoked access to support users successfully");
      }}
      onSetFailureAlert={async (id, on) => {
        await memberSaves.onSetFailureAlert(id, on);
        // Lightning's own spelling (project_live/settings.ex).
        toast("Project user updated successfuly");
      }}
      onSetDigest={async (id, digest) => {
        await memberSaves.onSetDigest(id, digest);
        toast("Project user updated successfuly");
      }}
      onSetRequiresMfa={async (requiresMfa) => {
        await simulateRequest();
        patchProject({ requiresMfa });
        toast("Project MFA requirement updated successfully");
      }}
      onInitiateGithubSync={async () => {
        await simulateRequest();
        toast("GitHub sync initiated");
      }}
      onRemoveGithubConnection={async () => {
        await simulateRequest();
        update(() => ({ connection: null }));
        toast("Connection removed successfully");
      }}
      onSaveDataStorage={(values) => updateProject(values)}
      {...credentialReplicaActions(fixture.credentials, updateCredentials, viewer, toast, project)}
    />
  );
}
