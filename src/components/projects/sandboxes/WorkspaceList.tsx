import type { SandboxRow } from "../../../types/sandboxes";
import Section from "../../primitives/Section";
import TextLink from "../../primitives/TextLink";
import WorkspaceCard from "./WorkspaceCard";
import EmptyState from "../../primitives/EmptyState";

/**
 * The sandboxes page list (SandboxLive.Components.workspace_list): the root
 * card (a sandbox card when the root is a sandbox), its live sandboxes (or
 * the dashed "No sandboxes found" box), then a "Scheduled for deletion"
 * section.
 */
export default function WorkspaceList({
  root,
  rootIsSandbox = false,
  sandboxes,
  currentProjectId,
  newHref,
  createBlockedReason = null,
  onMerge,
  onEdit,
  onDelete,
  onRestore,
}: {
  root: SandboxRow;
  rootIsSandbox?: boolean;
  sandboxes: SandboxRow[];
  currentProjectId: string;
  /** "Create your first sandbox" links here. */
  newHref: string;
  /** Shown instead of that link when the user can't create one. */
  createBlockedReason?: string | null;
  onMerge?: (s: SandboxRow) => void;
  onEdit?: (s: SandboxRow) => void;
  onDelete?: (s: SandboxRow) => void;
  onRestore?: (s: SandboxRow) => Promise<void>;
}) {
  const active = sandboxes.filter((s) => !s.scheduledDeletion);
  const scheduled = sandboxes.filter((s) => s.scheduledDeletion);
  const card = (s: SandboxRow, isRoot = false) => (
    <WorkspaceCard
      key={s.id}
      workspace={s}
      isRoot={isRoot}
      isCurrent={s.id === currentProjectId}
      onMerge={() => onMerge?.(s)}
      onEdit={() => onEdit?.(s)}
      onDelete={() => onDelete?.(s)}
      onRestore={async () => {
        await onRestore?.(s);
      }}
    />
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {card(root, !rootIsSandbox)}
        {active.length === 0 && scheduled.length === 0 ? (
          <EmptyState
            icon={null}
            title="No sandboxes found"
            message={
              createBlockedReason ?? (
                <>
                  <TextLink to={newHref}>Create your first sandbox</TextLink> to start experimenting.
                </>
              )
            }
          />
        ) : (
          active.map((s) => card(s))
        )}
      </div>
      {scheduled.length > 0 && (
        <Section id="scheduled-for-deletion-section" size="lg" title="Scheduled for deletion">
          {scheduled.map((s) => card(s))}
        </Section>
      )}
    </div>
  );
}
