import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "./Callout";

const meta = { title: "ui/Callout", component: Callout } satisfies Meta<typeof Callout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { title: "Copy your token now. You won't be able to see it again." } };
export const Danger: Story = {
  args: { tone: "danger", role: "alert", title: "Couldn't load your tokens", children: "Lightning didn't answer. Check your connection." },
};
/** An error that stays until it's dealt with. Its buttons are `secondary`: `plain`'s muted words are under 4.5:1 on the danger panel. */
export const WithActions: Story = {
  args: {
    tone: "danger",
    title: "Couldn't load your tokens",
    children: "Lightning didn't answer.",
    actions: (
      <>
        <Button variant="secondary" size="xs">Dismiss</Button>
        <Button variant="secondary" size="xs">Try again</Button>
      </>
    ),
  },
};
export const LongText: Story = {
  args: {
    title: "Lightning wants you to enter your password again before it makes a new token for the Ministry of Health production instance",
    children:
      "Asking for your password here isn't built yet. Sign out and back in, then generate the token within five minutes, or ask an administrator to make one for the integration that needs it.",
  },
};
