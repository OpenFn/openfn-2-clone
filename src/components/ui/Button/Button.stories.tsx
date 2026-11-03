import type { Meta, StoryObj } from "@storybook/react-vite";
import { GitBranch, Plus, ShieldX, Trash2 } from "lucide-react";
import { Button } from "./Button";

const meta = {
  title: "ui/Button",
  component: Button,
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "plain"] },
    tone: { control: "select", options: [undefined, "danger"] },
    size: { control: "select", options: ["xs", "sm", "md"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: "Save" } };
export const Secondary: Story = { args: { children: "Cancel", variant: "secondary" } };
export const Plain: Story = { args: { children: "Dismiss", variant: "plain", size: "xs" } };
export const PrimaryDanger: Story = { args: { children: "Delete project", tone: "danger", icon: Trash2 } };
/** Removing one thing from a list. */
export const SecondaryDanger: Story = { args: { children: "Revoke", variant: "secondary", tone: "danger", size: "xs", icon: ShieldX } };
export const PlainDanger: Story = { args: { children: "Remove collaborator", variant: "plain", tone: "danger", size: "xs" } };
export const WithIcon: Story = { args: { children: "Generate new token", icon: Plus, size: "sm" } };
/** Someone else's brand doesn't colour the button; its icon says whose it is. */
export const ThirdParty: Story = { args: { children: "Connect your GitHub account", variant: "secondary", icon: GitBranch } };
export const Disabled: Story = {
  args: { children: "Save" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Save</Button>
      <Button tone="danger" disabled>Delete project</Button>
      <Button variant="secondary" disabled>Add private credential</Button>
      <Button variant="secondary" tone="danger" size="xs" disabled>Revoke</Button>
      <Button variant="plain" size="xs" disabled>Dismiss</Button>
    </div>
  ),
};
export const LongText: Story = {
  args: { children: "Connect the Ministry of Health production DHIS2 instance to this project", variant: "secondary", icon: Plus },
};
