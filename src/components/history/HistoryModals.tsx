import { useState, type ReactNode } from "react";
import { errorMessage } from "../../utils/errors";
import { useAction } from "../../utils/useAction";
import Alert from "../primitives/Alert";
import Button from "../primitives/Button";
import ConfirmModal from "../primitives/ConfirmModal";
import Modal from "../primitives/Modal";
import { Field, Radio } from "../primitives/Inputs";
import Text from "../primitives/Text";

const plural = (n: number) => (n === 1 ? "" : "s");

/** Which work orders a bulk action covers: the ticked ones, or every one matching the filters. */
export type BulkScope = "selected" | "all";

/** What a bulk modal needs to know about the selection and the search. */
export interface BulkSelection {
  selectedCount: number;
  /** Every row on the page is ticked. */
  allSelected: boolean;
  pageNumber: number;
  pages: number;
  totalEntries: number;
}

/**
 * Every row on a page of many is ticked: the modal offers the whole search
 * as well as the ticked rows (components.ex, `@all_selected? and
 * @total_entries > 1 and @pages > 1`).
 */
const offersAll = (s: BulkSelection) => s.allSelected && s.totalEntries > 1 && s.pages > 1;

/**
 * A bulk confirm with one button per scope: "selected" always, "all
 * matching" when `allLabel` is given. Then, as Lightning lays it out, the
 * two sit side by side over an "OR" and a full-width way back. Pending and
 * failure as ConfirmModal.
 */
function BulkModal({
  open,
  onClose,
  title,
  children,
  selectedLabel,
  allLabel,
  backLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  selectedLabel: string;
  allLabel: string | null;
  backLabel: string;
  onConfirm: (scope: BulkScope) => Promise<void>;
}) {
  const [scope, setScope] = useState<BulkScope>("selected");
  const confirm = useAction(onConfirm);
  const close = () => {
    if (confirm.pending) return;
    confirm.reset();
    onClose();
  };
  const button = (s: BulkScope, label: string) => (
    <Button
      disabled={confirm.pending}
      pending={confirm.pending && scope === s}
      onClick={() => {
        setScope(s);
        void confirm.run(s);
      }}
    >
      {label}
    </Button>
  );
  const back = (
    <Button variant="secondary" onClick={close} disabled={confirm.pending}>
      {backLabel}
    </Button>
  );
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        !allLabel && (
          <>
            {button("selected", selectedLabel)}
            {back}
          </>
        )
      }
    >
      <Text as="div" tone="muted" className="space-y-3">
        {confirm.error && <Alert tone="danger">{errorMessage(confirm.error)}</Alert>}
        {children}
      </Text>
      {allLabel && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {button("selected", selectedLabel)}
          {button("all", allLabel)}
          <div className="relative col-span-2 flex justify-center" aria-hidden="true">
            <div className="absolute inset-x-0 top-1/2 border-t border-strong" />
            <Text tone="muted" className="relative bg-surface px-2">OR</Text>
          </div>
          <div className="col-span-2 grid">{back}</div>
        </div>
      )}
    </Modal>
  );
}

/** "Run Selected Work Orders" (Retry on the bulk bar; run_live/components.ex `bulk_rerun_modal`). */
export function BulkRerunModal({
  open,
  onClose,
  selection,
  query,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  selection: BulkSelection;
  /** The search in words, for the all-selected message ("for X workflow, …"). */
  query: string;
  onConfirm: (scope: BulkScope) => Promise<void>;
}) {
  const { selectedCount, allSelected, pageNumber, pages, totalEntries } = selection;
  const all = offersAll(selection);
  return (
    <BulkModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Run Selected Work Orders"
      selectedLabel={`Rerun ${selectedCount} selected work order${plural(selectedCount)} from start`}
      allLabel={all ? `Rerun all ${totalEntries} matching work orders from start` : null}
      backLabel={all ? "Go back" : "Cancel"}
    >
      <p>
        {allSelected
          ? `You've selected all ${selectedCount} work orders from page ${pageNumber} of ${pages}. There are a total of ${totalEntries} that match your current query: ${query}.`
          : `You've selected ${selectedCount} work orders to rerun from the start. This will create a new run for each selected work order.`}
      </p>
    </BulkModal>
  );
}

/** "Cancel Pending Runs" (Cancel on the bulk bar; run_live/components.ex `bulk_cancel_modal`). */
export function BulkCancelModal({
  open,
  onClose,
  selection,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  selection: BulkSelection;
  onConfirm: (scope: BulkScope) => Promise<void>;
}) {
  return (
    <BulkModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Cancel Pending Runs"
      selectedLabel={`Cancel up to ${selection.selectedCount} selected`}
      allLabel={offersAll(selection) ? `Cancel up to ${selection.totalEntries} matching` : null}
      backLabel="Go back"
    >
      <p>
        This will cancel pending runs for the selected work orders. Any runs that have already been claimed by a
        worker will be skipped.
      </p>
    </BulkModal>
  );
}

/** A job "Retry from" can start at, and how many of the selected work orders' last runs reached it. */
export interface RetryFromJob {
  id: string;
  name: string;
  /** 0 disables the job: no selected work order's last run has a stored input for it. */
  retriableCount: number;
}

/** "Run from a specific step" (Retry from on the bulk bar; rerun_job_component.ex). */
export function RerunFromJobModal({
  open,
  onClose,
  jobs,
  selection,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  /** The selected work orders' workflow's jobs, in order. */
  jobs: RetryFromJob[];
  selection: BulkSelection;
  onConfirm: (scope: BulkScope, jobId: string) => Promise<void>;
}) {
  // Lightning starts on the first job, even when it can't be retried.
  const [selected, setSelected] = useState(jobs[0]?.id);
  const job = jobs.find((j) => j.id === selected);
  const count = job?.retriableCount ?? 0;
  return (
    <BulkModal
      open={open}
      onClose={onClose}
      onConfirm={(scope) => onConfirm(scope, selected ?? "")}
      title="Run from a specific step"
      selectedLabel={`Rerun ${count} selected work order${plural(count)} from selected job`}
      allLabel={offersAll(selection) ? `Rerun all ${selection.totalEntries} matching work orders from selected job` : null}
      backLabel="Cancel"
    >
      <p>
        Find all runs that include this step and rerun from there. (Note that if you'd like to reprocess all of the
        selected work orders from the start, use the "Rerun" button, not this "Rerun from" button.)
      </p>
      <Field group aria-label="Workflow Job">
        <div id="select-job-for-rerun-form" className="space-y-2 pt-1">
          {jobs.map((j) => (
            <Radio
              key={j.id}
              id={`job_${j.id}`}
              name="job"
              label={j.name}
              checked={selected === j.id}
              disabled={j.retriableCount === 0}
              onChange={() => setSelected(j.id)}
            />
          ))}
        </div>
      </Field>
    </BulkModal>
  );
}

/** "Confirm history export" (run_live/export_confirmation_modal.ex). */
export function ExportConfirmationModal({
  open,
  onClose,
  count,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirm history export"
      confirmLabel="Export history"
    >
      <p>
        Exporting history will download all {count} work orders and associated runs, steps, and I/O data clips that
        match your query.
      </p>
      <p>The export will happen in the background and you'll receive an email when it is complete.</p>
    </ConfirmModal>
  );
}
