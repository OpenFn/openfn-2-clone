import { useCallback, useState } from "react";
import ConfirmModal from "../primitives/ConfirmModal";
import ButtonMenu from "../primitives/ButtonMenu";
import { MenuItem } from "../primitives/Menu";
import EmptyState from "../primitives/EmptyState";
import { CredentialsTable, KeychainCredentialsTable, OauthClientsTable } from "./CredentialTables";
import CredentialFormModal from "./CredentialFormModal";
import OauthClientFormModal from "./OauthClientFormModal";
import KeychainCredentialFormModal from "./KeychainCredentialFormModal";
import TransferCredentialModal from "./TransferCredentialModal";
import CredentialDeletionModal from "./CredentialDeletionModal";
import { deleteKeychainMessage, deleteOauthClientMessage } from "./messages";
import { useCredentialModalRequests, type NewCredentialTarget } from "./credentialModalEvents";
import type {
  CredentialActions,
  CredentialIndexData,
  CredentialSchemaResult,
  CredentialSecretsResult,
  KeychainCredentialActions,
  KeychainCredentialRow,
  OauthClientSecretsResult,
} from "../../types/credentials";
import { useActions } from "../../utils/useAction";
import { Stack } from "../primitives/Stack";

/** Project settings' scope: the project, its keychain credentials and their actions. */
interface ProjectScope extends KeychainCredentialActions {
  id: string;
  keychainCredentials: KeychainCredentialRow[];
  canCreateKeychainCredential: boolean;
  canEditKeychainCredential: boolean;
}

interface Props extends CredentialIndexData, CredentialActions {
  /** Project settings › Credentials; null on the user's /credentials page (no owner column, no keychains). */
  project: ProjectScope | null;
  /** The host's `can_create_project_credential` (/credentials hard-codes it on). */
  canCreateProjectCredential: boolean;
}

type ActiveModal =
  | { kind: NewCredentialTarget }
  | { kind: "edit_credential"; id: string; secrets: CredentialSecretsResult; schema: CredentialSchemaResult | undefined }
  | { kind: "edit_oauth_client"; id: string; secrets: OauthClientSecretsResult }
  | {
      kind: "transfer_credential" | "delete_credential" | "delete_oauth_client" | "edit_keychain_credential" | "delete_keychain_credential";
      id: string;
    }
  | null;

/**
 * The shared credential index (annotations/shared/shared-credential-index-component.md,
 * credential_live/credential_index_component.html.heex): OAuth clients,
 * credentials and, in a project, keychain credentials, with their row
 * actions and modals. Used on /credentials and in project settings.
 *
 * The page's "Add new" menu (NewCredentialMenuButton) opens this component's
 * create modals. Records come in as props and every change goes out through
 * an action; the host announces success.
 */
