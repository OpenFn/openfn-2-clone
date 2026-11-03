import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/primitives/Toast";
import { fakeMfaSetup, profilePropsFor } from "../../mock-data/profile";
import { simulateRequest } from "../../mock-data/request";
import { users } from "../../mock-data/users";
import { useCurrentUser } from "../../session/session";
import type { User } from "../../types/users";
import { RequestError } from "../../utils/errors";
import ProfilePage from "./ProfilePage";

/**
 * The replica's side of ProfilePage: the signed-in user held in state as the
 * server would, the deletion route, and the success toasts (Lightning's
 * flashes) and navigation. Lightning replaces this file with a LiveView
 * wrapper.
 */
export default function ProfilePageReplica() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(useCurrentUser());
  const patch = (changes: Partial<User>) => setUser((u) => ({ ...u, ...changes }));
  // Lightning only lets you delete your own account here (Policies.Users :delete_account).
  const refused = userId !== undefined && userId !== user.id;

  // Once per refusal: StrictMode runs the effect twice.
  const refusing = useRef(false);
  useEffect(() => {
    if (!refused || refusing.current) {
      refusing.current = refused;
      return;
    }
    refusing.current = true;
    // edit.ex refuses with this flash; it push_patches, which can't cross live_sessions, so here it navigates.
    toast("You can't perform this action", "danger");
    navigate("/profile", { replace: true });
  }, [refused, toast, navigate]);

  return (
    <ProfilePage
      {...profilePropsFor(user)}
      deleting={userId === user.id}
      onSaveBasicInfo={async (values) => {
        await simulateRequest();
        patch(values);
        toast("User information updated successfully");
      }}
      onChangeEmail={async ({ email }) => {
        await simulateRequest();
        // Accounts.validate_change_user_email; any password passes here, Lightning checks it.
        if (email === user.email) {
          throw new RequestError("has not changed", { fieldErrors: { email: ["has not changed"] } });
        }
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          throw new RequestError("has already been taken", { fieldErrors: { email: ["has already been taken"] } });
        }
        toast("You will receive an email with instructions shortly.");
      }}
      onChangePassword={async () => {
        await simulateRequest();
        // Lightning then signs the user in again with a fresh token; the demo session needs nothing.
        toast("Password changed successfully.");
      }}
      onStartMfaSetup={() => simulateRequest(fakeMfaSetup)}
      onConfirmMfa={async () => {
        // Any six digits pass here; Lightning checks the code against the secret it handed out.
        await simulateRequest();
        patch({ mfaEnabled: true });
        toast("MFA Setup");
        // Lightning sends a first-time setup on to the backup codes page; the demo session can't record MFA, so it stays.
      }}
      onDisableMfa={async () => {
        await simulateRequest();
        patch({ mfaEnabled: false });
        toast("MFA Disabled");
      }}
      onDisconnectGithub={async () => {
        await simulateRequest();
        patch({ githubConnected: false });
        toast("GitHub connection removed successfully");
      }}
      onSetExperimentalFeatures={async (experimentalFeatures) => {
        await simulateRequest();
        patch({ experimentalFeatures });
        toast("Experimental features updated successfully");
      }}
      onDeleteAccount={async (email) => {
        await simulateRequest();
        // User.scheduled_deletion_changeset checks these again on the server.
        if (user.role === "superuser") throw new RequestError("You can't delete a superuser account.");
        if (email !== user.email) throw new RequestError("This email doesn't match your current email");
        toast("User scheduled for deletion");
        navigate("/users/log_out");
      }}
      onCloseDelete={() => navigate("/profile")}
    />
  );
}
