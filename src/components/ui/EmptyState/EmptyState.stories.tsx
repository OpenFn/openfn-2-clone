import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button/Button";
import { Fingerprint, Plus } from "@/components/ui/icons";
import { EmptyState } from "./EmptyState";

const meta = { title: "ui/EmptyState", component: EmptyState } satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Fingerprint,
    title: "No personal access tokens",
    description: "Get started by creating a new access token.",
    action: <Button icon={Plus}>Generate new token</Button>,
  },
};
export const TitleOnly: Story = { args: { title: "No personal access tokens" } };
export const LongText: Story = {
  args: {
    icon: Fingerprint,
    title: "No personal access tokens for the Ministry of Health production DHIS2 integration account",
    description: "Get started by creating a new access token. Scripts and the OpenFn CLI use it to act as you, so keep it somewhere safe.",
  },
};
