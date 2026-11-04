import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";
import { ToastProvider } from "./components/primitives/Toast";
import { session } from "./mock-data/users";
import { ReactRouterAdapter } from "./routing/ReactRouterAdapter";
import SessionProvider from "./session/SessionProvider";

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <ReactRouterAdapter>
          <SessionProvider session={session}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SessionProvider>
        </ReactRouterAdapter>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("goes from log out to the log in page", async () => {
    renderAt("/users/log_out");
    expect(await screen.findByRole("button", { name: "Log in" })).toBeTruthy();
  });

  it("draws the project menu for a project the fixtures don't have, as one from the API", async () => {
    const id = "0b5c3a52-1f7e-4d1a-9f37-6c2b1e8d4a90";
    renderAt(`/projects/${id}/sandboxes`);
    const [menu] = await screen.findAllByRole("navigation");
    expect(within(menu!).getByRole("link", { name: "Sandboxes" }).getAttribute("href")).toContain(`/projects/${id}/sandboxes`);
  });
});
