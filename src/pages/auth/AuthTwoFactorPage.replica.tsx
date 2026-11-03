import { useLocation } from "react-router-dom";
import { useSessionActions } from "../../api/session";
import AuthTwoFactorPage from "./AuthTwoFactorPage";

/**
 * The replica's side of AuthTwoFactorPage: sends the code to finish an MFA
 * sign-in on Lightning's API (or its stand-in, which takes 123456);
 * SessionGate then sends the visitor where they were headed.
 */
export default function AuthTwoFactorPageReplica() {
  const { search } = useLocation();
  const { verifyCode } = useSessionActions();
  const method = new URLSearchParams(search).get("authentication_type") === "backup_code" ? "backup_code" : "totp";

  return (
    <AuthTwoFactorPage
      method={method}
      onVerify={async (values) => void (await verifyCode(values))}
    />
  );
}
