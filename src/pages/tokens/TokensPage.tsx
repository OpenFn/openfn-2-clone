import { useRef, useState } from "react";
import {
  Breadcrumbs,
  Button,
  Callout,
  ConfirmDialog,
  CopyValue,
  EmptyState,
  icons,
  SectionHeading,
  SettingsLayout,
  SettingsNav,
  SettingsNavItem,
  Spinner,
  StatusMessage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components";
import { formatDate } from "@/lib/format";

/** One of your tokens. The server masks it; it's shown as sent. */
export type TokenRow = { id: string; masked: string; createdAt: string; lastUsedAt: string | null };

/** Where the list stands. A failed reload with tokens already on screen stays `ready`. `retryable` is false when asking again won't help. */
export type TokensStatus = { state: "loading" } | { state: "ready" } | { state: "error"; message: string; retryable: boolean };

type TokensPageProps = {
  status: TokensStatus;
  tokens: TokenRow[];
  /** Resolves with the whole new token, shown this once; rejects with an Error whose message says what to do. */
  onGenerate: () => Promise<string>;
  /** Resolves once the token is gone from `tokens`. */
  onDelete: (id: string) => Promise<unknown>;
  /** Load the list again after it failed. */
  onRetry: () => void;
};

/** Your personal access tokens: generate one (shown once, to copy), and delete one after asking. */
export function TokensPage({ status, tokens, onGenerate, onDelete, onRetry }: TokensPageProps) {
  const [generating, setGenerating] = useState(false);
  const [newToken, setNewToken] = useState<string>();
  const [generateError, setGenerateError] = useState<string>();
  const [deleting, setDeleting] = useState<TokenRow>();
  const [announcement, setAnnouncement] = useState("");
  // The header's Generate button: where focus goes when what had it (a dismissed error) disappears.
  const generateButton = useRef<HTMLButtonElement>(null);

  const generate = async () => {
    setGenerating(true);
    setGenerateError(undefined);
    try {
      setNewToken(await onGenerate());
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const generateButtonProps = { icon: icons.Plus, pending: generating, onClick: generate, children: "Generate new token" };

  return (
    <SettingsLayout
      breadcrumbs={<Breadcrumbs trail={[{ label: "User settings", href: "/user-settings" }]} current="API tokens" />}
      title="User settings"
      description="Manage your profile, personal credentials and API tokens."
      nav={
        <SettingsNav label="User settings">
          <SettingsNavItem icon={icons.UserRound}>Profile</SettingsNavItem>
          <SettingsNavItem icon={icons.KeyRound}>Credentials</SettingsNavItem>
          <SettingsNavItem icon={icons.Terminal} href="/user-settings/api-tokens" current>
            API tokens
          </SettingsNavItem>
        </SettingsNav>
      }
    >
      <SectionHeading title="API tokens" description="Personal access tokens let the OpenFn CLI and API act as you." action={<Button ref={generateButton} size="sm" {...generateButtonProps} />}
      />

      {generateError && (
        <Callout
          tone="danger"
          role="alert"
          title="Couldn't generate a token"
          actions={
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setGenerateError(undefined);
                generateButton.current?.focus();
              }}
            >
              Dismiss
            </Button>
          }
        >
          {generateError}
        </Callout>
      )}

      {newToken && (
        <Callout tone="warning" title="Copy your token now. You won't be able to see it again.">
          {/* Keyed, so a second new token is focused too. */}
          <CopyValue key={newToken} value={newToken} label="New token" autoFocus />
        </Callout>
      )}

      {status.state === "loading" && <Spinner label="Loading tokens" />}

      {status.state === "error" && (
        <Callout
          tone="danger"
          role="alert"
          title="Couldn't load your tokens"
          actions={
            status.retryable && (
              <Button variant="secondary" size="xs" onClick={onRetry}>
                Try again
              </Button>
            )
          }
        >
          {status.message}
        </Callout>
      )}

      {status.state === "ready" && tokens.length === 0 && (
        <EmptyState
          icon={icons.Fingerprint}
          title="No personal access tokens"
          description="Get started by creating a new access token."
          action={<Button {...generateButtonProps} />}
        />
      )}

      {status.state === "ready" && tokens.length > 0 && (
        <Table aria-label="API tokens">
          <TableHead>
            <TableHeader>Token</TableHeader>
            <TableHeader>Created on</TableHeader>
            <TableHeader>Last used</TableHeader>
            <TableHeader align="end" hidden>
              Actions
            </TableHeader>
          </TableHead>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableRowHeader>
                  <code>{token.masked}</code>
                </TableRowHeader>
                <TableCell>{formatDate(token.createdAt)}</TableCell>
                <TableCell>{token.lastUsedAt ? formatDate(token.lastUsedAt) : "Never used"}</TableCell>
                <TableCell align="end">
                  <Button
                    variant="secondary"
                    tone="danger"
                    size="xs"
                    icon={icons.Trash2}
                    aria-label={`Delete token ${token.masked}`}
                    onClick={() => {
                      setAnnouncement("");
                      setDeleting(token);
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <StatusMessage>{announcement}</StatusMessage>

      {deleting && (
        <ConfirmDialog
          title="Delete token?"
          confirmLabel="Delete token"
          tone="danger"
          onConfirm={() => onDelete(deleting.id).then(() => setAnnouncement("Token deleted"))}
          onClose={() => setDeleting(undefined)}
        >
          <p>Any applications or scripts using this token will no longer be able to access the API.</p>
        </ConfirmDialog>
      )}
    </SettingsLayout>
  );
}
