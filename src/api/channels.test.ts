import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { channelKeys, useChannelIndex, useChannelSaves, type ApiChannel } from "./channels";

// kickstart-me, where the stand-in has two recorded channels and one linked credential.
const KICKSTART = "1da97d81-152f-5f7d-a0fc-8416bd411706";
const loaded = { timeout: 3000 };

function renderChannels() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => ({ index: useChannelIndex(KICKSTART), saves: useChannelSaves(KICKSTART) }), { wrapper }) };
}

const cached = (client: QueryClient) => client.getQueryData<ApiChannel[]>(channelKeys.all(KICKSTART)) ?? [];
const values = { name: "", enabled: true, destinationUrl: "https://example.com", destinationCredentialId: "", clientAuthMethodIds: [] };

describe("useChannelIndex", () => {
  it("lists the project's channels and the credentials its form picks from", async () => {
    const { result } = renderChannels();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    expect(result.current.index.channels.map((c) => c.attributes.name)).toEqual(["legacy-sms", "orders-proxy"]);
    expect(result.current.index.credentialOptions).toEqual([{ id: "547eb25a-ebd5-41ab-ad9d-ab582f78eb3d", name: "bsj credential" }]);
  });
});

describe("useChannelSaves", () => {
  it("resolves a new channel only once the list has reloaded with it", async () => {
    const { result, client } = renderChannels();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onSave({ ...values, name: "saved-and-listed" });
    expect(cached(client).map((c) => c.attributes.name)).toContain("saved-and-listed");
  });

  it("puts Lightning's refusals on the form's fields", async () => {
    const { result } = renderChannels();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await expect(result.current.saves.onSave({ ...values, name: "orders-proxy" })).rejects.toMatchObject({
      fieldErrors: { name: ["A channel with this name already exists in this project"] },
    });
    await expect(result.current.saves.onSave({ ...values, name: "bad-url", destinationUrl: "ftp://x" })).rejects.toMatchObject({
      fieldErrors: { destinationUrl: ["must be either a http or https URL"] },
    });
  });

  it("switches a channel off, keeping the rest of it", async () => {
    const { result, client } = renderChannels();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    const orders = cached(client).find((c) => c.attributes.name === "orders-proxy")!;
    await result.current.saves.onToggle(orders.id, false);
    expect(cached(client).find((c) => c.id === orders.id)?.attributes).toMatchObject({
      enabled: false,
      destination_credential_id: "547eb25a-ebd5-41ab-ad9d-ab582f78eb3d",
    });
  });

  it("refuses an edit of a channel someone else saved since it loaded", async () => {
    const { result, client } = renderChannels();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    const sms = cached(client).find((c) => c.attributes.name === "legacy-sms")!;
    await result.current.saves.onToggle(sms.id, true);
    await expect(result.current.saves.onSave({ ...values, name: "legacy-sms" }, sms)).rejects.toMatchObject({ code: "concurrent_edit" });
  });
});
