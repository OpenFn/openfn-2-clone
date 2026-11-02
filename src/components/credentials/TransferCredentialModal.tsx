import FormModal from "../primitives/FormModal";
import { TextInput } from "../primitives/Inputs";
import Text from "../primitives/Text";
import type { CredentialRow } from "../../types/credentials";
import { useForm } from "../../utils/useForm";
import { isValidEmail } from "../../utils/validate";

interface Props {
  open: boolean;
  onClose: () => void;
  credential: CredentialRow;
  /** Called with the receiver's email. Rejects with field errors (`receiverEmail`) or a message; the modal stays open. */
  onTransfer: (receiverEmail: string) => Promise<void>;
  onRevoke: () => Promise<void>;
}

/**
 * Lightning's TransferCredentialModal (credential_live/transfer_credential_modal.ex).
 * A pending transfer shows the revoke variant instead. The host checks the
 * receiver is a member of every project using the credential.
 */
export default function TransferCredentialModal({ open, onClose, credential, onTransfer, onRevoke }: Props) {
  const revoke = credential.transferStatus === "pending";
  const modalId = `transfer-credential-${credential.id}-modal`;
  const form = useForm({
    initial: { receiverEmail: "" },
    validate: (v) => ({ receiverEmail: revoke || isValidEmail(v.receiverEmail.trim()) ? [] : ["must be a valid email address"] }),
  });

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={revoke ? "Revoke Credential Transfer" : "Transfer Credential Ownership"}
      description={
        revoke
          ? "A transfer of this credential is pending. Click the revoke button to cancel it."
          : "Enter the email address of the new owner. Note: The user must be a member of all projects where this credential is used."
      }
      size="xl"
      formId={`${modalId}-form`}
      formClassName=""
      onSubmit={form.modalSubmit(async (v) => {
        await (revoke ? onRevoke() : onTransfer(v.receiverEmail.trim()));
        onClose();
      })}
      submitLabel={revoke ? "Revoke" : "Transfer"}
      submitId={revoke ? `${modalId}-revoke-button` : `${modalId}-submit-button`}
    >
      {revoke ? (
        <Text as="p" tone="muted">
          Revoking this transfer will cancel the pending request. This will keep the credential under your ownership.
          You will need to initiate a new transfer request to transfer it in the future.
        </Text>
      ) : (
        <TextInput id="receiver_email" aria-label="Receiver email" placeholder="email@example.com" required {...form.fieldProps("receiverEmail")} />
      )}
    </FormModal>
  );
}
