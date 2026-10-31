import { useEffect, useRef, useState } from "react";
import Button from "../primitives/Button";
import ConfirmModal from "../primitives/ConfirmModal";
import Heading from "../primitives/Heading";
import { TextInput } from "../primitives/Inputs";
import Modal from "../primitives/Modal";
import SectionHeader from "../primitives/SectionHeader";
import TextLink from "../primitives/TextLink";
import Card from "../primitives/Card";
import Form from "../primitives/Form";
import type { MfaSettings, MfaSetupResult } from "../../types/profile";
import { useAction } from "../../utils/useAction";
import { useForm } from "../../utils/useForm";
import { blank } from "../../utils/validate";
import Text from "../primitives/Text";

interface Props {
  mfa: MfaSettings;
  /** Starts setting up an authenticator app. The secret and QR code arrive only in this reply. */
  onStartSetup: () => Promise<MfaSetupResult>;
  /** Saves the setup with the code the app shows. Rejects with field errors (`code`) or a message. */
  onConfirm: (code: string) => Promise<void>;
  onDisable: () => Promise<void>;
}

/**
 * The MFA card on /profile (profile_live/mfa_component.html.heex). Lightning
 * uses a switch, but neither way takes effect at once, so the card has buttons
 * (PRINCIPLES.md, Switch or checkbox): "Set up MFA" asks the host for a secret
 * and shows the setup form, whose Cancel closes it; "Disable MFA" asks to
 * confirm. With MFA on it links to the recovery codes. The secret lives here
 * only while the setup form is open.
 */
export default function MfaCard({ mfa, onStartSetup, onConfirm, onDisable }: Props) {
  const id = "mfa_section";
  const [setup, setSetup] = useState<MfaSetupResult | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  // After a confirmed setup the card shows MFA as on until the host's props say so.
  const [confirmed, setConfirmed] = useState(false);
  const [lastEnabled, setLastEnabled] = useState(mfa.enabled);
  if (lastEnabled !== mfa.enabled) {
    setLastEnabled(mfa.enabled);
    setConfirmed(false);
  }
  const form = useForm({
    initial: { code: "" },
    // Lightning's UserTOTP changeset wording.
    validate: ({ code }) => ({ code: code.trim() && !/^\d{6}$/.test(code) ? ["should be a 6 digit number"] : blank(code) }),
    clearOnSave: true,
  });
  const start = useAction(
    async () => {
      const result = await onStartSetup();
      form.reset();
      setShowSecret(false);
      setSetup(result);
    },
    { onError: "toast" }
  );
  // Opening or closing setup removes the button that had focus: move focus to
  // the code field when it opens, and back to the card's button when it closes.
  const wasSetup = useRef(false);
  useEffect(() => {
    if (setup !== null && !wasSetup.current) document.getElementById("mfa-code")?.focus();
    if (setup === null && wasSetup.current) document.getElementById("mfa-action")?.focus();
    wasSetup.current = setup !== null;
  }, [setup]);
  const enabled = mfa.enabled || confirmed;
  const show = enabled || setup !== null;
  const action = enabled ? (
    <Button id="mfa-action" variant="secondary" disabled={form.pending} onClick={() => setConfirmDisable(true)}>
      Disable MFA
    </Button>
  ) : setup ? undefined : (
    <Button id="mfa-action" pending={start.pending} onClick={() => void start.run()}>
      Set up MFA
    </Button>
  );


  return (
    <Card
      padding="lg"
      annotation="profile-mfa"
      title={<span id={`${id}-label`}>Enable multi-factor authentication</span>}
      description={
        <span id={`${id}-description`}>
          This adds an additional layer of security to your account by requiring more than just a password to sign in.
        </span>
      }
      action={action}
    >
      {show && (
        // eslint-disable-next-line local/primitive-classname -- debt: F526 box (border-t border-strong pt-5)
        <Text as="div" className="space-y-5 border-t border-strong pt-5">
          {enabled && !setup && (
            <p>
              You have configured an authentication app to get two-factor authentication codes.{" "}
              <TextLink id="setup_another_totp_device" onClick={() => void start.run()}>
                Setup another device instead
              </TextLink>
            </p>
          )}

          {setup && (
            <div className="space-y-2 text-muted">
              <Heading>Authenticator app</Heading>
              <p>
                Authenticator apps and browser extensions like 1Password, Authy etc. generate one-time passwords that
                are used as a second factor to verify your identity when prompted during sign-in.
              </p>
              <Heading>Scan the QR code</Heading>
              <p>Use an authenticator app or browser extension to scan.</p>
              <img src={setup.qrCodeSrc} alt="QR code for your authenticator app" className="h-44 w-44" />
              <p>
                Unable to scan? You can use <TextLink onClick={() => setShowSecret(true)}>this secret key</TextLink> to
                manually configure your authenticator app.
              </p>
              <Form
                id="set_totp_form"
                className="max-w-md"
                actions={
                  <>
                    <Button variant="secondary" disabled={form.pending} onClick={() => setSetup(null)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Save
                    </Button>
                  </>
                }
                {...form.formProps(async ({ code }) => {
                  await onConfirm(code);
                  setConfirmed(true);
                  setSetup(null);
                })}
              >
                <TextInput
                  id="mfa-code"
                  label="Verify the code from the app"
                  autoComplete="one-time-code"
                  placeholder="XXXXXX"
                  {...form.fieldProps("code")}
                />
              </Form>
              <Modal open={showSecret} onClose={() => setShowSecret(false)} title="Your two-factor secret" size="sm">
                <Text tone="muted">
                  <code>{setup.secret}</code>
                </Text>
              </Modal>
            </div>
          )}

          {enabled && (
            <SectionHeader
              title="Recovery codes"
              subtitle="Recovery codes can be used to access your account in the event you lose access to your device and cannot receive two-factor authentication codes."
              action={
                <Button variant="secondary" to={mfa.backupCodesHref}>
                  View
                </Button>
              }
            />
          )}
        </Text>
      )}

      <ConfirmModal
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        title="Disable MFA"
        tone="danger"
        confirmLabel="Disable"
        confirmId="disable_mfa_button"
        onConfirm={async () => {
          await onDisable();
          setConfirmDisable(false);
          setConfirmed(false);
          setSetup(null);
        }}
      >
        <p>
          Are you sure you want to disable MFA from your account? This will make your account less secure. Should an
          attacker get hold of your password, there will be nothing preventing them from accessing your account
        </p>
      </ConfirmModal>
    </Card>
  );
}
