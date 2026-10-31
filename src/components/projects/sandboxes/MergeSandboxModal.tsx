import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MergePreviewResult, MergeValues } from "../../../types/sandboxes";
import { errorMessage } from "../../../utils/errors";
import { formatGracePeriod } from "../../../utils/format";
import { useAction } from "../../../utils/useAction";
import Alert from "../../primitives/Alert";
import FormModal from "../../primitives/FormModal";
import { Checkbox, Select } from "../../primitives/Inputs";
import Pill from "../../primitives/Pill";
import Spinner from "../../primitives/Spinner";
import Text from "../../primitives/Text";

interface State {
  /** The latest preview that arrived. Merge always sends its target. */
  preview: MergePreviewResult | null;
  /** The select's value: the target asked for, until its preview arrives or fails. */
  shown: string | null;
  loading: boolean;
  error: string | null;
  workflows: Set<string>;
  credentials: Set<string>;
  collections: Set<string>;
}

const ids = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));
const keep = (selected: Set<string>, still: Set<string>) => new Set([...selected].filter((x) => still.has(x)));

/**
 * sandbox_live/index.ex `select-merge-target`: on a new target, ticks still
 * listed stay; workflows that newly appear ticked if changed, credentials
 * that newly appear ticked; collections all ticked again.
 */
function applyPreview(s: State, next: MergePreviewResult): State {
  const prev = s.preview;
  const nextWorkflows = ids(next.workflows);
  const nextCredentials = ids(next.credentials);
  const prevWorkflows = prev ? ids(prev.workflows) : new Set<string>();
  const prevCredentials = prev ? ids(prev.credentials) : new Set<string>();
  const sameTarget = prev !== null && prev.targetId === next.targetId;
  return {
    preview: next,
    shown: next.targetId,
    loading: false,
    error: null,
    workflows: new Set([
      ...keep(s.workflows, nextWorkflows),
      ...next.workflows.filter((w) => w.isChanged && !prevWorkflows.has(w.id)).map((w) => w.id),
    ]),
    credentials: new Set([...keep(s.credentials, nextCredentials), ...[...nextCredentials].filter((id) => !prevCredentials.has(id))]),
    collections: sameTarget ? keep(s.collections, new Set(next.collectionsToAdd)) : new Set(next.collectionsToAdd),
  };
}

const toggled = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/**
 * "Merge sandbox" (SandboxLive.Components.merge_modal): pick a target, tick
 * the workflows, credentials and collections to carry over, and a warning
 * that the sandbox is deleted afterwards. The preview comes from the host on
 * open and on every target change; the latest one asked for wins.
 */
