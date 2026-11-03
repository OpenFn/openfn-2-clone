import { useLocation, useNavigate } from "react-router-dom";
import { live } from "../../api/client";
import { loginOptions, useInstance } from "../../api/instance";
import { useSessionActions } from "../../api/session";
import { authFlags } from "../../mock-data/auth";
import type { SignInState } from "../../session/session";
import AuthLoginPage from "./AuthLoginPage";

/**
 * The replica's side of AuthLoginPage: signs in on Lightning's API (or its
 * stand-in), then goes where the visitor was headed, or on to the two-factor
 * page when the account has MFA. Register and the SSO button follow the
 * instance; on the stand-in, `?signup=1` and `?sso=1` switch them on.
 */
export default function AuthLoginPageReplica() {
  const navigate = useNavigate();
  const { search, state } = useLocation() as { search: string; state: SignInState | null };
  const instance = useInstance();
  const { signIn } = useSessionActions();
  const options = live ? (instance ? loginOptions(instance) : { allowSignup: false, ssoProvider: null }) : authFlags(search);

  return (
    <AuthLoginPage
      allowSignup={options.allowSignup}
      ssoProvider={options.ssoProvider}
      info={state?.info ?? null}
      onSignIn={async ({ email, password }) => {
        const next = await signIn({ email, password });
        const returnTo = state?.returnTo ?? "/projects";
        if (next === "mfaRequired") navigate("/users/two-factor", { state: { returnTo } satisfies SignInState });
        else navigate(returnTo, { replace: true });
      }}
    />
  );
}
