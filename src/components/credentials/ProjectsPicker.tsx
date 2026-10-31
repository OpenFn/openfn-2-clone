import { useState } from "react";
import type { CredentialProjectRef } from "../../types/credentials";
import ConfirmModal from "../primitives/ConfirmModal";
import { Select } from "../primitives/Inputs";
import Pill from "../primitives/Pill";

interface Props {
  id: string;
  type: "credential" | "oauth_client";
  /** Every project the user can grant; the select lists those not yet selected. */
  projects: CredentialProjectRef[];
  /** The projects the record is shared with now, including ones not in `projects`, so each keeps its chip. */
  granted?: (CredentialProjectRef & { workflowsUsing?: string[] })[] | undefined;
  selectedIds: string[];
  /** The host's refusals for the projects. */
  errors?: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Lightning's `Components.Credentials.projects_picker`: a select that adds a
 * project, then the granted projects as removable chips. Removing a project
 * whose workflows use the credential asks first.
 */
export default function ProjectsPicker({ id, type, projects, granted = [], selectedIds, errors = [], onChange }: Props) {
  const [confirming, setConfirming] = useState<(typeof granted)[number] | null>(null);
  const available = projects.filter((p) => !selectedIds.includes(p.id));
  const selected = selectedIds
    .map((pid) => projects.find((p) => p.id === pid) ?? granted.find((p) => p.id === pid))
    .filter((p): p is CredentialProjectRef => !!p);
  const prompt =
    type === "credential" ? "Grant projects access to this credential" : "Grant projects access to this OAuth client";
  const selectId = type === "credential" ? `project-credentials-list-${id}` : `project-oauth-clients-list-${id}`;
  const remove = (pid: string) => onChange(selectedIds.filter((x) => x !== pid));

  return (
    // eslint-disable-next-line no-restricted-syntax -- debt: F556 off-scale space-y-3, waiting on Lucy's rounding
    <div className="space-y-3">
      <Select
        id={selectId}
        value=""
        aria-label={prompt}
        prompt={prompt}
        errors={errors}
        options={available.map((p) => ({ label: p.name, value: p.id }))}
        onChange={(e) => e.target.value && onChange([...selectedIds, e.target.value])}
      />
      {selected.length > 0 && (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
          {selected.map((p) => (
            <Pill
              key={p.id}
              color="blue"
              removeLabel={`Remove ${p.name}`}
              onRemove={() => {
                const using = granted.find((g) => g.id === p.id);
                if (using?.workflowsUsing?.length) setConfirming(using);
                else remove(p.id);
              }}
            >
              {p.name}
            </Pill>
          ))}
        </div>
      )}
      {/* Lightning's data-confirm on the remove button. */}
      {confirming && (
        <ConfirmModal
          key={confirming.id}
          open
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            remove(confirming.id);
            setConfirming(null);
          }}
          title="Revoke project access"
          confirmLabel="Revoke access"
          tone="danger"
        >
          <p>
            Warning: This credential is in use by the following workflows: {confirming.workflowsUsing?.join(", ")}. If you
            revoke access to the &quot;{confirming.name}&quot; project, runs for those workflows will probably fail until you
            provide a new credential. Are you sure you want to revoke access?
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
