import type { Annotation, InventoryRow } from "../../annotations/source";
import Button from "../primitives/Button";
import Disclosure from "../primitives/Disclosure";
import Heading from "../primitives/Heading";
import IconButton from "../primitives/IconButton";
import Pill from "../primitives/Pill";
import Text from "../primitives/Text";
import type { Tone } from "../primitives/tone";
import EmptyState from "../primitives/EmptyState";
import TextLink from "../primitives/TextLink";
import Markdown from "../primitives/Markdown";

interface Props {
  id: string;
  annotation: Annotation | null;
  inventory?: InventoryRow | undefined;
  /** Called with an id from the annotation's `inherits` / `flows` lists. */
  onOpenId?: ((id: string) => void) | undefined;
  inventoryHref?: string;
}

const statusTones: Record<string, Tone> = {
  "not-started": "neutral",
  todo: "neutral",
  "in-progress": "warning",
  migrated: "success",
  done: "success",
  "done-with-decides": "info",
  cut: "danger",
};

function statusTone(status: string): Tone {
  return statusTones[status] ?? (status.startsWith("batch-") ? "warning" : "neutral");
}

function IdList({ label, ids, onOpenId }: { label: string; ids: string[]; onOpenId?: ((id: string) => void) | undefined }) {
  if (ids.length === 0) return null;
  return (
    <Text as="div" variant="body-sm" className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted">{label}</span>
      {ids.map((id) => (
        // eslint-disable-next-line no-restricted-syntax -- debt: Button has no 12px mono size for ids
        <Button key={id} variant="secondary" size="xs" className="font-mono text-xs" onClick={() => onOpenId?.(id)}>
          {id}
        </Button>
      ))}
    </Text>
  );
}

/**
 * One behaviour annotation: its title and status, the inventory row it
 * belongs to, the shared annotations it inherits, then the markdown body.
 * Shows where things stand when the file hasn't been written yet.
 */
export default function AnnotationCard({ id, annotation, inventory, onOpenId, inventoryHref }: Props) {
  const fm = annotation?.frontMatter ?? {};
  const title = typeof fm["title"] === "string" ? fm["title"] : id;
  const status = typeof fm["status"] === "string" ? fm["status"] : null;
  const list = (key: string) => (Array.isArray(fm[key]) ? (fm[key] as string[]) : []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Heading as="h2">{title}</Heading>
          {annotation && (
            <IconButton
              href={annotation.url}
              target="_blank"
              icon="hero-arrow-top-right-on-square"
              label="Open on GitHub"
              size="xs"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill variant="square">
            <code>{id}</code>
          </Pill>
          {annotation && <Pill color="primary">{annotation.folder.replace(/s$/, "")}</Pill>}
          {status && <Pill tone={statusTone(status)}>{status}</Pill>}
          {inventory && <Pill tone={statusTone(inventory.status)}>inventory: {inventory.status}</Pill>}
        </div>
        {inventory && (
          <Text as="p" variant="body-sm" className="text-muted">
            {inventory.section} · <code>{inventory.route.replace(/`/g, "")}</code>
          </Text>
        )}
        <IdList label="Inherits" ids={list("inherits")} onOpenId={onOpenId} />
        <IdList label="Flows" ids={list("flows")} onOpenId={onOpenId} />
      </div>

      {!annotation && (
        <EmptyState
          icon="hero-document-magnifying-glass"
          title="Not annotated yet"
          message={
            inventory
              ? "This view is in the inventory but its annotation hasn't been written."
              : "No annotation file and no inventory row for this id."
          }
        >
          {inventoryHref && (
            <TextLink href={inventoryHref} external>
              Open INVENTORY.md
            </TextLink>
          )}
        </EmptyState>
      )}

      {annotation && (
        <>
          {annotation.frontMatterRaw && (
            <Disclosure title="Front matter" defaultOpen={false} padding="none">
              <Text as="pre" variant="code-sm" className="overflow-x-auto border-t border-subtle px-4 py-3 text-muted">
                {annotation.frontMatterRaw}
              </Text>
            </Disclosure>
          )}
          <Markdown source={annotation.body} />
        </>
      )}
    </div>
  );
}
