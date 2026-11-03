import type { Meta, StoryObj } from "@storybook/react";
import AuthLoginPage from "./AuthLoginPage";
import { exampleSsoProvider } from "../../mock-data/auth";
import { withCanvas, withRouter } from "../../stories/decorators";

const meta: Meta<typeof AuthLoginPage> = {
  title: "Pages/Auth/AuthLoginPage",
  component: AuthLoginPage,
  decorators: [withRouter, withCanvas("h-screen")],
  parameters: { layout: "fullscreen" },
  args: { allowSignup: false, ssoProvider: null, info: null, onSignIn: async () => {} },
};
export default meta;
type Story = StoryObj<typeof AuthLoginPage>;

export const Default: Story = {};
/** The host refuses: its words show at the top of the card. */
export const InvalidCredentials: Story = {
  args: { onSignIn: () => Promise.reject(new Error("The sign-in details are not valid.")) },
  play: async ({ canvasElement }) => {
    const type = (selector: string, value: string) => {
      const input = canvasElement.querySelector<HTMLInputElement>(selector)!;
      // Set the value the way a keystroke does, so React's onChange sees it.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    type("#user_email", "demo@openfn.org");
    type("#user_password", "wrong-password");
    await new Promise((r) => setTimeout(r));
    canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  },
};
export const LoggedOut: Story = { args: { info: "Logged out successfully." } };
export const WithSso: Story = { args: { ssoProvider: exampleSsoProvider } };
export const SignupAllowed: Story = { args: { allowSignup: true } };
