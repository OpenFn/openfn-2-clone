import type { Meta, StoryObj } from "@storybook/react";
import RouteErrorBoundary from "./RouteErrorBoundary";

function CrashingPage(): never {
  throw new Error("Cannot read properties of undefined (reading 'name')");
}

const meta: Meta = { title: "Shell/RouteErrorBoundary" };
export default meta;
type Story = StoryObj;

/** A page that throws while drawing: the error page takes its place. */
export const PageCrashed: Story = {
  render: () => (
    <RouteErrorBoundary resetKey="/projects">
      <CrashingPage />
    </RouteErrorBoundary>
  ),
};
