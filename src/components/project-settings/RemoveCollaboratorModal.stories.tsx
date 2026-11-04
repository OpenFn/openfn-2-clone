import type { Meta, StoryObj } from "@storybook/react";
import RemoveCollaboratorModal from "./RemoveCollaboratorModal";
import type { CollaboratorRow } from "../../types/project-settings";

const collaborator: CollaboratorRow = {
  id: "pu-1",
  firstName: "Esther",
  lastName: "Mwangi",
  email: "esther@example.org",
  role: "editor",
  failureAlert: true,
  digest: "weekly",
  isCurrentUser: false,
  removeBlockedReason: null,
  ownedCredentialNames: [],
};

const meta: Meta<typeof RemoveCollaboratorModal> = {
  title: "Project settings/RemoveCollaboratorModal",
  component: RemoveCollaboratorModal,
  args: { collaborator, onCancel: () => {}, onConfirm: () => {} },
};
export default meta;
type Story = StoryObj<typeof RemoveCollaboratorModal>;

export const Default: Story = {};
/** The host can't say which credentials they own (Lightning's API), so it warns without naming them. */
export const CredentialsUnknown: Story = {
  args: { collaborator: { ...collaborator, ownedCredentialNames: null } },
};
export const OwnsCredentials: Story = {
  args: { collaborator: { ...collaborator, ownedCredentialNames: ["DHIS2 play", "CommCare demo"] } },
};
