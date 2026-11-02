import { useState } from "react";
import type { ChannelRow } from "../../../types/channels";
import { cn } from "../../../utils/cn";
import Button from "../../primitives/Button";
import ConfirmModal from "../../primitives/ConfirmModal";
import EmptyState from "../../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../../primitives/Table";
import Toggle from "../../primitives/Toggle";
import DateTime from "../../primitives/DateTime";
import TextLink from "../../primitives/TextLink";
import ProxyUrlCopy from "./ProxyUrlCopy";

/**
 * The channels table (ChannelLive.Index `channels_table`): name, destination
 * with the copyable proxy URL under it, request count and last activity
 * (both link to the channel's logs), the Enabled toggle (text for those who
 * cannot edit), and Edit / Delete. Delete asks first in a modal, where
 * Lightning used a browser `data-confirm`.
 */
export default function ChannelsTable({
  channels,
  canEdit = true,
  canDelete = true,
  onToggle,
  onEdit,
  onDelete,
}: {
  channels: ChannelRow[];
  canEdit?: boolean;
  canDelete?: boolean;
  onToggle?: (id: string, enabled: boolean) => void;
  onEdit?: (id: string) => void;
  /** May be async: the modal shows pending until it settles. */
  onDelete?: (id: string) => void | Promise<void>;
}) {
  const [deleting, setDeleting] = useState<ChannelRow | null>(null);

  if (channels.length === 0) return <EmptyState variant="plain" message="No channels found." />;

  return (
    <>
      <Table
        id="channels-table"
        header={
          <Tr>
            <Th>Name</Th>
            <Th>Destination</Th>
            <Th>Requests</Th>
            <Th>Last Activity</Th>
            <Th>Enabled</Th>
            <Th actions />
          </Tr>
        }
      >
        {channels.map((channel) => (
          <Tr key={channel.id} id={`channel-${channel.id}`}>
            {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type, F527 colour (font-medium text-strong text-faint) */}
            <Td wrap maxWidth={60} className={cn("font-medium", channel.enabled ? "text-strong" : "text-faint")}>
              <span id={`channel-name-${channel.id}`}>{channel.name}</span>
            </Td>
            <Td maxWidth={80}>
              <div className="flex items-center gap-1.5 font-mono text-muted">
                <span className="hero-arrow-right-start-on-rectangle h-4 w-4 shrink-0 text-faint" />
                <span className="min-w-0 wrap-break-word">{channel.destinationUrl}</span>
              </div>
              <ProxyUrlCopy url={channel.proxyUrl} icon className="mt-1" />
            </Td>
            <Td>
              <TextLink to={channel.logsHref}>{channel.requestCount}</TextLink>
            </Td>
            <Td>
              <TextLink to={channel.logsHref}>
                {channel.lastActivityAt ? <DateTime value={channel.lastActivityAt} /> : <span className="italic">Never</span>}
              </TextLink>
            </Td>
            <Td>
              {canEdit ? (
                <Toggle
                  id={channel.id}
                  name="channel_state"
                  labelledBy={`channel-name-${channel.id}`}
                  checked={channel.enabled}
                  onChange={(v) => onToggle?.(channel.id, v)}
                  tooltip={channel.enabled ? undefined : `${channel.name} (disabled)`}
                />
              ) : (
                <span className={channel.enabled ? "text-body" : "text-faint"}>
                  {channel.enabled ? "Enabled" : "Disabled"}
                </span>
              )}
            </Td>
            <Td actions>
              {canEdit && (
                <Button variant="secondary" size="xs" onClick={() => onEdit?.(channel.id)}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button tone="danger" size="xs" onClick={() => setDeleting(channel)}>
                  Delete
                </Button>
              )}
            </Td>
          </Tr>
        ))}
      </Table>
      {deleting && (
        <ConfirmModal
          open
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await onDelete?.(deleting.id);
            setDeleting(null);
          }}
          title="Delete channel"
          confirmLabel="Delete"
          tone="danger"
        >
          <p>{`Delete "${deleting.name}"? This cannot be undone.`}</p>
        </ConfirmModal>
      )}
    </>
  );
}
