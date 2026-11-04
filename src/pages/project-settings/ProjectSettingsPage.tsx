import type { ReactNode } from "react";
import AsyncBoundary from "../../components/primitives/AsyncBoundary";
import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import SectionHeader, { NestedSections } from "../../components/primitives/SectionHeader";
import CredentialIndex from "../../components/credentials/CredentialIndex";
import NewCredentialMenuButton, { projectCredentialMenuOptions } from "../../components/credentials/NewCredentialMenuButton";
import CollaborationPanel from "../../components/project-settings/CollaborationPanel";
import CollectionsPanel from "../../components/project-settings/CollectionsPanel";
import DataStoragePanel from "../../components/project-settings/DataStoragePanel";
import GithubSyncPanel from "../../components/project-settings/GithubSyncPanel";
import HistoryExportsPanel from "../../components/project-settings/HistoryExportsPanel";
import ProjectDeletionModal from "../../components/domain/ProjectDeletionModal";
import ProjectSetupPanel from "../../components/project-settings/ProjectSetupPanel";
import SandboxSettingsBanner from "../../components/project-settings/SandboxSettingsBanner";
import SecurityPanel from "../../components/project-settings/SecurityPanel";
import Tabs from "../../components/primitives/Tabs";
import WebhookSecurityPanel from "../../components/project-settings/WebhookSecurityPanel";
import { defaultSettingsHash, projectSettingsTabs } from "../../components/project-settings/tabs";
import DeleteSandboxModal from "../../components/domain/DeleteSandboxModal";
import { useRouter } from "../../routing/router";
import type {
  AddCollaboratorsResult,
  CollaboratorValues,
  DataStorageValues,
  Digest,
  InviteValues,
  ProjectIdentityValues,
  ProjectSettingsPageData,
  ReauthValues,
  WebhookAuthMethodValues,
} from "../../types/project-settings";
import type { CredentialActions, KeychainCredentialActions } from "../../types/credentials";
import type { ResourceStatus } from "../../types/resource";
import { cn } from "../../utils/cn";

/**
 * The contract between this page and whatever feeds it (the replica wrapper,
 * later Lightning): one shape per tab, so a tab can change without touching
 * the others. "Async action" in STANDARDS.md says how the host answers each
 * action. The host announces success (its flash).
 */
export interface ProjectSettingsPageProps extends ProjectSettingsPageData, CredentialActions, KeychainCredentialActions {
  /** The picker's label, "parent/child" for a sandbox. */
  projectLabel: string;
  /** The deletion modal is open (/settings/delete). */
  deleting: boolean;
  /** While the host loads the collaborators, or why it couldn't (STANDARDS pattern 5). Leave it out when they arrive with the page. */
  collaborationStatus?: ResourceStatus;
  /** While the host loads the collections, or why it couldn't (STANDARDS pattern 5). Leave it out when they arrive with the page. */
  collectionsStatus?: ResourceStatus;

  onSaveIdentity: (values: ProjectIdentityValues) => Promise<void>;
  /** Saves Concurrency Override: 1 for one run at a time, null for parallel. */
  onSaveConcurrency: (concurrency: number | null) => Promise<void>;
  /** Deletes the project (or sandbox) with the name the user typed, which the host checks. The host moves the user on. */
  onDeleteProject: (nameConfirmation: string) => Promise<void>;
  /** Closes the deletion modal (Cancel). */
  onCloseDelete: () => void;

  // The Credentials tab's actions come from CredentialActions and KeychainCredentialActions (types/credentials.ts).

