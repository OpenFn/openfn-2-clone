import { useEffect, useRef, useState } from "react";
import FormModal from "../primitives/FormModal";
import Button from "../primitives/Button";
import Alert from "../primitives/Alert";
import Card from "../primitives/Card";
import ConfirmModal from "../primitives/ConfirmModal";
import IconButton from "../primitives/IconButton";
import InfoTooltip from "../primitives/InfoTooltip";
import { Checkbox, PasswordInput, Radio, TextArea, TextInput } from "../primitives/Inputs";
import Tabs from "../primitives/Tabs";
import Text from "../primitives/Text";
import TextLink from "../primitives/TextLink";
import Section from "../primitives/Section";
import { Stack } from "../primitives/Stack";
import ProjectsPicker from "./ProjectsPicker";
import { adaptorIconUrl } from "../../utils/adaptors";
import { assetUrl } from "../../utils/assets";
import { formatSchemaName } from "../../utils/format";
import { errorMessage, RequestError } from "../../utils/errors";
import { useAction } from "../../utils/useAction";
import { useForm } from "../../utils/useForm";
import { blank } from "../../utils/validate";
import type {
  CredentialOauthClient,
  CredentialProjectRef,
  CredentialRow,
  CredentialSchemaResult,
  CredentialSecretsResult,
  CredentialTypeOption,
  CredentialValues,
  OauthAuthorizeResult,
  OauthAuthorizeValues,
  OauthClientRow,
  OauthSignInResult,
  SchemaField,
  StoredOauthToken,
} from "../../types/credentials";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Set to edit an existing credential (skips the type picker), with its stored values and, for an adaptor, its schema. */
  credential?: CredentialRow | undefined;
  secrets?: CredentialSecretsResult | undefined;
  schema?: CredentialSchemaResult | undefined;
  /** OAuth clients available here; each is offered as a credential type. */
  oauthClients: OauthClientRow[];
  credentialTypes: CredentialTypeOption[];
  /** Projects the user can grant access to. */
  projects: CredentialProjectRef[];
  /** Pre-selected projects for a new credential (the current project, in project settings). */
  defaultProjectIds?: string[];
  oauthSignIns: OauthSignInResult[];
  onAuthorizeOauth: (values: OauthAuthorizeValues) => Promise<OauthAuthorizeResult>;
  /** Called when the form goes, saved or not, if it started a sign-in. */
  onDiscardOauthSignIns: (formId: string) => Promise<void>;
  onLoadCredentialSchema: (key: string) => Promise<CredentialSchemaResult>;
  /** Saves the form. Rejects with field errors or a message, and the modal stays open; closes once it resolves. */
  onSave: (values: CredentialValues) => Promise<void>;
}

/** One environment tab: what it saves, plus its OAuth sign-in state. */
interface Env {
  /** Stable across renames, for this form only. */
  key: string;
  name: string;
  previousName: string | null;
  body: string;
  /** The stored token, when editing an OAuth credential. */
  stored: StoredOauthToken | null;
  /** Optional scopes ticked. */
  optionalScopes: string[];
  /** The sign-in started and not yet answered, with the scopes it asked for. */
  pending: { id: string; scopes: string[] } | null;
  /** The last answer to a sign-in from this tab. */
  answer: OauthSignInResult | null;
  /** The sign-in whose token this environment takes. */
  signInId: string | null;
  /** What the token this environment saves grants: the stored one's scopes, or what its sign-in asked for. */
  tokenScopes: string[];
}

const MAX_ENVIRONMENTS = 5;

const environmentTooltip =
  "Environment names let a workflow pick the right credential values for the project or sandbox it runs in, e.g. main, staging, production.";

// JSON.parse's source text access (ES2025, not yet in TypeScript's lib), where the browser has it.
const sourceJson = JSON as unknown as { rawJSON?: (text: string) => unknown; isRawJSON?: (value: unknown) => value is { rawJSON: string } };

/** Keeps a stored integer past 2^53 as its digits, so saving another field doesn't round it (Lightning keeps it). */
const keepBigIntegers = (_key: string, value: unknown, context?: { source?: string }) =>
  typeof value === "number" && !Number.isSafeInteger(value) && context?.source && /^-?\d+$/.test(context.source) && sourceJson.rawJSON
    ? sourceJson.rawJSON(context.source)
    : value;

