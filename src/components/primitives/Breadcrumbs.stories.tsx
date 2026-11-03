import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb, Breadcrumbs } from "./Breadcrumbs";
import { withRouter } from "../../stories/decorators";

const meta: Meta = { title: "Primitives/Breadcrumbs", decorators: [withRouter] };
export default meta;
type Story = StoryObj;

export const Plain: Story = {
  render: () => (
    <Breadcrumbs>
      <Breadcrumb to="/settings/users">Users</Breadcrumb>
      <Breadcrumb>Amy Admin</Breadcrumb>
    </Breadcrumbs>
  ),
};

export const LongNames: Story = {
  render: () => (
    <Breadcrumbs>
      <Breadcrumb to="/projects">Kenya MoH community health referrals to DHIS2 aggregate sync (sandbox)</Breadcrumb>
      <Breadcrumb>Fetch overdue referrals and upsert them as DHIS2 tracker events</Breadcrumb>
    </Breadcrumbs>
  ),
};
