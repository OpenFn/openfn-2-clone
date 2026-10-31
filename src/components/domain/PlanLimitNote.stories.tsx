import type { Meta, StoryObj } from "@storybook/react";
import PlanLimitNote from "./PlanLimitNote";

const meta: Meta<typeof PlanLimitNote> = {
  title: "Domain/PlanLimitNote",
  component: PlanLimitNote,
  args: { children: "Your plan keeps run history for 7 days. Upgrade your plan for longer retention." },
};
export default meta;
type Story = StoryObj<typeof PlanLimitNote>;

export const Default: Story = {};
/** A long message wraps under itself, the lock stays at the top. */
export const Long: Story = {
  args: { children: "Not allowed on Free plans. Parallel execution can only be turned off on a paid plan, which also raises the number of runs you can start each month." },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
};
