import { useState } from "react";
import AuthPanelLayout, { AuthPanel } from "../../components/auth/AuthPanelLayout";
import Alert from "../../components/primitives/Alert";
import Form from "../../components/primitives/Form";
import TextLink from "../../components/primitives/TextLink";
import Text from "../../components/primitives/Text";
import Button from "../../components/primitives/Button";
import Heading from "../../components/primitives/Heading";
import { PasswordInput, TextInput } from "../../components/primitives/Inputs";
import { errorMessage } from "../../utils/errors";
import { useAction } from "../../utils/useAction";
import { useForm } from "../../utils/useForm";
import { blank, emailErrors } from "../../utils/validate";
import type { ChangeEmailValues } from "../../types/profile";

/** What the host answers a resend with. */
export type ResendResult = { status: "sent" } | { status: "throttled"; message: string } | { status: "failed" };

/** What the host answers an address change with: sent to the new address, or throttled. */
export type ChangeEmailResult = { status: "requested"; email: string } | { status: "throttled" };

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface AuthConfirmationRequiredPageProps {
  /** The address the confirmation link went to. */
  email: string;
  /** Asks for a new link to `email`. Resolves with what happened; the page shows it. */
  onResend: () => Promise<ResendResult>;
  /** Asks to send the link to a corrected address instead. Rejects with field errors (a wrong password, a bad address). */
  onChangeEmail: (values: ChangeEmailValues) => Promise<ChangeEmailResult>;
  /** Where "Log out" goes. */
  logoutTo: string;
}

/**
 * Inventory view `auth-confirmation-required`
 * (user_confirmation_required_live.html.heex): the one page a locked-out
 * account can reach. Resend and Update email each show the host's answer
 * where the HEEx showed its assigns. Props only, so it can run unchanged in
 * Lightning; the replica's fixtures live in the .replica.tsx wrapper.
 */
export default function AuthConfirmationRequiredPage({ email, onResend, onChangeEmail, logoutTo }: AuthConfirmationRequiredPageProps) {
  const [resent, setResent] = useState<ResendResult | null>(null);
  const [changed, setChanged] = useState<ChangeEmailResult | null>(null);
  // Each answer replaces the last; a request that never answered shows as its own error.
  const resend = useAction(async () => {
    setResent(null);
    setResent(await onResend());
  });
  const form = useForm<ChangeEmailValues>({
    initial: { email: "", currentPassword: "" },
    validate: ({ email: next, currentPassword }) => ({
      email: emailErrors(next).length > 0 ? emailErrors(next) : next === email ? ["must be different from the current one"] : [],
      currentPassword: blank(currentPassword),
    }),
  });
  // Sent: the form empties, as the HEEx's did, and the password with it.
  // Throttled: nothing was sent, so the typed address stays.
  const changeEmail = async (values: ChangeEmailValues) => {
    setChanged(null);
    const result = await onChangeEmail(values);
    setChanged(result);
    if (result.status === "requested") form.reset();
  };

  return (
    <AuthPanelLayout title="Confirm your email address" align="top">
      <AuthPanel>
        {/* eslint-disable-next-line no-restricted-syntax -- debt: F557 Stack/Row can't render this element */}
        <Text as="div" tone="muted" className="space-y-4">
          <p>
            Your account is blocked pending email confirmation. We sent a confirmation link to{" "}
            <span className="font-medium">{email}</span> when you signed up — open it to keep using OpenFn.
          </p>
          <p>
            If that link has expired, request a new one. If the address above is wrong, correct it below and we will
            send the link there instead.
          </p>
          {resent?.status === "sent" && (
            <Alert tone="info" id="confirmation-email-sent">
              We have sent a new confirmation link to {email}.
            </Alert>
          )}
          {resent?.status === "throttled" && (
            <Alert tone="warning" id="confirmation-email-throttled">
              {resent.message}
            </Alert>
          )}
          {changed?.status === "requested" && (
            <Alert tone="info" id="email-change-requested">
              We have sent confirmation instructions to {changed.email}.
            </Alert>
          )}
          {resent?.status === "failed" && (
            <Alert tone="danger" id="confirmation-email-failed">
              We could not send that email just now. Try again in a moment; if it keeps failing, contact your instance
              administrator.
            </Alert>
          )}
          {resend.error && <Alert tone="danger">{errorMessage(resend.error)}</Alert>}
          <Button id="resend-confirmation-email-button" onClick={() => void resend.run()} pending={resend.pending}>
            Resend confirmation email
          </Button>
        </Text>
      </AuthPanel>

      <AuthPanel>
        <Form
          id="email-form"
          {...form.formProps(changeEmail)}
        >
          <Heading as="h2">Change email address</Heading>
          {changed?.status === "throttled" && (
            <Alert tone="warning" id="email-change-throttled">
              You've asked us to change this address a few times recently. Check the inbox of the address you last
              entered; you can try another in a few minutes.
            </Alert>
          )}
          <TextInput id="user_email" name="email" type="email" label="New email address" required {...form.fieldProps("email")} />
          <PasswordInput
            id="user_current_password"
            name="current_password"
            label="Enter password to confirm"
            required
            autoComplete="current-password"
            {...form.fieldProps("currentPassword")}
          />
          <Button type="submit">
            Update email
          </Button>
        </Form>
      </AuthPanel>

      <Text>
        <TextLink to={logoutTo}>Log out</TextLink>
      </Text>
    </AuthPanelLayout>
  );
}
