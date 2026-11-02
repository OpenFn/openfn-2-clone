import type { AdminProjectRow } from "../../types/admin";
import SearchInput from "../primitives/SearchInput";
import { Stack } from "../primitives/Stack";
import ButtonMenu from "../primitives/ButtonMenu";
import { MenuItem } from "../primitives/Menu";
import { Table, Td, Th, Tr } from "../primitives/Table";
import { useTableSort, type SortValue } from "../../utils/useTableSort";
import { formatShortDateTime } from "../../utils/format";

type SortKey = "name" | "inserted_at" | "description" | "owner" | "scheduled_deletion";

const sortMap: Record<SortKey, (p: AdminProjectRow) => SortValue> = {
  name: (p) => p.name,
  inserted_at: (p) => p.insertedAt,
  description: (p) => p.description,
  owner: (p) => p.ownerName,
  scheduled_deletion: (p) => p.scheduledDeletion,
};

const searchFields: ((p: AdminProjectRow) => string)[] = [(p) => p.name, (p) => p.description, (p) => p.ownerName];

/**
 * The superuser projects table (project_live/index.html.heex): every project
 * in the instance, filterable and sortable, with Edit / Delete (or Cancel
 * deletion / Delete now) in each row's Actions menu.
 */
export default function AdminProjectsTable({
  projects,
  onCancelDeletion,
}: {
  projects: AdminProjectRow[];
  onCancelDeletion?: (project: AdminProjectRow) => void;
}) {
  const { rows, filter, setFilter, thProps } = useTableSort({
    rows: projects,
    initialKey: "name",
    sortMap,
    searchFields,
    nulls: "last",
  });

  return (
    <Stack>
      <SearchInput value={filter} onChange={setFilter} placeholder="Filter projects..." className="max-w-sm" />
      <Table
        id="projects"
        header={
          <Tr>
            <Th {...thProps("name")}>Name</Th>
            <Th {...thProps("inserted_at")}>Created At</Th>
            <Th {...thProps("description")}>Description</Th>
            <Th {...thProps("owner")}>Owner</Th>
            <Th {...thProps("scheduled_deletion")}>Scheduled Deletion</Th>
            <Th actions />
          </Tr>
        }
      >
        {rows.map((project) => {
          const owner = project.ownerName;
          const deletion = project.scheduledDeletion;
          return (
            <Tr key={project.id} id={`project-row-${project.id}`}>
              <Td wrap maxWidth={80}>{project.name}</Td>
              <Td>{formatShortDateTime(project.insertedAt)}</Td>
              <Td wrap maxWidth={80}>{project.description}</Td>
              <Td wrap maxWidth={64}>{owner === "" ? "No owner" : owner}</Td>
              <Td>{deletion && formatShortDateTime(deletion)}</Td>
              {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (py-0.5) */}
              <Td actions className="py-0.5">
                <ButtonMenu label="Actions">
                  <MenuItem to={`/settings/projects/${project.id}`}>Edit</MenuItem>
                  {deletion && <MenuItem onClick={() => onCancelDeletion?.(project)}>Cancel deletion</MenuItem>}
                  <MenuItem to={`/settings/projects/${project.id}/delete`}>{deletion ? "Delete now" : "Delete"}</MenuItem>
                </ButtonMenu>
              </Td>
            </Tr>
          );
        })}
      </Table>
    </Stack>
  );
}
