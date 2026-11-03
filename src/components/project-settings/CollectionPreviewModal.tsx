import CodeViewer from "../primitives/CodeViewer";
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
 * JSON in a Monaco viewer.
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
        <CodeViewer value={json} language="json" ariaLabel={`First record of ${name}`} className="h-96" />
      ) : (
        <Text as="p" tone="faint" className="flex h-96 items-center justify-center">
          This collection is empty.
        </Text>
      )}
    </Modal>
  );
}
