import type { Meta, StoryObj } from "@storybook/react";
import { OpenFnLogo, OpenFnLogoCollapsed } from "./OpenFnLogo";

const meta: Meta = { title: "Shell/OpenFnLogo" };
export default meta;
type Story = StoryObj;

export const Full: Story = { render: () => <OpenFnLogo className="h-6 text-brand" /> };
export const Collapsed: Story = { render: () => <OpenFnLogoCollapsed className="h-6 text-brand" /> };
