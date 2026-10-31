import type { ReactNode } from "react";
import Section from "../primitives/Section";
import InfoTooltip from "../primitives/InfoTooltip";
import Pill from "../primitives/Pill";
import CopyChip from "../primitives/CopyChip";
import { Table, Td, Th, Tr } from "../primitives/Table";
import type { CredentialRow, KeychainCredentialRow, OauthClientRow } from "../../types/credentials";
import Tooltip from "../primitives/Tooltip";

/**
 * The three tables of the credential index (live/components/data_tables.ex):
 * a plain title, then either the table or the empty state passed in.
 */

function ProjectBadges({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <Pill key={name} color="primary" variant="square">
          {name}
        </Pill>
      ))}
    </div>
  );
}


/** The Type column (data_tables.ex `credential_type`): the client's name for OAuth. */
function credentialType(credential: CredentialRow): string {
  if (credential.schema === "oauth") return credential.oauthClient ? credential.oauthClient.name.toLowerCase() : "oauth";
  return credential.schema;
}

interface TableProps<T> {
  rows: T[];
  showOwner?: boolean;
  /** Rendered instead of the table when there are no rows. */
  emptyState: ReactNode;
  /** Last-column content per row (the Actions dropdown). */
  actions?: (row: T) => ReactNode;
}

export function OauthClientsTable({ rows, showOwner = false, emptyState, actions }: TableProps<OauthClientRow>) {
  return (
    <Section id="oauth-clients-table-container" title="OAuth Clients">
      {rows.length === 0 ? (
        emptyState
      ) : (
        <Table
          id="oauth-clients-table"
          header={
            <Tr>
              <Th>Name</Th>
              {showOwner && <Th>Owner</Th>}
              <Th>Projects With Access</Th>
              <Th>Authorization URL</Th>
              <Th actions />
            </Tr>
          }
        >
          {rows.map((client) => (
            <Tr key={client.id} id={`oauth-clients-${client.id}`}>
              <Td truncate maxWidth={60}>{client.name}</Td>
              {showOwner && <Td truncate maxWidth={60}>{client.global ? "GLOBAL" : client.ownerEmail}</Td>}
              <Td truncate maxWidth={80}>
                <ProjectBadges names={client.global ? ["GLOBAL"] : client.projects.map((p) => p.name)} />
              </Td>
              <Td wrap maxWidth={72}>{client.authorizationEndpoint}</Td>
              <Td actions>{actions?.(client)}</Td>
            </Tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

export function CredentialsTable({ rows, showOwner = false, emptyState, actions }: TableProps<CredentialRow>) {
  return (
    <Section id="credentials-table-container" title="Credentials">
      {rows.length === 0 ? (
        emptyState
      ) : (
        <Table
          id="credentials-table"
          header={
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
              {showOwner && <Th>Owner</Th>}
              <Th>Projects with access</Th>
              <Th>External ID</Th>
              <Th>Environments</Th>
              <Th actions />
            </Tr>
          }
        >
          {rows.map((credential) => (
            <Tr key={credential.id} id={`credentials-${credential.id}`}>
              <Td truncate maxWidth={60}>
                {credential.name}
                {credential.schema === "oauth" && !credential.oauthClient && (
                  <InfoTooltip
                    title="OAuth client not found"
                    icon="hero-exclamation-triangle"
                    iconClass="h-5 w-5"
                    // eslint-disable-next-line local/primitive-classname -- debt: F525 margin (ml-2)
                    className="ml-2"
                  />
                )}
              </Td>
              <Td truncate maxWidth={40}>{credentialType(credential)}</Td>
              {showOwner && <Td truncate maxWidth={60}>{credential.ownerEmail}</Td>}
              <Td wrap maxWidth={100}>
                <ProjectBadges names={credential.projects.map((p) => p.name)} />
              </Td>
              <Td truncate maxWidth={48}>
                {credential.externalId ? <CopyChip value={credential.externalId} /> : <span className="text-faint">-</span>}
              </Td>
              <Td>
                <Tooltip content={credential.environments.join(", ")}>
                  <span>{credential.environments.length}</span>
                </Tooltip>
              </Td>
              <Td actions>{actions?.(credential)}</Td>
            </Tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

export function KeychainCredentialsTable({ rows, showOwner = true, emptyState, actions }: TableProps<KeychainCredentialRow>) {
  return (
    <Section id="keychain-credentials-table-container" title="Keychain Credentials">
      {rows.length === 0 ? (
        emptyState
      ) : (
        <Table
          id="keychain-credentials-table"
          header={
            <Tr>
              <Th>Name</Th>
              <Th>Path</Th>
              <Th>Default Credential</Th>
              {showOwner && <Th>Owner</Th>}
              <Th actions />
            </Tr>
          }
        >
          {rows.map((kc) => (
            <Tr key={kc.id} id={`keychain-credentials-${kc.id}`}>
              <Td truncate maxWidth={60}>{kc.name}</Td>
              <Td truncate maxWidth={100}>
                <CopyChip value={kc.path} />
              </Td>
              <Td truncate maxWidth={60}>
                {kc.defaultCredential ? kc.defaultCredential.name : <span className="text-faint">None</span>}
              </Td>
              {showOwner && <Td truncate maxWidth={60}>{kc.ownerEmail}</Td>}
              <Td actions>{actions?.(kc)}</Td>
            </Tr>
          ))}
        </Table>
      )}
    </Section>
  );
}
