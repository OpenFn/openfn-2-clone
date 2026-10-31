import { Fragment } from "react";
import type { AuditEvent } from "../../types/admin";
import type { PageInfo } from "../../types/lists";
import { shortUuid } from "../../utils/format";
import Pagination from "../primitives/Pagination";
import Pill from "../primitives/Pill";
import DateTime from "../primitives/DateTime";
import { Table, Td, Th, Tr } from "../primitives/Table";
import Text from "../primitives/Text";
import AuditChanges from "./AuditChanges";

function TwoLine({ label, sub }: { label: string; sub: string }) {
  return (
    <>
      <div className="truncate text-strong">{label}</div>
      <Text as="div" variant="body-sm" className="truncate">
        {sub}
      </Text>
    </>
  );
}

/**
 * The superuser audit trail (audit_live/index.html.heex): one row per event
 * (when, event pill, actor, subject) with its change strip underneath, and
 * the pagination bar.
 */
export default function AuditTable({
  events,
  page,
}: {
  /** The events on this page. */
  events: AuditEvent[];
  page: PageInfo;
}) {
  return (
    <Table
      variant="plain"
      header={
        <Tr>
          <Th>Occurred</Th>
          <Th>Event</Th>
          <Th>Actor</Th>
          <Th>Subject</Th>
        </Tr>
      }
      footer={<Pagination page={page} />}
    >
      {events.map((audit) => (
        <Fragment key={audit.id}>
          <Tr className="border-t border-subtle">
            <Td>
              <DateTime value={audit.insertedAt} />
            </Td>
            <Td>
              <Pill color="green">{audit.event}</Pill>
            </Td>
            <Td>
              <TwoLine label={audit.actorLabel} sub={audit.actorIdentifier ?? shortUuid(audit.actorId)} />
            </Td>
            <Td>
              <TwoLine label={audit.itemType.split(".").pop() ?? ""} sub={shortUuid(audit.itemId)} />
            </Td>
          </Tr>
          <Tr>
            <AuditChanges audit={audit} />
          </Tr>
        </Fragment>
      ))}
    </Table>
  );
}
