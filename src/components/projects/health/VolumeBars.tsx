import { useState } from "react";
import { Link } from "../../../routing/router";
import { cn } from "../../../utils/cn";
import { formatNumber } from "../../../utils/format";
import { historyUrl } from "../../../utils/history";
import type { RunBucket } from "../../../types/workflow-health";
import { CANCELLED, DOT, EMPTY, FAILED, FRAME, LEGEND, SUCCESS } from "./palette";
import Text from "../../primitives/Text";

/** A run has no `rejected` state, so the red band folds the other five. */
const RUN_FAILURE_KEYS = ["failed", "crashed", "killed", "exception", "lost"] as const;

// Top to bottom, as the legend and tooltip read; the bars stack the reverse.
// `states` is what a band counts, and what its History link filters on.
const SERIES = [
  { key: "success", label: "Success", color: SUCCESS, states: ["success"] },
  { key: "cancelled", label: "Cancelled", color: CANCELLED, states: ["cancelled"] },
  { key: "failed", label: "Failed", color: FAILED, states: RUN_FAILURE_KEYS },
] as const;

/**
 * One band of one bar: work orders with a run created in the bar's slot that
 * ended in one of the band's states. The slot ends where the next bar starts;
 * the newest bar has no end (VolumeBars.tsx `bucketUrl`).
 */
const bucketUrl = (projectId: string, workflowId: string, buckets: RunBucket[], index: number, states: readonly string[]) =>
  historyUrl(projectId, workflowId, {
    run_date_after: buckets[index]!.at,
    run_date_before: buckets[index + 1]?.at,
    run_status: states,
  });

