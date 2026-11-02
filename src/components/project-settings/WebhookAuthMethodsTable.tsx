import TextLink from "../primitives/TextLink";
import EmptyState from "../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../primitives/Table";
import Button from "../primitives/Button";
import { linkedUsageSummary } from "../../utils/format";
import type { WebhookAuthMethodRow } from "../../types/project-settings";

interface Props {
  authMethods: WebhookAuthMethodRow[];
  canWrite: boolean;
  onCreate: () => void;
  onView: (m: WebhookAuthMethodRow) => void;
  onDelete: (m: WebhookAuthMethodRow) => void;
  onShowUsage: (m: WebhookAuthMethodRow) => void;
}

const typeLabel = { api: "API", basic: "Basic" } as const;

/**
 * Lightning's `webhook_auth_methods_table` (workflow_live/components.ex)
 * with the project-settings slots from settings.html.heex: the linked
 * usage link and View / Delete actions.
 */
export default function WebhookAuthMethodsTable({ authMethods, canWrite, onCreate, onView, onDelete, onShowUsage }: Props) {
  if (authMethods.length === 0) {
    return (
      <EmptyState
        icon="hero-plus-circle"
        message="No auth methods found."
        buttonText="Create a new auth method"
        onClick={onCreate}
        disabled={!canWrite}
      />
    );
  }
  return (
    <Table
      header={
        <Tr>
          <Th>Name</Th>
          <Th>Type</Th>
          <Th>Linked Triggers &amp; Channels</Th>
          <Th actions />
        </Tr>
      }
    >
      {authMethods.map((m) => {
        const summary = linkedUsageSummary(m);
        return (
          <Tr key={m.id} id={m.id}>
            {/* eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-strong) */}
            <Td truncate maxWidth={60} className="text-strong">{m.name}</Td>
            {/* eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-strong) */}
            <Td className="text-strong">{typeLabel[m.authType]}</Td>
            <Td>
              {summary ? (
                <TextLink id={`display_linked_usage_link_${m.id}`} onClick={() => onShowUsage(m)}>
                  {summary}
                </TextLink>
              ) : (
                <span className="italic text-faint">No associated triggers or channels...</span>
              )}
            </Td>
            <Td actions>
              <Button variant="secondary" size="xs" disabled={!canWrite} onClick={() => onView(m)}>
                {canWrite ? "View" : "Edit"}
              </Button>
              <Button variant="secondary" size="xs" disabled={!canWrite} onClick={() => onDelete(m)}>
                Delete
              </Button>
            </Td>
          </Tr>
        );
      })}
    </Table>
  );
}
