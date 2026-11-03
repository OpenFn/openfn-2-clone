import { renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useDocumentTitle } from "./useDocumentTitle";

it("sets Lightning's page title while mounted and puts the old one back after", () => {
  document.title = "OpenFn Lightning";
  const { unmount } = renderHook(() => useDocumentTitle("Personal Access Tokens"));
  expect(document.title).toBe("Personal Access Tokens · OpenFn Lightning");
  unmount();
  expect(document.title).toBe("OpenFn Lightning");
});
