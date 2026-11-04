import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard, { AuthFooterLinks } from "../../components/auth/AuthCard";
import SsoLogin from "../../components/auth/SsoLogin";
import Button from "../../components/primitives/Button";
import Form from "../../components/primitives/Form";
import { useForm } from "../../utils/useForm";
import { blank, emailErrors } from "../../utils/validate";
import { errorMessage } from "../../utils/errors";
import { Checkbox, PasswordInput, TextInput } from "../../components/primitives/Inputs";
import TextLink from "../../components/primitives/TextLink";
import type { SsoProvider } from "../../types/auth";

/** What the log in form sends. */
export interface LoginValues {
  email: string;
  password: string;
  /** "Keep me logged in for 60 days". */
  rememberMe: boolean;
}

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface AuthLoginPageProps {
  /** Lightning's `allow_signup`: shows "Register". */
  allowSignup: boolean;
  /** The configured single sign-on provider, or null for none. */
  ssoProvider: SsoProvider | null;
  /** A notice above the form, such as "Logged out successfully.", or null. */
  info: string | null;
  /** Signs in. Resolves when the host accepts (it then sends the user on); rejects with the refusal to show. */
  onSignIn: (values: LoginValues) => Promise<void>;
}

/**
 * Inventory view `auth-login` (user_session_html/new.html.heex). A refusal
 * shows at the top of the card, where Lightning's flash is. Props only, so
 * it can run unchanged in Lightning.
 */
export default function AuthLoginPage({ allowSignup, ssoProvider, info, onSignIn }: AuthLoginPageProps) {
  const form = useForm({
    initial: { email: "", password: "", rememberMe: false },
    validate: ({ email, password }) => ({ email: emailErrors(email), password: blank(password) }),
  });
  const { error, ...formProps } = form.formProps(onSignIn);

  return (
    <AuthLayout title="Log in">
      <div id="login">
        <Form {...formProps}>
          <AuthCard error={error ? errorMessage(error) : undefined} info={error ? undefined : (info ?? undefined)}>
            <TextInput id="user_email" name="email" type="email" label="Email" required autoComplete="email" {...form.fieldProps("email")} />
            <PasswordInput id="user_password" name="password" label="Password" required autoComplete="current-password" {...form.fieldProps("password")} />
            <Checkbox
              id="user_remember_me"
              name="remember_me"
              label="Remember me"
              hint="Keep me logged in for 60 days"
              checked={form.values.rememberMe}
              onChange={(e) => form.set("rememberMe", e.target.checked)}
            />
            <Button type="submit">Log in</Button>
            {ssoProvider && <SsoLogin provider={ssoProvider} />}
            <AuthFooterLinks
              divider
              left={allowSignup && <TextLink variant="plain" to="/users/register">Register</TextLink>}
              right={<TextLink variant="plain" to="/users/reset_password">Forgot your password?</TextLink>}
            />
          </AuthCard>
        </Form>
      </div>
    </AuthLayout>
  );
}
