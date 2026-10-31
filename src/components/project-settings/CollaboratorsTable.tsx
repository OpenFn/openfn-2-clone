import Button from "../primitives/Button";
import { Select } from "../primitives/Inputs";
import EmptyState from "../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../primitives/Table";
import Text from "../primitives/Text";
import { useToast } from "../primitives/Toast";
import { digestOptions } from "../../constants";
import type { CollaboratorRow, Digest } from "../../types/project-settings";
import { errorMessage } from "../../utils/errors";
import { capitalize } from "../../utils/format";
import { useChosenValue } from "../../utils/useChosenValue";

interface Props {
  collaborators: CollaboratorRow[];
  /** Whether the plan sends failure alerts at all. */
  canReceiveFailureAlerts: boolean;
  /** The viewer's own alert settings. Each select shows the choice at once, and goes back if this rejects. */
  onSetFailureAlert: (id: string, on: boolean) => Promise<void>;
  onSetDigest: (id: string, digest: Digest) => Promise<void>;
  onRemove: (collaborator: CollaboratorRow) => void;
  onAdd: () => void;
  canAdd: boolean;
}

const failureAlertOptions: [string, string][] = [
  ["Disabled", "false"],
  ["Enabled", "true"],
];
const digestSelectOptions = digestOptions.map((d) => [capitalize(d), d] as [string, string]);

/** A select the host saves on every change, showing the choice while it does. */
function SavedSelect({ id, label, saved, options, onSave }: { id: string; label: string; saved: string; options: [string, string][]; onSave: (value: string) => Promise<void> }) {
  const toast = useToast();
  const select = useChosenValue(saved, onSave, (e) => toast(errorMessage(e), "danger"));
  return <Select id={id} aria-label={label} value={select.value} options={options} onChange={(e) => select.choose(e.target.value)} />;
}

/**
 * Lightning's `DataTables.collaborators_table` (live/components/data_tables.ex):
 * Collaborator, Role, Failure Alert, Digest and a Remove Collaborator
 * button. Alert settings are only editable on your own row.
 */
export default function CollaboratorsTable({ collaborators, canReceiveFailureAlerts, onSetFailureAlert, onSetDigest, onRemove, onAdd, canAdd }: Props) {
  if (collaborators.length === 0) {
    return (
      <EmptyState
        icon="hero-plus-circle"
        message="No collaborators found."
        buttonText="Add a collaborator"
        onClick={onAdd}
        disabled={!canAdd}
      />
    );
  }
  return (
    <Table
      id="collaborators-table"
      header={
        <Tr>
          <Th>Collaborator</Th>
          <Th>Role</Th>
          <Th>Failure Alert</Th>
          <Th>Digest</Th>
          <Th actions />
        </Tr>
      }
    >
      {collaborators.map((c) => (
        <Tr key={c.id} id={`project_user-${c.id}`}>
          <Td>
            <div>
              {c.firstName} {c.lastName}
            </div>
            <Text as="div" variant="body-sm">
              {c.email}
            </Text>
            {c.isCurrentUser && (
              <Text variant="body-sm" tone="faint">
                <em>Well hello, you!</em>
              </Text>
            )}
          </Td>
          <Td>{capitalize(c.role)}</Td>
          <Td>
            {!canReceiveFailureAlerts ? (
              "Unavailable"
            ) : c.isCurrentUser ? (
              <SavedSelect
                id={`failure-alert-${c.id}`}
                label="Failure Alert"
                saved={String(c.failureAlert)}
                options={failureAlertOptions}
                onSave={(v) => onSetFailureAlert(c.id, v === "true")}
              />
            ) : c.failureAlert ? (
              "Enabled"
            ) : (
              "Disabled"
            )}
          </Td>
          <Td>
            {c.isCurrentUser ? (
              <SavedSelect
                id={`digest-${c.id}`}
                label="Digest"
                saved={c.digest}
                options={digestSelectOptions}
                onSave={(v) => onSetDigest(c.id, v as Digest)}
              />
            ) : (
              capitalize(c.digest)
            )}
          </Td>
          <Td actions>
            <Button
              id={`remove_project_user_${c.id}_button`}
              variant="secondary"
              size="lg"
              tooltip={c.removeBlockedReason ?? undefined}
              disabled={c.removeBlockedReason !== null}
              onClick={() => onRemove(c)}
              icon="hero-minus-circle"
            >
              Remove Collaborator
            </Button>
          </Td>
        </Tr>
      ))}
    </Table>
  );
}
