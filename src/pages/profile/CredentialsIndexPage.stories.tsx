import type { Meta, StoryObj } from "@storybook/react";
import CredentialsIndexPage from "./CredentialsIndexPage";
import { clientSecretsFor, fieldsForSchema, credentialIndexDataFor, credentialSecretsFor, credentialsFixture } from "../../mock-data/credentials";
import { session } from "../../mock-data/users";
import { withCanvas, withRouter } from "../../stories/decorators";

const done = async () => {};
const fixture = credentialsFixture();

const meta: Meta<typeof CredentialsIndexPage> = {
  title: "Pages/Profile/CredentialsIndexPage",
  component: CredentialsIndexPage,
  // PageContent fills its parent, so give it a screen to fill.
  decorators: [withRouter, withCanvas("h-screen")],
  parameters: { layout: "fullscreen" },
  args: {
    ...credentialIndexDataFor(fixture, undefined, session.user),
    onCreateCredential: done,
    onUpdateCredential: done,
    onLoadCredentialSecrets: async (id) => credentialSecretsFor(fixture, fixture.credentials.find((c) => c.id === id)!),
    onLoadCredentialSchema: async (key: string) => ({ fields: fieldsForSchema(key) }),
    onDeleteCredential: done,
    onCancelCredentialDeletion: done,
    onTransferCredential: done,
    onRevokeCredentialTransfer: done,
    onAuthorizeOauth: async () => ({ authorizeUrl: "about:blank" }),
    onDiscardOauthSignIns: async () => {},
    onCreateOauthClient: done,
    onUpdateOauthClient: done,
    onLoadOauthClientSecrets: async (id) => clientSecretsFor(fixture, id),
    onDeleteOauthClient: done,
  },
};
export default meta;
type Story = StoryObj<typeof CredentialsIndexPage>;

export const Default: Story = {};
export const Empty: Story = { args: { credentials: [], oauthClients: [] } };
export const Loading: Story = { args: { credentials: [], oauthClients: [], status: { state: "loading" } } };
export const Failed: Story = { args: { credentials: [], oauthClients: [], status: { state: "error", message: "Authentication is required." } } };
