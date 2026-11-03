import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Button } from "@/components/ui/Button/Button";
import { Dialog } from "./Dialog";

const meta = { title: "ui/Dialog", component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

function Opener({ startOpen }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
      {open && (
        <Dialog
          title="Rename workflow"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Save</Button>
            </>
          }
        >
          <p>The new name shows everywhere this workflow is listed.</p>
        </Dialog>
      )}
    </>
  );
}

const args = { title: "", onClose: () => {}, children: null };

export const Open: Story = { args, render: () => <Opener startOpen /> };
/** Focus goes in, Tab wraps round inside, Escape closes it and focus comes back to the button that opened it. */
export const Keyboard: Story = {
  args,
  render: () => <Opener />,
  play: async ({ canvas }) => {
    const opener = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(opener);
    await canvas.findByRole("dialog", { name: "Rename workflow" });
    const cancel = canvas.getByRole("button", { name: "Cancel" });
    await expect(cancel).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(canvas.getByRole("button", { name: "Save" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(opener).toHaveFocus();
  },
};
