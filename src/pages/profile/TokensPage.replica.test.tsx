import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it } from "vitest";
import { createQueryClient } from "../../api/session";
import { ToastProvider } from "../../components/primitives/Toast";
import TokensPageReplica from "./TokensPage.replica";

it("refuses the delete route for a token that isn't yours, as Lightning does, and goes back to the list", async () => {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={["/profile/tokens/someone-elses-token/delete"]}>
          <Routes>
            <Route path="/profile/tokens/:tokenId/delete" element={<TokensPageReplica />} />
            <Route path="/profile/tokens" element={<p>The token list</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  expect(await screen.findByText("You can't perform this action", {}, { timeout: 3000 })).toBeTruthy();
  expect(screen.getByText("The token list")).toBeTruthy();
  expect(screen.queryByText("Delete API Access Token")).toBeNull();
});
