import type { Meta, StoryObj } from "@storybook/react";
import CopyChip from "./CopyChip";

const meta: Meta<typeof CopyChip> = { title: "Primitives/CopyChip", component: CopyChip, args: { value: "ext-dhis2-prod-01" } };
export default meta;
type Story = StoryObj<typeof CopyChip>;

export const Short: Story = {};
/** In a narrow box: cut off with an ellipsis, the whole value on hover. */
export const Long: Story = {
  args: { value: "$.data.district-health-information-system-production-instance.credential_id" },
  decorators: [(Story) => <div className="w-60">{Story()}</div>],
};
