import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

const meta = {
  title: "ui/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    title: "Delete token?",
    children: <p>Any applications or scripts using this token will no longer be able to access the API.</p>,
    confirmLabel: "Delete token",
    tone: "danger",
    onConfirm: fn(() => Promise.resolve()),
    onClose: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Waiting on the action: the button spins and Cancel can't be pressed. */
export const Pending: Story = {
  args: { onConfirm: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete token" }));
    await expect(canvas.getByRole("button", { name: "Delete token" })).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeDisabled();
  },
};
/** The action failed: the error stays in the dialog, which stays open. */
export const Failed: Story = {
  args: { onConfirm: fn(() => Promise.reject(new Error("This token doesn't exist any more."))) },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete token" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This token doesn't exist any more.");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
/** Enter on the focused button confirms; Escape cancels. */
export const Keyboard: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onClose).toHaveBeenCalledOnce();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalledTimes(2);
  },
};
