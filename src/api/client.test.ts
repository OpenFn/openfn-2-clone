import { afterEach, describe, expect, it, vi } from "vitest";
import { toApiError } from "./client";

describe("toApiError", () => {
  it("keeps a problem document's code and detail, and keys its body entries as field errors", () => {
    const error = toApiError(422, {
      status: 422,
      code: "invalid",
      detail: "The body is not valid.",
      errors: [
        { pointer: "#/name", code: "taken", detail: "has already been taken" },
        { pointer: "#/project_credentials/0/project_id", code: "no_access", detail: "is not a project you can use" },
        { parameter: "page", code: "type", detail: "is not a number" },
      ],
    });
    expect(error).toMatchObject({ status: 422, code: "invalid", message: "The body is not valid." });
    expect(error.fieldErrors).toEqual({ name: ["has already been taken"], "project_credentials.0.project_id": ["is not a project you can use"] });
  });

  it("names the code from the status when the body isn't a problem document", () => {
    expect(toApiError(403, undefined)).toMatchObject({ code: "forbidden", message: "Lightning answered 403." });
    expect(toApiError(502, "Bad Gateway")).toMatchObject({ code: "internal" });
  });
});

describe("request, on Lightning", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends a write with no CSRF token when signed out, so signing in can happen", async () => {
    vi.stubEnv("VITE_API", "lightning");
    // Signed out: reading the session is refused, signing in isn't.
    const fetch = vi.fn(async (_path: string, init?: RequestInit) =>
      init?.method === "GET"
        ? new Response(JSON.stringify({ code: "unauthenticated", detail: "Authentication is required." }), { status: 401 })
        : new Response(JSON.stringify({ data: {} }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetch);
    vi.resetModules();
    const { request } = await import("./client");
    await request("POST", "/api/session", { email: "a@b.c", password: "x" });
    const [, init] = fetch.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(init.headers).not.toHaveProperty("x-csrf-token");
  });
});
