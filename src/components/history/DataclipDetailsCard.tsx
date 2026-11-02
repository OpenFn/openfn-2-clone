import type { ReactNode } from "react";
import type { DataclipDetail } from "../../types/history";
import Card from "../primitives/Card";
import DateTime from "../primitives/DateTime";
import { DetailItem, DetailList } from "../primitives/DetailList";
import DataclipTypePill from "../domain/DataclipTypePill";

/** The "Dataclip Details" metadata card (dataclip_live/show.ex). */
export default function DataclipDetailsCard({ dataclip }: { dataclip: DataclipDetail }) {
  return (
    <Card title="Dataclip Details" padding="lg">
      <DetailList layout="grid">
        <DetailItem label="ID" variant="code">
          {dataclip.id}
        </DetailItem>
        <DetailItem label="Type">
          <DataclipTypePill type={dataclip.type} />
        </DetailItem>
        <DetailItem label="Created">
          <DateTime value={dataclip.insertedAt} />
        </DetailItem>
        <DetailItem label="Updated">
          <DateTime value={dataclip.updatedAt} />
        </DetailItem>
        {dataclip.wipedAt && (
          <DetailItem label="Wiped">
            <DateTime value={dataclip.wipedAt} />
          </DetailItem>
        )}
      </DetailList>
    </Card>
  );
}

/** The dataclip page's body card: a fixed-height frame for the JSON viewer or "No Data Available". */
export function DataclipBodyCard({ children }: { children: ReactNode }) {
  return (
    <Card padding="none" className="h-96 overflow-hidden">
      {children}
    </Card>
  );
}
