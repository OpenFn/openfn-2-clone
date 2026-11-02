import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouterProvider, type Router } from "../../routing/router";
import { RowLink, RowToggle, Table, Td, Th, Tr } from "./Table";

describe("Th", () => {
  it("links a server-sorted header through the router", () => {
    const router: Router = {
      navigate: vi.fn(),
      useHref: (to) => "#" + to,
      useLocation: () => ({ pathname: "/projects/p1/w", search: "", hash: "" }),
    };
    render(
      <RouterProvider value={router}>
        <table>
          <thead>
            <tr>
              <Th sortHref="/projects/p1/w?sort=name&dir=asc" sortDirection={null}>
                Name
              </Th>
            </tr>
          </thead>
        </table>
      </RouterProvider>
    );
    const link = screen.getByRole("link", { name: /Name/ });
    expect(link.getAttribute("href")).toBe("#/projects/p1/w?sort=name&dir=asc");
    fireEvent.click(link);
    expect(router.navigate).toHaveBeenCalledWith("/projects/p1/w?sort=name&dir=asc", { replace: false });
  });
});

describe("Table state", () => {
  const header = (
    <tr>
      <th>Name</th>
    </tr>
  );

  it("shows the loading message as a status instead of the rows", () => {
    render(
      <Table header={header} state="loading" loadingMessage="Loading work orders ...">
        <tr>
          <td>A row</td>
        </tr>
      </Table>
    );
    expect(screen.getByRole("status").textContent).toBe("Loading work orders ...");
    expect(screen.queryByText("A row")).toBeNull();
  });

  it("announces the error message instead of the rows", () => {
    render(
      <Table header={header} state="error" errorMessage="There was an error loading the work orders">
        <tr>
          <td>A row</td>
        </tr>
      </Table>
    );
    expect(screen.getByRole("alert").textContent).toBe("There was an error loading the work orders");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("A row")).toBeNull();
  });
});

describe("clickable rows (D303)", () => {
  it("opens a row from its link, and a click elsewhere on the row follows the same link", () => {
    const router: Router = {
      navigate: vi.fn(),
      useHref: (to) => "#" + to,
      useLocation: () => ({ pathname: "/projects", search: "", hash: "" }),
    };
    render(
      <RouterProvider value={router}>
        <table>
          <tbody>
            <Tr>
              <Td>
                <RowLink to="/projects/p1/w">Alpha</RowLink>
              </Td>
              <Td>3 workflows</Td>
              <Td>
                <button type="button">History</button>
              </Td>
            </Tr>
          </tbody>
        </table>
      </RouterProvider>
    );
    expect(screen.getByRole("link", { name: "Alpha" }).getAttribute("href")).toBe("#/projects/p1/w");
    fireEvent.click(screen.getByText("3 workflows"));
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith("/projects/p1/w", { replace: false });
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it("toggles an expandable row from its button, or from a click elsewhere on the row", () => {
    function Row() {
      const [open, setOpen] = useState(false);
      return (
        <table>
          <tbody>
            <Tr>
              <Td>Work order</Td>
              <Td>
                <RowToggle expanded={open} onToggle={() => setOpen((o) => !o)} label="Show runs" />
              </Td>
            </Tr>
          </tbody>
        </table>
      );
    }
    render(<Row />);
    const toggle = screen.getByRole("button", { name: "Show runs" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByText("Work order"));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
