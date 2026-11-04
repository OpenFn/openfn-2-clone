import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollaboratorRow } from "../../types/project-settings";
import RemoveCollaboratorModal from "./RemoveCollaboratorModal";

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
  ownedCredentialNames: null,
};

describe("RemoveCollaboratorModal", () => {
  it("warns about their credentials without naming them when the host can't say which they own", () => {
    render(<RemoveCollaboratorModal collaborator={collaborator} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("dialog").textContent).toContain(
      'Are you sure you want to remove "Esther Mwangi" from this project? They will no longer have access to this project and any credentials they own will be removed from it.'
    );
  });
});
