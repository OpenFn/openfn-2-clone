import type { ReactNode } from "react";
import Button from "../primitives/Button";

interface Props {
  onClick: () => void;
  canSave?: boolean;
  /** Shows the red dot when there are unsaved changes. */
  hasChanges?: boolean;
  /** "Save", or "Create" on a new workflow. */
  children?: ReactNode;
  tooltip?: string;
}

/**
 * The header's Save button (SaveButton in collaborative-editor Header.tsx),
 * with the red "unsaved changes" dot in its corner. The GitHub "Save & Sync"
 * split variant isn't shown: no demo project has a repo connection.
 */
export default function SaveButton({ onClick, canSave = true, hasChanges = false, children = "Save", tooltip = "⌘ S" }: Props) {
  return (
    <div className="relative">
      <Button onClick={onClick} disabled={!canSave} tooltip={tooltip}>
        {children}
      </Button>
      {/* eslint-disable-next-line no-restricted-syntax -- debt: the dot is 500, strong fill is 600 */}
      {hasChanges && <div className="absolute top-0 right-0 -m-1 size-3 rounded-full bg-danger-500" data-is-dirty />}
    </div>
  );
}
