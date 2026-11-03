import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextInput } from "./TextInput";

const meta = { title: "ui/TextInput", component: TextInput, args: { "aria-label": "Name" } } satisfies Meta<typeof TextInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "My workflow" } };
export const ReadOnly: Story = { args: { readOnly: true, monospace: true, value: "demo.fake-token-not-real.4f1c9a2b", "aria-label": "New token" } };
export const Disabled: Story = { args: { disabled: true, value: "Can't change this" } };
