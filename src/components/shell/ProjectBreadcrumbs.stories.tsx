import type { Meta, StoryObj } from "@storybook/react";
import ProjectBreadcrumbs from "./ProjectBreadcrumbs";
import { projectLabel } from "./projectPickerItems";
import { projects } from "../../mock-data/projects";
import { withRouter } from "../../stories/decorators";

const meta: Meta<typeof ProjectBreadcrumbs> = { title: "Shell/ProjectBreadcrumbs", component: ProjectBreadcrumbs, decorators: [withRouter] };
export default meta;
type Story = StoryObj<typeof ProjectBreadcrumbs>;

export const Project: Story = {
  args: {
    project: projects[0]!,
    label: projectLabel(projects[0]!, projects),
    items: [["History", `/projects/${projects[0]!.id}/history`]],
    current: "Run 962b650f",
  },
};

export const Sandbox: Story = {
  args: { project: projects[2]!, label: projectLabel(projects[2]!, projects), current: "Workflows" },
};
