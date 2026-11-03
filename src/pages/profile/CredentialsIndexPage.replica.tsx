import { useState } from "react";
import { useCredentialIndex, useCredentialSaves } from "../../api/credentials";
import { useToast } from "../../components/primitives/Toast";
import { credentialIndexDataFor, credentialsFixture, type CredentialsFixture } from "../../mock-data/credentials";
import { useCurrentUser } from "../../session/session";
import { credentialReplicaActions } from "./credentialsReplica";
import CredentialsIndexPage from "./CredentialsIndexPage";

/**
 * The replica's side of CredentialsIndexPage. The credentials, the projects
 * and the adaptors come from Lightning's API (or its stand-in); OAuth clients
 * and sign-ins, which the API doesn't serve yet, stay on the fixture. The
 * success toasts are Lightning's flashes. Lightning replaces this file with a
 * LiveView wrapper; CredentialsIndexPage stays as it is.
 */
export default function CredentialsIndexPageReplica() {
  const viewer = useCurrentUser();
  const toast = useToast();
  const { status, ...data } = useCredentialIndex(viewer.email);
  const saves = useCredentialSaves();
  const [fixture, setFixture] = useState<CredentialsFixture>(credentialsFixture);
  const update = (change: (f: CredentialsFixture) => Partial<CredentialsFixture>) => setFixture((f) => ({ ...f, ...change(f) }));
  const toasting =
    <A extends unknown[]>(save: (...args: A) => Promise<void>, flash: string | ((...args: A) => string)) =>
    async (...args: A) => {
      await save(...args);
      toast(typeof flash === "string" ? flash : flash(...args));
    };

  return (
    <CredentialsIndexPage
      {...credentialIndexDataFor(fixture, undefined, viewer)}
      {...credentialReplicaActions(fixture, update, viewer, toast)}
      {...data}
      status={status}
      onLoadCredentialSecrets={saves.onLoadCredentialSecrets}
      onLoadCredentialSchema={saves.onLoadCredentialSchema}
      onCreateCredential={toasting(saves.onCreateCredential, "Credential created successfully")}
      onUpdateCredential={toasting(saves.onUpdateCredential, "Credential updated successfully")}
      onDeleteCredential={toasting(saves.onDeleteCredential, (_id, { now }) => (now ? "Credential deleted successfully" : "Credential scheduled for deletion"))}
      onCancelCredentialDeletion={toasting(saves.onCancelCredentialDeletion, "Credential deletion canceled")}
      onTransferCredential={toasting(saves.onTransferCredential, "Credential transfer initiated. We've sent you a confirmation email.")}
      onRevokeCredentialTransfer={toasting(saves.onRevokeCredentialTransfer, "Transfer revoked successfully")}
    />
  );
}
