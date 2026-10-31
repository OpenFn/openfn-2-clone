import { useState } from "react";
import FormModal from "../primitives/FormModal";
import Alert from "../primitives/Alert";
import Card from "../primitives/Card";
import Pill from "../primitives/Pill";
import { Checkbox, Field, PasswordInput, TextInput } from "../primitives/Inputs";
import ProjectsPicker from "./ProjectsPicker";
import { useForm } from "../../utils/useForm";
import { blank } from "../../utils/validate";
import type { CredentialProjectRef, OauthClientRow, OauthClientSecretsResult, OauthClientValues } from "../../types/credentials";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Set to edit an existing client, with its id and secret from the host. */
  client?: OauthClientRow | undefined;
  secrets?: OauthClientSecretsResult | undefined;
  projects: CredentialProjectRef[];
  defaultProjectIds?: string[];
  /** Superusers may make a client global. */
  allowGlobal: boolean;
  /** Saves the form. Rejects with field errors or a message, and the modal stays open; closes once it resolves. */
  onSave: (values: OauthClientValues) => Promise<void>;
}

/**
 * Lightning's OauthClientFormComponent (credential_live/oauth_client_form_component.ex):
 * endpoints, client id and secret, scopes, and project access.
 */
export default function OauthClientFormModal({ open, onClose, client, secrets, projects, defaultProjectIds = [], allowGlobal, onSave }: Props) {
  const form = useForm<OauthClientValues>({
    initial: {
      name: client?.name ?? "",
      authorizationEndpoint: client?.authorizationEndpoint ?? "",
      tokenEndpoint: client?.tokenEndpoint ?? "",
      revocationEndpoint: client?.revocationEndpoint ?? "",
      introspectionEndpoint: client?.introspectionEndpoint ?? "",
      userinfoEndpoint: client?.userinfoEndpoint ?? "",
      clientId: secrets?.clientId ?? "",
      clientSecret: secrets?.clientSecret ?? "",
      mandatoryScopes: client?.mandatoryScopes ?? [],
      optionalScopes: client?.optionalScopes ?? [],
      scopesDocUrl: client?.scopesDocUrl ?? "",
      global: client?.global ?? false,
      projectIds: client?.projects.map((p) => p.id) ?? defaultProjectIds,
    },
    validate: (v) => ({
      name: blank(v.name),
      authorizationEndpoint: blank(v.authorizationEndpoint),
      tokenEndpoint: blank(v.tokenEndpoint),
      clientId: blank(v.clientId),
      clientSecret: blank(v.clientSecret),
    }),
  });
  const { values } = form;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={client ? "Edit OAuth Client" : "Add an OAuth Client"}
      size="xl"
      formId={`oauth-client-form-${client?.id ?? "new"}`}
      onSubmit={form.modalSubmit(async (v) => {
        await onSave({ ...v, name: v.name.trim(), projectIds: v.global ? [] : v.projectIds });
        onClose();
      })}
      submitLabel={client ? "Save Changes" : "Add OAuth Client"}
    >
      <TextInput id="oauth-client-name" label="Name" required {...form.fieldProps("name")} />
      <TextInput label="Authorization Endpoint" required {...form.fieldProps("authorizationEndpoint")} />
      <TextInput label="Token Endpoint" required {...form.fieldProps("tokenEndpoint")} />
      <TextInput label="Revocation Endpoint" {...form.fieldProps("revocationEndpoint")} />
      <TextInput label="Introspection Endpoint" {...form.fieldProps("introspectionEndpoint")} />
      <TextInput label="UserInfo Endpoint" {...form.fieldProps("userinfoEndpoint")} />
      <PasswordInput label="Client ID" required {...form.fieldProps("clientId")} />
      <PasswordInput label="Client Secret" required autoComplete="new-password" {...form.fieldProps("clientSecret")} />

      <Card as="section" title="Manage Scopes" description="Type the names of the scopes and separate them using comma">
        <ScopesInput
          id={`mandatory-scopes-${client?.id ?? "new"}`}
          label="Mandatory Scopes"
          scopes={values.mandatoryScopes}
          errors={form.errors.mandatoryScopes}
          onChange={(s) => form.set("mandatoryScopes", s)}
        />
        <ScopesInput
          id={`optional-scopes-${client?.id ?? "new"}`}
          label="Optional Scopes"
          scopes={values.optionalScopes}
          errors={form.errors.optionalScopes}
          onChange={(s) => form.set("optionalScopes", s)}
        />
        <TextInput label="Scopes Documentation URL" {...form.fieldProps("scopesDocUrl")} />
      </Card>

      <Card as="section" title="Manage Project Access" description="Control which projects have access to this OAuth client">
        {allowGlobal && (
          <Alert tone="warning">
            <Field errors={form.errors.global}>
              <Checkbox
                label="Make client global (allow any project in this instance to use this client)"
                checked={values.global}
                onChange={(e) => form.set("global", e.target.checked)}
              />
            </Field>
          </Alert>
        )}
        {!values.global && (
          <ProjectsPicker
            id={client?.id ?? "new"}
            type="oauth_client"
            projects={projects}
            granted={client?.projects}
            selectedIds={values.projectIds}
            errors={form.errors.projectIds}
            onChange={(ids) => form.set("projectIds", ids)}
          />
        )}
      </Card>
    </FormModal>
  );
}

/** Scope entry: type and press comma, space or Enter to add a chip (Lightning's ClearInput hook). */
function ScopesInput({
  id,
  label,
  scopes,
  errors,
  onChange,
}: {
  id: string;
  label: string;
  scopes: string[];
  /** The host's refusals for these scopes. */
  errors: string[];
  onChange: (scopes: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  // oauth_client_form_component.ex `parse_and_update_scopes`: split on commas and spaces, merged and sorted.
  const commit = (raw: string) => {
    const added = raw.split(/[, ]+/).filter((s) => s && !scopes.includes(s));
    if (added.length) onChange([...new Set([...scopes, ...added])].sort());
    setDraft("");
  };
  return (
    // eslint-disable-next-line no-restricted-syntax -- debt: F557 Stack/Row can't render this element
    <div id={`generic-oauth-scopes-${id}`} className="space-y-2">
      <TextInput
        id={id}
        label={label}
        value={draft}
        errors={errors}
        onChange={(e) => (/[, ]/.test(e.target.value) ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          }
        }}
        onBlur={() => draft && commit(draft)}
      />
      {scopes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scopes.map((scope) => (
            <Pill key={scope} color="blue" removeLabel={`Remove ${scope}`} onRemove={() => onChange(scopes.filter((s) => s !== scope))}>
              {scope}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}
