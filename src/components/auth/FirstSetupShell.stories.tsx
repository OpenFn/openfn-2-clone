import type { Meta, StoryObj } from "@storybook/react";
import FirstSetupShell from "./FirstSetupShell";
import Header from "../primitives/Header";
import { Centered, PageContent } from "../primitives/PageContent";

const meta: Meta<typeof FirstSetupShell> = {
  title: "Auth/FirstSetupShell",
  component: FirstSetupShell,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof FirstSetupShell>;

export const Default: Story = {
  args: {
    releaseLabel: "v2.19.1",
    children: (
      <PageContent header={<Header title="Setup" size="xl" />}>
        <Centered>
          <p>Page content</p>
        </Centered>
      </PageContent>
    ),
  },
};
