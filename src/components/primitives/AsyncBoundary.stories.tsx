import type { Meta, StoryObj } from "@storybook/react";
import AsyncBoundary from "./AsyncBoundary";
import Text from "./Text";

const meta: Meta<typeof AsyncBoundary> = { title: "Primitives/AsyncBoundary", component: AsyncBoundary };
export default meta;
type Story = StoryObj<typeof AsyncBoundary>;

const content = <Text>The page's content.</Text>;

export const Ready: Story = { render: () => <AsyncBoundary status={{ state: "ready" }}>{content}</AsyncBoundary> };
export const Loading: Story = { render: () => <AsyncBoundary status={{ state: "loading" }}>{content}</AsyncBoundary> };
export const NotFound: Story = { render: () => <AsyncBoundary status={{ state: "notFound" }}>{content}</AsyncBoundary> };
export const Forbidden: Story = { render: () => <AsyncBoundary status={{ state: "forbidden" }}>{content}</AsyncBoundary> };
export const Failed: Story = {
  render: () => <AsyncBoundary status={{ state: "error", message: "Authentication is required." }}>{content}</AsyncBoundary>,
};
