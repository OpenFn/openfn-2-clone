import EmptyState from "../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../primitives/Table";
import Button from "../primitives/Button";
import type { ExportStatus, HistoryExportRow } from "../../types/project-settings";
import { capitalize } from "../../utils/format";
import DateTime from "../primitives/DateTime";

/** data_tables.ex `format_export_status/1`: "in_progress" -> "In progress". */
function formatStatus(status: ExportStatus): string {
  return capitalize(status.replace(/_/g, " "));
}

/**
 * Lightning's `DataTables.history_exports_table`: Export Date, Filename,
 * Export Requested By, Status and a Download action (disabled until the
 * export completes).
 */
export default function HistoryExportsTable({ exports }: { exports: HistoryExportRow[] }) {
  if (exports.length === 0) {
    return <EmptyState icon="hero-folder-arrow-down" message="No history exports found for this project." />;
  }
  return (
    <Table
      id="project_users_table-table"
      header={
        <Tr>
          <Th>Export Date</Th>
          <Th>Filename</Th>
          <Th>Export Requested By</Th>
          <Th>Status</Th>
          <Th actions />
        </Tr>
      }
    >
      {exports.map((f) => (
        <Tr key={f.id}>
          <Td>
            <DateTime value={f.insertedAt} />
          </Td>
          <Td wrap maxWidth={60}>{f.fileName ?? <em>Pending</em>}</Td>
          <Td>{f.requestedBy}</Td>
          <Td>{formatStatus(f.status)}</Td>
          <Td actions>
            {f.downloadHref ? (
              <Button id={`download-export-file-${f.id}-button`} variant="secondary" size="xs" href={f.downloadHref} target="_blank">
                Download
              </Button>
            ) : (
              <Button
                id={`download-export-file-${f.id}-button`}
                variant="secondary"
                size="xs"
                disabled
                tooltip="Export is not yet ready for download"
              >
                Download
              </Button>
            )}
          </Td>
        </Tr>
      ))}
    </Table>
  );
}
