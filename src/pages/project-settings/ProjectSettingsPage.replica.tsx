import { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/primitives/Toast";
import { projectLabel } from "../../components/shell/projectPickerItems";
import {
  generateApiKey,
  projectSettingsPropsFor,
  rootOf,
  settingsFixtureFor,
  type SettingsFixture,
} from "../../mock-data/project-settings";
import { findProject, projects } from "../../mock-data/projects";
import { simulateRequest } from "../../mock-data/request";
import { users } from "../../mock-data/users";
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
 * (Lightning's flashes) and navigation. Lightning replaces this file with a
 * LiveView wrapper.
 */
export default function ProjectSettingsPageReplica() {
  const { projectId } = useParams();
  const project = findProject(projectId);
  if (!project) return <Navigate to="/projects" replace />;
  // Keyed so another project starts from its own fixtures.
  return <Replica key={project.id} project={project} />;
}

function Replica({ project: initial }: { project: Project }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const viewer = useCurrentUser();
  const [fixture, setFixture] = useState<SettingsFixture>(() => settingsFixtureFor(initial));
  const { project } = fixture;
  const settingsPath = `/projects/${project.id}/settings`;

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
  const updateMember = async (id: string, changes: Partial<Project["members"][number]>) => {
    await simulateRequest();
    update((f) => ({ project: { ...f.project, members: f.project.members.map((m) => (m.userId === id ? { ...m, ...changes } : m)) } }));
    // Lightning's own spelling (project_live/settings.ex).
    toast("Project user updated successfuly");
  };

  return (
    <ProjectSettingsPage
      {...projectSettingsPropsFor(fixture, viewer)}
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
        await simulateRequest();
        const known = values.flatMap((v) => {
          const user = users.find((u) => u.email.toLowerCase() === v.email.toLowerCase());
          return user ? [{ userId: user.id, role: v.role, failureAlert: true, digest: "weekly" as const }] : [];
        });
        const toInvite = values.filter((v) => !users.some((u) => u.email.toLowerCase() === v.email.toLowerCase()));
        update((f) => ({ project: { ...f.project, members: [...f.project.members, ...known] } }));
        toast(addedMessage(known.length, toInvite.length));
        return { toInvite };
      }}
      onInviteCollaborators={async (values) => {
        await simulateRequest();
        // invited_collaborators.ex: an email that already has an account is refused on its row.
        const taken = Object.fromEntries(
          values.flatMap((v, i) =>
            users.some((u) => u.email.toLowerCase() === v.email.toLowerCase()) ? [[`${i}.email`, ["This email is already taken"]]] : []
          )
        );
        if (Object.keys(taken).length) throw new RequestError("This email is already taken", { fieldErrors: taken });
        toast(`Invite${values.length > 1 ? "s" : ""} sent successfully`);
      }}
      onRemoveCollaborator={async (id) => {
        await simulateRequest();
        update((f) => ({ project: { ...f.project, members: f.project.members.filter((m) => m.userId !== id) } }));
        toast("Collaborator removed");
      }}
      onSetSupportAccess={async (on) => {
        await simulateRequest();
        update(() => ({ supportAccess: on }));
        toast(on ? "Granted access to support users successfully" : "Revoked access to support users successfully");
      }}
      onSetFailureAlert={(id, failureAlert) => updateMember(id, { failureAlert })}
      onSetDigest={(id, digest) => updateMember(id, { digest })}
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
