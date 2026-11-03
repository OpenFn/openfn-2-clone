import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button/Button";
import { Trash2 } from "@/components/ui/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableRowHeader } from "./Table";

const meta = { title: "ui/Table", component: Table } satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { id: "a", token: "eyJhb…xyz12", created: "3 Nov 2026, 09:12", used: "Never used" },
  { id: "b", token: "eyJhb…Qm9vX", created: "12 Oct 2026, 16:40", used: "Never used" },
];

const render = (list: typeof rows) => (
  <Table aria-label="API tokens">
    <TableHead>
      <TableHeader>Token</TableHeader>
      <TableHeader>Created on</TableHeader>
      <TableHeader>Last used</TableHeader>
      <TableHeader align="end" hidden>Actions</TableHeader>
    </TableHead>
    <TableBody>
      {list.map((row) => (
        <TableRow key={row.id}>
          <TableRowHeader>{row.token}</TableRowHeader>
          <TableCell>{row.created}</TableCell>
          <TableCell>{row.used}</TableCell>
          <TableCell align="end">
            <Button variant="secondary" tone="danger" size="xs" icon={Trash2}>Delete</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const Default: Story = { args: { children: null }, render: () => render(rows) };
/** Long values wrap in their cell; the table scrolls sideways before it squashes a column to nothing. */
export const LongText: Story = {
  args: { children: null },
  render: () =>
    render([{ id: "c", token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.Ministry-of-Health-production…", created: "Wednesday 30 September 2026, 23:59", used: "Never used" }]),
};
