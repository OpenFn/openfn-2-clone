import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderPage } from "../../test/renderPage";
import { RequestError } from "../../utils/errors";
import AuthLoginPage, { type AuthLoginPageProps } from "./AuthLoginPage";

const render = (data: Partial<Omit<AuthLoginPageProps, "onSignIn">> = {}) =>
  renderPage(AuthLoginPage, { allowSignup: false, ssoProvider: null, info: null, ...data }, ["onSignIn"]);

const email = () => screen.getByRole("textbox", { name: /^Email/ });
const fill = (address: string, password: string) => {
  fireEvent.change(email(), { target: { value: address } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: password } });
};
const logIn = () => fireEvent.click(screen.getByRole("button", { name: "Log in" }));

describe("AuthLoginPage", () => {
  it("says a blank email and password can't be blank, focuses the email, and sends nothing", () => {
    const host = render();
    logIn();
    expect(screen.getAllByText("can't be blank")).toHaveLength(2);
    expect(document.activeElement).toBe(email());
    expect(host.calls("onSignIn")).toEqual([]);
  });

  it("says an email without an @ isn't one, in Lightning's words", () => {
    const host = render();
    fill("amy", "welcome12345");
    logIn();
    expect(screen.getByText("must have the @ sign and no spaces")).toBeTruthy();
    expect(host.calls("onSignIn")).toEqual([]);
  });

  it("signs in with the email, password and remember me", async () => {
    const host = render();
    fill("amy@openfn.org", "welcome12345");
    fireEvent.click(screen.getByRole("checkbox", { name: /Remember me/ }));
    logIn();
    expect(host.calls("onSignIn")).toEqual([[{ email: "amy@openfn.org", password: "welcome12345", rememberMe: true }]]);
    await host.resolve("onSignIn");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the host's refusal at the top of the card, in place of its notice", async () => {
    const host = render({ info: "Logged out successfully." });
    expect(screen.getByText("Logged out successfully.")).toBeTruthy();
    fill("amy@openfn.org", "wrong");
    logIn();
    await host.reject("onSignIn", new RequestError("The sign-in details are not valid.", { status: 401 }));
    expect(screen.getByText("The sign-in details are not valid.")).toBeTruthy();
    expect(screen.queryByText("Logged out successfully.")).toBeNull();
  });

  it("shows Register and the provider's button only when the host has them", () => {
    render({ allowSignup: true, ssoProvider: { name: "Keycloak", handlerUrl: "/authenticate/keycloak" } });
    expect(screen.getByRole("link", { name: "Register" })).toBeTruthy();
    expect(screen.getByText(/via external provider/)).toBeTruthy();
  });
});