const dayLabel = (d: Date, tz: string) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: tz });
const hour = (d: Date, tz: string) =>
  Number(d.toLocaleString("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz }));
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** "Oct 14, 14:00 – 16:00"; a daily bar is just its day. */
function rangeLabel(at: string, hours: number, tz: string) {
  const start = new Date(at);
  if (hours >= 24) return dayLabel(start, tz);
  const from = hour(start, tz);
  return `${dayLabel(start, tz)}, ${hourLabel(from)} – ${hourLabel((from + hours) % 24)}`;
}

function tickLabel(at: string, hours: number, tz: string) {
  const d = new Date(at);
  if (hours >= 24) return dayLabel(d, tz);
  if (hours >= 12) return hour(d, tz) < 12 ? dayLabel(d, tz) : "";
  return hourLabel(hour(d, tz));
}

/**
 * "Runs over time": run volume per bucket, stacked Failed / Cancelled /
 * Success from the axis up (VolumeBars.tsx). Plain SVG in place of Recharts.
 * Hovering a bar names its slot and counts; clicking a band opens the runs it
 * counts in History. The chart is mouse-only and hidden from
 * assistive tech; the window totals below are its accessible version.
 */
export default function VolumeBars({
  buckets,
  hours,
  timezone,
  emptyMessage,
  projectId,
  workflowId,
}: {
  buckets: RunBucket[];
  hours: number;
  timezone: string;
  emptyMessage: string;
  projectId: string;
  workflowId: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const rows = buckets.map((b) => ({
    at: b.at,
    success: b.success,
    cancelled: b.cancelled,
    failed: RUN_FAILURE_KEYS.reduce((sum, k) => sum + b[k], 0),
  }));
  const totals = SERIES.map((s) => ({ ...s, value: rows.reduce((sum, r) => sum + r[s.key], 0) })).filter(
    ({ key, value }) => key !== "cancelled" || value > 0
  );
  if (totals.every(({ value }) => value === 0)) return <Text as="p" tone="muted" className={EMPTY}>{emptyMessage}</Text>;

  const max = Math.max(...rows.map((r) => r.success + r.cancelled + r.failed));
  // A tenth of headroom, rounded up to four whole-number steps.
  const step = Math.max(1, Math.ceil((max * 1.1) / 4));
  const ceiling = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  // Thin the axis to about a dozen labels, keeping the newest bar's. 12-hour
  // bars are already halved: tickLabel blanks the afternoon ones.
  const every = hours >= 12 && hours < 24 ? 1 : Math.ceil(rows.length / 13);
  const n = rows.length;
  const tip = hovered === null ? undefined : rows[hovered];

  return (
    <>
      <div className={`${FRAME} flex`} aria-hidden="true">
        <Text as="div" variant="body-sm" tone="muted" className="flex w-11 shrink-0 flex-col">
          <div className="relative flex-1">
            {ticks.map((t, i) => (
              <span key={i} className="absolute right-2 translate-y-1/2" style={{ bottom: `${(t / ceiling) * 100}%` }}>
                {t}
              </span>
            ))}
          </div>
          <div className="h-5" />
        </Text>
        <div className="flex flex-1 flex-col">
          {/* eslint-disable-next-line no-restricted-syntax -- chart geometry: bar gaps scale with the chart */}
          <div className="relative flex min-h-0 flex-1 items-end gap-[1%] border-b border-subtle" onMouseLeave={() => setHovered(null)}>
            {ticks.slice(1).map((t, i) => (
              <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-subtle" style={{ bottom: `${(t / ceiling) * 100}%` }} />
            ))}
            {rows.map((r, i) => {
              let base = ceiling;
              return (
                <div
                  key={r.at}
                  className={cn("relative flex h-full flex-1 justify-center", hovered === i && "bg-subtle")}
                  onMouseEnter={() => setHovered(i)}
                >
                  <svg viewBox={`0 0 1 ${ceiling}`} preserveAspectRatio="none" className="h-full w-4/5 max-w-16">
                    {[...totals].reverse().map(({ key, color, states }) => {
                      if (r[key] === 0) return null;
                      base -= r[key];
                      return (
                        <Link key={key} to={bucketUrl(projectId, workflowId, buckets, i, states)} tabIndex={-1}>
                          <path d={`M0 ${base}H1V${base + r[key]}H0Z`} fill={color} className="cursor-pointer" />
                        </Link>
                      );
                    })}
                  </svg>
                </div>
              );
            })}
            {tip && hovered !== null && (
              <Text
                as="div"
                variant="body-sm"
                // eslint-disable-next-line local/primitive-classname -- debt: F529 state, F526 box (pointer-events-none rounded-lg border border-subtle bg-surface shadow-lg)
                className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-subtle bg-surface shadow-lg"
                // Beside the bar, on the side with more room.
                style={hovered < n / 2 ? { left: `${((hovered + 1) / n) * 100}%` } : { right: `${((n - hovered) / n) * 100}%` }}
              >
                <p className="border-b border-subtle px-3 py-2 font-medium text-strong">{rangeLabel(tip.at, hours, timezone)}</p>
                <ul className="flex flex-col gap-1.5 px-3 py-2 text-body">
                  {totals.map(({ key, label, color }) => (
                    // eslint-disable-next-line no-restricted-syntax -- debt: F557 Stack/Row can't render this element
                    <li key={key} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="grow pr-4">{label}</span>
                      <span className="font-medium tabular-nums text-strong">{formatNumber(tip[key])}</span>
                    </li>
                  ))}
                </ul>
              </Text>
            )}
          </div>
          {/* eslint-disable-next-line no-restricted-syntax, local/primitive-classname -- chart geometry: bar gaps scale with the chart; debt: F526 box (pt-1) */}
          <Text as="div" variant="body-sm" tone="muted" className="flex h-5 gap-[1%] pt-1">
            {rows.map((r, i) => (
              <span key={r.at} className="flex-1 truncate text-center">
                {(n - 1 - i) % every === 0 ? tickLabel(r.at, hours, timezone) : ""}
              </span>
            ))}
          </Text>
        </div>
      </div>
      <p className="sr-only">{`Window totals: ${totals.map(({ label, value }) => `${label} ${formatNumber(value)}`).join(", ")}.`}</p>
      <Text as="ul" aria-hidden="true" tone="body" className={LEGEND}>
        {totals.map(({ key, label, color }) => (
          // eslint-disable-next-line no-restricted-syntax -- debt: F557 Stack/Row can't render this element
          <li key={key} className="flex items-center gap-2">
            <span className={DOT} style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </Text>
    </>
  );
}
