import { useState } from "react";
import { authRedirectUri } from "../../utils/urls";
import type { AuthProvider, AuthProviderValues } from "../../types/admin";
import Alert from "../primitives/Alert";
import Button from "../primitives/Button";
import Form from "../primitives/Form";
import Card from "../primitives/Card";
import Section from "../primitives/Section";
import { Checkbox, PasswordInput, TextInput } from "../primitives/Inputs";
import Text from "../primitives/Text";
import TextLink from "../primitives/TextLink";
import { cn } from "../../utils/cn";
import { RequestError, errorMessage } from "../../utils/errors";
import { useAction } from "../../utils/useAction";
import { blank } from "../../utils/validate";
import { Stack } from "../primitives/Stack";

type TestState = "unknown" | "success" | "failed";

interface Props {
  provider: AuthProvider;
  /** Saves. Resolves when the host has it; rejects with field errors or a message. */
  onSave: (values: AuthProviderValues) => Promise<void>;
  /** Fetches the discovery document with these values. Resolves on success; rejects with why not. */
  onTest: (values: AuthProviderValues) => Promise<void>;
  /** Removes the provider. Resolves when the host has (it then shows the blank form). */
  onRemove: () => Promise<void>;
  /** The Test button's state at first render; it starts "unknown" and resets on any edit. */
  initialTestState?: TestState;
}

function TestButton({ state, pending, onTest }: { state: TestState; pending: boolean; onTest: () => void }) {
  if (state === "failed")
    return (
      <Button tone="danger" id="test-button" icon="hero-x-mark-solid">
        Failed
      </Button>
    );
  if (state === "success")
    return (
      <Button tone="success" id="test-button" icon="hero-check-solid">
        Success
      </Button>
    );
  return (
    <Button variant="secondary" id="test-button" onClick={onTest} pending={pending} icon="hero-beaker-solid">
      Test
    </Button>
  );
}

const docsLink = (href: string) => (
  <TextLink to={href} external>
    here &raquo;
  </TextLink>
);

const fieldErrorsOf = (error: Error | null) => (error instanceof RequestError ? error.fieldErrors : {});

/**
 * The OpenID Connect provider form (auth_providers/form_component.ex): the
 * fields on the left, the explanation and redirect URI preview on the right.
 * An existing provider also gets Remove. Save is always enabled: pressing
 * it with a required field blank says so on the field. Test waits for the
 * required fields; a stored secret may be left blank to keep it. The
 * host's field errors land on their fields, and a failed Test says
 * why under the discovery URL.
 */
