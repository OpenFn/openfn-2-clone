/**
 * Credentials, OAuth clients and keychain credentials for the shared
 * credential index (annotations/shared/shared-credential-index-component.md).
 * Static fixtures only: every secret here is an obviously fake placeholder.
 */
import { projects } from "./projects";
import type { Project } from "../types/projects";
import { findUser } from "./users";
import { canEditCredential } from "../permissions";
import type { User } from "../types/users";
import { kickstartCredentials } from "./generated/kickstart";
import type {
  CredentialSecretsResult,
  CredentialIndexData,
  CredentialTypeOption,
  KeychainCredentialRow,
  OauthClientSecretsResult,
  OauthSignInResult,
  OauthUserInfo,
  StoredOauthToken,
  SchemaField,
} from "../types/credentials";
import type { Credential, KeychainCredential, OauthClient } from "./models/credentials";

const openhie = projects[0]!;
const dhis2Project = projects[1]!;

export const oauthClients: OauthClient[] = [
  {
    id: "oc-google",
    name: "Google Workspace",
    ownerId: "user-amy",
    global: false,
    projectIds: [openhie.id],
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    introspectionEndpoint: "",
    userinfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    mandatoryScopes: ["openid", "email"],
    optionalScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    scopesDocUrl: "https://developers.google.com/identity/protocols/oauth2/scopes",
  },
  {
    id: "oc-salesforce",
    name: "Salesforce",
    ownerId: "user-sizwe",
    global: true,
    projectIds: [],
    authorizationEndpoint: "https://login.salesforce.com/services/oauth2/authorize",
    tokenEndpoint: "https://login.salesforce.com/services/oauth2/token",
    revocationEndpoint: "",
    introspectionEndpoint: "",
    userinfoEndpoint: "",
    mandatoryScopes: ["api", "refresh_token"],
    optionalScopes: [],
    scopesDocUrl: "",
  },
];

export const credentials: Credential[] = [
  {
    id: "cred-dhis2-play",
    name: "DHIS2 play",
    schema: "dhis2",
    ownerId: "user-amy",
    projectIds: [openhie.id, dhis2Project.id],
    externalId: null,
    environments: ["main"],
    transferStatus: null,
    scheduledDeletion: null,
  },
  {
    id: "cred-hapi-fhir",
    name: "OpenHIE HAPI FHIR",
    schema: "fhir",
    ownerId: "user-amy",
    projectIds: [openhie.id],
    externalId: "hapi-fhir-shr-01",
    environments: ["main", "staging"],
    transferStatus: null,
    scheduledDeletion: null,
  },
  {
    id: "cred-google-sheets",
    name: "Reporting spreadsheet",
    schema: "oauth",
    oauthClientId: "oc-google",
    ownerId: "user-amy",
    projectIds: [openhie.id],
    externalId: null,
    environments: ["main"],
    transferStatus: "pending",
    scheduledDeletion: null,
  },
  {
    id: "cred-commcare",
    name: "CommCare HQ",
    schema: "commcare",
    ownerId: "user-esther",
    projectIds: [openhie.id, dhis2Project.id],
    externalId: null,
    environments: ["main"],
    transferStatus: null,
    scheduledDeletion: null,
  },
  {
    id: "cred-old-postgres",
    name: "Legacy warehouse",
    schema: "postgresql",
    ownerId: "user-amy",
    projectIds: [],
    externalId: null,
    environments: ["main"],
    transferStatus: null,
    scheduledDeletion: "2026-10-21T09:00:00Z",
  },
  // Projects loaded from kickstart/exports/ (see kickstart/sync.mjs).
  ...kickstartCredentials,
];

export const keychainCredentials: KeychainCredential[] = [
  {
    id: "kc-by-district",
    name: "By district",
    path: "$.district_id",
    defaultCredentialId: "cred-dhis2-play",
    projectId: openhie.id,
    createdById: "user-amy",
  },
];

/**
 * Every adaptor with a credential schema (short names, as Lightning shows
 * them), offered on the first page of "Add a credential".
 */
const adaptorSchemas = [
  "airqo", "arcgis", "asana", "aws-s3", "azure-storage", "beyonic", "bigquery", "browserless",
  "cartodb", "chatgpt", "cht", "claude", "commcare", "dagu", "dhis2", "divoc", "dynamics",
  "erpnext", "et-mfr", "facebook", "fhir", "fhir-4", "fhir-eswatini", "fhir-fr", "fhir-ndr-et",
  "fhir-opensrp", "flutterwave", "formsg", "gemini", "ghana-bdr", "ghana-nia", "godata",
  "googledrive", "googlehealthcare", "hive", "http", "ihris", "kobotoolbox", "mailchimp",
  "mailgun", "medicmobile", "mogli", "mongodb", "msgraph", "mssql", "mysql", "ocl", "odk",
  "openfn", "openhim", "openimis", "openlmis", "openmrs", "openspp", "postgresql", "primero",
  "rapidpro", "redis", "salesforce", "satusehat", "senaite", "sftp", "surveycto", "telerivet",
  "twilio", "vtiger", "wigal-sms",
];

