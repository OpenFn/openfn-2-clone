import type { Meta, StoryObj } from "@storybook/react";
import AuthTwoFactorPage from "./AuthTwoFactorPage";
import { withCanvas, withRouter } from "../../stories/decorators";

const meta: Meta<typeof AuthTwoFactorPage> = {
  title: "Pages/Auth/AuthTwoFactorPage",
  component: AuthTwoFactorPage,
  decorators: [withRouter, withCanvas("h-screen")],
  parameters: { layout: "fullscreen" },
  args: { method: "totp", onVerify: async () => {} },
};
export default meta;
type Story = StoryObj<typeof AuthTwoFactorPage>;

export const AuthenticatorCode: Story = {};
export const BackupCode: Story = { args: { method: "backup_code" } };
/** The host refuses the code: its words show above the field. */
export const InvalidCode: Story = {
  args: { onVerify: () => Promise.reject(new Error("The sign-in details are not valid.")) },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>("#user_code")!;
    // Set the value the way a keystroke does, so React's onChange sees it.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "000000");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  },
};
