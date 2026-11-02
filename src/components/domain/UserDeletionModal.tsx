import Button from "../primitives/Button";
import ConfirmModal from "../primitives/ConfirmModal";
import Modal from "../primitives/Modal";
import Text from "../primitives/Text";

interface Props {
  open?: boolean;
  onClose: () => void;
  /** Called with the typed email when "Delete account" is pressed. May be async: the modal shows pending and stays open with the error if it rejects. */
  onDelete?: (email: string) => void | Promise<void>;
  /** The account's email. When given, "Delete account" enables only once it has been typed back. */
  email?: string | undefined;
  /** "Your account…" (profile page) instead of "This user's account…" (admin). */
  isCurrentUser?: boolean;
  /** The user still has auditable activity in projects: shows the extra note. */
  hasActivityInProjects?: boolean;
  /** Deleting now (rather than scheduling) a user with activity: deletion is blocked. */
  blocked?: boolean;
}

/**
 * Lightning's UserDeletionModal (live/components/user_deletion_modal.ex):
 * confirm by typing the user's email, then "Delete account". When the user
 * can't be deleted yet (`blocked`), it only explains why.
 */
export default function UserDeletionModal({
  open = true,
  onClose,
  onDelete,
  email,
  isCurrentUser = false,
  hasActivityInProjects = false,
  blocked = false,
}: Props) {
  const title = "Delete user";

  if (blocked) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        size="sm"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        }
      >
        <Text as="div" tone="muted" className="space-y-3">
          <p>
            {isCurrentUser ? "Your account" : "This user"} cannot be deleted until their auditable activities have
            also been purged.
          </p>
          <p>Audit trails are removed on a project-basis and may be controlled by the project owner or a superuser.</p>
        </Text>
      </Modal>
    );
  }

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={(email) => onDelete?.(email)}
      title={title}
      confirmLabel="Delete account"
      tone="danger"
      formId="scheduled_deletion_form"
      confirmation={{
        id: "scheduled_deletion_email",
        label: "User email",
        ...(email !== undefined && { expected: email }),
        mismatchError: isCurrentUser ? "This email doesn't match your current email" : "This email doesn't match the user's email",
        disabledTooltip: isCurrentUser ? "Type your email to confirm" : "Type the user's email to confirm",
      }}
    >
      <p>
        {isCurrentUser ? "Your" : "This user's"} account and credential data will be deleted. Please make sure none of
        these credentials are used in production workflows.
      </p>
      {hasActivityInProjects && (
        <p>
          *Note that {isCurrentUser ? "you still have" : "this user still has"} activity related to active projects. We
          may not be able to delete them entirely from the app until those projects are deleted.
        </p>
      )}
      {email !== undefined && (
        <p>
          To confirm, type <strong className="font-medium wrap-break-word text-strong">{email}</strong> below.
        </p>
      )}
    </ConfirmModal>
  );
}
