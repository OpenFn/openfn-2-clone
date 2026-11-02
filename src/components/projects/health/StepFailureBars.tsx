import { formatNumber } from "../../../utils/format";
import type { ErrorSignature } from "../../../types/workflow-health";
import { cn } from "../../../utils/cn";
import { EMPTY, FAILED, UNATTRIBUTED, adaptorLabel } from "./palette";
import Text from "../../primitives/Text";
import Tooltip from "../../primitives/Tooltip";
import { Stack } from "../../primitives/Stack";

const NO_STEP = "no-step";

/** One row per job, plus one for failures with no step to blame (StepFailureBars.tsx `groupByStep`). */
function groupByStep(signatures: ErrorSignature[]) {
  const rows = new Map<string, { key: string; label: string; adaptor: string | null; count: number }>();
  for (const { job_id, step_name, adaptor, count } of signatures) {
    const key = job_id ?? NO_STEP;
    const existing = rows.get(key);
    if (existing) existing.count += count;
    else rows.set(key, { key, label: job_id ? step_name || "(unknown step)" : "No failing step", adaptor, count });
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * "Steps with failures": which steps the window's failures land on,
 * heaviest first, each with a bar scaled to the heaviest row.
 */
export default function StepFailureBars({
  signatures,
  emptyMessage,
}: {
  signatures: ErrorSignature[];
  emptyMessage: string;
}) {
  const rows = groupByStep(signatures);
  if (rows.length === 0) return <Text as="p" tone="muted" className={EMPTY}>{emptyMessage}</Text>;
  const max = Math.max(...rows.map((r) => r.count));

  return (
    <div className="lg:relative lg:min-h-64 lg:flex-1">
      <ul className="relative -mr-6 flex max-h-64 flex-col gap-6 overflow-y-auto pr-4 lg:absolute lg:inset-0 lg:max-h-none">
        {rows.map(({ key, label, adaptor, count }) => (
          <Stack as="li" gap="sm" key={key}>
            <Text as="div" className="flex items-baseline justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Tooltip content={label}>
                  <span className={cn("truncate", key === NO_STEP ? "italic text-muted" : "text-strong")}>{label}</span>
                </Tooltip>
                {adaptor && <Text variant="code-sm" tone="muted" className="truncate">{adaptorLabel(adaptor)}</Text>}
              </div>
              <span className="shrink-0 font-medium tabular-nums text-strong">{formatNumber(count)}</span>
            </Text>
            <div aria-hidden="true" className="h-1.5 rounded-full bg-emphasis">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${(count / max) * 100}%`, backgroundColor: key === NO_STEP ? UNATTRIBUTED : FAILED }}
              />
            </div>
          </Stack>
        ))}
      </ul>
    </div>
  );
}
