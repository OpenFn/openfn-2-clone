import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it } from "vitest";
import { request } from "../../api/client";
import { standInAccount } from "../../api/me";
import { createQueryClient } from "../../api/session";
import { ToastProvider } from "../../components/primitives/Toast";
import { session } from "../../mock-data/users";
import { ReactRouterAdapter } from "../../routing/ReactRouterAdapter";
import SessionProvider from "../../session/SessionProvider";
import ProjectSettingsPageReplica from "./ProjectSettingsPage.replica";

it("opens a project the API lists but no fixture holds, with its collaborators from the API", async () => {
  // As Lightning would list a project seeded there: an id and name no fixture has. Only a superuser may create one.
  const signedIn = standInAccount.user!;
  const id = "5e1f0c3a-0000-4000-8000-000000000001";
  standInAccount.user = { ...signedIn, email: "super@example.org", role: "superuser", mfaEnabled: false };
  await request("PUT", `/api/projects/${id}`, { name: "malawi-hiv", description: null, members: [{ email: signedIn.email, role: "owner" }], notify: false });
  standInAccount.user = signedIn;
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
  expect(await screen.findByText(signedIn.email, {}, { timeout: 3000 })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Collaboration" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByText("The projects list")).toBeNull();
});
