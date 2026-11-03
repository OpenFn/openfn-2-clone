import { useLocation, useNavigate } from "react-router-dom";
import { ApiError, live } from "../../api/client";
import { authMessages } from "../../constants";
import { RequestError } from "../../utils/errors";
import { loginOptions, useInstance } from "../../api/instance";
import { useSessionActions } from "../../api/session";
import { authFlags } from "../../mock-data/auth";
import type { SignInState } from "../../session/session";
import AuthLoginPage from "./AuthLoginPage";

/**
 * The replica's side of AuthLoginPage: signs in on Lightning's API (or its
 * stand-in); SessionGate then sends the visitor where they were headed. An
 * account with MFA goes on to the two-factor page. Register and the SSO button follow the
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
        const result = await signIn({ email, password }).catch((error: unknown) => {
          // Lightning's login page says the same for every refusal.
          throw error instanceof ApiError && error.code === "invalid_credentials" ? new RequestError(authMessages.invalidLogin, { status: 401 }) : error;
        });
        if (result === "mfaRequired") {
          // Keeps where they were headed for after the code.
          navigate("/users/two-factor", { state });
        }
      }}
    />
  );
}
