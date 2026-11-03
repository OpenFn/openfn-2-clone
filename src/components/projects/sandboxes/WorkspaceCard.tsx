import type { KeyboardEvent } from "react";
import { useRouter } from "../../../routing/router";
import type { SandboxRow } from "../../../types/sandboxes";
import { cn } from "../../../utils/cn";
import { formatUtcDate } from "../../../utils/format";
import Card from "../../primitives/Card";
import Heading from "../../primitives/Heading";
import Pill from "../../primitives/Pill";
import Tooltip from "../../primitives/Tooltip";
import SandboxActions from "./SandboxActions";

function deletionTooltip(iso: string) {
  const at = new Date(iso);
  const days = Math.trunc((at.getTime() - Date.now()) / 86_400_000);
  const suffix = days > 1 ? ` (in ${days} days)` : days === 1 ? " (in 1 day)" : days === 0 ? " (today)" : "";
  return `Scheduled for deletion on ${formatUtcDate(iso)}${suffix}. Cancel the deletion to restore it.`;
}

/**
 * A row on the sandboxes page (SandboxLive.Components root_project_card /
 * sandbox_card): a colour strip, the name and badges ("main", "active" or
 * the env name), and, for sandboxes, Merge / Edit / Delete. The root
 * project's strip is indigo. A sandbox scheduled for deletion is struck
 * through, dimmed, and offers Restore. Clicking a live card opens that
 * project's workflows.
 */
export default function WorkspaceCard({
  workspace,
  isRoot = false,
  isCurrent = false,
  onMerge,
  onEdit,
  onDelete,
  onRestore,
}: {
  workspace: SandboxRow;
  isRoot?: boolean;
  isCurrent?: boolean;
  onMerge?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => Promise<void>;
}) {
  const { navigate } = useRouter();
  const deleted = workspace.scheduledDeletion;
  const env = workspace.env?.trim() ? workspace.env : isRoot ? "main" : null;
  const color = (!isRoot && workspace.color) || "var(--background-color-brand)";

  return (
    <Card
      id={isRoot && !deleted ? undefined : `sandbox-card-${workspace.id}`}
      padding="none"
      variant={deleted ? "muted" : "default"}
      // The whole card shows the focus outline when its name area is reached by keyboard.
      // eslint-disable-next-line local/primitive-classname -- debt: box, state (has-[[role=button]:focus-visible]:outline-2 has-[[role=button]:focus-visible]:outline-offset-2 has-[[role=button]:focus-visible]:outline-focus opacity-75 hover:bg-hover)
      className={cn(
        "flex overflow-hidden has-[[role=button]:focus-visible]:outline-2 has-[[role=button]:focus-visible]:outline-offset-2 has-[[role=button]:focus-visible]:outline-focus",
        deleted ? "opacity-75" : "hover:bg-hover"
      )}
    >
      <div className={cn("w-3 shrink-0", deleted && "opacity-60")} style={{ backgroundColor: color }} />
      <div
        className={cn("flex min-w-0 flex-1 items-center gap-3 p-4 focus:outline-none", deleted ? "cursor-not-allowed" : "cursor-pointer")}
        {...(deleted
          ? { "aria-disabled": true, "aria-description": deletionTooltip(deleted) }
          : {
              role: "button",
              tabIndex: 0,
              onClick: () => navigate(workspace.workflowsHref),
              onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                navigate(workspace.workflowsHref);
              },
            })}
      >
        {/* Only on the name: around the badges too, it would open with their own tooltips. */}
        <Tooltip content={deleted ? deletionTooltip(deleted) : undefined}>
          <div className="min-w-0">
            {/* eslint-disable-next-line local/primitive-classname -- debt: colour, state (text-muted line-through) */}
            <Heading size="lg" className={cn("truncate", deleted && "text-muted line-through")}>
              {workspace.name}
            </Heading>
          </div>
        </Tooltip>
        {env && <Badge id={`env-badge-${workspace.id}`} label={env} />}
        {isCurrent && <Badge id={`active-badge-${workspace.id}`} label="active" />}
      </div>
      {(!isRoot || deleted) && (
        <div className="flex items-center pr-4">
          <SandboxActions
            sandbox={workspace}
            onMerge={onMerge}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        </div>
      )}
    </Card>
  );
}

function Badge({ id, label }: { id: string; label: string }) {
  return (
    <Pill id={id} className="max-w-32" title={label}>
      <span className="truncate">{label}</span>
    </Pill>
  );
}
