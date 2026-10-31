import Pagination from "../primitives/Pagination";
import EmptyState from "../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../primitives/Table";
import type { ChannelLogRow } from "../../types/channels";
import type { PageInfo } from "../../types/lists";
import DateTime from "../primitives/DateTime";
import TextLink from "../primitives/TextLink";
import { ChannelStatePill } from "../domain/StatePill";
import { shortUuid } from "../../utils/format";

/** History's Channel Logs table (run_live/channel_logs_component.ex): one page of requests, newest first. */
export default function ChannelRequestsTable({
  rows,
  page,
  projectId,
}: {
  rows: ChannelLogRow[];
  page: PageInfo;
  projectId: string;
}) {
  return (
    <Table
      id="channel-requests-table"
      header={
        <Tr>
          <Th>Request ID</Th>
          <Th>Request Path</Th>
          <Th>Channel Name</Th>
          <Th>Started At</Th>
          <Th>Status</Th>
          <Th>Error Message</Th>
        </Tr>
      }
      footer={<Pagination page={page} />}
    >
      {rows.length === 0 ? (
        <Tr>
          <Td colSpan={6}>
            <EmptyState icon="hero-inbox" message="No channel requests found." />
          </Td>
        </Tr>
      ) : (
        rows.map((r) => (
          <Tr key={r.id} id={`request-${r.id}`}>
            <Td>
              {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-mono) */}
              <TextLink to={`/projects/${projectId}/history/channels/${r.id}`} title={r.requestId} className="font-mono">
                {shortUuid(r.requestId)}
              </TextLink>
            </Td>
            {/* eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-body) */}
            <Td className="text-body">{r.requestPath || "—"}</Td>
            <Td>
              <TextLink to={`/projects/${projectId}/history/channels?filters[channel_id]=${r.channelId}`}>{r.channelName}</TextLink>
            </Td>
            <Td>
              <DateTime value={r.startedAt} />
            </Td>
            <Td>
              <ChannelStatePill state={r.state} />
            </Td>
            <Td maxWidth={80} className="truncate">{r.errorMessage}</Td>
          </Tr>
        ))
      )}
    </Table>
  );
}
