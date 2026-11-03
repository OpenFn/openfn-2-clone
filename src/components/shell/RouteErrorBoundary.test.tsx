import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RouteErrorBoundary from "./RouteErrorBoundary";

let broken = true;
function Page() {
  if (broken) throw new Error("Cannot read properties of undefined (reading 'name')");
  return <p>The page</p>;
}

describe("RouteErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the error page in place of a page that crashes, and Try again draws the page again", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    broken = true;
    render(
      <RouteErrorBoundary resetKey="/projects">
        <Page />
      </RouteErrorBoundary>
    );
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    expect(screen.getByText("Cannot read properties of undefined (reading 'name')")).toBeTruthy();
    broken = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("The page")).toBeTruthy();
  });

  it("clears the error when the route changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    broken = true;
    const { rerender } = render(
      <RouteErrorBoundary resetKey="/projects">
        <Page />
      </RouteErrorBoundary>
    );
    broken = false;
    rerender(
      <RouteErrorBoundary resetKey="/credentials">
        <Page />
      </RouteErrorBoundary>
    );
    expect(screen.getByText("The page")).toBeTruthy();
  });
});
