import { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useProjectMemberSaves, useProjectMembers, useProjectName } from "../../api/projects";
import { useToast } from "../../components/primitives/Toast";
import { projectLabel } from "../../components/shell/projectPickerItems";
import { generateApiKey, projectSettingsPropsFor, rootOf, settingsFixtureFor, type SettingsFixture } from "../../mock-data/project-settings";
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
 * everything else stays on the fixture until the API serves it. Lightning
 * replaces this file with a LiveView wrapper.
 */
export default function ProjectSettingsPageReplica() {
  const { projectId = "" } = useParams();
  const apiName = useProjectName(projectId);
  // The fixtures' ids aren't always Lightning's, so the rest of the project is also found by its name on the API.
  const project = findProject(projectId) ?? projects.find((p) => apiName && p.name === apiName);
  if (!project) return apiName === undefined ? null : <Navigate to="/projects" replace />;
  // Keyed so another project starts from its own fixtures.
  return <Replica key={project.id} project={project} apiProjectId={projectId} />;
}

/** `apiProjectId` is the project's id on the API, which the members are read and saved under. */
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

  // The key onGenerateApiKey last handed out, kept here as Lightning keeps it on the server.
  const apiKey = useRef("");

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
        await simulateRequest();
        update((f) => ({
          collections: [...f.collections, { id: `col-${Date.now()}`, projectId: project.id, name: urlSafeName(rawName), byteSizeSum: 0, previewJson: null }],
        }));
        toast("Collection created");
      }}
      onRenameCollection={async (id, rawName) => {
        await simulateRequest();
        update((f) => ({ collections: f.collections.map((c) => (c.id === id ? { ...c, name: urlSafeName(rawName) } : c)) }));
        toast("Collection updated");
      }}
      onDeleteCollection={async (id) => {
        await simulateRequest();
        update((f) => ({ collections: f.collections.filter((c) => c.id !== id) }));
        toast("Collection deleted");
      }}
      onPreviewCollection={(id) => simulateRequest(fixture.collections.find((c) => c.id === id)?.previewJson ?? null)}
      onCreateWebhookAuthMethod={async (values) => {
        await simulateRequest();
        const secret = values.authType === "api" ? { apiKey: apiKey.current } : {};
        update((f) => ({
          authMethods: [...f.authMethods, { ...values, ...secret, id: `wam-${Date.now()}`, projectId: project.id, triggers: [], channels: [] }],
        }));
        toast("Webhook auth method created successfully");
      }}
      onRenameWebhookAuthMethod={async (id, name) => {
        await simulateRequest();
        update((f) => ({ authMethods: f.authMethods.map((m) => (m.id === id ? { ...m, name } : m)) }));
        toast("Webhook auth method updated successfully");
      }}
      onDeleteWebhookAuthMethod={async (id) => {
        await simulateRequest();
        update((f) => ({ authMethods: f.authMethods.filter((m) => m.id !== id) }));
        toast("Your Webhook Authentication method has been deleted.");
      }}
      onGenerateApiKey={async () => {
        apiKey.current = await simulateRequest(generateApiKey());
        return apiKey.current;
      }}
      onRevealWebhookSecret={async (id, { password, code }) => {
        await simulateRequest();
        // Any password or code passes here; Lightning checks them against the user's.
        if (!password && !code) throw new RequestError("Invalid! Please try again");
        const method = fixture.authMethods.find((m) => m.id === id);
        return (method?.authType === "basic" ? method.password : method?.apiKey) ?? "";
      }}
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
