import { useState } from "react";
import AsyncBoundary from "../../components/primitives/AsyncBoundary";
import Button from "../../components/primitives/Button";
import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import DeleteSandboxModal from "../../components/domain/DeleteSandboxModal";
import MergeSandboxModal from "../../components/projects/sandboxes/MergeSandboxModal";
import SandboxFormModal from "../../components/projects/sandboxes/SandboxFormModal";
import WorkspaceList from "../../components/projects/sandboxes/WorkspaceList";
import { useRouter } from "../../routing/router";
import type { CurrentProject } from "../../types/projects";
import type { ResourceStatus } from "../../types/resource";
import type { MergePreviewResult, MergeValues, SandboxForm, SandboxRow, SandboxValues } from "../../types/sandboxes";

export interface SandboxesIndexPageProps {
  /** The project the page is under. Its card gets the "active" badge. */
  project: CurrentProject;
  /** The picker's label, "parent/child" for a sandbox. */
  projectLabel: string;
  /** The top of the tree the viewer can see: the root project, or a sandbox when that's all they can access. */
  root: SandboxRow;
  /** Whether `root` is a sandbox: a sandbox root gets a sandbox card, with its actions. */
  rootIsSandbox: boolean;
  /** Every sandbox under `root` the viewer can see, live and scheduled for deletion, in the order to show them. */
  sandboxes: SandboxRow[];
  /** The route that opens the create form. */
  newHref: string;
  /** Why the viewer can't create a sandbox here (not authorized, nesting depth, plan limit), or null when they can. */
  createBlockedReason: string | null;
  /** Days a deleted sandbox is kept, or null when Lightning has no setting ("the configured grace period"). */
  gracePeriodDays: number | null;
  /** The create or edit form the route opened, or null. */
  form: SandboxForm | null;
  /** Where the workspace stands while the host loads it; ready when omitted. */
  status?: ResourceStatus;

  /** Closes the form (Cancel, the X, Escape). The host goes back to the list route. */
  onCloseForm: () => void;
  /**
   * Creates a sandbox under `project`. The name is checked here, on submit,
   * not as the user types. Rejects with a `RequestError` whose
   * `fieldErrors.rawName` (e.g. "Sandbox name already exists") shows on the
   * Name field; any other message shows above the form, which stays open.
   * The host may instead close the form and announce the failure itself, as
   * Lightning does. On success it moves the user to the new sandbox, and
   * that route change closes the form (`form` goes null).
   */
  onCreateSandbox: (values: SandboxValues) => Promise<void>;
  /**
   * Saves the edit form. Rejects as `onCreateSandbox` does. On success the
   * host goes back to the list route, which closes the form.
   */
  onUpdateSandbox: (id: string, values: SandboxValues) => Promise<void>;
  /**
   * Schedules the sandbox, and the sandboxes under it, for deletion. The host
   * checks the typed name again. A rejection's message shows in the modal,
   * which stays open; on success the modal closes. When the viewer was
   * inside it, the host moves them to its parent's sandboxes page.
   */
  onDeleteSandbox: (id: string, nameConfirmation: string) => Promise<void>;
  /** Restore: cancels a scheduled deletion. A rejection's message shows as an error toast. */
  onCancelDeletion: (id: string) => Promise<void>;
  /**
   * What merging into `targetId` would do; null asks for the default target
   * (the parent). Called when Merge opens and on every target change; only
   * the latest answer is used. A rejection's message shows in the modal.
   */
  onPreviewMerge: (id: string, targetId: string | null) => Promise<MergePreviewResult>;
  /**
   * Merges the sandbox into `values.targetId`, then schedules it for
   * deletion. On success the host moves the user to the target's workflows.
   * A rejection's message shows in the modal, which stays open.
   */
  onMergeSandbox: (id: string, values: MergeValues) => Promise<void>;
}

/**
 * Inventory view `sandboxes-index` (SandboxLive.Index): the workspace tree
 * with Create / Edit (route-driven modals at /new and /:sandboxId/edit, the
 * host answers with `form`), Delete (confirm modal), Restore and Merge
 * (a modal fed by `onPreviewMerge`). Props only, so it can run unchanged in
 * Lightning; the replica's data lives in SandboxesIndexPage.replica.tsx.
 */
export default function SandboxesIndexPage({
  project,
  projectLabel,
  root,
  rootIsSandbox,
  sandboxes,
  newHref,
  createBlockedReason,
  gracePeriodDays,
  form,
  status = { state: "ready" },
  onCloseForm,
  onCreateSandbox,
  onUpdateSandbox,
  onDeleteSandbox,
  onCancelDeletion,
  onPreviewMerge,
  onMergeSandbox,
}: SandboxesIndexPageProps) {
  const { navigate } = useRouter();
  // The id, not the row, so the modal always shows the host's latest row and closes if it goes.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = [root, ...sandboxes].find((s) => s.id === deletingId) ?? null;
  const [mergingId, setMergingId] = useState<string | null>(null);
  const merging = [root, ...sandboxes].find((s) => s.id === mergingId) ?? null;

  return (
    <PageContent
      header={
        <Header breadcrumbs={<ProjectBreadcrumbs project={project} label={projectLabel} current="Sandboxes" />} title="Sandboxes">
          <Button
            id="create-sandbox-button"
            size="lg"
            disabled={createBlockedReason !== null}
            tooltip={createBlockedReason ?? undefined}
            onClick={() => navigate(newHref)}
          >
            Create Sandbox
          </Button>
        </Header>
      }
    >
      <Centered>
        <AsyncBoundary status={status}>
          <WorkspaceList
            root={root}
            rootIsSandbox={rootIsSandbox}
            sandboxes={sandboxes}
            currentProjectId={project.id}
            newHref={newHref}
            createBlockedReason={createBlockedReason}
            onMerge={(s) => setMergingId(s.id)}
            onEdit={(s) => s.editHref && navigate(s.editHref)}
            onDelete={(s) => setDeletingId(s.id)}
            // Each card spins its own Restore and toasts a refusal. The host announces success (its flash).
            onRestore={(s) => onCancelDeletion(s.id)}
          />

          {deleting && (
            <DeleteSandboxModal
              key={deleting.id}
              sandboxName={deleting.name}
              descendantCount={deleting.activeDescendantCount}
              isCurrent={deleting.id === project.id}
              rootName={root.name}
              gracePeriodDays={gracePeriodDays}
              onClose={() => setDeletingId(null)}
              onConfirm={async (typed) => {
                await onDeleteSandbox(deleting.id, typed);
                setDeletingId(null);
              }}
            />
          )}

          {merging && (
            <MergeSandboxModal
              key={merging.id}
              sandboxName={merging.name}
              descendantCount={merging.activeDescendantCount}
              gracePeriodDays={gracePeriodDays}
              onPreview={(targetId) => onPreviewMerge(merging.id, targetId)}
              onClose={() => setMergingId(null)}
              onMerge={async (values) => {
                await onMergeSandbox(merging.id, values);
                setMergingId(null);
              }}
            />
          )}

          {form && (
            <SandboxFormModal
              key={form.mode === "edit" ? form.sandboxId : "new"}
              form={form}
              onClose={onCloseForm}
              onSave={(values) => (form.mode === "new" ? onCreateSandbox(values) : onUpdateSandbox(form.sandboxId, values))}
            />
          )}
        </AsyncBoundary>
      </Centered>
    </PageContent>
  );
}
