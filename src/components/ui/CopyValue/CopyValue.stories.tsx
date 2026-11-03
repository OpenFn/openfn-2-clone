import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { CopyValue } from "./CopyValue";

const meta = {
  title: "ui/CopyValue",
  component: CopyValue,
  args: { label: "New token", value: "demo.fake-token-not-real.4f1c9a2b" },
  // The test browser has no clipboard permission; stand in for it.
  beforeEach: () => {
    const real = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.resolve() } });
    return () => {
      if (real) Object.defineProperty(navigator, "clipboard", real);
    };
  },
} satisfies Meta<typeof CopyValue>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongValue: Story = {
  args: { value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik1pbmlzdHJ5IG9mIEhlYWx0aCJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" },
};
/** Tab to Copy, press Enter: the button says "Copied" and a screen reader hears it. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("textbox", { name: "New token" })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByRole("button", { name: "Copied" })).toHaveFocus();
    await expect(canvas.getByRole("status")).toHaveTextContent("Copied");
  },
};
