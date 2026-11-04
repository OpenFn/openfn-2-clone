import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";
import { ToastProvider } from "./components/primitives/Toast";
import { session } from "./mock-data/users";
import { ReactRouterAdapter } from "./routing/ReactRouterAdapter";
import SessionProvider from "./session/SessionProvider";

describe("App", () => {
  it("goes from log out to the log in page", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/users/log_out"]}>
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
    expect(await screen.findByRole("button", { name: "Log in" })).toBeTruthy();
  });
});
