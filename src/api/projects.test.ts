import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { failNext } from "./client";
import { projectKeys, useProjectSaves, useProjectsOverview, type ApiProject } from "./projects";

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
