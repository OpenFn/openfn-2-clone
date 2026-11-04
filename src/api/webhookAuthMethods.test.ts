import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { channelKeys, type ApiChannel, type ApiWebhookAuthMethod } from "./channels";
import { authMethodRow, useProjectWebhookAuthMethods, useWebhookAuthMethodSaves } from "./webhookAuthMethods";

// kickstart-me, where the stand-in has a recorded basic method and API key method, and the demo user is owner.
const KICKSTART = "1da97d81-152f-5f7d-a0fc-8416bd411706";
const BASIC = "8b769609-745c-4e46-a059-04c46802682f";
const loaded = { timeout: 3000 };

function renderMethods() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const rendered = renderHook(
    () => ({
      index: useProjectWebhookAuthMethods(KICKSTART),
      saves: useWebhookAuthMethodSaves(KICKSTART),
    }),
    { wrapper },
  );
  return { client, ...rendered };
}

const cached = (client: QueryClient) => client.getQueryData<ApiWebhookAuthMethod[]>(channelKeys.authMethods(KICKSTART)) ?? [];
const names = (client: QueryClient) => cached(client).map((m) => m.attributes.name);

describe("authMethodRow", () => {
  it("names a trigger by its workflow and lists the channels it guards", () => {
    const method: ApiWebhookAuthMethod = {
      id: "m1",
      attributes: {
        name: "k",
        auth_type: "api",
        username: null,
        api_key_last_characters: "abcde",
        triggers: [{ id: "t1", workflow_id: "w1" }],
      },
    };
    const channel = {
      id: "c1",
      attributes: { name: "proxy", client_auth_method_ids: ["m1"] },
    } as ApiChannel;
    const row = authMethodRow("p1", method, [{ id: "w1", name: "Intake", project_id: "p1", updated_at: "" }], [channel]);
    expect(row.maskedSecret).toBe("***************abcde");
    expect(row.triggers).toEqual([{ id: "t1", name: "Intake", href: "/projects/p1/w/w1?s=t1" }]);
    expect(row.channels).toEqual([{ id: "c1", name: "proxy", href: "/projects/p1/channels/c1/edit" }]);
  });
});

describe("useProjectWebhookAuthMethods", () => {
  it("lists the project's methods without their secrets, and the viewer's role", async () => {
    const { result } = renderMethods();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    expect(result.current.index.authMethods.map((m) => [m.name, m.username])).toEqual([
      ["nightly basic 2", "nightuser"],
      ["nightly key", null],
    ]);
    expect(result.current.index.viewerRole).toBe("owner");
  });
});

describe("useWebhookAuthMethodSaves", () => {
  it("resolves a new method only once the list has reloaded with it", async () => {
    const { result, client } = renderMethods();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onCreateWebhookAuthMethod({
      authType: "api",
      name: "saved and listed",
    });
    expect(names(client)).toContain("saved and listed");
  });

  it("puts Lightning's refusals on the form's fields", async () => {
    const { result } = renderMethods();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await expect(
      result.current.saves.onCreateWebhookAuthMethod({
        authType: "basic",
        name: "nightly key",
        username: "u",
        password: "p",
      }),
    ).rejects.toMatchObject({
      fieldErrors: { password: ["should be at least 8 character(s)"] },
    });
    await expect(
      result.current.saves.onCreateWebhookAuthMethod({
        authType: "basic",
        name: "nightly key",
        username: "u",
        password: "long enough",
      }),
    ).rejects.toMatchObject({
      fieldErrors: { name: ["must be unique within the project"] },
    });
    await expect(result.current.saves.onRenameWebhookAuthMethod(BASIC, "")).rejects.toMatchObject({ fieldErrors: { name: ["can't be blank"] } });
  });

  it("shows a secret only after the password, in Lightning's words when it's wrong", async () => {
    const { result } = renderMethods();
    await expect(
      result.current.saves.onRevealWebhookSecret(BASIC, {
        password: "wrong",
        code: "",
      }),
    ).rejects.toMatchObject({ message: "Invalid! Please try again" });
    await expect(
      result.current.saves.onRevealWebhookSecret(BASIC, {
        password: "welcome12345",
        code: "",
      }),
    ).resolves.toBe("nightpass1");
  });

  it("renames and deletes, each resolving after the reload", async () => {
    const { result, client } = renderMethods();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }), loaded);
    await result.current.saves.onCreateWebhookAuthMethod({
      authType: "basic",
      name: "to rename",
      username: "u",
      password: "long enough",
    });
    const id = cached(client).find((m) => m.attributes.name === "to rename")!.id;
    await result.current.saves.onRenameWebhookAuthMethod(id, "renamed");
    expect(names(client)).toContain("renamed");
    await result.current.saves.onDeleteWebhookAuthMethod(id);
    expect(names(client)).not.toContain("renamed");
  });
});
