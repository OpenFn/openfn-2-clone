import AuthPanelLayout, {
  AuthPanel,
  HavingProblems,
} from "../../components/auth/AuthPanelLayout";
import Alert from "../../components/primitives/Alert";
import Form from "../../components/primitives/Form";
import { errorMessage } from "../../utils/errors";
import { useForm } from "../../utils/useForm";
import { blank } from "../../utils/validate";
import TextLink from "../../components/primitives/TextLink";
import Button from "../../components/primitives/Button";
import { TextInput } from "../../components/primitives/Inputs";
import type { TwoFactorMethod } from "../../types/auth";

/** What the two-factor form sends: the code, and which kind it is. */
export interface TwoFactorValues {
  method: TwoFactorMethod;
  code: string;
}

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface AuthTwoFactorPageProps {
  /** Which code the page asks for (Lightning's `?authentication_type=`). */
  method: TwoFactorMethod;
  /** Checks the code. Resolves when the host accepts (it then sends the user on); rejects with the refusal to show. */
  onVerify: (values: TwoFactorValues) => Promise<void>;
}

/**
 * Inventory view `auth-two-factor` (user_totp_html/new.html.heex): the second
 * step of signing in to an account with MFA. "Use your backup code" switches
 * to the backup-code form, as in Lightning. Props only, so it can run
 * unchanged in Lightning.
 */
export default function AuthTwoFactorPage({ method, onVerify }: AuthTwoFactorPageProps) {
  const other: TwoFactorMethod = method === "totp" ? "backup_code" : "totp";
  const form = useForm({ initial: { code: "" }, validate: ({ code }) => ({ code: blank(code) }) });
  // A refusal shows above the form, where Lightning's flash is.
  const { error, ...formProps } = form.formProps(({ code }) => onVerify({ method, code }));

  return (
    <AuthPanelLayout title="Two-factor authentication">
      <AuthPanel>
        {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}
        <Form {...formProps}>
          <TextInput
            id="user_code"
            label={method === "backup_code" ? "Backup Code" : "Authentication Code"}
            hint={
              method === "totp"
                ? "Open your two-factor authenticator (TOTP) app or browser extension to view your authentication code."
                : "Use one of your backup codes. Kindly note that a backup code can only be used once"
            }
            name="code"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="XXXXXX"
            {...form.fieldProps("code")}
          />
          <Button type="submit" className="w-full">
            Verify
          </Button>
        </Form>
      </AuthPanel>
      <HavingProblems>
        <li>
          <TextLink to={`/users/two-factor?authentication_type=${other}`}>
            {method === "totp" ? "Use your backup code" : "Use your authenticator app"}
          </TextLink>
        </li>
      </HavingProblems>
    </AuthPanelLayout>
  );
}
