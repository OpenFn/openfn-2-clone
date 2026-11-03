import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { failNext } from "./client";
import { createQueryClient, sessionKeys, useSessionActions, useSessionState } from "./session";

function renderSession(client: QueryClient = createQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...renderHook(() => ({ state: useSessionState(), actions: useSessionActions() }), { wrapper }) };
}

const signedInName = (state: ReturnType<typeof useSessionState>) =>
  state.state === "signedIn" ? `${state.session.user.firstName} ${state.session.user.lastName}` : state.state;

// The stand-in keeps one session for the whole file, as a browser would: these run in order.
describe("useSessionState and useSessionActions, on the stand-in", () => {
  it("starts signed in as the fixture's user, so pages on the fixtures still find her", async () => {
    const { result } = renderSession();
    await waitFor(() => expect(signedInName(result.current.state)).toBe("Amy Admin"));
    expect(result.current.state).toMatchObject({ session: { user: { id: "user-amy", role: "superuser" } } });
  });

  it("signs out, and is signed out once the promise resolves", async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.state.state).toBe("signedIn"));
    await result.current.actions.signOut();
    await waitFor(() => expect(result.current.state.state).toBe("signedOut"));
  });

  it("refuses a wrong password in Lightning's words", async () => {
    const { result } = renderSession();
    await expect(result.current.actions.signIn({ email: "demo@openfn.org", password: "wrong" })).rejects.toMatchObject({
      code: "invalid_credentials",
      message: "The sign-in details are not valid.",
    });
  });

  it("resolves a sign-in only once the signed-in person has been read again", async () => {
    const { result, client } = renderSession();
    await expect(result.current.actions.signIn({ email: "demo@openfn.org", password: "welcome12345" })).resolves.toBe("signedIn");
    expect(client.getQueryData(sessionKeys.me)).toMatchObject({ id: "user-amy" });
  });

  it("asks an account with MFA for its code, refuses a wrong one, and signs in with the right one", async () => {
    const { result } = renderSession();
    await expect(result.current.actions.signIn({ email: "super@openfn.org", password: "welcome12345" })).resolves.toBe("mfaRequired");
    await expect(result.current.actions.verifyCode({ method: "totp", code: "000000" })).rejects.toMatchObject({ code: "invalid_credentials" });
    await result.current.actions.verifyCode({ method: "backup_code", code: "123456" });
    await waitFor(() => expect(signedInName(result.current.state)).toBe("Sizwe Super"));
  });
});

describe("createQueryClient", () => {
  it("reads the signed-in person again when any request says the session has ended", async () => {
    const client = createQueryClient();
    const recheck = vi.spyOn(client, "invalidateQueries");
    failNext({ status: 401, code: "unauthenticated", detail: "Authentication is required." });
    await client.query({ queryKey: ["credentials"], queryFn: () => import("./client").then((c) => c.request("GET", "/api/credentials")) }).catch(() => {});
    expect(recheck).toHaveBeenCalledWith({ queryKey: sessionKeys.me });
  });
});

describe("signing in, on Lightning", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends the next write with the token the new session came with", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API", "lightning");
    const fetch = vi.fn(async (path: string, init?: RequestInit) => {
      if (path === "/api/session" && init?.method === "POST") return Response.json({ data: { state: "signed_in", csrf_token: "new-token" } }, { status: 201 });
      if (path === "/api/session") return Response.json({ code: "unauthenticated" }, { status: 401 });
      return Response.json({ data: {} });
    });
    vi.stubGlobal("fetch", fetch);
    const session = await import("./session");
    const { request } = await import("./client");
    // A fresh import of the module, so it calls Lightning rather than the stand-in.
    const live = renderHook(() => session.useSessionActions(), {
      wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: session.createQueryClient() }, children),
    });
    await live.result.current.signIn({ email: "demo@openfn.org", password: "welcome12345" });
    await request("POST", "/api/credentials", { name: "x" });
    const write = fetch.mock.calls.find(([path]) => path === "/api/credentials")!;
    expect(new Headers(write[1]?.headers).get("x-csrf-token")).toBe("new-token");
  });
});
