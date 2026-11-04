import type { Meta, StoryObj } from "@storybook/react";
import ErrorPage from "./ErrorPage";

const meta: Meta<typeof ErrorPage> = {
  title: "Shell/ErrorPage",
  component: ErrorPage,
  args: { message: "Cannot read properties of undefined (reading 'name')", onRetry: () => {} },
};
export default meta;
type Story = StoryObj<typeof ErrorPage>;

export const Default: Story = {};
/** An error with no message of its own. */
export const NoMessage: Story = { args: { message: "" } };
