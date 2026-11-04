import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, expect, it } from "vitest";
import { failNext, request } from "../../api/client";
import { standInAccount } from "../../api/me";
import type { ApiProject } from "../../api/projects";
import { createQueryClient } from "../../api/session";
import { ToastProvider } from "../../components/primitives/Toast";
import { session } from "../../mock-data/users";
import { ReactRouterAdapter } from "../../routing/ReactRouterAdapter";
import SessionProvider from "../../session/SessionProvider";
import ProjectSettingsPageReplica from "./ProjectSettingsPage.replica";

// As Lightning would list a project seeded there: an id and name no fixture has, the signed-in person its owner.
const id = "5e1f0c3a-0000-4000-8000-000000000001";
const signedIn = standInAccount.user!;
beforeAll(async () => {
  // Only a superuser may create a project.
  standInAccount.user = { ...signedIn, email: "super@example.org", role: "superuser", mfaEnabled: false };
  try {
    await request("PUT", `/api/projects/${id}`, { name: "malawi-hiv", description: null, members: [{ email: signedIn.email, role: "owner" }], notify: false });
  } finally {
    standInAccount.user = signedIn;
  }
});

function renderCollaboration() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SessionProvider session={session}>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/projects/${id}/settings#collaboration`]}>
            <ReactRouterAdapter>
              <Routes>
                <Route path="/projects/:projectId/settings" element={<ProjectSettingsPageReplica />} />
                <Route path="/projects" element={<p>The projects list</p>} />
              </Routes>
            </ReactRouterAdapter>
          </MemoryRouter>
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

it("opens a project the API lists but no fixture holds, with its collaborators from the API", async () => {
  renderCollaboration();
  expect(await screen.findByText(signedIn.email, {}, { timeout: 3000 })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Collaboration" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByText("The projects list")).toBeNull();
});

it("saves support access on the API, and says a refusal in Lightning's words", async () => {
  renderCollaboration();
  const toggle = await screen.findByRole("switch", { name: "Grant support access" }, { timeout: 3000 });

  failNext({ status: 403, code: "forbidden", detail: "You may not do this (or it might not exist)." });
  fireEvent.click(toggle);
  expect(await screen.findByText("You are not authorized to perform this action.", {}, { timeout: 3000 })).toBeTruthy();

  fireEvent.click(toggle);
  expect(await screen.findByText("Granted access to support users successfully", {}, { timeout: 3000 })).toBeTruthy();
  const listed = await request<{ data: ApiProject[] }>("GET", "/api/projects");
  expect(listed.data.find((p) => p.id === id)?.attributes.allow_support_access).toBe(true);
});
