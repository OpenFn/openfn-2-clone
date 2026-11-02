import { useState } from "react";
import type { AdminProjectForm as FormData, AdminProjectFormValues, AdminProjectUser } from "../../types/admin";
import type { ProjectRole } from "../../types/projects";
import { fullName, urlSafeName } from "../../utils/format";
import { cn } from "../../utils/cn";
import { RequestError, errorMessage } from "../../utils/errors";
import { useAction } from "../../utils/useAction";
import SearchInput from "../primitives/SearchInput";
import Button from "../primitives/Button";
import Form from "../primitives/Form";
import Section from "../primitives/Section";
import { Radio } from "../primitives/Inputs";
import NameField from "../primitives/NameField";
import { Table, Td, Th, Tr } from "../primitives/Table";
import { useTableSort, type SortValue } from "../../utils/useTableSort";

type Role = ProjectRole | "";
const ROLES: ProjectRole[] = ["owner", "admin", "editor", "viewer"];

interface Row {
  user: AdminProjectUser;
  role: Role;
}

type SortKey = "name" | "email" | "no_access" | ProjectRole;

const sortMap: Record<SortKey, (r: Row) => SortValue> = {
  name: (r) => fullName(r.user),
  email: (r) => r.user.email,
  no_access: (r) => r.role === "",
  owner: (r) => r.role === "owner",
  admin: (r) => r.role === "admin",
  editor: (r) => r.role === "editor",
  viewer: (r) => r.role === "viewer",
};

const searchFields: ((r: Row) => string)[] = [(r) => fullName(r.user), (r) => r.user.email, (r) => r.role];

interface Props {
  /** The project being edited; omit for /settings/projects/new. */
  project?: FormData["project"] | undefined;
  users: AdminProjectUser[];
  /** Saves the form. Rejects with field errors (`rawName`, `owner`) or a message, shown by the form. */
  onSave: (values: AdminProjectFormValues) => Promise<void>;
  /** Where Cancel goes. */
  cancelHref: string;
}

/**
 * The superuser project form (project_live/form_component.html.heex): a
 * name (with the slug it will get) and a role radio grid for every user in
 * the instance. Save is always enabled: pressing it without a name or
 * exactly one owner shows why and sends nothing. The host checks both again
 * and replies its own owner error.
 */
export default function AdminProjectForm({ project, users, onSave, cancelHref }: Props) {
  const [rawName, setRawName] = useState(project?.name ?? "");
  const [roles, setRoles] = useState<Record<string, Role>>(() =>
    Object.fromEntries(users.map((u) => [u.id, project?.members.find((m) => m.userId === u.id)?.role ?? ""]))
  );
  // Errors show once something has changed or Save was pressed.
  const [touched, setTouched] = useState(false);
  const rows: Row[] = users.map((user) => ({ user, role: roles[user.id] ?? "" }));
  const sort = useTableSort({ rows, initialKey: "name", sortMap, searchFields });
  const save = useAction(() => onSave({ rawName, roles }));

  const name = urlSafeName(rawName);
  const owners = Object.values(roles).filter((r) => r === "owner").length;
  const valid = name !== "" && owners === 1;
  const fieldErrors = save.error instanceof RequestError ? save.error.fieldErrors : {};
  const ownerError =
    fieldErrors["owner"]?.[0] ??
    (owners > 1
      ? "A project can have only one owner."
      : touched && owners === 0
        ? "Every project must have exactly one owner. Please specify one below."
        : null);
  // Both show: a new owner mistake mustn't hide why the last Save failed.
  const otherError = save.error && !fieldErrors["owner"] && !fieldErrors["rawName"] ? errorMessage(save.error) : null;

  const th = (key: SortKey, label: string, center = true) => (
    <Th align={center ? "center" : "left"} {...sort.thProps(key)}>
      {label}
    </Th>
  );

  return (
    <div id={`project-form-${project?.id ?? "new"}`}>
      <Form
        id="project-form"
        pending={save.pending}
        error={[ownerError, otherError].filter(Boolean).join(" ") || null}
        actions={
          <>
            <Button variant="secondary" to={cancelHref}>
              Cancel
            </Button>
            <Button type="submit">
              Save
            </Button>
          </>
        }
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) void save.run();
        }}
      >
        <NameField
          id="project_raw_name"
          name="raw_name"
          value={rawName}
          onChange={(raw) => {
            setRawName(raw);
            setTouched(true);
            save.reset();
          }}
          errors={fieldErrors["rawName"] ?? (touched && name === "" ? ["can't be blank"] : [])}
          badgeLabel="Note that this project will be named:"
          fieldClassName="w-1/2"
        />
        {/* eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mt-8) */}
        <Section title="Manage project users" className="mt-8">
          <SearchInput value={sort.filter} onChange={sort.setFilter} placeholder="Filter users..." className="max-w-sm" />

          <Table
            id="project_users_table"
            header={
              <Tr>
                {th("name", "NAME", false)}
                {th("email", "EMAIL", false)}
                {th("no_access", "NO ACCESS")}
                {th("owner", "OWNER")}
                {th("admin", "ADMIN")}
                {th("editor", "EDITOR")}
                {th("viewer", "VIEWER")}
              </Tr>
            }
          >
            {sort.rows.map(({ user, role }) => (
              // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-faint)
              <Tr key={user.id} className={cn(role === "" && "text-faint")}>
                <Td>{fullName(user)}</Td>
                <Td>{user.email}</Td>
                {(["", ...ROLES] as Role[]).map((r) => (
                  <Td key={r || "no_access"} align="center">
                    <span className="inline-flex justify-center">
                      <Radio
                        name={`project_users[${user.id}][role]`}
                        id={`project_users_${user.id}_role_${r || "no_access"}`}
                        label={<span className="sr-only">{`${fullName(user)}: ${r || "no access"}`}</span>}
                        checked={role === r}
                        onChange={() => {
                          setRoles((prev) => ({ ...prev, [user.id]: r }));
                          setTouched(true);
                          save.reset();
                        }}
                      />
                    </span>
                  </Td>
                ))}
              </Tr>
            ))}
          </Table>
        </Section>
      </Form>
    </div>
  );
}
