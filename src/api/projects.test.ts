import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { failNext } from "./client";
import { projectKeys, useProjectMemberSaves, useProjectMembers, useProjectSaves, useProjectsOverview, type ApiMember, type ApiProject } from "./projects";

// The members load once the projects have: two of the stand-in's delays.
function renderProjects() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => ({ index: useProjectsOverview(), saves: useProjectSaves() }), { wrapper }) };
}

describe("useProjectsOverview", () => {
  it("gives each project the caller's role and its counts", async () => {
    const { result } = renderProjects();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    expect(result.current.index.firstName).toBe("Amy");
    expect(result.current.index.projects.find((p) => p.name === "openhie-project")).toMatchObject({
      role: "admin",
      workflowsCount: 1,
      collaboratorsCount: 4,
      lastUpdatedAt: "2026-11-03T16:03:49Z",
    });
  });
});

describe("useProjectSaves", () => {
  it("resolves a new project only once the list has reloaded with it", async () => {
    const { result, client } = renderProjects();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    await result.current.saves.onCreate({ name: "saved-and-listed", description: "" });
    expect(client.getQueryData<ApiProject[]>(projectKeys.all)?.map((p) => p.attributes.name)).toContain("saved-and-listed");
  });

  it("puts Lightning's refusal of a name on the form's name field", async () => {
    const { result } = renderProjects();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    failNext({ status: 422, code: "invalid", detail: "The request is not valid. See errors.", errors: [{ pointer: "#/name", code: "format", detail: "has invalid format" }] });
    await expect(result.current.saves.onCreate({ name: "x", description: "" })).rejects.toMatchObject({ fieldErrors: { rawName: ["has invalid format"] } });
  });
});

const OPENHIE = "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa";
const DHIS2 = "f5c51652-8428-4fb0-9b01-b27638079dc0";

function renderMembers(projectId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const view = renderHook(() => ({ index: useProjectMembers(projectId, true), saves: useProjectMemberSaves(projectId) }), { wrapper });
  const emails = () => client.getQueryData<ApiMember[]>(projectKeys.members(projectId))?.map((m) => m.attributes.email) ?? [];
  return { emails, ...view };
}

describe("useProjectMemberSaves", () => {
  it("adds someone from another of the caller's projects, and hands back the rest to invite, once the members have reloaded", async () => {
    const { result, emails } = renderMembers(DHIS2);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    const answer = await result.current.saves.onAddCollaborators([
      { email: "Editor@openfn.org", role: "editor" },
      { email: "nobody@example.org", role: "viewer" },
    ]);
    expect(answer.toInvite).toEqual([{ email: "nobody@example.org", role: "viewer" }]);
    expect(emails()).toContain("editor@openfn.org");
  });

  it("marks the viewer's own row and the owner as not removable", async () => {
    const { result } = renderMembers(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    const reasons = Object.fromEntries(result.current.index.collaborators.map((c) => [c.email, c.removeBlockedReason]));
    expect(reasons).toMatchObject({ "demo@openfn.org": "You cannot remove yourself", "super@openfn.org": "You cannot remove an owner", "viewer@openfn.org": null });
  });

  it("puts Lightning's refusal of an invite's email on that row", async () => {
    const { result } = renderMembers(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    const invite = (email: string) => ({ email, firstName: "A", lastName: "B", role: "viewer" as const });
    await expect(result.current.saves.onInviteCollaborators([invite("someone.new@example.org"), invite("viewer@openfn.org")])).rejects.toMatchObject({
      fieldErrors: { "1.email": ["has already been taken"] },
    });
  });
});
