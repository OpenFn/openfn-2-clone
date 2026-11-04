import ConfirmModal from "../primitives/ConfirmModal";
import type { CollaboratorRow } from "../../types/project-settings";

interface Props {
  collaborator: CollaboratorRow;
  onCancel: () => void;
  /** May be async: the modal shows pending and stays open with the error if it throws. */
  onConfirm: () => void | Promise<void>;
}

/** settings.ex `confirm_user_removal_modal`. */
export default function RemoveCollaboratorModal({ collaborator, onCancel, onConfirm }: Props) {
  const name = `${collaborator.firstName} ${collaborator.lastName}`;
  const owned = collaborator.ownedCredentialNames;
  const credentialsText =
    owned === null
      ? " and any credentials they own will be removed from it"
      : owned.length === 0
      ? ""
      : owned.length === 1
        ? ` and their owned credential ${owned[0]} will be removed from it`
        : ` and their owned credentials ${owned.join(", ")} will be removed from it`;
  return (
    <ConfirmModal open onClose={onCancel} onConfirm={onConfirm} title={`Remove ${name}`} confirmLabel="Confirm" tone="danger">
      <p>
        Are you sure you want to remove "{name}" from this project? They will no longer have access to this project
        {credentialsText}.
      </p>
      <p>Do you wish to proceed with this action?</p>
    </ConfirmModal>
  );
}
