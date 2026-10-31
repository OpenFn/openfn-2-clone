import type { Meta, StoryObj } from "@storybook/react";
import { Table, Td, Th, Tr } from "./Table";
import Pagination from "./Pagination";
import { users } from "../../mock-data/users";
import { fullName } from "../../utils/format";

const meta: Meta = { title: "Primitives/Table" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Table
      header={
        <Tr>
          <Th sortDirection="asc" onSort={() => {}}>
            Name
          </Th>
          <Th>Email</Th>
          <Th>Role</Th>
        </Tr>
      }
      footer={<Pagination page={{ number: 1, size: 10, totalEntries: users.length }} />}
    >
      {users.map((u) => (
        <Tr key={u.id} onClick={() => {}}>
          <Td className="text-strong">{fullName(u)}</Td>
          <Td>{u.email}</Td>
          <Td>{u.role}</Td>
        </Tr>
      ))}
    </Table>
  ),
};

const header = (
  <Tr>
    <Th>Name</Th>
    <Th>Email</Th>
    <Th>Role</Th>
  </Tr>
);

/** A server-driven list while its search runs. */
export const Loading: Story = {
  render: () => (
    <Table header={header} state="loading" loadingMessage="Loading work orders ...">
      {null}
    </Table>
  ),
};

/** A server-driven list whose search failed. */
export const LoadError: Story = {
  render: () => (
    <Table header={header} state="error" errorMessage="There was an error loading the work orders">
      {null}
    </Table>
  ),
};

/**
 * `wrap` breaks long words when the table is narrow. `maxWidth` sets a
 * max-width the table layout ignores while it has room (F530).
 */
export const WrapAndMaxWidth: Story = {
  render: () => (
    <div className="max-w-xl">
      <Table header={header}>
        {users.map((u) => (
          <Tr key={u.id}>
            <Td wrap maxWidth={40}>
              {fullName(u)}
            </Td>
            <Td wrap maxWidth={48}>
              {u.email}
            </Td>
            <Td>{u.role}</Td>
          </Tr>
        ))}
        <Tr>
          <Td wrap maxWidth={40}>
            Maximiliana Wolfeschlegelsteinhausen-Bergerdorff
          </Td>
          <Td wrap maxWidth={48}>
            maximiliana.wolfeschlegelsteinhausen@ministry-of-health.example.org
          </Td>
          <Td>viewer</Td>
        </Tr>
      </Table>
    </div>
  ),
};
