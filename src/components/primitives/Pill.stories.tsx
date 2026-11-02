import type { Meta, StoryObj } from "@storybook/react";
import Pill from "./Pill";
import { withWhitePanel } from "../../stories/decorators";

const meta: Meta<typeof Pill> = { title: "Primitives/Pill", component: Pill, args: { children: "main" }, decorators: [withWhitePanel("w-auto")] };
export default meta;
type Story = StoryObj<typeof Pill>;

export const Neutral: Story = {};
export const Success: Story = { args: { tone: "success", children: "Live" } };
export const Danger: Story = { args: { tone: "danger", children: "Deleted in sandbox" } };
export const Warning: Story = { args: { tone: "warning", children: "Read-only" } };
export const Info: Story = { args: { tone: "info", children: "New" } };
/** `color` is for tags that mean nothing, like dataclip types and HTTP methods. */
export const TagColour: Story = { args: { color: "purple", children: <code>step_result</code> } };
export const Square: Story = { args: { color: "primary", variant: "square", children: "latest" } };
export const Removable: Story = { args: { color: "blue", children: "openhie-project", onRemove: () => {} } };
/** Code text goes in `<code>`. */
export const Mono: Story = { args: { children: <code>v2.14.3</code> } };
export const LongText: Story = { args: { color: "blue", children: "kenya-moh-community-health-referrals-sandbox", onRemove: () => {} } };
/** `title` shows as a tooltip on hover. */
export const WithTooltip: Story = { args: { tone: "warning", children: "Read-only", title: "Sandboxes can't edit this setting" } };
