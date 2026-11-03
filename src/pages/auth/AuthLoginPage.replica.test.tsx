import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "../../api/session";
import AuthLoginPageReplica from "./AuthLoginPage.replica";

describe("AuthLoginPageReplica", () => {
  it("says a refused sign-in in Lightning's words, not the API's", async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <AuthLoginPageReplica />
        </MemoryRouter>
      </QueryClientProvider>
    );
    fireEvent.change(screen.getByRole("textbox", { name: /^Email/ }), { target: { value: "editor@openfn.org" } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "wrong password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Invalid email or password", {}, { timeout: 3000 })).toBeTruthy();
  });
});
