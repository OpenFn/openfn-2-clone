import type { Meta, StoryObj } from "@storybook/react";
import Header from "./Header";
import Button from "./Button";
import ProjectBreadcrumbs from "../shell/ProjectBreadcrumbs";
import { projectLabel } from "../shell/projectPickerItems";
import { projects } from "../../mock-data/projects";
import { withRouter } from "../../stories/decorators";

const meta: Meta<typeof Header> = { title: "Primitives/Header", component: Header, decorators: [withRouter] };
export default meta;
type Story = StoryObj<typeof Header>;

export const Title: Story = { args: { title: "Projects" } };
export const WithAction: Story = {
  args: { title: "Personal Access Tokens", children: <Button>Generate New Token</Button> },
};
export const WithBreadcrumbs: Story = {
  args: { breadcrumbs: <ProjectBreadcrumbs project={projects[0]!} label={projectLabel(projects[0]!, projects)} current="History" /> },
};
export const TitleWithCount: Story = {
  args: { title: "Projects", count: 3, children: <Button>Create project</Button> },
};
export const WithBreadcrumbsAndTitle: Story = {
  args: {
    breadcrumbs: <ProjectBreadcrumbs project={projects[0]!} label={projectLabel(projects[0]!, projects)} current="Workflows" />,
    title: "Workflows",
    count: 3,
    children: <Button>Create new workflow</Button>,
  },
};
export const LongTitle: Story = {
  args: {
    breadcrumbs: <ProjectBreadcrumbs project={projects[0]!} label={projectLabel(projects[0]!, projects)} current="Settings" />,
    title: "Malawi Community Health Worker Referrals to National HMIS (DHIS2 Tracker) settings",
    children: <Button>Save</Button>,
  },
};
export const LoggedOut: Story = { args: { title: "Log in", size: "xl" } };
export const LongBreadcrumbs: Story = {
  args: {
    breadcrumbs: (
      <ProjectBreadcrumbs
        project={projects[0]!}
        label="Kenya MoH community health referrals to DHIS2 aggregate sync (sandbox)"
        current="Fetch overdue referrals and upsert them as DHIS2 tracker events"
      />
    ),
  },
};
