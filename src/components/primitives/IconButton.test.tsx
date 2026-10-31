import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hover, openTooltips } from "../../test/tooltip";
import Button from "./Button";
import IconButton from "./IconButton";

describe("IconButton", () => {
  it("lets a caller's hover colour replace its own", () => {
    render(<IconButton icon="hero-x-mark" label="Cancel" className="hover:text-danger" />);
    const classes = screen.getByRole("button", { name: "Cancel" }).className;
    expect(classes).toContain("hover:text-danger");
    expect(classes).not.toMatch(/hover:text-body/);
  });

  it("is a square as tall as a Button of the same size", () => {
    for (const size of ["xs", "sm", "md", "lg"] as const) {
      const { unmount } = render(
        <>
          <Button size={size}>Save</Button>
          <IconButton icon="hero-x-mark" label="Close" size={size} />
        </>
      );
      const height = screen.getByRole("button", { name: "Save" }).className.match(/min-h-(\d+)/)?.[1];
      expect(screen.getByRole("button", { name: "Close" }).className).toMatch(new RegExp(`(^| )size-${height}( |$)`));
      unmount();
    }
  });

  it("defaults to the plain variant the light theme's `:not([data-variant=\"plain\"])` relies on", () => {
    render(<IconButton icon="hero-x-mark" label="Close" />);
    expect(screen.getByRole("button", { name: "Close" }).getAttribute("data-variant")).toBe("plain");
  });

  it("marks a toggle that's on as pressed", () => {
    render(<IconButton icon="hero-funnel" label="Filter" active />);
    expect(screen.getByRole("button", { name: "Filter", pressed: true })).toBeTruthy();
  });

  it("passes a disabled button's hover to the wrapper that shows its label", async () => {
    render(<IconButton icon="hero-trash" label="Delete" disabled />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.parentElement!.classList).toContain("cursor-not-allowed");
    expect(button.parentElement!.classList).toContain("*:pointer-events-none");
    await hover(button.parentElement!);
    expect(openTooltips()).toEqual(["Delete"]);
  });
});
