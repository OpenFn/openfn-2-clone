/**
 * Fixtures for the logged-out and onboarding views (auth-*, first-setup).
 * Lightning reads these from instance config (Lightning.Config.check_flag?,
 * the OIDC auth provider); here they are static flags. Static only: nothing
 * here authenticates anyone.
 *
 * For demoing, a page can override a flag from the query string, e.g.
 * /users/log_in?sso=1, /users/register?signup=1.
 */
import type { SsoProvider } from "../types/auth";
import type { AuthConfig } from "./models/auth";

export const authConfig: AuthConfig = {
  allowSignup: false,
  ssoProvider: null,
  allowFirstSetup: true,
};

/** A configured provider, used when `?sso=1` is set and in stories. */
export const exampleSsoProvider: SsoProvider = {
  name: "Keycloak",
  handlerUrl: "/authenticate/keycloak",
};

/** Flags with query-string overrides applied (`sso`, `signup`). */
export function authFlags(search: string): AuthConfig {
  const q = new URLSearchParams(search);
  const flag = (key: string, fallback: boolean) => (q.has(key) ? q.get(key) !== "0" : fallback);
  return {
    ...authConfig,
    allowSignup: flag("signup", authConfig.allowSignup),
    ssoProvider: flag("sso", authConfig.ssoProvider !== null) ? (authConfig.ssoProvider ?? exampleSsoProvider) : null,
  };
}

/** The signed-in but unconfirmed user shown on /users/confirm-required. */
export const unconfirmedUser = {
  firstName: "Una",
  lastName: "Confirmed",
  email: "una@example.org",
};
