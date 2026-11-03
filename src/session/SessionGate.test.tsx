import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "../api/session";
import { useCurrentUser } from "./session";
import SessionGate from "./SessionGate";

function Here() {
  const { pathname, state } = useLocation();
  return <p>{`at ${pathname} ${JSON.stringify(state)}`}</p>;
}
function Who() {
  return <p>{`signed in as ${useCurrentUser().firstName}`}</p>;
}

function renderGate(path: string) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <SessionGate>
          <Routes>
            <Route path="/projects/:id/w" element={<Who />} />
            <Route path="*" element={<Here />} />
          </Routes>
        </SessionGate>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// The stand-in starts signed in and keeps one session for the file: these run in order.
describe("SessionGate", () => {
  it("gives the pages the signed-in person", async () => {
    renderGate("/projects/p1/w");
    expect(await screen.findByText("signed in as Amy")).toBeTruthy();
  });

  it("sends a signed-in visitor on log in to their projects", async () => {
    renderGate("/users/log_in");
    expect(await screen.findByText("at /projects null")).toBeTruthy();
  });

  it("signs out on /users/log_out, then shows log in with Lightning's flash", async () => {
    renderGate("/users/log_out");
    expect(await screen.findByText('at /users/log_in {"info":"Logged out successfully."}', {}, { timeout: 3000 })).toBeTruthy();
  });

  it("sends a signed-out visitor to log in, remembering where they were going", async () => {
    renderGate("/projects/p1/w?x=1");
    expect(await screen.findByText('at /users/log_in {"returnTo":"/projects/p1/w?x=1"}')).toBeTruthy();
  });
});
