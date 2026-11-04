import { useNavigate, useSearchParams } from "react-router-dom";
import { useSessionActions } from "../../api/session";
import { useCurrentUser } from "../../session/session";
import AuthConfirmAccessPage from "./AuthConfirmAccessPage";

/**
 * The replica's side of AuthConfirmAccessPage: the signed-in user from the
 * session; the password or code steps the session up on Lightning's API (or
 * its stand-in), then it returns to the page that asked (`return_to`), or the
 * profile. A refusal stays in the form. Lightning replaces this file with a
 * LiveView wrapper.
 */
export default function AuthConfirmAccessPageReplica() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useCurrentUser();
  const { stepUp } = useSessionActions();
  // Only a path inside the app.
  const returnTo = params.get("return_to");
  const back = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/profile";
  return (
    <AuthConfirmAccessPage
      user={{ firstName: user.firstName, lastName: user.lastName, mfaEnabled: user.mfaEnabled }}
      onConfirm={async (values) => {
        await stepUp(values);
        navigate(back);
      }}
    />
  );
}
