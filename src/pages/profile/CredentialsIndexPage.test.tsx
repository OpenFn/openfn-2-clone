import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterProvider, type Router } from "../../routing/router";
import { ToastProvider } from "../../components/primitives/Toast";
import type { CredentialRow, OauthClientRow } from "../../types/credentials";
import { RequestError } from "../../utils/errors";
import { pickOption } from "../../test/select";
import CredentialsIndexPage, { type CredentialsIndexPageProps } from "./CredentialsIndexPage";
import { isDisabled } from "../../test/disabled";

const dhis2: CredentialRow = {
  id: "cred1",
  name: "DHIS2 play",
  schema: "dhis2",
  oauthClient: null,
  ownerEmail: "amy@example.org",
  projects: [{ id: "p1", name: "openhie", workflowsUsing: [] }],
  externalId: "dhis2-01",
  environments: ["main", "staging"],
  transferStatus: null,
  scheduledDeletion: null,
  hasActivityInProjects: false,
  canEdit: true,
};
const sheets: CredentialRow = {
  ...dhis2,
  id: "cred2",
  name: "Reporting spreadsheet",
  schema: "oauth",
  oauthClient: { id: "oc1", name: "Google Workspace", mandatoryScopes: ["openid"], optionalScopes: ["spreadsheets", "drive"], scopesDocUrl: "" },
  externalId: null,
  environments: ["main"],
};
const google: OauthClientRow = {
  id: "oc1",
  name: "Google Workspace",
  ownerEmail: "amy@example.org",
  global: false,
  projects: [{ id: "p1", name: "openhie" }],
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "",
  introspectionEndpoint: "",
  userinfoEndpoint: "",
  mandatoryScopes: ["openid", "email"],
  optionalScopes: ["spreadsheets"],
  scopesDocUrl: "",
  canEdit: true,
};

const data = (): Omit<CredentialsIndexPageProps, `on${string}`> => ({
  credentials: [dhis2, sheets],
  oauthClients: [google],
  projects: [
    { id: "p1", name: "openhie" },
    { id: "p2", name: "dhis2-project" },
  ],
  credentialTypes: [{ key: "dhis2", name: "dhis2" }],
  oauthSignIns: [],
  canCreateGlobalOauthClient: false,
});