export default function CredentialIndex(props: Props) {
  const { project, credentials, oauthClients, canCreateProjectCredential: canCreate } = props;
  const [active, setActiveState] = useState<ActiveModal>(null);
  // Edit forms open once the host has sent the stored secrets (and an adaptor's schema). While that
  // loads, the row's Actions button spins and the others wait. Opening or closing any modal drops
  // the answer, so a late edit form never shows over another modal.
  const loadThenOpen = useActions((_id: string, load: () => Promise<Exclude<ActiveModal, null>>) => load(), {
    latest: true,
    onError: "toast",
    onSuccess: setActiveState,
  });
  const { cancel: dropLoad } = loadThenOpen;
  const setActive = useCallback(
    (next: ActiveModal) => {
      dropLoad();
      setActiveState(next);
    },
    [dropLoad]
  );

  const showOwner = !!project;
  const defaultProjectIds = project ? [project.id] : [];
  const canCreateKeychain = project?.canCreateKeychainCredential ?? false;

  const open = useCallback(
    (target: NewCredentialTarget) => {
      if (target === "new_keychain_credential" ? !canCreateKeychain : !canCreate) return;
      setActive({ kind: target });
    },
    [canCreate, canCreateKeychain, setActive]
  );
  useCredentialModalRequests(open);

  const editCredential = (id: string, schema: string) =>
    loadThenOpen.run(id, async () => {
      const adaptor = schema !== "raw" && schema !== "oauth";
      const [secrets, loaded] = await Promise.all([
        props.onLoadCredentialSecrets(id),
        adaptor ? props.onLoadCredentialSchema(schema) : undefined,
      ]);
      return { kind: "edit_credential", id, secrets, schema: loaded };
    });
  const editOauthClient = (id: string) =>
    loadThenOpen.run(id, async () => ({ kind: "edit_oauth_client", id, secrets: await props.onLoadOauthClientSecrets(id) }));
  // Cancelling a deletion spins its row too, and the other rows wait for it.
  const cancelDeletion = useActions(props.onCancelCredentialDeletion, { onError: "toast" });
  const busy = loadThenOpen.pending() || cancelDeletion.pending();
  const rowMenu = (id: string) => ({ pending: loadThenOpen.pending(id) || cancelDeletion.pending(id), disabled: busy });

  const close = () => setActive(null);
  const activeId = active && "id" in active ? active.id : null;
  const activeCredential = credentials.find((c) => c.id === activeId);
  const activeClient = oauthClients.find((c) => c.id === activeId);
  const activeKeychain = project?.keychainCredentials.find((k) => k.id === activeId);
  // A record that leaves the props takes its modal, and any secrets it holds, with it.
  if (activeId && !activeCredential && !activeClient && !activeKeychain) setActive(null);
  const credentialForm = {
    oauthClients,
    credentialTypes: props.credentialTypes,
    projects: props.projects,
    oauthSignIns: props.oauthSignIns,
    onAuthorizeOauth: props.onAuthorizeOauth,
    onDiscardOauthSignIns: props.onDiscardOauthSignIns,
    onLoadCredentialSchema: props.onLoadCredentialSchema,
    onClose: close,
  };

  return (
    <Stack gap="md" id="credentials-index-component" data-annotation="shared-credential-index-component">
      <OauthClientsTable
        rows={oauthClients}
        showOwner={showOwner}
        emptyState={
          <EmptyState
            message="No OAuth clients found."
            buttonText="Create a new OAuth client"
            disabled={!canCreate}
            onClick={() => open("new_oauth_client")}
          />
        }
        actions={(client) =>
          client.canEdit && (
            <ButtonMenu label="Actions" {...rowMenu(client.id)}>
              <MenuItem onClick={() => editOauthClient(client.id)}>Edit</MenuItem>
              <MenuItem onClick={() => setActive({ kind: "delete_oauth_client", id: client.id })}>Delete</MenuItem>
            </ButtonMenu>
          )
        }
      />
      <CredentialsTable
        rows={credentials}
        showOwner={showOwner}
        emptyState={
          <EmptyState message="No credentials found." buttonText="Create a new Credential" disabled={!canCreate} onClick={() => open("new_credential")} />
        }
        actions={(credential) =>
          credential.canEdit && (
            <ButtonMenu label="Actions" {...rowMenu(credential.id)}>
              <MenuItem onClick={() => setActive({ kind: "transfer_credential", id: credential.id })}>
                {credential.transferStatus === "pending" ? "Revoke Transfer" : "Transfer"}
              </MenuItem>
              <MenuItem onClick={() => editCredential(credential.id, credential.schema)}>Edit</MenuItem>
              {credential.scheduledDeletion && (
                <MenuItem onClick={() => cancelDeletion.run(credential.id)}>Cancel deletion</MenuItem>
              )}
              <MenuItem onClick={() => setActive({ kind: "delete_credential", id: credential.id })}>
                {credential.scheduledDeletion ? "Delete now" : "Delete"}
              </MenuItem>
            </ButtonMenu>
          )
        }
      />
      {project && (
        <KeychainCredentialsTable
          rows={project.keychainCredentials}
          emptyState={
            <EmptyState
              message="No keychain credentials found."
              buttonText="Create a new keychain credential"
              disabled={!canCreateKeychain}
              onClick={() => open("new_keychain_credential")}
            />
          }
          actions={(kc) =>
            project.canEditKeychainCredential && (
              <ButtonMenu label="Actions" disabled={busy}>
                <MenuItem onClick={() => setActive({ kind: "edit_keychain_credential", id: kc.id })}>Edit</MenuItem>
                <MenuItem onClick={() => setActive({ kind: "delete_keychain_credential", id: kc.id })}>Delete</MenuItem>
              </ButtonMenu>
            )
          }
        />
      )}

      {active?.kind === "new_credential" && (
        <CredentialFormModal open {...credentialForm} defaultProjectIds={defaultProjectIds} onSave={props.onCreateCredential} />
      )}
      {active?.kind === "edit_credential" && activeCredential && (
        <CredentialFormModal
          open
          {...credentialForm}
          credential={activeCredential}
          secrets={active.secrets}
          schema={active.schema}
          onSave={(values) => props.onUpdateCredential(activeCredential.id, values)}
        />
      )}
      {active?.kind === "transfer_credential" && activeCredential && (
        <TransferCredentialModal
          open
          onClose={close}
          credential={activeCredential}
          onTransfer={(email) => props.onTransferCredential(activeCredential.id, email)}
          onRevoke={() => props.onRevokeCredentialTransfer(activeCredential.id)}
        />
      )}
      {active?.kind === "delete_credential" && activeCredential && (
        <CredentialDeletionModal
          key={activeCredential.id}
          onClose={close}
          credential={activeCredential}
          onDelete={async (intent) => {
            await props.onDeleteCredential(activeCredential.id, intent);
            close();
          }}
        />
      )}
      {active?.kind === "new_oauth_client" && (
        <OauthClientFormModal
          open
          onClose={close}
          projects={props.projects}
          defaultProjectIds={defaultProjectIds}
          allowGlobal={props.canCreateGlobalOauthClient}
          onSave={props.onCreateOauthClient}
        />
      )}
      {active?.kind === "edit_oauth_client" && activeClient && (
        <OauthClientFormModal
          open
          onClose={close}
          client={activeClient}
          secrets={active.secrets}
          projects={props.projects}
          allowGlobal={props.canCreateGlobalOauthClient}
          onSave={(values) => props.onUpdateOauthClient(activeClient.id, values)}
        />
      )}
      {active?.kind === "delete_oauth_client" && activeClient && (
        <ConfirmModal
          open
          title="Delete Oauth Client"
          tone="danger"
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            await props.onDeleteOauthClient(activeClient.id);
            close();
          }}
        >
          <p>{deleteOauthClientMessage(activeClient.name)}</p>
          <p>Do you want to proceed with this action?</p>
        </ConfirmModal>
      )}
      {project && active?.kind === "new_keychain_credential" && (
        <KeychainCredentialFormModal open onClose={close} credentials={credentials} onSave={project.onCreateKeychainCredential} />
      )}
      {project && active?.kind === "edit_keychain_credential" && activeKeychain && (
        <KeychainCredentialFormModal
          open
          onClose={close}
          keychainCredential={activeKeychain}
          credentials={credentials}
          onSave={(values) => project.onUpdateKeychainCredential(activeKeychain.id, values)}
        />
      )}
      {project && active?.kind === "delete_keychain_credential" && activeKeychain && (
        <ConfirmModal
          open
          title="Delete Keychain Credential"
          tone="danger"
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            await project.onDeleteKeychainCredential(activeKeychain.id);
            close();
          }}
        >
          <p>{deleteKeychainMessage(activeKeychain.name)}</p>
          <p>Do you want to proceed with this action?</p>
        </ConfirmModal>
      )}
    </Stack>
  );
}
