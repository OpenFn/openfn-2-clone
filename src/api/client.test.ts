import { describe, expect, it } from "vitest";
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
