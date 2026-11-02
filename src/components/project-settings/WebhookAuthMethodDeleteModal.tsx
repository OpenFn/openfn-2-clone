import Alert from "../primitives/Alert";
import ConfirmModal from "../primitives/ConfirmModal";
import { UsageLinks } from "./LinkedUsageModal";
import { byName } from "./usageRefs";
import type { WebhookAuthMethodRow } from "../../types/project-settings";
import { Stack } from "../primitives/Stack";

interface Props {
  authMethod: WebhookAuthMethodRow;
  onCancel: () => void;
  /** May be async: the modal shows pending and stays open with the error if it throws. */
  onDelete: () => void | Promise<void>;
}

const countLabel = (n: number, noun: string) => (n === 1 ? `1 ${noun}` : `${n} ${noun}s`);

/**
 * WebhookAuthMethodDeleteModal (workflow_live/webhook_auth_method_delete_modal.ex):
 * lists what loses protection and asks for "DELETE".
 */
export default function WebhookAuthMethodDeleteModal({ authMethod, onCancel, onDelete }: Props) {
  const { triggers, channels } = authMethod;
  const unused = triggers.length === 0 && channels.length === 0;

  return (
    <ConfirmModal
      open
      onClose={onCancel}
      onConfirm={onDelete}
      title="Delete Authentication Method"
      confirmLabel="Delete authentication method"
      tone="danger"
      confirmation={{
        id: "delete_confirmation_confirmation",
        label: "Type in 'DELETE' to confirm the deletion",
        expected: "DELETE",
      }}
    >
      <p>
        You are about to delete the webhook auth method "<span className="font-bold">{authMethod.name}</span>"
        {unused
          ? " which is used by no workflows or channels."
          : ". This cannot be undone, and it will be removed from everything listed below."}
      </p>
      {triggers.length > 0 && (
        <Alert tone="warning" header={`${countLabel(triggers.length, "workflow trigger")} will stop requiring authentication`}>
          <UsageLinks refs={triggers} />
        </Alert>
      )}
      {channels.length > 0 && (
        <Alert tone="danger" header={`${countLabel(channels.length, "channel")} will accept unauthenticated requests`}>
          <Stack gap="sm">
            <UsageLinks refs={byName(channels)} />
            <p>
              These channels stay enabled and keep forwarding requests to their destination with the project
              credential attached. Add another client auth method, or disable the channels, before deleting this one.
            </p>
          </Stack>
        </Alert>
      )}
    </ConfirmModal>
  );
}
