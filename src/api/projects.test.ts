import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { failNext } from "./client";
import { standInAccount } from "./me";
import {
  projectKeys,
  useApiSettingsProject,
  useProjectMemberSaves,
  useProjectMembers,
  useProjectSaves,
  useProjectsOverview,
  useSandboxSaves,
  useWorkspace,
  type ApiMember,
  type ApiProject,
  type WorkspaceProject,
} from "./projects";

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
  const signedIn = standInAccount.user;
  afterEach(() => {
    standInAccount.user = signedIn;
  });

  it("refuses a project from anyone but a superuser, in Lightning's words", async () => {
    const { result } = renderProjects();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    await expect(result.current.saves.onCreate({ name: "not-allowed", description: "" })).rejects.toMatchObject({ message: "You may not do this (or it might not exist)." });
  });

  it("resolves a new project only once the list has reloaded with it", async () => {
    // Lightning lets only a superuser create a project through the API.
    standInAccount.user = { ...signedIn!, email: "super@example.org", role: "superuser", mfaEnabled: false };
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
  const view = renderHook(() => ({ index: useProjectMembers(projectId, () => true), saves: useProjectMemberSaves(projectId) }), { wrapper });
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

  it("gives the viewer's role from the project's members, so the host decides what they may do from Lightning's answer", async () => {
    const { result } = renderMembers(OPENHIE);
    await waitFor(() => expect(result.current.index.viewerRole).toBe("admin"), { timeout: 3000 });
  });

  it("marks the viewer's own row and the owner as not removable", async () => {
    const { result } = renderMembers(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    const reasons = Object.fromEntries(result.current.index.collaborators.map((c) => [c.email, c.removeBlockedReason]));
    expect(reasons).toMatchObject({ "demo@openfn.org": "You cannot remove yourself", "super@openfn.org": "You cannot remove an owner", "viewer@openfn.org": null });
  });

  it("puts Lightning's refusal of an invite's email on that row, saying why an account's email can't be added", async () => {
    const { result } = renderMembers(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), { timeout: 3000 });
    const invite = (email: string) => ({ email, firstName: "A", lastName: "B", role: "viewer" as const });
    await expect(result.current.saves.onInviteCollaborators([invite("someone.new@example.org"), invite("viewer@openfn.org")])).rejects.toMatchObject({
      fieldErrors: { "1.email": ["This person has an account, but Lightning's API can only add people who are in one of your projects"] },
    });
  });
});

// The stand-in's recorded workspace: openhie-project, its sandbox staging, and staging's fhir-tests.
const STAGING = "bf2cd8b2-2380-44ca-a07a-7a79e394cdf9";
const FHIR_TESTS = "1f030fbc-0f76-4f0d-b266-0e96ad34d087";
// The workspace loads a level at a time, then each project's members.
const loaded = { timeout: 5000 };

function renderWorkspace(projectId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => ({ index: useWorkspace(projectId), saves: useSandboxSaves(projectId) }), { wrapper }) };
}

describe("useWorkspace", () => {
  it("finds a sandbox's workspace from its root down, by name, and who may manage each", async () => {
    const { result } = renderWorkspace(FHIR_TESTS);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    expect(result.current.index.label).toBe("openhie-project/staging/fhir-tests");
    expect(result.current.index.root?.name).toBe("openhie-project");
    expect(result.current.index.sandboxes.map((s) => [s.name, s.canEdit, s.activeDescendantCount])).toEqual([
      // By name, not by tree.
      ["fhir-tests", true, 0],
      ["staging", true, 1],
    ]);
    // Merging staging may go to the root, not into fhir-tests, which is under it.
    expect(result.current.index.mergeTargets(STAGING).map((t) => t.name)).toEqual(["openhie-project"]);
  });

  it("says not found for a project the caller can't see", async () => {
    const { result } = renderWorkspace("00000000-0000-4000-8000-000000000000");
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "notFound" }), loaded);
  });
});

describe("useApiSettingsProject", () => {
  const render = (projectId: string) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
    return renderHook(() => useApiSettingsProject(projectId), { wrapper });
  };

  it("finds a sandbox, which GET /api/projects doesn't list, with its parent", async () => {
    const { result } = render(FHIR_TESTS);
    await waitFor(() => expect(result.current).toBeTruthy(), loaded);
    expect(result.current?.project).toMatchObject({ id: FHIR_TESTS, name: "fhir-tests", parentId: STAGING });
    expect(result.current?.parent).toEqual({ id: STAGING, name: "staging" });
  });

  it("is null for a project the API doesn't have", async () => {
    const { result } = render("00000000-0000-4000-8000-000000000000");
    await waitFor(() => expect(result.current).toBeNull(), loaded);
  });
});

describe("useSandboxSaves", () => {
  const names = (client: QueryClient) => client.getQueryData<WorkspaceProject[]>(projectKeys.workspaces)?.map((p) => p.name);

  it("resolves a new sandbox only once the workspace has reloaded with it", async () => {
    const { result, client } = renderWorkspace(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onCreateSandbox({ rawName: "Saved And Listed", color: "#5AA1F0" });
    expect(names(client)).toContain("saved-and-listed");
  }, 15_000);

  it("puts a sibling's name on the form's name field in Lightning's words", async () => {
    const { result } = renderWorkspace(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await expect(result.current.saves.onCreateSandbox({ rawName: "staging", color: null })).rejects.toMatchObject({
      fieldErrors: { rawName: ["Sandbox name already exists"] },
    });
  }, 15_000);

  it("refuses what the API can't do yet, before sending anything", async () => {
    const { result } = renderWorkspace(OPENHIE);
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await expect(result.current.saves.onUpdateSandbox(STAGING, { rawName: "staging", color: "#5AA1F0" })).rejects.toMatchObject({
      message: "Lightning's API can't change a sandbox's colour yet.",
    });
    const merge = { targetId: OPENHIE, workflowIds: [], deletedWorkflowIds: ["w"], credentialIds: [], skippedCollectionNames: [] };
    await expect(result.current.saves.onMergeSandbox(STAGING, merge)).rejects.toMatchObject({
      message: "Lightning's API can't delete a workflow from the target in a merge yet.",
    });
  }, 15_000);
});
