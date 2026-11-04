import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { collectionKeys, useCollectionSaves, useProjectCollections, type ApiCollection } from "./collections";

// kickstart-me, where the stand-in has two recorded collections and the demo user is owner.
const KICKSTART = "1da97d81-152f-5f7d-a0fc-8416bd411706";
const loaded = { timeout: 3000 };

function renderCollections() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const rendered = renderHook(() => ({ index: useProjectCollections(KICKSTART), saves: useCollectionSaves(KICKSTART) }), { wrapper });
  return { client, ...rendered };
}

const cachedNames = (client: QueryClient) => (client.getQueryData<ApiCollection[]>(collectionKeys.all(KICKSTART)) ?? []).map((c) => c.name);

describe("useProjectCollections", () => {
  it("lists the project's collections by name, and the viewer's role", async () => {
    const { result } = renderCollections();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    expect(result.current.index.collections.map((c) => c.name)).toEqual(["facility-ids", "patients"]);
    expect(result.current.index.viewerRole).toBe("owner");
  });
});

describe("useCollectionSaves", () => {
  it("resolves a new collection only once the list has reloaded with its URL-safe name", async () => {
    const { result, client } = renderCollections();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onCreateCollection("Saved And Listed");
    expect(cachedNames(client)).toContain("saved-and-listed");
  });

  it("puts Lightning's refusals on the form's rawName", async () => {
    const { result } = renderCollections();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await expect(result.current.saves.onCreateCollection("patients")).rejects.toMatchObject({
      fieldErrors: { rawName: ["A collection with this name already exists"] },
    });
    await expect(result.current.saves.onCreateCollection("!!!")).rejects.toMatchObject({ fieldErrors: { rawName: ["can't be blank"] } });
  });

  it("refuses a preview in plain words", async () => {
    const { result } = renderCollections();
    await expect(result.current.saves.onPreviewCollection()).rejects.toMatchObject({ code: "not_supported" });
  });

  it("renames and deletes, each resolving after the reload", async () => {
    const { result, client } = renderCollections();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onCreateCollection("to-rename");
    const id = client.getQueryData<ApiCollection[]>(collectionKeys.all(KICKSTART))!.find((c) => c.name === "to-rename")!.id;
    await result.current.saves.onRenameCollection(id, "renamed");
    expect(cachedNames(client)).toContain("renamed");
    await result.current.saves.onDeleteCollection(id);
    expect(cachedNames(client)).not.toContain("renamed");
  });

  it("says a collection deleted since the page loaded is not found, instead of making it again", async () => {
    const { result, client } = renderCollections();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onCreateCollection("gone-meanwhile");
    const id = client.getQueryData<ApiCollection[]>(collectionKeys.all(KICKSTART))!.find((c) => c.name === "gone-meanwhile")!.id;
    await result.current.saves.onDeleteCollection(id);
    await expect(result.current.saves.onRenameCollection(id, "back-again")).rejects.toMatchObject({ message: "Collection not found" });
    expect(cachedNames(client)).not.toContain("back-again");
  });
});
