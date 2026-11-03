import { useState, type ReactNode } from "react";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import ConfirmModal from "../primitives/ConfirmModal";
import { DetailItem, DetailList } from "../primitives/DetailList";
import Pill from "../primitives/Pill";
import SectionHeader from "../primitives/SectionHeader";
import TextLink from "../primitives/TextLink";
import SandboxSettingsBanner from "./SandboxSettingsBanner";
import type { GithubSyncSettings } from "../../types/project-settings";
import { useAction } from "../../utils/useAction";
import { Stack } from "../primitives/Stack";

interface Props {
  githubSync: GithubSyncSettings;
  sandbox: boolean;
  /** "Initiate Sync to Branch". */
  onInitiateSync: () => Promise<void>;
  /** Disconnects the repository, after the user has confirmed. */
  onRemoveConnection: () => Promise<void>;
}

/**
 * The Sync to GitHub tab (`#vcs`, settings.html.heex:758-860 and
 * github_sync_component.html.heex). Shows "not configured", "connect your
 * account", or a connected repo. The installation / repo / branch form for
 * a new connection needs the GitHub API, so it isn't reproduced.
 */
export default function GithubSyncPanel({ githubSync, sandbox, onInitiateSync, onRemoveConnection }: Props) {
  const { enabled, connection, userConnected, connectAccountHref, canInstall, canInitiateSync } = githubSync;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const sync = useAction(onInitiateSync, { onError: "toast" });

  let body: ReactNode = null;
  if (!enabled) {
    body = (
      <Card
        title="Sync to GitHub"
        description="Version Control is not configured for this Lightning instance. Contact the superuser for more information."
      />
    );
  } else if (connection) {
    body = (
      <Stack gap="sm" id="github-sync-component">
        {/* eslint-disable-next-line no-restricted-syntax -- debt: a child would change in a flex column */}
        <Card className="space-y-4">
          <DetailList>
            <DetailItem label="Repository:">
              <TextLink href={`https://www.github.com/${connection.repo}`} external>
                {connection.repo}
              </TextLink>
            </DetailItem>
            <DetailItem label="Branch:">
              <Pill variant="square"><code>{connection.branch}</code></Pill>
            </DetailItem>
            <DetailItem label="GitHub Installation ID:">
              <Pill variant="square"><code>{connection.githubInstallationId}</code></Pill>
            </DetailItem>
            <DetailItem label="Path to config:">
              <Pill variant="square"><code>{connection.configPath}</code></Pill>
            </DetailItem>
            <DetailItem label="Sync version:">
              <Pill variant="square"><code>{connection.syncVersion ? "v2 (new)" : "v1 (legacy)"}</code></Pill>
            </DetailItem>
          </DetailList>
          <Button
            id="initiate-sync-button"
            disabled={!canInitiateSync}
            tooltip={canInitiateSync ? undefined : "Contact an editor or admin to sync."}
            pending={sync.pending}
            onClick={() => void sync.run()}
          >
            Initiate Sync to Branch
          </Button>
        </Card>
        {canInstall && (
          <p>
            No longer need to sync this project?{" "}
            <TextLink tone="danger" onClick={() => setConfirmRemove(true)}>
              Remove Integration.
            </TextLink>
          </p>
        )}
        {/* github_sync_component.ex `confirm_connection_removal_modal` */}
        {confirmRemove && (
          <ConfirmModal
            open
            onClose={() => setConfirmRemove(false)}
            onConfirm={async () => {
              await onRemoveConnection();
              setConfirmRemove(false);
            }}
            title="Remove Integration?"
            confirmLabel="Disconnect"
            tone="danger"
          >
            <p>
              You are about to disconnect this project from GitHub. Until you reconnect, you will not be able to sync
              this project to GitHub.
            </p>
          </ConfirmModal>
        )}
      </Stack>
    );
  } else if (canInstall && !userConnected) {
    body = (
      <Card
        title="Connect your OpenFn account to GitHub"
        description="To create a new GitHub version control connection you must first connect your OpenFn account to GitHub. Please click the button below to get started."
      >
        <Button id="connect-github-link" href={connectAccountHref}>
          Connect your GitHub Account
        </Button>
      </Card>
    );
  } else if (canInstall) {
    body = (
      <Card
        title="Connect a repository"
        description="Choose a GitHub installation, repository and branch to start syncing. (The connection form needs the GitHub API and isn't reproduced in this demo.)"
      />
    );
  }

  return (
    <>
      <SectionHeader
        size="lg"
        title="Version control"
        subtitle="View or modify external version control settings for this project."
        permissionsSection={
          canInstall ? undefined : `version control configuration${canInitiateSync ? " but you can initiate a sync." : "."}`
        }
      />
      {sandbox && <SandboxSettingsBanner scope="local" />}
      {body}
      <p>
        Need to learn more about GitHub Sync? See{" "}
        <TextLink
          href="https://docs.openfn.org/documentation/deploy/portability#automated-version-control-with-github-and-lightning"
          external
        >
          portability docs
        </TextLink>{" "}
        for full documentation on associated GitHub actions and automated workflows.
      </p>
    </>
  );
}