export default function MergeSandboxModal({
  sandboxName,
  descendantCount,
  gracePeriodDays,
  onPreview,
  onClose,
  onMerge,
}: {
  sandboxName: string;
  /** Live sandboxes under this one, deleted with it after the merge. */
  descendantCount: number;
  gracePeriodDays: number | null;
  /** null asks for the default target. */
  onPreview: (targetId: string | null) => Promise<MergePreviewResult>;
  onClose: () => void;
  onMerge: (values: MergeValues) => Promise<void>;
}) {
  const [s, setS] = useState<State>({
    preview: null,
    shown: null,
    loading: true,
    error: null,
    workflows: new Set(),
    credentials: new Set(),
    collections: new Set(),
  });
  // Only the newest preview asked for counts; an older answer, or failure, is dropped.
  const previewing = useAction(onPreview, {
    onSuccess: (next) => setS((cur) => applyPreview(cur, next)),
    onError: (e) => setS((cur) => ({ ...cur, loading: false, error: errorMessage(e), shown: cur.preview?.targetId ?? null })),
    latest: true,
  });
  const ask = previewing.run;
  const askRef = useRef(ask);
  useEffect(() => {
    void askRef.current(null);
  }, []);

  const { preview } = s;
  // The select's target; "MAIN" only once a preview says there's none (Lightning's wording).
  const targetName =
    preview?.targets.find((t) => t.id === s.shown)?.name ?? (preview && preview.targetId === null ? "MAIN" : "the target project");
  const blockedReason = s.loading
    ? "Loading the merge preview"
    : !preview
      ? "The merge preview didn't load"
      : preview.targetId === null
        ? "No project to merge into"
        : s.workflows.size === 0
          ? "No workflows selected"
          : null;
  const count = descendantCount;

  return (
    <FormModal
      open
      title="Merge sandbox"
      formId="merge-sandbox-form"
      submitId="merge-sandbox-submit"
      submitLabel="Merge"
      submitDisabled={blockedReason !== null}
      submitTooltip={blockedReason ?? undefined}
      formClassName="space-y-5"
      onClose={onClose}
      onSubmit={() =>
        onMerge({
          targetId: preview!.targetId!,
          workflowIds: preview!.workflows.filter((w) => !w.isDeleted && s.workflows.has(w.id)).map((w) => w.id),
          deletedWorkflowIds: preview!.workflows.filter((w) => w.isDeleted && s.workflows.has(w.id)).map((w) => w.id),
          credentialIds: preview!.credentials.filter((c) => s.credentials.has(c.id)).map((c) => c.id),
          skippedCollectionNames: preview!.collectionsToAdd.filter((n) => !s.collections.has(n)),
        })
      }
    >
      <div className="space-y-2">
        <Text as="div" className="flex items-center gap-2 text-body">
          <span>Merge</span>
          {/* eslint-disable-next-line no-restricted-syntax -- debt: Pill has no 14px size */}
          <Pill variant="square" color="gray" className="text-sm text-strong">
            {sandboxName}
          </Pill>
          <span>into</span>
          <Select
            id="merge-target-select"
            aria-label="Target project"
            fieldClassName="max-w-64 flex-1"
            options={(preview?.targets ?? []).map((t) => ({ label: t.name, value: t.id }))}
            // With no target yet the prompt shows, and picking any real target is a change.
            {...(s.shown === null && { prompt: "Select a project" })}
            value={s.shown ?? ""}
            disabled={!preview}
            onChange={(e) => {
              const targetId = e.target.value;
              setS((cur) => ({ ...cur, shown: targetId, loading: true, error: null }));
              void ask(targetId);
            }}
          />
        </Text>
        <Text as="p" className="text-body">
          The workflows you select below will overwrite their counterparts in{" "}
          <strong className="font-medium text-strong">{targetName}</strong>. Any conflicting changes in the target are lost.
        </Text>
      </div>

      {s.error && (
        <Alert tone="danger" id="merge-preview-error">
          {s.error}
        </Alert>
      )}

      {!preview ? (
        s.loading && (
          <div className="flex justify-center py-6">
            <Spinner size="md" label="Loading the merge preview" />
          </div>
        )
      ) : (
        <>
          <TickList
            id="merge-select-all-workflows"
            title="Workflows to merge"
            rows={preview.workflows.map((w) => ({
              id: w.id,
              label: w.name,
              badges: (
                <>
                  {w.isChanged && !w.isNew && !w.isDeleted && (
                    <Pill tone="success" title="This workflow has been modified in the sandbox">
                      Changed
                    </Pill>
                  )}
                  {w.isDiverged && (
                    <Pill tone="warning" title="This workflow was modified in the target project - this change will be lost">
                      Diverged
                    </Pill>
                  )}
                  {w.isNew && (
                    <Pill tone="info" title="This workflow doesn't exist in the target — it will be created">
                      New
                    </Pill>
                  )}
                  {w.isDeleted && (
                    <Pill tone="danger" title="This workflow was deleted in the sandbox — selecting it will delete it from the target">
                      Deleted in sandbox
                    </Pill>
                  )}
                </>
              ),
            }))}
            selected={s.workflows}
            onChange={(workflows) => setS((cur) => ({ ...cur, workflows }))}
          />
          {preview.credentials.length > 0 && (
            <TickList
              id="merge-select-all-credentials"
              title="Credentials to add"
              rows={preview.credentials.map((c) => ({ id: c.id, label: c.name }))}
              selected={s.credentials}
              onChange={(credentials) => setS((cur) => ({ ...cur, credentials }))}
            />
          )}
          {preview.collectionsToAdd.length > 0 && (
            <TickList
              id="merge-select-all-collections-to-add"
              title="Collections to add"
              rows={preview.collectionsToAdd.map((name) => ({ id: name, label: name }))}
              selected={s.collections}
              onChange={(collections) => setS((cur) => ({ ...cur, collections }))}
            />
          )}
        </>
      )}

      <Alert tone="warning" id="merge-deletion-warning" header="This sandbox will be deleted after merging">
        It can be restored from the sandbox list for {formatGracePeriod(gracePeriodDays)}, then permanently removed.
        {count === 1 && <div className="mt-2">Its child sandbox will also be deleted.</div>}
        {count > 1 && <div className="mt-2">Its {count} child sandboxes will also be deleted.</div>}
      </Alert>
    </FormModal>
  );
}

/** A bordered list of checkboxes under a "select all" header with "n of m selected". */
function TickList({
  id,
  title,
  rows,
  selected,
  onChange,
}: {
  id: string;
  title: string;
  rows: { id: string; label: string; badges?: ReactNode }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const some = rows.some((r) => selected.has(r.id));
  return (
    <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
      <div className="flex items-center gap-3 border-b border-subtle bg-subtle px-3 py-2">
        <div className="flex-1 font-medium text-strong">
          <Checkbox
            id={id}
            label={title}
            checked={all}
            indeterminate={some && !all}
            disabled={rows.length === 0}
            onChange={() => onChange(all ? new Set() : new Set(rows.map((r) => r.id)))}
          />
        </div>
        <Text variant="body-sm" className="text-muted">
          {selected.size} of {rows.length} selected
        </Text>
      </div>
      <ul className="max-h-48 divide-y divide-subtle overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="px-3 py-2 hover:bg-hover">
            <Checkbox
              label={
                <span className="flex items-center gap-2">
                  <span className="truncate">{r.label}</span>
                  {r.badges}
                </span>
              }
              checked={selected.has(r.id)}
              onChange={() => onChange(toggled(selected, r.id))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
