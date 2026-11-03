import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { failNext } from "./client";
import { tokenKeys, useTokenSaves, useTokens, type ApiAccessToken } from "./tokens";

function renderTokens() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const view = renderHook(() => ({ index: useTokens(), saves: useTokenSaves() }), { wrapper });
  const cached = () => client.getQueryData<ApiAccessToken[]>(tokenKeys.all) ?? [];
  const listed = () => cached().map((t) => t.id);
  return { cached, listed, ...view };
}

describe("useTokenSaves", () => {
  it("resolves a new token only once the list has reloaded with it, masked", async () => {
    const { result, cached } = renderTokens();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }));
    const whole = await result.current.saves.generate();
    expect(cached()[0]?.token).toBe(`${whole.slice(0, 5)}…${whole.slice(-5)}`);
  });

  it("removes a deleted token from the list before it resolves", async () => {
    const { result, listed } = renderTokens();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }));
    const id = listed()[0]!;
    await result.current.saves.onDelete(id);
    expect(listed()).not.toContain(id);
  });

  it("rejects with Lightning's words when the session hasn't stepped up", async () => {
    const { result } = renderTokens();
    await waitFor(() => expect(result.current.index.status).toEqual({ state: "ready" }));
    failNext({ status: 403, code: "step_up_required", detail: "Enter your password or an MFA code again to do this." });
    await expect(result.current.saves.generate()).rejects.toMatchObject({
      code: "step_up_required",
      message: "Enter your password or an MFA code again to do this.",
    });
  });
});
