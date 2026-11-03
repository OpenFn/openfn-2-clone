import {
  clientSecretsFor,
  credentialSecretsFor,
  fakeToken,
  fieldsForSchema,
  storedEnvironmentsFor,
  withActivity,
  type CredentialsFixture,
  type StoredEnvironment,
} from "../../mock-data/credentials";
import { purgeDeletedAfterDays } from "../../mock-data/project-settings";
import { projects } from "../../mock-data/projects";
import { simulateRequest } from "../../mock-data/request";
import { users } from "../../mock-data/users";
import type { CredentialActions, CredentialValues, KeychainCredentialActions } from "../../types/credentials";
import type { Project } from "../../types/projects";
import type { User } from "../../types/users";
import { RequestError } from "../../utils/errors";
import { fullName } from "../../utils/format";

type Change = (f: CredentialsFixture) => Partial<CredentialsFixture>;

/**
 * The replica's side of the credential index, shared by the user's
 * Credentials page and project settings: each action changes the fixture as
 * Lightning's credential_index_component.ex would, and toasts its flash.
 * `fixture` is the state as last rendered; `update` applies a change to the latest.
 */
export function credentialReplicaActions(
  fixture: CredentialsFixture,
  update: (change: Change) => void,
  viewer: User,
  toast: (message: string) => void,
  project?: Project
): CredentialActions & KeychainCredentialActions {
  const find = (id: string) => fixture.credentials.find((c) => c.id === id);
  const patch = (id: string, changes: Partial<CredentialsFixture["credentials"][number]>) =>
    update((f) => ({ credentials: f.credentials.map((c) => (c.id === id ? { ...c, ...changes } : c)) }));

  // Lightning: a user's credential names are unique.
  const checkName = (values: CredentialValues, id?: string) => {
    if (fixture.credentials.some((c) => c.ownerId === viewer.id && c.id !== id && c.name === values.name)) {
      throw new RequestError("Please fix the errors below.", { fieldErrors: { name: ["has already been taken"] } });
    }
  };
  /**
   * The environments to store, as the contract says the host must: an OAuth
   * environment takes the token of a sign-in from this form for this
   * credential, or keeps the one stored under its previous name.
   */
  const storedFrom = (v: CredentialValues, credentialId: string | null): StoredEnvironment[] => {
    const stored = credentialId && find(credentialId) ? storedEnvironmentsFor(fixture, find(credentialId)!) : [];
    const refusals: Record<string, string[]> = {};
    const result = v.environments.map((e): StoredEnvironment => {
      if (v.schema !== "oauth") return { name: e.name, body: e.body, oauth: null };
      const signIn = e.signInId ? fixture.signIns[e.signInId] : undefined;
      const usedTwice = v.environments.filter((x) => x.signInId === e.signInId).length > 1;
      if (e.signInId) {
        if (signIn && !usedTwice && signIn.formId === v.formId && signIn.credentialId === credentialId && signIn.oauthClientId === v.oauthClientId) {
          return { name: e.name, body: fakeToken(signIn.scopes), oauth: { scopes: signIn.scopes, status: "ready", userInfo: signIn.userInfo } };
        }
        refusals[`environments.${e.name}`] = ["sign in again: that sign-in can't be used here"];
      }
      const previous = stored.find((s) => s.name === e.previousName);
      if (!e.signInId && previous) return { ...previous, name: e.name };
      if (!e.signInId) refusals[`environments.${e.name}`] = ["sign in before saving"];
      return { name: e.name, body: "", oauth: null };
    });
    if (Object.keys(refusals).length) throw new RequestError("Please fix the errors below.", { fieldErrors: refusals });
    return result;
  };
  // A save uses up its form's sign-ins.
  const dropSignIns = (formId: string) => (f: CredentialsFixture) => ({
    signIns: Object.fromEntries(Object.entries(f.signIns).filter(([, s]) => s.formId !== formId)),
  });
  const fromValues = (v: CredentialValues) => ({
    name: v.name,
    schema: v.schema,
    oauthClientId: v.oauthClientId,
    projectIds: v.projectIds,
    externalId: v.externalId || null,
    environments: v.environments.map((e) => e.name),
  });

  return {
    onCreateCredential: async (values) => {
      await simulateRequest();
      checkName(values);
      const environments = storedFrom(values, null);
      const id = `cred-${Date.now()}`;
      update((f) => ({
        credentials: [...f.credentials, { ...fromValues(values), id, ownerId: viewer.id, transferStatus: null, scheduledDeletion: null }],
        secrets: { ...f.secrets, [id]: environments },
        ...dropSignIns(values.formId)(f),
      }));
      toast("Credential created successfully");
    },
    onUpdateCredential: async (id, values) => {
      await simulateRequest();
      checkName(values, id);
      const environments = storedFrom(values, id);
      patch(id, fromValues(values));
      update((f) => ({ secrets: { ...f.secrets, [id]: environments }, ...dropSignIns(values.formId)(f) }));
      toast("Credential updated successfully");
    },
    onLoadCredentialSecrets: async (id) => {
      const credential = find(id);
      if (!credential) throw new RequestError("Credential not found");
      return simulateRequest(credentialSecretsFor(fixture, credential));
    },
    onLoadCredentialSchema: (key) => simulateRequest({ fields: fieldsForSchema(key) }),
    onDeleteCredential: async (id, { now }) => {
      await simulateRequest();
      // credential_deletion_modal.ex: what the dialog showed, even if the row changed since; scheduling again moves the date.
      if (now) {
        if (withActivity.has(id)) throw new RequestError("Cannot delete a credential that has activities in projects");
        update((f) => ({ credentials: f.credentials.filter((c) => c.id !== id) }));
        toast("Credential deleted successfully");
      } else {
        // Scheduling also unshares it from every project (`remove_credential_associations`).
        patch(id, { scheduledDeletion: new Date(Date.now() + purgeDeletedAfterDays * 86_400_000).toISOString(), projectIds: [] });
        toast("Credential scheduled for deletion");
      }
    },
    onCancelCredentialDeletion: async (id) => {
      await simulateRequest();
      patch(id, { scheduledDeletion: null });
      toast("Credential deletion canceled");
    },
    onTransferCredential: async (id, receiverEmail) => {
      await simulateRequest();
      // Lightning.Credentials' transfer checks, in its wording.
      const receiver = users.find((u) => u.email.toLowerCase() === receiverEmail.toLowerCase());
      const refuse = (message: string) => new RequestError(message, { fieldErrors: { receiverEmail: [message] } });
      if (!receiver) throw refuse("User does not exist");
      if (receiver.id === viewer.id) throw refuse("You cannot transfer a credential to yourself");
      const blocking = projects.filter((p) => find(id)?.projectIds.includes(p.id) && !p.members.some((m) => m.userId === receiver.id));
      if (blocking.length) throw refuse(`User doesn't have access to these projects: ${blocking.map((p) => p.name).join(", ")}`);
      patch(id, { transferStatus: "pending" });
      toast("Credential transfer initiated. We've sent you a confirmation email.");
    },
    onRevokeCredentialTransfer: async (id) => {
      await simulateRequest();
      patch(id, { transferStatus: null });
      toast("Transfer revoked successfully");
    },
    onAuthorizeOauth: async ({ formId, signInId, credentialId, oauthClientId, scopes }) => {
      const client = fixture.oauthClients.find((c) => c.id === oauthClientId);
      if (!client) throw new RequestError("OAuth client not found");
      // Lightning builds the provider's URL; the replica has no provider, so it opens a blank page.
      const result = await simulateRequest({ authorizeUrl: "about:blank" });
      // The provider "redirects back" a little later: the host keeps the token and says who signed in.
      const userInfo = client.userinfoEndpoint ? { name: fullName(viewer), email: viewer.email } : null;
      void simulateRequest(undefined, { latencyMs: 1500 }).then(() =>
        update((f) =>
          // A form discarded meanwhile gets no token.
          f.discardedForms.includes(formId)
            ? {}
            : {
                signIns: { ...f.signIns, [signInId]: { formId, credentialId, oauthClientId, scopes, userInfo } },
                oauthSignIns: [...f.oauthSignIns, { signInId, error: null, userInfo }],
              }
        )
      );
      return result;
    },
    onDiscardOauthSignIns: async (formId) => update((f) => ({ ...dropSignIns(formId)(f), discardedForms: [...f.discardedForms, formId] })),
    onCreateOauthClient: async (values) => {
      await simulateRequest();
      const id = `oc-${Date.now()}`;
      const { clientId, clientSecret, ...client } = values;
      update((f) => ({
        oauthClients: [...f.oauthClients, { ...client, id, ownerId: viewer.id }],
        clientSecrets: { ...f.clientSecrets, [id]: { clientId, clientSecret } },
      }));
      toast("Oauth client created successfully");
    },
    onUpdateOauthClient: async (id, values) => {
      await simulateRequest();
      const { clientId, clientSecret, ...client } = values;
      update((f) => ({
        oauthClients: f.oauthClients.map((c) => (c.id === id ? { ...c, ...client } : c)),
        clientSecrets: { ...f.clientSecrets, [id]: { clientId, clientSecret } },
      }));
      toast("Oauth client updated successfully");
    },
    onLoadOauthClientSecrets: (id) => simulateRequest(clientSecretsFor(fixture, id)),
    onDeleteOauthClient: async (id) => {
      await simulateRequest();
      update((f) => ({ oauthClients: f.oauthClients.filter((c) => c.id !== id) }));
      toast("Oauth client deleted");
    },
    onCreateKeychainCredential: async (values) => {
      await simulateRequest();
      if (!project) throw new RequestError("Keychain credentials belong to a project");
      const kc = { ...values, id: `kc-${Date.now()}`, projectId: project.id, createdById: viewer.id };
      update((f) => ({ keychainCredentials: [...f.keychainCredentials, kc] }));
      toast("Keychain credential created successfully");
    },
    onUpdateKeychainCredential: async (id, values) => {
      await simulateRequest();
      update((f) => ({ keychainCredentials: f.keychainCredentials.map((k) => (k.id === id ? { ...k, ...values } : k)) }));
      toast("Keychain credential updated successfully");
    },
    onDeleteKeychainCredential: async (id) => {
      await simulateRequest();
      update((f) => ({ keychainCredentials: f.keychainCredentials.filter((k) => k.id !== id) }));
      toast("Keychain credential deleted");
    },
  };
}
