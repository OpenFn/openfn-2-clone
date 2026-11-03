import Alert from "../primitives/Alert";
import Button from "../primitives/Button";

/** Shown on the backup codes page when MFA is off (backup_codes_live/index.html.heex). */
export default function MfaDisabledNotice({ profileHref }: { profileHref: string }) {
  return (
    <Alert tone="warning" header="MFA Disabled">
      <p>
        In order to use backup codes, you need to have MFA enabled in your account. You can enable MFA in your account
        by visiting your profile page.
      </p>
      {/* eslint-disable-next-line local/primitive-classname -- debt: margin (mt-4) */}
      <Button to={profileHref} className="mt-4">
        Back to profile
      </Button>
    </Alert>
  );
}
