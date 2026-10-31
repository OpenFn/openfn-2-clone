import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { hover, openTooltips } from "../../test/tooltip";
import IconButton from "./IconButton";
import Modal from "./Modal";

describe("Modal", () => {
  it("names the dialog by its title and describes it by its description", () => {
    render(<Modal open title="Delete project" description="This cannot be undone" onClose={() => {}}>Sure?</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Delete project" });
    const describedBy = dialog.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("This cannot be undone");
  });

  it("names a dialog that shows no title by its label", () => {
    render(<Modal open variant="bare" title="Hidden" label="Search projects" onClose={() => {}}>Picker</Modal>);
    screen.getByRole("dialog", { name: "Search projects" });
  });

  it("closes on the first Escape, with no tooltip on its X to take it", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Delete project">Sure?</Modal>);
    // A browser moves focus to the X, the first focusable element; jsdom stops at the dialog, so focus it here.
    const close = screen.getByRole("button", { name: "Close" });
    act(() => close.focus());
    expect(openTooltips()).toEqual([]);
    fireEvent.keyDown(close, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on the first Escape while a tooltip inside it is open", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Delete project">
        <IconButton icon="hero-trash" label="Delete" />
      </Modal>
    );
    const del = screen.getByRole("button", { name: "Delete" });
    await hover(del);
    expect(openTooltips()).toEqual(["Delete"]);
    fireEvent.keyDown(del, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