  /** Creates a collection from the name as typed. Field errors are keyed `rawName`. */
  onCreateCollection: (rawName: string) => Promise<void>;
  /** Field errors are keyed `rawName`. */
  onRenameCollection: (id: string, rawName: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  /** The collection's first record, pretty-printed, or null when it's empty. */
  onPreviewCollection: (id: string) => Promise<string | null>;

  /** Creates a webhook auth method; an API key method gets the key `onGenerateApiKey` last handed out. */
  onCreateWebhookAuthMethod: (values: WebhookAuthMethodValues) => Promise<void>;
  /** Field errors are keyed `name`. */
  onRenameWebhookAuthMethod: (id: string, name: string) => Promise<void>;
  onDeleteWebhookAuthMethod: (id: string) => Promise<void>;
  /** A new API key, shown in the form before the method is created. The host keeps it for `onCreateWebhookAuthMethod`. */
  onGenerateApiKey: () => Promise<string>;
  /** A method's password or API key, once the user has re-authenticated. Rejects when the password or code is wrong; only the message shows. */
  onRevealWebhookSecret: (id: string, values: ReauthValues) => Promise<string>;

  /** Adds the emails that have OpenFn accounts, and answers with the rest to invite. Only a rejection's message shows. */
  onAddCollaborators: (values: CollaboratorValues[]) => Promise<AddCollaboratorsResult>;
  /** Field errors are keyed by row and field (`"1.email"`), which show on that row. */
  onInviteCollaborators: (values: InviteValues[]) => Promise<void>;
  onRemoveCollaborator: (id: string) => Promise<void>;
  onSetSupportAccess: (on: boolean) => Promise<void>;
  /** The viewer's own alert settings (`id` is their project user), saved on change. */
  onSetFailureAlert: (id: string, on: boolean) => Promise<void>;
  /** Saved on change. */
  onSetDigest: (id: string, digest: Digest) => Promise<void>;

  onSetRequiresMfa: (on: boolean) => Promise<void>;
  onInitiateGithubSync: () => Promise<void>;
  onRemoveGithubConnection: () => Promise<void>;
  onSaveDataStorage: (values: DataStorageValues) => Promise<void>;
}

/**
 * Inventory views `project-settings-*` (live/project_live/settings.ex +
 * settings.html.heex): one page with a vertical tab list; the URL hash
 * picks the panel, defaulting to #project. `deleting` opens the deletion
 * modal over the Setup panel. Props only, so it can run unchanged in
 * Lightning; the replica's data lives in ProjectSettingsPage.replica.tsx.
 */
export default function ProjectSettingsPage(props: ProjectSettingsPageProps) {
  const { project, projectLabel, parent, deleting, setup, credentials } = props;
  const { useLocation } = useRouter();
  const requested = useLocation().hash.replace(/^#/, "");
  const active = projectSettingsTabs.some((t) => t.id === requested) ? requested : defaultSettingsHash;
  const sandbox = parent !== null;

  const panels: Record<string, ReactNode> = {
    project: (
      <ProjectSetupPanel
        setup={setup}
        parent={parent}
        onSaveIdentity={props.onSaveIdentity}
        onSaveConcurrency={props.onSaveConcurrency}
      />
    ),
    credentials: (
      <>
        <SectionHeader
          size="lg"
          title="Project credentials"
          subtitle="Manage OAuth 2.0 Clients and Credentials accessible to this project."
          permissionsSection={credentials.canCreateProjectCredential ? undefined : "available credentials."}
          action={
            <NewCredentialMenuButton
              id="project-credential-options-menu-button"
              options={projectCredentialMenuOptions(credentials.canCreateProjectCredential, credentials.canCreateKeychainCredential)}
            />
          }
        />
        {sandbox && <SandboxSettingsBanner scope="editable" />}
        {/* The page props carry the credential actions; the tab's data comes after, so its `credentials` list wins. */}
        <CredentialIndex
          {...props}
          {...credentials}
          project={{
            id: project.id,
            keychainCredentials: credentials.keychainCredentials,
            canCreateKeychainCredential: credentials.canCreateKeychainCredential,
            canEditKeychainCredential: credentials.canEditKeychainCredential,
            onCreateKeychainCredential: props.onCreateKeychainCredential,
            onUpdateKeychainCredential: props.onUpdateKeychainCredential,
            onDeleteKeychainCredential: props.onDeleteKeychainCredential,
          }}
        />
      </>
    ),
    collections: (
      <AsyncBoundary status={props.collectionsStatus ?? { state: "ready" }}>
        <CollectionsPanel
          collections={props.collections}
          sandbox={sandbox}
          onCreate={props.onCreateCollection}
          onRename={props.onRenameCollection}
          onDelete={props.onDeleteCollection}
          onPreview={props.onPreviewCollection}
        />
      </AsyncBoundary>
    ),
    webhook_security: (
      <WebhookSecurityPanel
        webhookSecurity={props.webhookSecurity}
        parent={parent}
        onCreate={props.onCreateWebhookAuthMethod}
        onRename={props.onRenameWebhookAuthMethod}
        onDelete={props.onDeleteWebhookAuthMethod}
        onGenerateApiKey={props.onGenerateApiKey}
        onReveal={props.onRevealWebhookSecret}
      />
    ),
    collaboration: (
      <AsyncBoundary status={props.collaborationStatus ?? { state: "ready" }}>
        <CollaborationPanel
          collaboration={props.collaboration}
          sandbox={sandbox}
          onAdd={props.onAddCollaborators}
          onInvite={props.onInviteCollaborators}
          onRemove={props.onRemoveCollaborator}
          onSetSupportAccess={props.onSetSupportAccess}
          onSetFailureAlert={props.onSetFailureAlert}
          onSetDigest={props.onSetDigest}
        />
      </AsyncBoundary>
    ),
    security: <SecurityPanel security={props.security} parent={parent} onSetRequiresMfa={props.onSetRequiresMfa} />,
    vcs: (
      <GithubSyncPanel
        githubSync={props.githubSync}
        sandbox={sandbox}
        onInitiateSync={props.onInitiateGithubSync}
        onRemoveConnection={props.onRemoveGithubConnection}
      />
    ),
    "data-storage": <DataStoragePanel dataStorage={props.dataStorage} sandbox={sandbox} onSave={props.onSaveDataStorage} />,
    "history-exports": <HistoryExportsPanel exports={props.historyExports} sandbox={sandbox} />,
  };

  return (
    <PageContent header={<Header breadcrumbs={<ProjectBreadcrumbs project={project} label={projectLabel} current="Project settings" />} title="Project settings" />}>
      <Centered>
        {/* Keyed by project so panel state resets when the project picker switches projects. */}
        <div key={project.id} id="project-settings-container" className="flex h-full gap-8">
          <Tabs orientation="vertical" label="Project settings" className="flex-none" tabs={projectSettingsTabs} active={active} />
          <div className="min-w-0 grow">
            {projectSettingsTabs.map((t) => (
              <div
                key={t.id}
                id={`${t.id}-panel`}
                role="tabpanel"
                className={cn("space-y-4", t.id !== active && "hidden")}
              >
                <NestedSections>{panels[t.id]}</NestedSections>
              </div>
            ))}
          </div>
        </div>
      </Centered>
      {deleting &&
        setup.canDeleteProject &&
        (setup.sandboxDeletion ? (
          <DeleteSandboxModal
            key={project.id}
            sandboxName={setup.name}
            descendantCount={setup.sandboxDeletion.descendantCount}
            isCurrent
            rootName={setup.sandboxDeletion.rootName}
            gracePeriodDays={setup.gracePeriodDays}
            onClose={props.onCloseDelete}
            onConfirm={props.onDeleteProject}
          />
        ) : (
          <ProjectDeletionModal
            key={project.id}
            project={{ name: setup.name }}
            // Lightning deletes an already scheduled project at once, so it goes "today".
            gracePeriodDays={setup.scheduledDeletion ? 0 : setup.gracePeriodDays}
            onCancel={props.onCloseDelete}
            onDelete={props.onDeleteProject}
          />
        ))}
    </PageContent>
  );
}