function renderPage(props: Partial<CredentialsIndexPageProps> = {}) {
  const router: Router = { navigate: vi.fn(), useHref: (to) => to, useLocation: () => ({ pathname: "/credentials", search: "", hash: "" }) };
  const done = () => vi.fn().mockResolvedValue(undefined);
  const handlers = {
    onCreateCredential: done(),
    onUpdateCredential: done(),
    onLoadCredentialSecrets: vi.fn().mockResolvedValue({
      environments: [
        { name: "main", body: '{"hostUrl":"https://play.dhis2.org"}', oauth: null },
        { name: "staging", body: '{"hostUrl":"https://staging.dhis2.org"}', oauth: null },
      ],
    }),
    onLoadCredentialSchema: vi.fn().mockResolvedValue({
      fields: [
        { key: "hostUrl", label: "Host URL", kind: "url", required: true, placeholder: null, unrecognizedType: null },
        { key: "password", label: "Password", kind: "password", required: false, placeholder: null, unrecognizedType: null },
      ],
    }),
    onDeleteCredential: done(),
    onCancelCredentialDeletion: done(),
    onTransferCredential: done(),
    onRevokeCredentialTransfer: done(),
    onAuthorizeOauth: vi.fn().mockResolvedValue({ authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=x" }),
    onDiscardOauthSignIns: vi.fn().mockResolvedValue(undefined),
    onCreateOauthClient: done(),
    onUpdateOauthClient: done(),
    onLoadOauthClientSecrets: vi.fn().mockResolvedValue({ clientId: "client-1", clientSecret: "shh" }),
    onDeleteOauthClient: done(),
  };
  const page = (next: Partial<CredentialsIndexPageProps>) => (
    <RouterProvider value={router}>
      <ToastProvider>
        <CredentialsIndexPage {...data()} {...handlers} {...next} />
      </ToastProvider>
    </RouterProvider>
  );
  const { rerender } = render(page(props));
  return { ...handlers, rerender: (next: Partial<CredentialsIndexPageProps>) => rerender(page({ ...props, ...next })) };
}

const dialog = () => screen.getByRole("dialog");
const row = (id: string) => document.getElementById(id)!;
const openActions = async (id: string) => {
  await userEvent.click(within(row(id)).getByRole("button", { name: /Actions/ }));
  return screen.getByRole("menu");
};
const choose = async (id: string, item: string) => userEvent.click(within(await openActions(id)).getByRole("menuitem", { name: item }));
const addNew = async (item: string) => {
  await userEvent.click(screen.getByRole("button", { name: /Add new/ }));
  await userEvent.click(screen.getByRole("menuitem", { name: new RegExp(item) }));
};
/** Picks a type on "Add a credential" and waits for the form. */
const configure = async (type: string) => {
  await addNew("Credential");
  fireEvent.click(within(dialog()).getByLabelText(new RegExp(type)));
  fireEvent.click(within(dialog()).getByRole("button", { name: "Configure credential" }));
  // The picker leaves as the form arrives, so look for the form across the page.
  await screen.findByRole("button", { name: "Save Credential" });
};

afterEach(() => vi.restoreAllMocks());

describe("CredentialsIndexPage", () => {
  it("lists the viewer's credentials and clients as the host sends them, without an owner column", () => {
    renderPage({ credentials: [dhis2, { ...sheets, oauthClient: null }] });
    const cells = (id: string) => [...row(id).querySelectorAll("td")].map((td) => td.textContent);
    expect(cells("credentials-cred1").slice(0, 5)).toEqual(["DHIS2 play", "dhis2", "openhie", "dhis2-01", "2"]);
    expect(cells("credentials-cred2")[1]).toBe("oauth");
    expect(within(row("credentials-cred2")).getByLabelText("OAuth client not found")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Owner" })).toBeNull();
    expect(document.getElementById("keychain-credentials-table-container")).toBeNull();
  });

  it("names an OAuth credential's type after its client", () => {
    renderPage();
    expect(row("credentials-cred2").querySelectorAll("td")[1]!.textContent).toBe("google workspace");
  });

  it("offers no actions on a row the viewer doesn't own", () => {
    renderPage({ credentials: [{ ...dhis2, canEdit: false }], oauthClients: [{ ...google, canEdit: false }] });
    expect(within(row("credentials-cred1")).queryByRole("button", { name: /Actions/ })).toBeNull();
    expect(within(row("oauth-clients-oc1")).queryByRole("button", { name: /Actions/ })).toBeNull();
  });

  it("creates a credential from a schema the host sends when it's picked, sending each environment's body as JSON", async () => {
    const { onCreateCredential, onLoadCredentialSchema } = renderPage();
    await configure("dhis2");
    expect(onLoadCredentialSchema).toHaveBeenCalledWith("dhis2");
    fireEvent.change(document.getElementById("credential-name")!, { target: { value: "New DHIS2" } });
    fireEvent.change(document.getElementById("credential-body-hostUrl")!, { target: { value: "https://dhis2.example.org" } });
    await pickOption(document.getElementById("project-credentials-list-new")!, "dhis2-project");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    await waitFor(() =>
      expect(onCreateCredential).toHaveBeenCalledWith({
        formId: expect.any(String),
        name: "New DHIS2",
        externalId: "",
        schema: "dhis2",
        oauthClientId: null,
        projectIds: ["p2"],
        environments: [{ name: "main", previousName: null, body: '{"hostUrl":"https://dhis2.example.org"}', signInId: null }],
      })
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("stays on the type picker when the schema can't be loaded, and loads it again on Configure", async () => {
    const onLoadCredentialSchema = vi
      .fn()
      .mockRejectedValueOnce(new RequestError("Could not load the dhis2 schema."))
      .mockResolvedValue({ fields: [{ key: "hostUrl", label: "Host URL", kind: "url", required: true, placeholder: null, unrecognizedType: null }] });
    renderPage({ onLoadCredentialSchema });
    await addNew("Credential");
    fireEvent.click(screen.getByLabelText("dhis2"));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Configure credential" }));
    expect(await within(dialog()).findByText("Could not load the dhis2 schema.")).toBeTruthy();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Configure credential" }));
    expect(await screen.findByLabelText(/Host URL/)).toBeTruthy();
    expect(onLoadCredentialSchema).toHaveBeenCalledTimes(2);
  });

  it("opens the type picked last when the pick changes while a schema loads", async () => {
    const answers: Record<string, (v: unknown) => void> = {};
    const onLoadCredentialSchema = vi.fn((key: string) => new Promise((resolve) => (answers[key] = resolve)));
    const field = (key: string, label: string) => ({ key, label, kind: "url", required: false, placeholder: null, unrecognizedType: null });
    renderPage({ onLoadCredentialSchema: onLoadCredentialSchema as never, credentialTypes: [{ key: "dhis2", name: "dhis2" }, { key: "http", name: "http" }] });
    await addNew("Credential");
    fireEvent.click(screen.getByLabelText("dhis2"));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Configure credential" }));
    fireEvent.click(screen.getByLabelText("http"));
    answers["dhis2"]!({ fields: [field("hostUrl", "Host URL")] });
    await waitFor(() => expect(onLoadCredentialSchema).toHaveBeenLastCalledWith("http"));
    answers["http"]!({ fields: [field("baseUrl", "Base URL")] });
    expect(await screen.findByLabelText(/Base URL/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Create HTTP credential" })).toBeTruthy();
    expect(screen.queryByLabelText(/Host URL/)).toBeNull();
  });

  it("says which environment is missing a required field, without asking the host", async () => {
    const { onCreateCredential } = renderPage();
    await configure("dhis2");
    fireEvent.change(document.getElementById("credential-name")!, { target: { value: "New DHIS2" } });
    fireEvent.change(document.getElementById("credential-body-hostUrl")!, { target: { value: "https://dhis2.example.org" } });
    // The browser checks the fields on show; an environment in another tab has none rendered.
    fireEvent.click(within(dialog()).getByRole("button", { name: "Add new environment" }));
    fireEvent.click(within(dialog()).getByRole("tab", { name: "main" }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    expect(await within(dialog()).findByText("untitled: Host URL can't be blank")).toBeTruthy();
    expect(onCreateCredential).not.toHaveBeenCalled();
  });

  it("keeps the form open with the host's field error when it refuses the name", async () => {
    const onCreateCredential = vi.fn().mockRejectedValue(new RequestError("invalid", { fieldErrors: { name: ["has already been taken"] } }));
    renderPage({ onCreateCredential });
    await configure("Raw JSON");
    fireEvent.change(document.getElementById("credential-name")!, { target: { value: "DHIS2 play" } });
    fireEvent.change(document.getElementById("credential-body-raw")!, { target: { value: '{"a":1}' } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    expect(await within(dialog()).findByText("has already been taken")).toBeTruthy();
    expect(onCreateCredential).toHaveBeenCalledWith(expect.objectContaining({ schema: "raw", environments: [expect.objectContaining({ body: '{"a":1}' })] }));
  });

  it("asks the host for the stored values and schema before editing, and sends both environments", async () => {
    const { onLoadCredentialSecrets, onLoadCredentialSchema, onUpdateCredential } = renderPage();
    await choose("credentials-cred1", "Edit");
    expect(onLoadCredentialSecrets).toHaveBeenCalledWith("cred1");
    expect(onLoadCredentialSchema).toHaveBeenCalledWith("dhis2");
    const host = (await screen.findByLabelText(/Host URL/)) as HTMLInputElement;
    expect(host.value).toBe("https://play.dhis2.org");
    fireEvent.change(host, { target: { value: "https://dhis2.example.org" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    await waitFor(() =>
      expect(onUpdateCredential).toHaveBeenCalledWith("cred1", {
        formId: expect.any(String),
        name: "DHIS2 play",
        externalId: "dhis2-01",
        schema: "dhis2",
        oauthClientId: null,
        projectIds: ["p1"],
        environments: [
          { name: "main", previousName: "main", body: '{"hostUrl":"https://dhis2.example.org"}', signInId: null },
          { name: "staging", previousName: "staging", body: '{"hostUrl":"https://staging.dhis2.org"}', signInId: null },
        ],
      })
    );
  });

  it("loads the stored values again after Cancel, and a new credential shows none of them", async () => {
    const { onLoadCredentialSecrets } = renderPage();
    await choose("credentials-cred1", "Edit");
    await screen.findByLabelText(/Host URL/);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await choose("credentials-cred1", "Edit");
    await waitFor(() => expect(onLoadCredentialSecrets).toHaveBeenCalledTimes(2));
    await screen.findByLabelText(/Host URL/);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await configure("dhis2");
    expect(((await screen.findByLabelText(/Host URL/)) as HTMLInputElement).value).toBe("");
    expect((document.getElementById("credential-name") as HTMLInputElement).value).toBe("");
  });

  it("spins the row while its values load, holds the other rows back, and never opens over another modal", async () => {
    let answer: (v: unknown) => void = () => {};
    const onLoadCredentialSecrets = vi.fn(() => new Promise((resolve) => (answer = resolve)));
    renderPage({ onLoadCredentialSecrets: onLoadCredentialSecrets as never });
    await choose("credentials-cred1", "Edit");
    const actions = (id: string) => within(row(id)).getByRole("button", { name: /Actions/ }) as HTMLButtonElement;
    expect(actions("credentials-cred1").getAttribute("aria-busy")).toBe("true");
    expect(actions("credentials-cred2").disabled).toBe(true);
    expect(actions("oauth-clients-oc1").disabled).toBe(true);
    await addNew("OAuth Client");
    expect(within(dialog()).getByRole("heading", { name: "Add an OAuth Client" })).toBeTruthy();
    answer({ environments: [{ name: "main", body: "{}", oauth: null }] });
    await waitFor(() => expect(isDisabled(actions("credentials-cred2"))).toBe(false));
    expect(within(dialog()).getByRole("heading", { name: "Add an OAuth Client" })).toBeTruthy();
  });

  it("doesn't open a late edit form after another modal opened and closed meanwhile", async () => {
    let answer: (v: unknown) => void = () => {};
    const onLoadCredentialSecrets = vi.fn(() => new Promise((resolve) => (answer = resolve)));
    renderPage({ onLoadCredentialSecrets: onLoadCredentialSecrets as never });
    await choose("credentials-cred1", "Edit");
    await addNew("OAuth Client");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    answer({ environments: [{ name: "main", body: "{}", oauth: null }] });
    const actions = within(row("credentials-cred2")).getByRole("button", { name: /Actions/ }) as HTMLButtonElement;
    await waitFor(() => expect(isDisabled(actions)).toBe(false));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the edit form, and forgets its values, when the credential leaves the host's list", async () => {
    const { rerender } = renderPage();
    await choose("credentials-cred1", "Edit");
    await screen.findByLabelText(/Host URL/);
    rerender({ credentials: [sheets] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender({ credentials: [dhis2, sheets] });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says so when the stored values can't be loaded, and opens no form", async () => {
    renderPage({ onLoadCredentialSecrets: vi.fn().mockRejectedValue(new RequestError("Credential not found")) });
    await choose("credentials-cred1", "Edit");
    expect(await screen.findByText("Credential not found")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deletes a credential after confirming", async () => {
    const { onDeleteCredential } = renderPage();
    await choose("credentials-cred1", "Delete");
    expect(dialog().textContent).toContain("Deleting this credential will immediately remove it from all jobs and projects.");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete credential" }));
    await waitFor(() => expect(onDeleteCredential).toHaveBeenCalledWith("cred1", { now: false }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("sends the deletion the dialog showed, even when the credential was scheduled meanwhile", async () => {
    const { onDeleteCredential, rerender } = renderPage();
    await choose("credentials-cred1", "Delete");
    rerender({ credentials: [{ ...dhis2, scheduledDeletion: "2026-10-21T09:00:00Z", hasActivityInProjects: true }, sheets] });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete credential" }));
    await waitFor(() => expect(onDeleteCredential).toHaveBeenCalledWith("cred1", { now: false }));
  });

  it("deletes a scheduled credential now, even when its deletion was cancelled meanwhile", async () => {
    const scheduled = { ...dhis2, scheduledDeletion: "2026-10-21T09:00:00Z" };
    const { onDeleteCredential, rerender } = renderPage({ credentials: [scheduled, sheets] });
    await choose("credentials-cred1", "Delete now");
    rerender({ credentials: [{ ...scheduled, scheduledDeletion: null }, sheets] });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete credential" }));
    await waitFor(() => expect(onDeleteCredential).toHaveBeenCalledWith("cred1", { now: true }));
  });

  it("keeps the delete dialog open with the host's error when it refuses", async () => {
    renderPage({ onDeleteCredential: vi.fn().mockRejectedValue(new RequestError("You are not authorized to delete this credential.")) });
    await choose("credentials-cred1", "Delete");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete credential" }));
    expect(await within(dialog()).findByText("You are not authorized to delete this credential.")).toBeTruthy();
  });

  it("only explains, and deletes nothing, for a scheduled credential with audited runs", async () => {
    const { onDeleteCredential } = renderPage({
      credentials: [{ ...dhis2, scheduledDeletion: "2026-10-21T09:00:00Z", hasActivityInProjects: true }],
    });
    await choose("credentials-cred1", "Delete now");
    expect(within(dialog()).getByRole("heading", { name: "Credential marked for deletion" })).toBeTruthy();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Ok, understood" }));
    expect(onDeleteCredential).not.toHaveBeenCalled();
  });

  it("cancels a scheduled deletion, and toasts the host's refusal", async () => {
    const onCancelCredentialDeletion = vi.fn().mockRejectedValue(new RequestError("You are not authorized to perform this action"));
    renderPage({ credentials: [{ ...dhis2, scheduledDeletion: "2026-10-21T09:00:00Z" }], onCancelCredentialDeletion });
    await choose("credentials-cred1", "Cancel deletion");
    expect(onCancelCredentialDeletion).toHaveBeenCalledWith("cred1");
    expect(await screen.findByText("You are not authorized to perform this action")).toBeTruthy();
  });

  it("spins the row whose deletion is being cancelled, and holds the other rows back until it's answered", async () => {
    let answer: () => void = () => {};
    const onCancelCredentialDeletion = vi.fn(() => new Promise<void>((resolve) => (answer = resolve)));
    const scheduled = { scheduledDeletion: "2026-10-21T09:00:00Z" };
    renderPage({ credentials: [{ ...dhis2, ...scheduled }, { ...sheets, ...scheduled }], onCancelCredentialDeletion });
    await choose("credentials-cred1", "Cancel deletion");
    const actions = (id: string) => within(row(id)).getByRole("button", { name: /Actions/ }) as HTMLButtonElement;
    expect(actions("credentials-cred1").getAttribute("aria-busy")).toBe("true");
    expect(actions("credentials-cred2").disabled).toBe(true);
    answer();
    await waitFor(() => expect(isDisabled(actions("credentials-cred2"))).toBe(false));
    await choose("credentials-cred2", "Cancel deletion");
    expect(onCancelCredentialDeletion).toHaveBeenLastCalledWith("cred2");
  });

  it("shows the host's refusal of a transfer on the email field", async () => {
    const onTransferCredential = vi
      .fn()
      .mockRejectedValue(new RequestError("User does not exist", { fieldErrors: { receiverEmail: ["User does not exist"] } }));
    renderPage({ onTransferCredential });
    await choose("credentials-cred1", "Transfer");
    fireEvent.change(document.getElementById("receiver_email")!, { target: { value: "nobody@example.org" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Transfer" }));
    await waitFor(() => expect(onTransferCredential).toHaveBeenCalledWith("cred1", "nobody@example.org"));
    expect(await within(dialog()).findByText("User does not exist")).toBeTruthy();
  });

  it("revokes a pending transfer", async () => {
    const { onRevokeCredentialTransfer } = renderPage({ credentials: [{ ...dhis2, transferStatus: "pending" }] });
    await choose("credentials-cred1", "Revoke Transfer");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(onRevokeCredentialTransfer).toHaveBeenCalledWith("cred1"));
  });

  it("signs in with an OAuth client at the host's URL, tied to this form, and saves the sign-in it got", async () => {
    const popup = { location: { href: "" }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const { onAuthorizeOauth, onCreateCredential, rerender } = renderPage();
    await configure("Google Workspace");
    fireEvent.change(document.getElementById("credential-name")!, { target: { value: "Sheets" } });
    fireEvent.click(screen.getByLabelText("spreadsheets"));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Sign in with Google Workspace" }));
    await waitFor(() =>
      expect(onAuthorizeOauth).toHaveBeenCalledWith({
        formId: expect.any(String),
        signInId: expect.any(String),
        credentialId: null,
        oauthClientId: "oc1",
        scopes: ["openid", "email", "spreadsheets"],
        environment: "main",
      })
    );
    const { formId, signInId } = onAuthorizeOauth.mock.lastCall![0];
    expect(open).toHaveBeenCalledWith("", "oauth_authorization");
    await waitFor(() => expect(popup.location.href).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=x"));
    expect(await within(dialog()).findByText("Authenticating with Google Workspace...")).toBeTruthy();

    rerender({ oauthSignIns: [{ signInId, error: null, userInfo: { name: "Amy Admin", email: "amy@example.org" } }] });
    expect(await within(dialog()).findByText("Amy Admin")).toBeTruthy();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    await waitFor(() =>
      expect(onCreateCredential).toHaveBeenCalledWith(
        expect.objectContaining({ formId, schema: "oauth", oauthClientId: "oc1", environments: [{ name: "main", previousName: null, body: "", signInId }] })
      )
    );
  });

  it("never saves a sign-in from another form onto a credential", async () => {
    vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, close: vi.fn() } as unknown as Window);
    const secrets = { environments: [{ name: "main", body: "", oauth: { scopes: ["openid", "email"], status: "ready" as const, userInfo: null } }] };
    const { onAuthorizeOauth, onUpdateCredential, rerender } = renderPage({ onLoadCredentialSecrets: vi.fn().mockResolvedValue(secrets) });
    // Sign in on Add credential, then cancel.
    await configure("Google Workspace");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Sign in with Google Workspace" }));
    await within(dialog()).findByText("Authenticating with Google Workspace...");
    const abandoned = onAuthorizeOauth.mock.lastCall![0];
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender({ oauthSignIns: [{ signInId: abandoned.signInId, error: null, userInfo: null }] });

    // Edit another credential and save it without signing in.
    await choose("credentials-cred2", "Edit");
    await within(dialog()).findByText(/Successfully authenticated/);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    await waitFor(() => expect(onUpdateCredential).toHaveBeenCalled());
    const [id, values] = onUpdateCredential.mock.lastCall!;
    expect(id).toBe("cred2");
    expect(values.formId).not.toBe(abandoned.formId);
    expect(values.environments).toEqual([{ name: "main", previousName: "main", body: "", signInId: null }]);
  });

  it("shows how a sign-in failed, and won't save an environment that isn't signed in", async () => {
    vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, close: vi.fn() } as unknown as Window);
    const { onAuthorizeOauth, onCreateCredential, rerender } = renderPage();
    await configure("Google Workspace");
    fireEvent.change(document.getElementById("credential-name")!, { target: { value: "Sheets" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Sign in with Google Workspace" }));
    await within(dialog()).findByText("Authenticating with Google Workspace...");
    rerender({ oauthSignIns: [{ signInId: onAuthorizeOauth.mock.lastCall![0].signInId, error: "access_denied", userInfo: null }] });
    expect(await within(dialog()).findByText("access_denied")).toBeTruthy();
    expect(within(dialog()).getByRole("button", { name: "Try again" })).toBeTruthy();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    expect(await within(dialog()).findByText("main: sign in with Google Workspace first")).toBeTruthy();
    expect(onCreateCredential).not.toHaveBeenCalled();
  });

  it("edits an OAuth client with the id and secret the host sends", async () => {
    const { onLoadOauthClientSecrets, onUpdateOauthClient } = renderPage();
    await choose("oauth-clients-oc1", "Edit");
    expect(onLoadOauthClientSecrets).toHaveBeenCalledWith("oc1");
    expect(((await screen.findByLabelText(/Client Secret/)) as HTMLInputElement).value).toBe("shh");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(onUpdateOauthClient).toHaveBeenCalledWith("oc1", expect.objectContaining({ clientId: "client-1", clientSecret: "shh", projectIds: ["p1"] }))
    );
  });

  it("shows the host's refusal of an OAuth client's scopes and projects on those fields", async () => {
    const fieldErrors = { mandatoryScopes: ["mandatory is wrong"], optionalScopes: ["optional is wrong"], projectIds: ["projects are wrong"] };
    renderPage({ onUpdateOauthClient: vi.fn().mockRejectedValue(new RequestError("Please fix the errors below.", { fieldErrors })) });
    await choose("oauth-clients-oc1", "Edit");
    await screen.findByLabelText(/Client Secret/);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Changes" }));
    for (const message of Object.values(fieldErrors).flat()) expect(await within(dialog()).findByText(message)).toBeTruthy();
  });

  it("splits pasted scopes on spaces and commas, as Lightning does, and merges them with the ones there", async () => {
    const { onUpdateOauthClient } = renderPage();
    await choose("oauth-clients-oc1", "Edit");
    const mandatory = await screen.findByLabelText("Mandatory Scopes");
    fireEvent.change(mandatory, { target: { value: "profile email,  offline" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Changes" }));
    await waitFor(() =>
      expect(onUpdateOauthClient).toHaveBeenCalledWith("oc1", expect.objectContaining({ mandatoryScopes: ["email", "offline", "openid", "profile"] }))
    );
  });

  it("shows the host's refusal of making a client global on the checkbox", async () => {
    const fieldErrors = { global: ["only superusers can make a client global"] };
    renderPage({ canCreateGlobalOauthClient: true, onUpdateOauthClient: vi.fn().mockRejectedValue(new RequestError("Please fix the errors below.", { fieldErrors })) });
    await choose("oauth-clients-oc1", "Edit");
    await screen.findByLabelText(/Client Secret/);
    fireEvent.click(within(dialog()).getByLabelText(/Make client global/));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Changes" }));
    expect(await within(dialog()).findByText("only superusers can make a client global")).toBeTruthy();
  });

  it("shows, keeps and can remove a project the credential is shared with that the viewer can't grant", async () => {
    const hidden = { id: "p9", name: "someone-elses-project", workflowsUsing: [] };
    const { onUpdateCredential } = renderPage({ credentials: [{ ...dhis2, projects: [...dhis2.projects, hidden] }] });
    await choose("credentials-cred1", "Edit");
    await screen.findByRole("button", { name: "Save Credential" });
    expect(within(dialog()).getByText("someone-elses-project")).toBeTruthy();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    await waitFor(() => expect(onUpdateCredential).toHaveBeenCalledWith("cred1", expect.objectContaining({ projectIds: ["p1", "p9"] })));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await choose("credentials-cred1", "Edit");
    await screen.findByRole("button", { name: "Save Credential" });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Remove someone-elses-project" }));
    expect(within(dialog()).queryByText("someone-elses-project")).toBeNull();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save Credential" }));
    await waitFor(() => expect(onUpdateCredential).toHaveBeenLastCalledWith("cred1", expect.objectContaining({ projectIds: ["p1"] })));
  });

  it("asks before unsharing a project whose workflows use the credential, and keeps it on Cancel", async () => {
    const used = { id: "p1", name: "openhie", workflowsUsing: ["OpenHIE Workflow", "Referral follow-ups"] };
    const unused = { id: "p2", name: "dhis2-project", workflowsUsing: [] };
    renderPage({ credentials: [{ ...dhis2, projects: [used, unused] }] });
    await choose("credentials-cred1", "Edit");
    await screen.findByRole("button", { name: "Save Credential" });
    const form = screen.getAllByRole("dialog")[0]!;
    fireEvent.click(within(form).getByRole("button", { name: "Remove dhis2-project" }));
    expect(within(form).queryByRole("button", { name: "Remove dhis2-project" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Revoke project access" })).toBeNull();
    fireEvent.click(within(form).getByRole("button", { name: "Remove openhie" }));
    const confirm = screen.getByRole("dialog", { name: "Revoke project access" });
    expect(confirm.textContent).toContain(
      'Warning: This credential is in use by the following workflows: OpenHIE Workflow, Referral follow-ups. If you revoke access to the "openhie" project'
    );
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(within(form).getByText("openhie")).toBeTruthy();
    fireEvent.click(within(form).getByRole("button", { name: "Remove openhie" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Revoke project access" })).getByRole("button", { name: "Revoke access" }));
    await waitFor(() => expect(within(form).queryByRole("button", { name: "Remove openhie" })).toBeNull());
  });

  it("keeps the OAuth client delete dialog open with the host's error when it refuses", async () => {
    renderPage({ onDeleteOauthClient: vi.fn().mockRejectedValue(new RequestError("Could not delete the client.")) });
    await choose("oauth-clients-oc1", "Delete");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete" }));
    expect(await within(dialog()).findByText("Could not delete the client.")).toBeTruthy();
  });

  it("follows new props from the host", () => {
    const { rerender } = renderPage();
    rerender({ credentials: [sheets] });
    expect(document.getElementById("credentials-cred1")).toBeNull();
    expect(document.getElementById("credentials-cred2")).toBeTruthy();
  });
});