/** A body's fields, for the schema form; text that isn't a JSON object reads as no fields. */
function parseFields(body: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(body, keepBigIntegers);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** credential_form_component.ex `update_environment_name`: trimmed and lowercased, then its pattern, and unique. */
function environmentNameError(name: string, envs: Env[], key: string): string | null {
  if (name === "") return "Environment name cannot be empty";
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(name)) return "Must be lowercase alphanumeric with hyphens or underscores (max 32 chars)";
  if (envs.some((e) => e.key !== key && e.name === name)) return `Environment '${name}' already exists`;
  return null;
}

/** credential_form_component.ex `generate_untitled_name`. */
function untitledName(envs: Env[]): string {
  let name = "untitled";
  for (let n = 1; envs.some((e) => e.name === name); n++) name = `untitled-${n}`;
  return name;
}

const primaryNames = ["main", "production", "prod", "master", "principal", "primary", "default"];

/** credential_form_component.ex `sort_environments`: primary names first, in that order, then the rest by name. */
function sortEnvs(envs: Env[]): Env[] {
  const rank = (e: Env) => (primaryNames.includes(e.name) ? primaryNames.indexOf(e.name) : primaryNames.length);
  return [...envs].sort((a, b) => rank(a) - rank(b) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** A page-unique id. `crypto.randomUUID` needs a secure context (https); `getRandomValues` doesn't. */
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** generic_oauth_component.ex `scopes_changed`: the ticked scopes differ from what the environment's token grants, ignoring case. */
function scopesChanged(client: CredentialOauthClient, env: Env): boolean {
  if (!env.signInId && !env.stored) return false;
  const ticked = new Set([...client.mandatoryScopes, ...env.optionalScopes].map((s) => s.toLowerCase()));
  const granted = new Set(env.tokenScopes.map((s) => s.toLowerCase()));
  return ticked.size !== granted.size || [...ticked].some((s) => !granted.has(s));
}

const emptyBody = (schema: string | null) => (schema === "raw" || schema === "oauth" ? "" : "{}");

const newEnv = (key: string, name: string, schema: string | null): Env => ({
  key,
  name,
  previousName: null,
  body: emptyBody(schema),
  stored: null,
  optionalScopes: [],
  pending: null,
  answer: null,
  signInId: null,
  tokenScopes: [],
});

/**
 * Lightning's CredentialFormComponent (credential_live/credential_form_component.ex):
 * page one picks a credential type (adaptor schema, Raw JSON or an OAuth client),
 * page two is the form: identity, per-environment values, and project access.
 * Each environment's body is JSON text, as the contract sends it.
 */
export default function CredentialFormModal({
  open,
  onClose,
  credential,
  secrets,
  schema: loadedSchema,
  oauthClients,
  credentialTypes,
  projects,
  defaultProjectIds = [],
  oauthSignIns,
  onAuthorizeOauth,
  onDiscardOauthSignIns,
  onLoadCredentialSchema,
  onSave,
}: Props) {
  const editing = !!credential;
  // Names this form in its sign-ins and its save.
  const [formId] = useState(randomId);
  const counter = useRef(0);
  // Whether the form is still open, and whether it started a sign-in whose token the host should drop when it goes.
  const alive = useRef(true);
  const signedIn = useRef(false);
  const latestDiscard = useRef(onDiscardOauthSignIns);
  useEffect(() => {
    latestDiscard.current = onDiscardOauthSignIns;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (signedIn.current) void latestDiscard.current(formId).catch(() => {});
    };
  }, [formId]);
  const nextKey = () => `${formId}:${++counter.current}`;
  const [page, setPage] = useState<"first" | "second">(editing ? "second" : "first");
  const [schema, setSchema] = useState<string | null>(credential?.schema ?? null);
  // The pick as of the last click, for a schema that answers after the pick changed.
  const latestSchema = useRef(schema);
  const [fields, setFields] = useState<SchemaField[]>(loadedSchema?.fields ?? []);
  const [oauthClientId, setOauthClientId] = useState<string | null>(credential?.oauthClient?.id ?? null);
  const [tab, setTab] = useState(0);
  const [confirmingEnvDelete, setConfirmingEnvDelete] = useState(false);
  // What's typed in the environment name field, until it's a valid name.
  const [nameDraft, setNameDraft] = useState<{ key: string; text: string } | null>(null);
  // Object fields' code, by environment and field key, as typed.
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  // The host's refusals for one environment, by environment key.
  const [envServerErrors, setEnvServerErrors] = useState<Record<string, string[]>>({});

  // Editing uses the credential's own client, which may not be shared here.
  const client: CredentialOauthClient | undefined = editing ? (credential.oauthClient ?? undefined) : oauthClients.find((c) => c.id === oauthClientId);

  const form = useForm<{ name: string; externalId: string; projectIds: string[]; environments: Env[] }>({
    initial: {
      name: credential?.name ?? "",
      externalId: credential?.externalId ?? "",
      projectIds: credential?.projects.map((p) => p.id) ?? defaultProjectIds,
      // credential_form_component.ex sorts the stored environments and opens on the first.
      environments: secrets
        ? sortEnvs(secrets.environments.map((e, i) => ({
            ...newEnv(`${formId}:loaded-${i}`, e.name, schema),
            previousName: e.name,
            body: e.body,
            stored: e.oauth,
            // generic_oauth_component.ex ticks the stored token's scopes again, even ones the client no longer lists.
            optionalScopes: (e.oauth?.scopes ?? []).filter((s) => !client?.mandatoryScopes.includes(s)),
            tokenScopes: e.oauth?.scopes ?? [],
          })))
        : [newEnv(`${formId}:0`, "main", schema)],
    },
    validate: (v) => {
      const draftError = nameDraft && environmentNameError(nameDraft.text.trim().toLowerCase(), v.environments, nameDraft.key);
      const envErrors = v.environments.flatMap((e) => {
        if (schema === "raw" && !parseJson(e.body).ok) return [`${e.name}: the body must be valid JSON`];
        if (schema === "oauth" && !e.signInId && !e.stored) return [`${e.name}: sign in with ${client?.name ?? "the provider"} first`];
        const badCode = fields.filter((f) => {
          const code = codeDrafts[`${e.key}:${f.key}`];
          return f.kind === "object" && code !== undefined && !parseJson(code).ok;
        });
        if (badCode.length) return [`${e.name}: ${badCode.map((f) => f.label).join(", ")} must be valid JSON`];
        const values = parseFields(e.body);
        const missing = fields.filter((f) => f.required && f.kind !== "boolean" && (values[f.key] ?? "") === "");
        return missing.length ? [`${e.name}: ${missing.map((f) => f.label).join(", ")} can't be blank`] : [];
      });
      return { name: blank(v.name), environments: draftError ? [draftError, ...envErrors] : envErrors };
    },
  });
  const envs = form.values.environments;
  // The latest tabs, for a sign-in that comes back after more typing.
  const latestEnvs = useRef(envs);
  useEffect(() => {
    latestEnvs.current = envs;
  });
  const env = envs[tab] ?? envs[0]!;
  const setEnvs = (next: Env[]) => form.set("environments", next);
  // A change to an environment clears the host's refusals for it.
  const patchEnv = (key: string, patch: Partial<Env>) => {
    setEnvs(envs.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    setEnvServerErrors((errors) => (errors[key]?.length ? { ...errors, [key]: [] } : errors));
  };

  // The host's answers to this form's sign-ins, each taken once, by the tab that started it.
  const answered = oauthSignIns.filter((r) => envs.some((e) => e.pending?.id === r.signInId));
  if (answered.length) {
    setEnvs(
      envs.map((e) => {
        const answer = answered.find((r) => r.signInId === e.pending?.id);
        if (!answer || !e.pending) return e;
        return answer.error
          ? { ...e, pending: null, answer }
          : { ...e, pending: null, answer, signInId: answer.signInId, tokenScopes: e.pending.scopes };
      })
    );
  }

  // Which environment the running or last failed sign-in request is for; only its tab shows the spinner and error.
  const [authorizeKey, setAuthorizeKey] = useState<string | null>(null);
  const authorize = useAction(async (target: Env) => {
    if (!client) return;
    // Opened while the click still counts, so a popup blocker lets it through; pointed at the provider once the host answers.
    const popup = window.open("", "oauth_authorization");
    if (!popup) throw new Error("Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.");
    const signInId = `${target.key}:${++counter.current}`;
    const scopes = [...new Set([...client.mandatoryScopes, ...target.optionalScopes])];
    signedIn.current = true;
    let authorizeUrl: string;
    try {
      ({ authorizeUrl } = await onAuthorizeOauth({
        formId,
        signInId,
        credentialId: credential?.id ?? null,
        oauthClientId: client.id,
        scopes,
        environment: target.name,
      }));
    } catch (e) {
      popup.close();
      throw e;
    }
    // Closed while the host answered: no sign-in for a form that's gone.
    if (!alive.current) return popup.close();
    popup.location.href = authorizeUrl;
    form.set("environments", latestEnvs.current.map((e) => (e.key === target.key ? { ...e, pending: { id: signInId, scopes }, answer: null } : e)));
  });

  // OAuth clients are offered alongside the adaptors and Raw JSON; Lightning sorts them all case-insensitively.
  const typeOptions = [
    ...credentialTypes.map((t) => ({ key: t.key, name: t.name, logo: adaptorIconUrl(t.key) })),
    { key: "raw", name: "Raw JSON", logo: assetUrl("images/raw.png") },
    ...oauthClients.map((c) => ({ key: c.id, name: c.name, logo: assetUrl("images/oauth-2.png") })),
  ].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const selected = schema === "oauth" ? oauthClientId : schema;

  const pickType = (key: string) => {
    const oauth = oauthClients.some((c) => c.id === key);
    setSchema(oauth ? "oauth" : key);
    latestSchema.current = oauth ? "oauth" : key;
    setOauthClientId(oauth ? key : null);
    setEnvs([newEnv(nextKey(), "main", oauth ? "oauth" : key)]);
  };

  const save = form.modalSubmit(async (v) => {
    try {
      await onSave({
        formId,
        name: v.name.trim(),
        externalId: v.externalId.trim(),
        schema: schema ?? "raw",
        oauthClientId: schema === "oauth" ? oauthClientId : null,
        projectIds: v.projectIds,
        environments: v.environments.map((e) => ({
          name: e.name,
          previousName: e.previousName,
          body: schema === "oauth" ? "" : e.body,
          signInId: schema === "oauth" ? e.signInId : null,
        })),
      });
    } catch (e) {
      // A refusal for one environment (`environments.<name>`) shows on that environment.
      if (!(e instanceof RequestError)) throw e;
      const byEnv: Record<string, string[]> = {};
      const listed: string[] = [];
      const rest: Record<string, string[]> = {};
      for (const [field, messages] of Object.entries(e.fieldErrors)) {
        const target = field.startsWith("environments.") ? v.environments.find((x) => x.name === field.slice("environments.".length)) : undefined;
        if (target) {
          byEnv[target.key] = messages;
          listed.push(...messages.map((m) => `${target.name}: ${m}`));
        } else rest[field] = messages;
      }
      if (!listed.length) throw e;
      setEnvServerErrors(byEnv);
      throw new RequestError(e.message, { fieldErrors: { ...rest, environments: listed } });
    }
    onClose();
  });

  if (page === "first") {
    return (
      <FormModal
        key="picker"
        open={open}
        onClose={onClose}
        title="Add a credential"
        size="xl"
        formId="credential-schema-picker"
        formClassName=""
        onSubmit={async () => {
          // An adaptor's fields come from the host. A failure shows here, and Configure tries again.
          // The latest pick wins: one made while the fields load is loaded in turn.
          let picked: string | null;
          let loaded: SchemaField[];
          do {
            picked = latestSchema.current;
            loaded = picked && picked !== "raw" && picked !== "oauth" ? (await onLoadCredentialSchema(picked)).fields : [];
          } while (picked !== latestSchema.current);
          setFields(loaded);
          setPage("second");
        }}
        submitLabel="Configure credential"
        submitDisabled={!selected}
        cancelId="cancel-credential-type-picker"
      >
        <div className="grid max-h-99 grid-cols-2 gap-4 overflow-auto p-1 sm:grid-cols-3 md:grid-cols-4">
          {typeOptions.map((o) => (
            <Radio
              key={o.key}
              id={`credential-schema-picker_selected_${o.key}`}
              name="selected"
              value={o.key}
              checked={selected === o.key}
              onChange={() => pickType(o.key)}
              label={
                <span className="inline-flex items-center gap-1 font-medium">
                  {o.name}
                  {o.logo && <img src={o.logo} alt="" className="h-3 w-3" />}
                </span>
              }
            />
          ))}
        </div>
      </FormModal>
    );
  }

  const shownName = nameDraft?.key === env.key ? nameDraft.text : env.name;
  const nameError = nameDraft?.key === env.key ? environmentNameError(nameDraft.text.trim().toLowerCase(), envs, env.key) : null;
  const permissionsChanged = !!client && schema === "oauth" && envs.some((e) => scopesChanged(client, e));
  const values = parseFields(env.body);
  const setValue = (key: string, value: unknown) => patchEnv(env.key, { body: JSON.stringify({ ...values, [key]: value }) });

  return (
    <FormModal
      key="form"
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${credential.name || "credential"}` : `Create ${formatSchemaName(schema ?? "raw")} credential`}
      size="lg"
      before={
        schema === "oauth" &&
        !client && (
          // eslint-disable-next-line local/primitive-classname -- debt: margin (mb-4)
          <Alert tone="danger" header="OAuth client not found" className="mb-4">
            <p>The associated Oauth client for this credential cannot be found. Create a new client or contact your administrator.</p>
          </Alert>
        )
      }
      formId={`credential-form-${credential?.id ?? "new"}`}
      formClassName="space-y-4"
      onSubmit={save}
      submitLabel="Save Credential"
      // credential_form_component.ex disables Save while any environment's permissions changed since its sign-in.
      submitDisabled={permissionsChanged}
      submitTooltip={permissionsChanged ? "Reauthenticate to apply the changed permissions first" : undefined}
      submitId={`save-credential-button-${credential?.id ?? "new"}`}
    >
      <Card as="section" title="Credential identity" description="Basic information that applies to all environments">
        <TextInput id="credential-name" label="Credential Name" required {...form.fieldProps("name")} />
        <TextInput
          id="credential-external-id"
          label="External ID"
          hint="Optional identifier for external systems"
          {...form.fieldProps("externalId")}
        />
      </Card>

      <Card
        as="section"
        title="Credential environments"
        description="Different credential values for each environment (dev, staging, production, etc.)"
      >
        {form.errors.environments.length > 0 && (
          <Alert tone="danger" id="credential-environments-errors">
            {form.errors.environments.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Alert>
        )}
        <Tabs
          label="Environments"
          tabs={envs.map((e, i) => ({ id: String(i), label: e.name }))}
          active={String(tab)}
          onChange={(id) => {
            setTab(Number(id));
            setNameDraft(null);
          }}
          after={
            <IconButton
              id="add-environment-button"
              icon="hero-plus"
              label={envs.length >= MAX_ENVIRONMENTS ? "Maximum of 5 environments reached" : "Add new environment"}
              disabled={envs.length >= MAX_ENVIRONMENTS}
              onClick={() => {
                const added = newEnv(nextKey(), untitledName(envs), schema);
                const next = sortEnvs([...envs, added]);
                setEnvs(next);
                setTab(next.indexOf(added));
                setNameDraft(null);
              }}
            />
          }
        />
        <Stack gap="lg">
          <TextInput
            id="environment-name-input"
            label="Environment name"
            required
            info={environmentTooltip}
            placeholder="e.g., production, staging, development, test, qa"
            value={shownName}
            errors={[...(nameError ? [nameError] : []), ...(envServerErrors[env.key] ?? [])]}
            onChange={(e) => {
              const text = e.target.value;
              const name = text.trim().toLowerCase();
              setNameDraft({ key: env.key, text });
              // Lightning renames only to a valid name; the body and token move with it.
              if (!environmentNameError(name, envs, env.key)) patchEnv(env.key, { name });
            }}
          />
          {schema === "oauth" ? (
            client && (
              <OauthFields
                key={env.key}
                client={client}
                env={env}
                authorizing={authorize.pending && authorizeKey === env.key}
                authorizeError={authorizeKey === env.key ? authorize.error : null}
                onScopes={(optionalScopes) => patchEnv(env.key, { optionalScopes })}
                onSignIn={() => {
                  if (authorize.pending) return;
                  setAuthorizeKey(env.key);
                  void authorize.run(env);
                }}
              />
            )
          ) : schema === "raw" ? (
            <TextArea
              id="credential-body-raw"
              label="Credential Body"
              required
              rows={8}
              // eslint-disable-next-line local/primitive-classname -- debt: type (font-mono)
              className="font-mono"
              value={env.body}
              onChange={(e) => patchEnv(env.key, { body: e.target.value })}
            />
          ) : (
            <Stack gap="lg">
              {fields.map((f) => (
                <SchemaInput
                  key={`${env.key}-${f.key}`}
                  field={f}
                  value={values[f.key]}
                  code={codeDrafts[`${env.key}:${f.key}`]}
                  onChange={(value) => setValue(f.key, value)}
                  onCode={(text) => {
                    setCodeDrafts((drafts) => ({ ...drafts, [`${env.key}:${f.key}`]: text }));
                    const parsed = parseJson(text);
                    if (parsed.ok) setValue(f.key, parsed.value);
                  }}
                />
              ))}
            </Stack>
          )}
        </Stack>
        {envs.length > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmingEnvDelete(true)} icon="hero-trash">
            Delete environment
          </Button>
        )}
        {/* Lightning's data-confirm on the delete button. */}
        {confirmingEnvDelete && (
          <ConfirmModal
            key={env.key}
            open
            onClose={() => setConfirmingEnvDelete(false)}
            onConfirm={() => {
              setEnvs(envs.filter((e) => e.key !== env.key));
              setTab(0);
              setNameDraft(null);
              setConfirmingEnvDelete(false);
            }}
            title="Delete environment"
            confirmLabel="Delete"
            tone="danger"
          >
            <p>Are you sure you want to delete the {env.name} environment?</p>
          </ConfirmModal>
        )}
      </Card>

      <Card as="section" title="Projects access" description="Select projects that can use this credential">
        <ProjectsPicker
          id={credential?.id ?? "new"}
          type="credential"
          projects={projects}
          granted={credential?.projects}
          selectedIds={form.values.projectIds}
          errors={form.errors.projectIds}
          onChange={(ids) => form.set("projectIds", ids)}
        />
      </Card>
    </FormModal>
  );
}

/** One schema field, drawn as JsonSchemaBodyComponent's `input_type` says, keeping its value's type. */
function SchemaInput({
  field: f,
  value,
  code,
  onChange,
  onCode,
}: {
  field: SchemaField;
  value: unknown;
  /** An object field's code as typed. */
  code: string | undefined;
  onChange: (value: unknown) => void;
  onCode: (text: string) => void;
}) {
  const id = `credential-body-${f.key}`;
  const text = value === undefined || value === null ? "" : sourceJson.isRawJSON?.(value) ? value.rawJSON : String(value);
  const placeholder = f.placeholder ?? undefined;
  switch (f.kind) {
    case "boolean":
      return <Checkbox id={id} label={f.label} checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
    case "object":
      return (
        <TextArea
          id={id}
          label={f.label}
          required={f.required}
          rows={4}
          // eslint-disable-next-line local/primitive-classname -- debt: type (font-mono)
          className="font-mono"
          value={code ?? (value === undefined ? "" : JSON.stringify(value, null, 2))}
          errors={code !== undefined && !parseJson(code).ok ? ["must be valid JSON"] : []}
          onChange={(e) => onCode(e.target.value)}
        />
      );
    case "password":
      return <PasswordInput id={id} label={f.label} required={f.required} placeholder={placeholder} value={text} onChange={(e) => onChange(e.target.value)} />;
    case "integer":
      return (
        <TextInput
          id={id}
          label={f.label}
          required={f.required}
          placeholder={placeholder}
          value={text}
          // Saved as a number once it is one that survives the trip; anything else goes as typed, for the host to refuse.
          onChange={(e) => onChange(/^-?\d+$/.test(e.target.value) && Number.isSafeInteger(Number(e.target.value)) ? Number(e.target.value) : e.target.value)}
        />
      );
    default:
      return (
        <TextInput
          id={id}
          type={f.kind === "url" ? "url" : "text"}
          label={f.label}
          required={f.required}
          placeholder={placeholder}
          value={text}
          // json_schema_body_component.ex's schema warning.
          hint={f.unrecognizedType ? `This adaptor's configuration schema specifies an unrecognized type (${f.unrecognizedType}) for this field; we'll store it as text.` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/**
 * GenericOauthComponent and Components.Oauth.oauth_status for one
 * environment: scopes, then "Sign in with …", waiting, the host's answer,
 * the stored token's state, or signed in with a way to sign in again.
 */
function OauthFields({
  client,
  env,
  authorizing,
  authorizeError,
  onScopes,
  onSignIn,
}: {
  client: CredentialOauthClient;
  env: Env;
  authorizing: boolean;
  authorizeError: Error | null;
  onScopes: (optional: string[]) => void;
  onSignIn: () => void;
}) {
  // generic_oauth_component.ex also lists the stored token's scopes the client no longer does.
  const scopes = [...new Set([...client.mandatoryScopes, ...client.optionalScopes, ...env.tokenScopes])];
  const signInButton = (label: string) => (
    <Button id="authorize-button" onClick={onSignIn} pending={authorizing}>
      {label}
    </Button>
  );
  const userInfo = env.signInId ? env.answer?.userInfo : env.stored?.userInfo;

  let status;
  if (env.pending) {
    // Lightning has no way out of this; a closed popup would otherwise leave the tab waiting for good.
    status = (
      <Text as="p" tone="muted">
        Authenticating with {client.name}... <TextLink onClick={onSignIn}>Start again</TextLink>
      </Text>
    );
  } else if (env.answer?.error) {
    status = (
      <>
        <Alert tone="danger" header={`Couldn't sign in with ${client.name}`}>
          {env.answer.error}
        </Alert>
        {signInButton("Try again")}
      </>
    );
  } else if (scopesChanged(client, env)) {
    // oauth_error_formatter.ex `:scope_changed`. Save waits until it's signed in again.
    status = (
      <>
        <Alert tone="warning" header="Reauthentication Required">
          <Stack gap="sm">
            <p>You've changed the permissions for this credential.</p>
            <Text as="p">
              Please reauthenticate with {client.name} to apply these changes.
            </Text>
          </Stack>
        </Alert>
        {signInButton("Reauthenticate")}
      </>
    );
  } else if (env.signInId || env.stored?.status === "ready") {
    status = (
      <>
        {userInfo ? (
          <Alert tone="success">
            <p className="font-semibold">{userInfo.name ?? "Unknown User"}</p>
            <p>{userInfo.email ?? "No email provided"}</p>
            <Text as="p" variant="body-sm">
              Successfully authenticated with {client.name}
            </Text>
          </Alert>
        ) : (
          <Alert tone="info">
            Successfully authenticated with {client.name}. Your credential seems ready to use, but we couldn't fetch your
            user info to verify. This app may not provide a user info endpoint, or your admin may not have configured it.
          </Alert>
        )}
        <Text as="p" tone="muted">
          If your credential isn't working as expected, you can{" "}
          <TextLink onClick={onSignIn}>reauthenticate with {client.name}</TextLink>
        </Text>
      </>
    );
  } else if (env.stored?.status === "unavailable") {
    // oauth_error_formatter.ex, for a refresh that got a 5xx or 429.
    status = (
      <>
        <Alert tone="warning" header={`${client.name} is Having Issues`}>
          <Stack gap="sm">
            <p>{client.name} is experiencing technical difficulties.</p>
            <Text as="p">
              This is temporary - please try again in a few minutes.
            </Text>
          </Stack>
        </Alert>
        {signInButton("Try Again Later")}
      </>
    );
  } else if (env.stored?.status === "reauthorize") {
    // oauth_error_formatter.ex, for a refresh refused with invalid_grant.
    status = (
      <>
        <Alert tone="warning" header={`Your authorization with ${client.name} has expired or was revoked.`}>
          You'll need to reauthorize to continue using this credential.
        </Alert>
        {signInButton(`Reauthorize with ${client.name}`)}
      </>
    );
  } else {
    status = signInButton(`Sign in with ${client.name}`);
  }

  return (
    // eslint-disable-next-line no-restricted-syntax -- debt: a child would change in a flex column
    <div className="space-y-4">
      {scopes.length > 0 && (
        <Section
          size="sm"
          title={
            <>
              Select permissions
              <InfoTooltip title="Select permissions associated to your OAuth2 Token" />
            </>
          }
        >
          {client.scopesDocUrl && (
            <Text as="p" variant="body-sm" tone="strong">
              Learn more about {client.name} permissions{" "}
              <TextLink to={client.scopesDocUrl} external>
                here
              </TextLink>
            </Text>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {scopes.map((s) => {
              const mandatory = client.mandatoryScopes.includes(s);
              return (
                <Checkbox
                  key={s}
                  label={s}
                  checked={mandatory || env.optionalScopes.includes(s)}
                  disabled={mandatory}
                  onChange={(e) => onScopes(e.target.checked ? [...env.optionalScopes, s] : env.optionalScopes.filter((x) => x !== s))}
                />
              );
            })}
          </div>
        </Section>
      )}
      {authorizeError && <Alert tone="danger">{errorMessage(authorizeError)}</Alert>}
      {status}
    </div>
  );
}
