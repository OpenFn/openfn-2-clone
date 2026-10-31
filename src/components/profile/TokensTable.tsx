import { Table, Td, Th, Tr } from "../primitives/Table";
import EmptyState from "../primitives/EmptyState";
import DateTime from "../primitives/DateTime";
import IconButton from "../primitives/IconButton";
import type { ApiToken } from "../../types/tokens";

/**
 * The personal access tokens table (tokens_live/index.html.heex): masked
 * token, created and last-used dates, and a trash link to the delete modal.
 * With no tokens, the fingerprint empty state takes the table's place.
 */
export default function TokensTable({ tokens }: { tokens: ApiToken[] }) {
  if (tokens.length === 0) {
    return <EmptyState icon="hero-finger-print" title="No Personal Access Tokens" message="Get started by creating a new access token." />;
  }
  return (
    <Table
      id="tokens"
      header={
        <Tr>
          <Th>Token</Th>
          <Th>Created on</Th>
          <Th>Last Used at</Th>
        </Tr>
      }
    >
      {tokens.map((token) => (
        <Tr key={token.id} id={`tokens-${token.id}`}>
          <Td>
            <code className="whitespace-nowrap">{token.masked}</code>
          </Td>
          {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-medium) */}
          <Td className="whitespace-nowrap font-medium">
            <DateTime value={token.insertedAt} />
          </Td>
          <Td>
            <div className="flex items-center justify-between whitespace-nowrap font-medium">
              {token.lastUsedAt ? <DateTime value={token.lastUsedAt} /> : "Never used"}
              <IconButton
                id={`delete-token-${token.id}`}
                to={`/profile/tokens/${token.id}/delete`}
                icon="hero-trash"
                tone="danger"
                label="Delete token"
                size="xs"
              />
            </div>
          </Td>
        </Tr>
      ))}
    </Table>
  );
}
