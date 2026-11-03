import { useLocation, useNavigate } from "react-router-dom";
import { useSessionActions } from "../../api/session";
import type { SignInState } from "../../session/session";
import AuthTwoFactorPage from "./AuthTwoFactorPage";

/**
 * The replica's side of AuthTwoFactorPage: sends the code to finish an MFA
 * sign-in on Lightning's API (or its stand-in, which takes 123456), then goes
 * where the visitor was headed.
 */
export default function AuthTwoFactorPageReplica() {
  const navigate = useNavigate();
  const { search, state } = useLocation() as { search: string; state: SignInState | null };
  const { verifyCode } = useSessionActions();
  const method = new URLSearchParams(search).get("authentication_type") === "backup_code" ? "backup_code" : "totp";

  return (
    <AuthTwoFactorPage
      method={method}
      onVerify={async (values) => {
        await verifyCode(values);
        navigate(state?.returnTo ?? "/projects", { replace: true });
      }}
    />
  );
}
