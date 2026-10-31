import type { AdminUserRow as User } from "../../types/admin";
import SearchInput from "../primitives/SearchInput";
import ButtonMenu from "../primitives/ButtonMenu";
import { MenuItem } from "../primitives/Menu";
import { Table, Td, Th, Tr } from "../primitives/Table";
import { useTableSort, type SortValue } from "../../utils/useTableSort";
import { formatShortDateTime } from "../../utils/format";
import Tooltip from "../primitives/Tooltip";

type SortKey = "first_name" | "last_name" | "email" | "role" | "enabled" | "support_user" | "scheduled_deletion";

const sortMap: Record<SortKey, (u: User) => SortValue> = {
  first_name: (u) => u.firstName,
  last_name: (u) => u.lastName,
  email: (u) => u.email,
  role: (u) => u.role,
  enabled: (u) => !u.disabled,
  support_user: (u) => u.supportUser,
  scheduled_deletion: (u) => u.scheduledDeletion ?? null,
};

const searchFields: ((u: User) => string)[] = [(u) => u.firstName, (u) => u.lastName, (u) => u.email, (u) => u.role];

const checkIcon = <span className="hero-check-circle-solid w-6 h-6 text-muted" />;

/**
 * The admin users table (user_live/components.ex `users_table`): a filter
 * box, sortable columns, an Actions dropdown per row (Edit / Delete), and the
 * superuser footnote.
 */
export default function UsersTable({
  users,
  onCancelDeletion,
}: {
  users: User[];
  onCancelDeletion?: (user: User) => void;
}) {
  const { rows, filter, setFilter, thProps } = useTableSort({
    rows: users,
    initialKey: "email",
    sortMap,
    searchFields,
    nulls: "last",
  });

  return (
    <>
      <SearchInput value={filter} onChange={setFilter} placeholder="Filter users..." className="mb-4 max-w-sm" />
      <Table
        header={
          <Tr>
            <Th {...thProps("first_name")}>First name</Th>
            <Th {...thProps("last_name")}>Last name</Th>
            <Th {...thProps("email")}>Email</Th>
            <Th {...thProps("role")}>Role*</Th>
            <Th {...thProps("enabled")}>Enabled?</Th>
            <Th {...thProps("support_user")}>Support?</Th>
            <Th {...thProps("scheduled_deletion")}>Scheduled Deletion</Th>
            <Th actions>Actions</Th>
          </Tr>
        }
      >
        {rows.map((user) => (
          <Tr key={user.id} id={`user-${user.id}`}>
            <Td wrap maxWidth={40}>
              <Tooltip content={user.firstName}>
                <span>{user.firstName}</span>
              </Tooltip>
            </Td>
            <Td wrap maxWidth={40}>
              <Tooltip content={user.lastName}>
                <span>{user.lastName}</span>
              </Tooltip>
            </Td>
            <Td wrap maxWidth={48}>
              <Tooltip content={user.email}>
                <span>{user.email}</span>
              </Tooltip>
            </Td>
            <Td>{user.role}</Td>
            <Td>{!user.disabled && checkIcon}</Td>
            <Td>{user.supportUser && checkIcon}</Td>
            <Td>{user.scheduledDeletion && formatShortDateTime(user.scheduledDeletion)}</Td>
            <Td className="py-0.5">
              <ButtonMenu label="Actions">
                <MenuItem to={`/settings/users/${user.id}`}>Edit</MenuItem>
                {user.scheduledDeletion && <MenuItem onClick={() => onCancelDeletion?.(user)}>Cancel deletion</MenuItem>}
                {/* Superusers can't be deleted from here. */}
                <MenuItem to={`/settings/users/${user.id}/delete`} disabled={user.role === "superuser"}>
                  {user.scheduledDeletion ? "Delete now" : "Delete"}
                </MenuItem>
              </ButtonMenu>
            </Td>
          </Tr>
        ))}
      </Table>
      <p className="mt-6 text-body">
        *Note that a <code>superuser</code> can access <em>everything</em> in a Lightning installation across all
        projects, including this page. Most day-to-day user management (adding and removing collaborators) will be
        done by project "admins" via the project settings page.
      </p>
    </>
  );
}
