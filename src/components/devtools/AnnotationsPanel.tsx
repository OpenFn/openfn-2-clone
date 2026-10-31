import { useAnnotations } from "../../annotations/annotations-context";
import { ANNOTATIONS_BRANCH, getAnnotation, inventory, inventoryUrl } from "../../annotations/source";
import Heading from "../primitives/Heading";
import CloseButton from "../primitives/CloseButton";
import IconButton from "../primitives/IconButton";
import Text from "../primitives/Text";
import TextLink from "../primitives/TextLink";
import AnnotationCard from "./AnnotationCard";
import Tooltip from "../primitives/Tooltip";

export const ANNOTATIONS_PANEL_WIDTH = 440;

/**
 * Right-hand panel showing the behaviour annotation for whatever the mouse
 * is over (or the page), from the bundled copy of Lightning's annotations.
 */
export default function AnnotationsPanel() {
  const { open, setOpen, currentId, pageId, pinnedId, pin } = useAnnotations();
  if (!open) return null;

  return (
    <aside
      data-devtools
      style={{ width: ANNOTATIONS_PANEL_WIDTH }}
      className="fixed inset-y-0 right-0 z-9998 flex flex-col border-l border-subtle bg-surface shadow-xl"
      aria-label="Annotations"
    >
      <div className="flex h-20 flex-none items-center justify-between gap-2 border-b border-subtle px-5">
        <div className="min-w-0">
          <Heading as="p" size="sm">
            Annotations
          </Heading>
          <Tooltip content={ANNOTATIONS_BRANCH}>
            <Text as="p" variant="body-sm" tone="muted" className="truncate">
              {pinnedId ? "Pinned" : "Following the mouse"} · copy of {ANNOTATIONS_BRANCH}
            </Text>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={pinnedId ? "hero-lock-closed" : "hero-lock-open"}
            label={pinnedId ? "Unpin and follow the mouse" : "Pin this annotation"}
            active={!!pinnedId}
            onClick={() => pin(pinnedId ? null : currentId)}
          />
          <CloseButton onClick={() => setOpen(false)} />
        </div>
      </div>

      {pinnedId === null && currentId !== pageId && pageId && (
        // eslint-disable-next-line local/primitive-classname -- debt: F526 box (border-b border-subtle bg-subtle px-5 py-2)
        <Text as="p" variant="body-sm" className="flex-none border-b border-subtle bg-subtle px-5 py-2">
          <TextLink onClick={() => pin(pageId)}>
            Page: <code>{pageId}</code>
          </TextLink>
        </Text>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {currentId ? (
          <AnnotationCard
            id={currentId}
            annotation={getAnnotation(currentId)}
            inventory={inventory.get(currentId)}
            inventoryHref={inventoryUrl()}
            onOpenId={pin}
          />
        ) : (
          <Text as="p" tone="muted">
            This page isn't in the inventory, and nothing under the mouse is annotated.
          </Text>
        )}
      </div>
    </aside>
  );
}
