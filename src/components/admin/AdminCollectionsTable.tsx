import type { AdminCollectionRow } from "../../types/admin";
import { formatBytes } from "../../utils/format";
import Button from "../primitives/Button";
import EmptyState from "../primitives/EmptyState";
import { Table, Td, Th, Tr } from "../primitives/Table";
import { useTableSort, type SortValue } from "../../utils/useTableSort";

const sortMap: Record<"name" | "byte_size_sum", (c: AdminCollectionRow) => SortValue> = {
  name: (c) => c.name,
  byte_size_sum: (c) => c.byteSizeSum,
};

interface Props {
  collections: AdminCollectionRow[];
  onCreate: () => void;
  onEdit: (collection: AdminCollectionRow) => void;
  onDelete: (collection: AdminCollectionRow) => void;
}

/**
 * The instance-wide collections table (collection_live/components.ex
 * `collections_table`): name / project / used storage with Edit and Delete
 * per row, sorted in the browser. With no collections it's the dashed "Create a new one." box.
 * Ids are Lightning's.
 */
export default function AdminCollectionsTable({ collections, onCreate, onEdit, onDelete }: Props) {
  const { rows, thProps } = useTableSort({ rows: collections, sortMap, initialKey: "name" });

  if (collections.length === 0) {
    return (
      <EmptyState
        id="open-create-collection-modal-big-buttton"
        icon="hero-plus-circle"
        message="No collection found."
        buttonText="Create a new one."
        onClick={onCreate}
      />
    );
  }

  return (
    <Table
      id="collections-table"
      header={
        <Tr>
          <Th {...thProps("name")}>Name</Th>
          <Th>Project</Th>
          <Th {...thProps("byte_size_sum")}>Used storage</Th>
          <Th actions />
        </Tr>
      }
    >
      {rows.map((collection) => (
        <Tr key={collection.id} id={`collections-table-row-${collection.id}`}>
          {/* eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-strong) */}
          <Td wrap maxWidth={60} className="text-strong">{collection.name}</Td>
          <Td wrap maxWidth={100}>{collection.projectName}</Td>
          <Td wrap maxWidth={100}>{formatBytes(collection.byteSizeSum)}</Td>
          <Td actions>
            <Button
              id={`edit-collection-${collection.id}-button`}
              aria-label={`Edit ${collection.name}`}
              variant="secondary"
              size="xs"
              onClick={() => onEdit(collection)}
            >
              Edit
            </Button>
            <Button
              id={`delete-collection-${collection.id}-button`}
              aria-label={`Delete ${collection.name}`}
              variant="secondary"
              size="xs"
              onClick={() => onDelete(collection)}
            >
              Delete
            </Button>
          </Td>
        </Tr>
      ))}
    </Table>
  );
}
