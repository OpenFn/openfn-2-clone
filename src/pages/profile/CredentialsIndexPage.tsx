import AsyncBoundary from "../../components/primitives/AsyncBoundary";
import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import CredentialIndex from "../../components/credentials/CredentialIndex";
import NewCredentialMenuButton from "../../components/credentials/NewCredentialMenuButton";
import type { CredentialActions, CredentialIndexData } from "../../types/credentials";
import type { ResourceStatus } from "../../types/resource";

/**
 * The contract between this page and whatever feeds it (the replica wrapper,
 * later Lightning): the viewer's own credentials and OAuth clients, and the
 * credential index's actions. Both shapes are documented in types/credentials.ts.
 */
export interface CredentialsIndexPageProps extends CredentialIndexData, CredentialActions {
  /** While the host loads the lists, or why it couldn't (STANDARDS pattern 5). Leave it out when the data arrives with the page. */
  status?: ResourceStatus;
}

/**
 * Inventory view `credentials-index` (credential_live/index.html.heex): the
 * user's own OAuth clients and credentials, with "Add new" in the header.
 * Props only, so it can run unchanged in Lightning; the replica's data lives
 * in CredentialsIndexPage.replica.tsx.
 */
export default function CredentialsIndexPage({ status = { state: "ready" }, ...props }: CredentialsIndexPageProps) {
  return (
    <PageContent
      header={
        <Header title="Credentials">
          <NewCredentialMenuButton id="credential-options-menu-button" />
        </Header>
      }
    >
      <Centered>
        {/* Lightning hard-codes can_create_project_credential here (credential_live/index.html.heex:33). */}
        <AsyncBoundary status={status}>
          <CredentialIndex {...props} project={null} canCreateProjectCredential />
        </AsyncBoundary>
      </Centered>
    </PageContent>
  );
}
