import EmptyState from "../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../primitives/Table";
import { useTableSort, type SortValue } from "../../utils/useTableSort";
import Button from "../primitives/Button";
import IconButton from "../primitives/IconButton";
import type { CollectionRow } from "../../types/project-settings";
import { formatBytes } from "../../utils/format";

interface Props {
  collections: CollectionRow[];
  canManage: boolean;
  onCreate: () => void;
  onPreview: (c: CollectionRow) => void;
  /** The collection whose preview is loading; the other previews wait for it. */
  previewingId?: string | null;
  onEdit: (c: CollectionRow) => void;
  onDelete: (c: CollectionRow) => void;
}

const sortMap: Record<"name" | "byteSizeSum", (c: CollectionRow) => SortValue> = {
  name: (c) => c.name,
  byteSizeSum: (c) => c.byteSizeSum,
};

/**
 * Lightning's `DataTables.collections_table` (live/components/data_tables.ex)
 * with the actions from collections_component.ex: preview, Download, Edit,
 * Delete. Name and Used storage sort client-side: the host sends the whole
 * list, as Lightning does.
 */
export default function CollectionsTable({ collections, canManage, onCreate, onPreview, previewingId = null, onEdit, onDelete }: Props) {
  const { rows, thProps } = useTableSort({ rows: collections, sortMap, initialKey: "name" });

  if (collections.length === 0) {
    return (
      <EmptyState
        icon="hero-plus-circle"
        message="No collections found."
        buttonText="Create a new collection"
        onClick={onCreate}
        disabled={!canManage}
      />
    );
  }

  return (
    <Table
      id="collections-table"
      header={
        <Tr>
          <Th {...thProps("name")}>Name</Th>
          <Th {...thProps("byteSizeSum")}>Used storage</Th>
          <Th actions />
        </Tr>
      }
    >
      {rows.map((c) => (
        <Tr key={c.id} id={`collection-row-${c.id}`}>
          <Td wrap maxWidth={60}>{c.name}</Td>
          <Td>{formatBytes(c.byteSizeSum)}</Td>
          <Td actions>
            <IconButton
              id={`preview-collection-${c.id}-button`}
              variant="secondary"
              size="xs"
              icon="hero-eye"
              label="Preview collection"
              pending={previewingId === c.id}
              onClick={() => onPreview(c)}
            />
            <Button id={`download-collection-${c.id}-button`} variant="secondary" size="xs" href={c.downloadHref}>
              Download
            </Button>
            <Button
              id={`edit-collection-${c.id}-button`}
              variant="secondary"
              size="xs"
              disabled={!canManage}
              onClick={() => onEdit(c)}
            >
              Edit
            </Button>
            <Button
              id={`delete-collection-${c.id}-button`}
              variant="secondary"
              size="xs"
              disabled={!canManage}
              onClick={() => onDelete(c)}
            >
              Delete
            </Button>
          </Td>
        </Tr>
      ))}
    </Table>
  );
}
