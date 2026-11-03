import Section from "../primitives/Section";
import Modal from "../primitives/Modal";
import TextLink from "../primitives/TextLink";
import { byName } from "./usageRefs";
import type { WebhookAuthMethodRow, WebhookUsageRef } from "../../types/project-settings";
import { Stack } from "../primitives/Stack";

/** The workflow triggers or channels an auth method protects, as a bulleted list of links in the order given. */
export function UsageLinks({ refs }: { refs: WebhookUsageRef[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {refs.map((l) => (
        <li key={l.id}>
          <TextLink to={l.href}>{l.name}</TextLink>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  authMethod: WebhookAuthMethodRow;
  onClose: () => void;
}

/** `linked_usage_for_webhook_auth_method_modal` (workflow_live/components.ex). */
export default function LinkedUsageModal({ authMethod, onClose }: Props) {
  const { triggers, channels } = authMethod;
  return (
    <Modal open onClose={onClose} title="Associated Triggers & Channels">
      <Stack gap="lg">
        <p>
          The "<span className="font-semibold">{authMethod.name}</span>" authentication method is used by:
        </p>
        {triggers.length > 0 && (
          <Section size="sm" title={`Workflow triggers (${triggers.length})`}>
            <UsageLinks refs={triggers} />
          </Section>
        )}
        {channels.length > 0 && (
          <Section size="sm" title={`Channels (${channels.length})`}>
            <UsageLinks refs={byName(channels)} />
          </Section>
        )}
      </Stack>
    </Modal>
  );
}
