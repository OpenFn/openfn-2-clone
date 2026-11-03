import { beforeEach, expect, test } from "vitest";
import { ApiError, failNext, isApiError, request, resetFakeApi } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import type { ApiToken } from "@/lib/api/tokens";

beforeEach(resetFakeApi);

const list = () => request<{ data: ApiToken[] }>("GET", "/api/me/tokens").then((answer) => answer.data);

test("a new token is whole once, then listed first and masked, and revoking it twice is 404", async () => {
  const before = await list();
  const created = (await request<{ data: ApiToken }>("POST", "/api/me/tokens")).data;
  const after = await list();
  expect(after).toHaveLength(before.length + 1);
  expect(after[0].id).toBe(created.id);
  expect(after[0].token).not.toBe(created.token);
  expect(after[0].token).toBe(`${created.token.slice(0, 5)}…${created.token.slice(-5)}`);

  await request("DELETE", `/api/me/tokens/${created.id}`);
  expect(await list()).toEqual(before);
  const again = await request("DELETE", `/api/me/tokens/${created.id}`).catch((error: unknown) => error);
  expect(again).toBeInstanceOf(ApiError);
  expect(again).toMatchObject({ status: 404, code: "not_found", message: "This token doesn't exist." });
});

test("a refusal arrives as an ApiError with its code and detail, once", async () => {
  failNext("POST /api/me/tokens", { status: 403, code: "step_up_required", detail: "Enter your password again." });
  const refused = await request("POST", "/api/me/tokens").catch((error: unknown) => error);
  expect(isApiError(refused, "step_up_required")).toBe(true);
  expect((refused as ApiError).message).toBe("Enter your password again.");
  await expect(request("POST", "/api/me/tokens")).resolves.toBeDefined();
});

test("a date that can't be read is Unknown, never a crash", () => {
  expect(formatDate("not a date")).toBe("Unknown");
  expect(formatDate("2026-10-28T09:12:44Z")).toMatch(/2026/);
});