const field = (key: string, label: string, kind: SchemaField["kind"] = "text", required = false): SchemaField => ({
  key,
  label,
  kind,
  required,
  placeholder: null,
  unrecognizedType: null,
});

const genericFields: SchemaField[] = [
  field("hostUrl", "Host URL", "url", true),
  field("username", "Username"),
  field("password", "Password", "password"),
];

/** A handful of real adaptor schemas, with Lightning's input kinds; the rest fall back to host/user/password. */
const schemaFields: Record<string, SchemaField[]> = {
  dhis2: [
    field("hostUrl", "Host URL", "url", true),
    field("username", "Username"),
    field("password", "Password", "password"),
    field("apiVersion", "API Version"),
    field("pat", "Personal access token", "password"),
  ],
  http: [
    field("baseUrl", "Base URL", "url"),
    field("username", "Username"),
    field("password", "Password", "password"),
    field("access_token", "Access Token", "password"),
    field("tls", "TLS", "object"),
  ],
  postgresql: [
    field("host", "Host", "text", true),
    field("port", "Port", "integer", true),
    field("database", "Database", "text", true),
    field("user", "User", "text", true),
    field("password", "Password", "password", true),
    field("ssl", "SSL", "boolean"),
  ],
  commcare: [
    field("hostUrl", "Host URL", "url"),
    field("domain", "Domain", "text", true),
    field("appId", "App ID"),
    field("username", "Username", "text", true),
    field("password", "Password", "password"),
    field("apiKey", "API Key", "password"),
  ],
  fhir: [
    field("baseUrl", "Base URL", "url", true),
    field("apiPath", "API Path"),
    field("access_token", "Access Token", "password"),
  ],
};

export function fieldsForSchema(schema: string): SchemaField[] {
  return schemaFields[schema] ?? genericFields;
}

/** "Add a credential"'s adaptor types. Their fields come from `fieldsForSchema`, one at a time, as Lightning loads them. */
export const credentialTypes: CredentialTypeOption[] = adaptorSchemas.map((s) => ({ key: s, name: s }));

export function ownerEmail(userId: string): string {
  return findUser(userId)?.email ?? "";
}

// ---------------------------------------------------------------------------
// What the replica holds, as the server would, and the contract's rows from it

/** Credentials whose runs are still in a project's audit trail (`has_activity_in_projects?`). */
export const withActivity = new Set(["cred-old-postgres"]);

/** Workflows with a job using a credential, by credential, then project (`Workflows.project_workflows_using_credentials`). */
const workflowsUsing: Record<string, Record<string, string[]>> = { "cred-dhis2-play": { [openhie.id]: ["OpenHIE Workflow"] } };

/** One stored environment. For OAuth, `body` holds the token, which never leaves the host. */
export interface StoredEnvironment {
  name: string;
  body: string;
  oauth: StoredOauthToken | null;
}

/** A sign-in the host has a token for, until a save takes it. */
export interface PendingSignIn {
  formId: string;
  credentialId: string | null;
  oauthClientId: string;
  scopes: string[];
  userInfo: OauthUserInfo | null;
}

export interface CredentialsFixture {
  credentials: Credential[];
  oauthClients: OauthClient[];
  keychainCredentials: KeychainCredential[];
  /** Stored environments per credential; generated from the schema until one is saved. */
  secrets: Record<string, StoredEnvironment[]>;
  clientSecrets: Record<string, OauthClientSecretsResult>;
  /** Tokens from sign-ins, by sign-in id. */
  signIns: Record<string, PendingSignIn>;
  /** Forms whose sign-ins were discarded; a sign-in answered later is dropped. */
  discardedForms: string[];
  /** How each sign-in ended, oldest first. */
  oauthSignIns: OauthSignInResult[];
}

export function credentialsFixture(): CredentialsFixture {
  return { credentials, oauthClients, keychainCredentials, secrets: {}, clientSecrets: {}, signIns: {}, discardedForms: [], oauthSignIns: [] };
}

/** A fake token, standing in for what the provider sends. */
export const fakeToken = (scopes: string[]) => JSON.stringify({ access_token: "fixture-access-token", refresh_token: "fixture-refresh-token", scope: scopes.join(" ") });

