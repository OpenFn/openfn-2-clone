import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { CredentialValues } from "../types/credentials";
import { credentialKeys, schemaFields, useCredentialIndex, useCredentialSaves, type ApiCredential } from "./credentials";

const values = (overrides: Partial<CredentialValues> = {}): CredentialValues => ({
  formId: "f1",
  name: "Test raw",
  externalId: "",
  schema: "raw",
  oauthClientId: null,
  projectIds: [],
  environments: [{ name: "main", previousName: null, body: '{"token":"abc"}', signInId: null }],
  ...overrides,
});

function renderCredentials() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => ({ index: useCredentialIndex("me@example.com"), saves: useCredentialSaves() }), { wrapper }) };
}

describe("schemaFields", () => {
  it("draws each property as Lightning's credential form does", () => {
    const fields = schemaFields({
      required: ["hostUrl"],
      properties: {
        hostUrl: { title: "Host URL", type: "string", format: "uri" },
        password: { title: "Password", type: "string", writeOnly: true },
        port: { type: "integer" },
        ssl: { type: "boolean" },
        extra: { type: "object" },
        apiVersion: { title: "API Version", anyOf: [{ type: "string" }, { type: "null" }] },
      },
    });
    expect(fields.map((f) => [f.key, f.label, f.kind, f.required])).toEqual([
      ["hostUrl", "Host URL", "url", true],
      ["password", "Password", "password", false],
      ["port", "port", "integer", false],
      ["ssl", "ssl", "boolean", false],
      ["extra", "extra", "object", false],
      ["apiVersion", "API Version", "text", false],
    ]);
  });
});

describe("useCredentialSaves", () => {
  it("resolves a save only once the list has reloaded with it", async () => {
    const { result, client } = renderCredentials();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }));
    await result.current.saves.onCreateCredential(values({ name: "Saved and listed" }));
    expect(client.getQueryData<ApiCredential[]>(credentialKeys.all)?.map((c) => c.name)).toContain("Saved and listed");
  });

  it("puts Lightning's refusal of a name on the name field", async () => {
    const { result } = renderCredentials();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }));
    const taken = result.current.index.credentials[0]!.name;
    await expect(result.current.saves.onCreateCredential(values({ name: taken }))).rejects.toMatchObject({
      fieldErrors: { name: ["you have another credential with the same name"] },
    });
  });

  it("asks for the main secret again on edit, since the API never sends it back", async () => {
    const { result } = renderCredentials();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }));
    const { id } = result.current.index.credentials[0]!;
    const blank = values({ environments: [{ name: "main", previousName: "main", body: "", signInId: null }] });
    await expect(result.current.saves.onUpdateCredential(id, blank)).rejects.toMatchObject({
      fieldErrors: { "environments.main": ["Type it again: Lightning's API doesn't send a stored secret back"] },
    });
  });
});
