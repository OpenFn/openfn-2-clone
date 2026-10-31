import type { Meta, StoryObj } from "@storybook/react";
import Card from "./Card";
import Button from "./Button";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  args: { children: "The webhook URL is shown once the trigger is saved." },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};
export const WithHeader: Story = {
  args: {
    title: "Project Identity",
    description: "Project name and description.",
    action: <Button variant="secondary">Edit</Button>,
  },
};
export const Large: Story = { args: { padding: "lg" } };
export const Muted: Story = { args: { variant: "muted" } };
export const Dashed: Story = { args: { variant: "dashed", className: "text-center text-sm text-muted", children: "Drop a file here" } };
export const Clickable: Story = { args: { as: "button", onClick: () => {}, children: "Start from a template" } };
export const LongTitle: Story = {
  args: {
    title: "Kenya MoH community health referrals to DHIS2 aggregate sync (sandbox)",
    description: "Fetch overdue referrals and upsert them as DHIS2 tracker events every fifteen minutes.",
    action: <Button variant="secondary">Edit</Button>,
  },
};