/** A credential's stored environments: saved ones, or obviously fake values for its schema's fields. */
export function storedEnvironmentsFor(fixture: CredentialsFixture, credential: Credential): StoredEnvironment[] {
  const saved = fixture.secrets[credential.id];
  if (saved) return saved;
  const client = fixture.oauthClients.find((c) => c.id === credential.oauthClientId);
  return credential.environments.map((name) => {
    if (credential.schema === "oauth") {
      const scopes = client?.mandatoryScopes ?? [];
      return { name, body: fakeToken(scopes), oauth: { scopes, status: "ready" as const, userInfo: null } };
    }
    if (credential.schema === "raw") return { name, body: JSON.stringify({ token: "fixture-token" }, null, 2), oauth: null };
    const fields = fieldsForSchema(credential.schema).filter((f) => f.kind !== "object");
    return {
      name,
      body: JSON.stringify(Object.fromEntries(fields.map((f) => [f.key, f.kind === "boolean" ? false : f.kind === "integer" ? 5432 : `fixture-${f.key}`]))),
      oauth: null,
    };
  });
}

/** The host's answer to `onLoadCredentialSecrets`: an OAuth token's body stays behind. */
export function credentialSecretsFor(fixture: CredentialsFixture, credential: Credential): CredentialSecretsResult {
  return {
    environments: storedEnvironmentsFor(fixture, credential).map((e) => ({ name: e.name, body: e.oauth ? "" : e.body, oauth: e.oauth })),
  };
}

export function clientSecretsFor(fixture: CredentialsFixture, id: string): OauthClientSecretsResult {
  return fixture.clientSecrets[id] ?? { clientId: "fixture-client-id", clientSecret: "fixture-client-secret" };
}

const byName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
const projectRefs = (ids: string[]) =>
  ids.flatMap((id) => {
    const p = projects.find((x) => x.id === id);
    return p ? [{ id: p.id, name: p.name }] : [];
  });

/**
 * What the credential index shows, as Lightning sends it: the viewer's own
 * credentials and clients (project undefined, /credentials) or those of the
 * project (its settings), plus the global clients.
 */
export function credentialIndexDataFor(fixture: CredentialsFixture, project: Project | undefined, viewer: User): CredentialIndexData {
  const shown = project
    ? fixture.credentials.filter((c) => c.projectIds.includes(project.id))
    : fixture.credentials.filter((c) => c.ownerId === viewer.id);
  const clients = fixture.oauthClients.filter((c) => c.global || (project ? c.projectIds.includes(project.id) : c.ownerId === viewer.id));
  return {
    credentials: byName(shown).map((c) => {
      const client = fixture.oauthClients.find((o) => o.id === c.oauthClientId);
      return {
        id: c.id,
        name: c.name,
        schema: c.schema,
        oauthClient:
          c.schema === "oauth" && client
            ? { id: client.id, name: client.name, mandatoryScopes: client.mandatoryScopes, optionalScopes: client.optionalScopes, scopesDocUrl: client.scopesDocUrl }
            : null,
        ownerEmail: ownerEmail(c.ownerId),
        projects: projectRefs(c.projectIds).map((p) => ({ ...p, workflowsUsing: workflowsUsing[c.id]?.[p.id] ?? [] })),
        externalId: c.externalId,
        environments: c.environments,
        transferStatus: c.transferStatus,
        scheduledDeletion: c.scheduledDeletion,
        hasActivityInProjects: withActivity.has(c.id),
        canEdit: canEditCredential(c, viewer),
      };
    }),
    oauthClients: byName(clients).map((c) => ({
      id: c.id,
      name: c.name,
      ownerEmail: ownerEmail(c.ownerId),
      global: c.global,
      projects: projectRefs(c.projectIds),
      authorizationEndpoint: c.authorizationEndpoint,
      tokenEndpoint: c.tokenEndpoint,
      revocationEndpoint: c.revocationEndpoint,
      introspectionEndpoint: c.introspectionEndpoint,
      userinfoEndpoint: c.userinfoEndpoint,
      mandatoryScopes: c.mandatoryScopes,
      optionalScopes: c.optionalScopes,
      scopesDocUrl: c.scopesDocUrl,
      canEdit: canEditCredential(c, viewer),
    })),
    // The viewer's projects (Lightning's `assign_projects`).
    projects: byName(projects.filter((p) => p.members.some((m) => m.userId === viewer.id))).map((p) => ({ id: p.id, name: p.name })),
    credentialTypes,
    oauthSignIns: fixture.oauthSignIns,
    canCreateGlobalOauthClient: viewer.role === "superuser",
  };
}

export function keychainRowsFor(fixture: CredentialsFixture, project: Project): KeychainCredentialRow[] {
  return byName(fixture.keychainCredentials.filter((k) => k.projectId === project.id)).map((k) => {
    const fallback = fixture.credentials.find((c) => c.id === k.defaultCredentialId);
    return {
      id: k.id,
      name: k.name,
      path: k.path,
      defaultCredential: fallback ? { id: fallback.id, name: fallback.name } : null,
      ownerEmail: ownerEmail(k.createdById),
    };
  });
}