export default function AuthProviderForm({ provider, onSave, onTest, onRemove, initialTestState = "unknown" }: Props) {
  const [values, setValues] = useState<AuthProviderValues>({
    name: provider.name,
    discoveryUrl: provider.discoveryUrl,
    clientId: provider.clientId,
    clientSecret: "",
    redirectHost: provider.redirectHost,
    allowUnverifiedEmail: provider.allowUnverifiedEmail,
  });
  const [testState, setTestState] = useState<TestState>(initialTestState);
  const [submitted, setSubmitted] = useState(false);
  const save = useAction(() => onSave(values));
  const test = useAction(async () => {
    try {
      await onTest(values);
      setTestState("success");
    } catch (e) {
      setTestState("failed");
      throw e;
    }
  });
  const remove = useAction(onRemove);

  // Any edit forgets the last Test and the last refusal, as the HEEx's validate did.
  const set = <K extends keyof AuthProviderValues>(key: K, value: AuthProviderValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setTestState("unknown");
    save.reset();
    test.reset();
  };

  // What the host's changeset will refuse, said as it says it (auth_config_form.ex).
  const nameError =
    values.name !== "" && !/^[a-z0-9\-_]+$/.test(values.name)
      ? ["must be lower-case and only contain alphanumeric, dash and underscore characters"]
      : [];
  const urlError = values.discoveryUrl !== "" && !/^https?:\/\/\S+\.\S+/.test(values.discoveryUrl) ? ["must be a valid HTTP/s URL"] : [];
  const valid =
    values.name.trim() !== "" &&
    nameError.length === 0 &&
    values.discoveryUrl.trim() !== "" &&
    urlError.length === 0 &&
    values.clientId.trim() !== "" &&
    (values.clientSecret.trim() !== "" || provider.hasClientSecret) &&
    values.redirectHost.trim() !== "";
  // A refused Save or Test puts its field errors on the fields; a Test's reason goes under the URL.
  const saveErrors = { ...fieldErrorsOf(save.error), ...fieldErrorsOf(test.error) };
  const testError = test.error && Object.keys(fieldErrorsOf(test.error)).length === 0 ? errorMessage(test.error) : null;
  const generalError = save.error && Object.keys(saveErrors).length === 0 ? errorMessage(save.error) : null;
  // Blank required fields are said only once Save was pressed.
  const required = (value: string, keep = false) => (submitted && !keep ? blank(value) : []);

  return (
    <div id={`auth-provider-form-${provider.id ?? "new"}`}>
      {/* The fields are the form; the help and Remove sit beside it. */}
      <div className="grid grid-cols-2 gap-6">
        <Form
          id="auth-provider-form"
          error={generalError}
          pending={save.pending}
          actions={
            <>
              {valid && <TestButton state={testState} pending={test.pending} onTest={() => void test.run()} />}
              <Button type="submit">
                Save
              </Button>
            </>
          }
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            if (valid) void save.run();
          }}
        >
          <TextInput
            id="auth_provider_name"
            name="name"
            label="Name"
            hint="The name of the provider, used in the redirect URI."
            value={values.name}
            errors={[...required(values.name), ...nameError, ...(saveErrors["name"] ?? [])]}
            onChange={(e) => set("name", e.target.value)}
          />
          <TextInput
            id="auth_provider_discovery_url"
            name="discovery_url"
            label="Discovery URL"
            hint={
              <>
                The URL to the <code>.well-known</code> endpoint.
              </>
            }
            value={values.discoveryUrl}
            errors={[...required(values.discoveryUrl), ...urlError, ...(saveErrors["discoveryUrl"] ?? []), ...(testError ? [testError] : [])]}
            onChange={(e) => set("discoveryUrl", e.target.value)}
          />
          <TextInput
            id="auth_provider_client_id"
            name="client_id"
            label="Client ID"
            value={values.clientId}
            errors={[...required(values.clientId), ...(saveErrors["clientId"] ?? [])]}
            onChange={(e) => set("clientId", e.target.value)}
          />
          <PasswordInput
            id="client_secret"
            name="client_secret"
            label="Client Secret"
            autoComplete="off"
            placeholder={provider.hasClientSecret ? "Leave blank to keep the current secret" : undefined}
            value={values.clientSecret}
            errors={[...required(values.clientSecret, provider.hasClientSecret), ...(saveErrors["clientSecret"] ?? [])]}
            onChange={(e) => set("clientSecret", e.target.value)}
          />
          <TextInput
            id="auth_provider_redirect_host"
            name="redirect_host"
            label="Redirect Host"
            value={values.redirectHost}
            errors={[...required(values.redirectHost), ...(saveErrors["redirectHost"] ?? [])]}
            onChange={(e) => set("redirectHost", e.target.value)}
          />
          <Checkbox
            id="auth_provider_allow_unverified_email"
            name="allow_unverified_email"
            label="Trust unverified emails from this provider"
            hint={
              <>
                Only enable for a provider you trust that doesn't assert <code>email_verified</code>. Off by default.
              </>
            }
            checked={values.allowUnverifiedEmail}
            onChange={(e) => set("allowUnverifiedEmail", e.target.checked)}
          />
        </Form>
        <Text as="div" tone="body">
          <Stack gap="md" className="h-full">
            <p>
              Allows users with existing accounts to login with an external OpenID Connect account that matches their
              email address.
            </p>
            <p>
              In order to make things easier we rely on the providers well-known file to determine all the different
              endpoints for authentication and retrieving the user information. Documentation on Google's OpenID
              Connect support and it's well-known file see{" "}
              {docsLink("https://developers.google.com/identity/protocols/oauth2/openid-connect#discovery")}
            </p>
            <div className="sm:border-t sm:border-subtle sm:pt-4">
              <Section title="Redirect URI" size="sm">
                <Card
                  variant="muted"
                  padding="sm"
                  id="redirect-uri-preview"
                  // eslint-disable-next-line local/primitive-classname -- debt: type, state, colour (font-mono cursor-not-allowed text-faint)
                  className={cn("font-mono", !valid && "cursor-not-allowed text-faint")}
                >
                  {valid ? authRedirectUri(values) : <>{values.redirectHost}&hellip;</>}
                </Card>
                <p>
                  Ensure your provider has this redirect URI set. For more information see{" "}
                  {docsLink("https://developers.google.com/identity/protocols/oauth2/openid-connect#setredirecturi")}
                </p>
              </Section>
            </div>
            {provider.id !== null && (
              <div className="mt-auto">
                <Section title="Remove" size="sm">
                  <p>Deletes the Authentication Configuration, and disables external authentication for Lightning.</p>
                  {remove.error && <Alert tone="danger">{errorMessage(remove.error)}</Alert>}
                  <Button tone="danger" onClick={() => void remove.run()} pending={remove.pending} icon="hero-trash">
                    Remove
                  </Button>
                </Section>
              </div>
            )}
          </Stack>
        </Text>
      </div>
    </div>
  );
}
