import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPage } from "../../test/renderPage";
import { RequestError } from "../../utils/errors";
import AuthTwoFactorPage from "./AuthTwoFactorPage";

const verify = () => fireEvent.click(screen.getByRole("button", { name: "Verify" }));

describe("AuthTwoFactorPage", () => {
  it("sends the authenticator code, and shows the host's refusal", async () => {
    const host = renderPage(AuthTwoFactorPage, { method: "totp" }, ["onVerify"]);
    fireEvent.change(screen.getByRole("textbox", { name: /^Authentication Code/ }), { target: { value: "000000" } });
    verify();
    expect(host.calls("onVerify")).toEqual([[{ method: "totp", code: "000000" }]]);
    await host.reject("onVerify", new RequestError("The sign-in details are not valid.", { status: 401 }));
    expect(screen.getByText("The sign-in details are not valid.")).toBeTruthy();
  });

  it("asks for a backup code instead, and links back to the authenticator", () => {
    const host = renderPage(AuthTwoFactorPage, { method: "backup_code" }, ["onVerify"]);
    expect(screen.getByRole("link", { name: "Use your authenticator app" })).toBeTruthy();
    verify();
    expect(screen.getByText("can't be blank")).toBeTruthy();
    expect(host.calls("onVerify")).toEqual([]);
  });
});
