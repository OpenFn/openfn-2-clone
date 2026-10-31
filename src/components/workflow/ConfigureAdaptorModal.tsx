// eslint-disable-next-line no-restricted-imports -- wiring: the project's credentials (and owner emails) for the picker.
import { credentials, ownerEmail } from "../../mock-data/credentials";
import { ADAPTORS_WITHOUT_CREDENTIALS } from "../../constants";
import { adaptorDisplayName, adaptorShortName, resolveAdaptor } from "../../utils/adaptors";
// eslint-disable-next-line no-restricted-imports -- wiring: the adaptor registry (catalogue, versions, docs).
import { resolvedAdaptorVersion } from "../../mock-data/adaptors";
import EmptyState from "../primitives/EmptyState";
import Button from "../primitives/Button";
import IconButton from "../primitives/IconButton";
import Card from "../primitives/Card";
import { Field, Radio, Select } from "../primitives/Inputs";
import Modal from "../primitives/Modal";
import TextLink from "../primitives/TextLink";
import { ADAPTOR_HELP } from "./AdaptorDisplay";
import AdaptorIcon from "./AdaptorIcon";
import Text from "../primitives/Text";
import { Stack } from "../primitives/Stack";

const CREDENTIALS_HELP =
  "If the system you're working with requires authentication, choose a credential with login details (secrets) that will allow this job to connect. If you're not connecting to an external system you don't need a credential.";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  adaptor: string;
  credentialName: string | null;
  onChangeAdaptor: () => void;
  onVersionChange: (version: string) => void;
  onCredentialChange: (credentialName: string | null) => void;
}

/**
 * "Configure connection" (ConfigureAdaptorModal.tsx): the adaptor with a
 * Change button, its version, and the project credentials that match it.
 * Creating or editing a credential isn't wired up in the demo.
 */
export default function ConfigureAdaptorModal({
  isOpen,
  onClose,
  projectId,
  adaptor,
  credentialName,
  onChangeAdaptor,
  onVersionChange,
  onCredentialChange,
}: Props) {
  const short = adaptorShortName(adaptor);
  const needsCredentials = !ADAPTORS_WITHOUT_CREDENTIALS.includes(short);
  const projectCreds = credentials.filter((c) => c.projectIds.includes(projectId));
  const matched = projectCreds.filter((c) => c.schema === short);
  const shown = matched.length > 0 ? matched : projectCreds;
  const { version } = resolveAdaptor(adaptor);
  const latest = resolvedAdaptorVersion(adaptor);
  const versions = ["latest", latest, "6.5.1", "6.4.0", "5.0.0"].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      title="Configure connection"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Stack gap="lg">
        <div className="grid grid-cols-3 gap-4">
          <Field className="col-span-2" label="Adaptor" info={ADAPTOR_HELP}>
            {/* As tall as the Version field beside it. */}
            {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (py-1.5 pl-3 pr-1.5) */}
            <Card padding="none" className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
              <AdaptorIcon name={adaptor} size="sm" />
              <span className="flex-1 truncate font-medium text-strong">{adaptorDisplayName(adaptor)}</span>
              <Button variant="secondary" size="xs" onClick={onChangeAdaptor} aria-label="Change adaptor">
                Change
              </Button>
            </Card>
          </Field>
          <Select
            id="adaptor-version"
            label="Version"
            options={versions}
            value={version}
            onChange={(e) => onVersionChange(e.target.value)}
          />
        </div>

        <Field
          group
          label="Credentials"
          info={CREDENTIALS_HELP}
          aside={needsCredentials && <TextLink>New Credential</TextLink>}
        >
          {!needsCredentials ? (
            // eslint-disable-next-line local/primitive-classname -- debt: F528 type, F527 colour (text-center text-muted)
            <Card variant="muted" padding="lg" className="text-center text-muted">
              <Text as="p">This adaptor does not require credentials.</Text>
            </Card>
          ) : shown.length === 0 ? (
            <EmptyState message="No credentials found in this project" buttonText="Create a new credential" />
          ) : (
            // eslint-disable-next-line local/primitive-classname -- debt: F526 box (divide-y divide-subtle)
            <Card padding="none" className="max-h-48 divide-y divide-subtle overflow-y-auto">
              {shown.map((c) => {
                const selected = c.name === credentialName;
                return (
                  <div key={c.id} className="flex items-start justify-between gap-3 p-4 hover:bg-hover">
                    <Radio
                      name="credential"
                      checked={selected}
                      onChange={() => onCredentialChange(c.name)}
                      label={<span className="font-medium text-strong">{c.name}</span>}
                      hint={
                        <Text className="flex items-center gap-1">
                          <span className="hero-user-solid h-4 w-4" />
                          {ownerEmail(c.ownerId)}
                        </Text>
                      }
                    />
                    {selected && <IconButton icon="hero-x-mark" label="Clear credential selection" onClick={() => onCredentialChange(null)} />}
                  </div>
                );
              })}
            </Card>
          )}
        </Field>
      </Stack>
    </Modal>
  );
}
