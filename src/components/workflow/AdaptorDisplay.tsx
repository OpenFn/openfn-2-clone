import { adaptorDisplayName, adaptorShortName, resolveAdaptor } from "../../utils/adaptors";
import { ADAPTORS_WITHOUT_CREDENTIALS } from "../../constants";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import Pill from "../primitives/Pill";
import AdaptorIcon from "./AdaptorIcon";
import Text from "../primitives/Text";
import { Row } from "../primitives/Stack";

/** The help text on the Adaptor field label. */
export const ADAPTOR_HELP =
  "Choose an adaptor to perform operations (via helper functions) in a specific application. Pick 'http' for generic REST APIs or the 'common' adaptor if this job only performs data manipulation.";

interface Props {
  adaptor: string;
  credentialName?: string | null;
  onEdit?: () => void;
  onChangeAdaptor?: () => void;
  isReadOnly?: boolean;
}

/**
 * The adaptor row in the job inspector and IDE header (AdaptorDisplay.tsx at
 * size "sm"): the adaptor button with its icon, the version, a green key pill
 * when a credential is connected, and Edit (or Connect when one is needed).
 */
export default function AdaptorDisplay({ adaptor, credentialName = null, onEdit, onChangeAdaptor, isReadOnly = false }: Props) {
  const { version } = resolveAdaptor(adaptor);
  const needsCredential = !ADAPTORS_WITHOUT_CREDENTIALS.includes(adaptorShortName(adaptor));
  const hasCredential = !!credentialName;
  const canEdit = hasCredential || !needsCredential;
  return (
    <Card padding="sm">
      <Row justify="between">
      <Text as="div" className="flex min-w-0 flex-1 items-center gap-2">
        {onChangeAdaptor && !isReadOnly ? (
          <Button variant="secondary" size="xs" onClick={onChangeAdaptor} aria-label={`Change adaptor: ${adaptorDisplayName(adaptor)}`} className="min-w-0">
            <AdaptorIcon name={adaptor} size="sm" />
            <span className="truncate">{adaptorDisplayName(adaptor)}</span>
          </Button>
        ) : (
          <Row>
            <AdaptorIcon name={adaptor} size="sm" />
            <span className="truncate font-medium text-muted">{adaptorDisplayName(adaptor)}</span>
          </Row>
        )}
        <Text variant="body-sm" tone={isReadOnly ? "faint" : "muted"} className="whitespace-nowrap">
          {version === "latest" ? "latest" : `v${version}`}
        </Text>
        {hasCredential && (
          <Pill tone="success" title={credentialName} aria-label={`Credential connected: ${credentialName}`} className="max-w-40">
            <span className="hero-key h-3 w-3 shrink-0" />
            <span className="truncate">{credentialName}</span>
          </Pill>
        )}
      </Text>
      {onEdit && !isReadOnly && (
        <Button
          variant={canEdit ? "secondary" : "primary"}
          size="xs"
          onClick={onEdit}
          aria-label={canEdit ? "Edit adaptor" : "Connect credential"}
          className="shrink-0"
        >
          {canEdit ? "Edit" : "Connect"}
        </Button>
      )}
      </Row>
    </Card>
  );
}
