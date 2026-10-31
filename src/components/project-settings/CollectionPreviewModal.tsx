import Modal from "../primitives/Modal";
import Text from "../primitives/Text";
import TextLink from "../primitives/TextLink";

interface Props {
  name: string;
  /** The first record, pretty-printed; null when the collection is empty. */
  json: string | null;
  onClose: () => void;
}

/**
 * collections_component.ex `collection_preview_modal`: the first record as
 * JSON. Lightning renders it in a Monaco viewer; this uses a plain <pre>.
 */
export default function CollectionPreviewModal({ name, json, onClose }: Props) {
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Collection Preview: ${name}`}
      description={
        <>
          Showing first record. We recommend{" "}
          <TextLink href="https://docs.openfn.org/documentation/collections-cli" external>
            using the CLI
          </TextLink>{" "}
          to manage collections.
        </>
      }
    >
      {json ? (
        // eslint-disable-next-line no-restricted-syntax -- debt: belongs in CodeViewer
        <pre className="h-96 overflow-auto rounded-md bg-code p-4 text-xs text-code">{json}</pre>
      ) : (
        <Text as="p" tone="faint" className="flex h-96 items-center justify-center">
          This collection is empty.
        </Text>
      )}
    </Modal>
  );
}
