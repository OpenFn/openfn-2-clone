import { useState } from "react";
import Button from "../primitives/Button";
import SectionHeader from "../primitives/SectionHeader";
import CollectionDeleteModal from "../domain/CollectionDeleteModal";
import CollectionFormModal from "./CollectionFormModal";
import CollectionPreviewModal from "./CollectionPreviewModal";
import CollectionsTable from "./CollectionsTable";
import SandboxSettingsBanner from "./SandboxSettingsBanner";
import type { CollectionRow, CollectionsSettings } from "../../types/project-settings";
import { useActions } from "../../utils/useAction";
import { Stack } from "../primitives/Stack";

interface Props {
  collections: CollectionsSettings;
  sandbox: boolean;
  /** Creates a collection from the name as typed. Rejects with field errors or a message, which keep the modal open. */
  onCreate: (rawName: string) => Promise<void>;
  onRename: (id: string, rawName: string) => Promise<void>;
  /** Deletes a collection, after the user has confirmed. */
  onDelete: (id: string) => Promise<void>;
  /** The collection's first record, pretty-printed, or null when it's empty. */
  onPreview: (id: string) => Promise<string | null>;
}

type Action =
  | { kind: "new" }
  | { kind: "edit" | "delete"; collection: CollectionRow }
  | { kind: "preview"; collection: CollectionRow; json: string | null }
  | null;

/** The Collections tab (`#collections`, project_live/collections_component.ex). */
export default function CollectionsPanel({ collections: { collections, canManage }, sandbox, onCreate, onRename, onDelete, onPreview }: Props) {
  const [action, setAction] = useState<Action>(null);
  const close = () => setAction(null);
  // Only the newest preview opens: asking for another row drops the one still loading.
  const preview = useActions(
    async (_id: string, collection: CollectionRow) => ({ kind: "preview" as const, collection, json: await onPreview(collection.id) }),
    { onSuccess: setAction, onError: "toast", latest: true }
  );

  return (
    <Stack gap="md" id="collections">
      <SectionHeader
        size="lg"
        title="Project collections"
        subtitle="Manage collections for this project."
        permissionsSection={canManage ? undefined : "available collections."}
        action={
          <Button
            id="open-create-collection-modal-button"
            size="lg"
            disabled={!canManage}
            onClick={() => setAction({ kind: "new" })}
          >
            Create collection
          </Button>
        }
      />
      {sandbox && <SandboxSettingsBanner scope="editable" />}

      {action?.kind === "new" && (
        <CollectionFormModal
          title="Create Collection"
          onCancel={close}
          onSave={async (rawName) => {
            await onCreate(rawName);
            close();
          }}
        />
      )}
      {action?.kind === "edit" && (
        <CollectionFormModal
          title="Edit Collection"
          initialName={action.collection.name}
          onCancel={close}
          onSave={async (rawName) => {
            await onRename(action.collection.id, rawName);
            close();
          }}
        />
      )}
      {action?.kind === "delete" && (
        <CollectionDeleteModal
          collection={action.collection}
          onCancel={close}
          onDelete={async () => {
            await onDelete(action.collection.id);
            close();
          }}
        />
      )}
      {action?.kind === "preview" && (
        <CollectionPreviewModal name={action.collection.name} json={action.json} onClose={close} />
      )}

      <CollectionsTable
        collections={collections}
        canManage={canManage}
        onCreate={() => setAction({ kind: "new" })}
        previewingId={collections.find((c) => preview.pending(c.id))?.id ?? null}
        onPreview={(collection) => void preview.run(collection.id, collection)}
        onEdit={(collection) => setAction({ kind: "edit", collection })}
        onDelete={(collection) => setAction({ kind: "delete", collection })}
      />
    </Stack>
  );
}
