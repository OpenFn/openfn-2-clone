import type { FailureState } from "../../../types/workflow-health";

/** Status colours shared by the health charts (assets/js/health/charts). */
export const SUCCESS = "#0ca30c";
export const FAILED = "#d03b3b";
export const CANCELLED = "var(--color-gray-500)";
/** Step-failure rows with no step to blame. */
export const UNATTRIBUTED = "#9ca3af";

/** The failure breakdown's categorical palette (FailureBreakdownDonut.tsx). */
export const FAILURE_COLORS: Record<FailureState, string> = {
  failed: FAILED,
  crashed: "#e87ba4",
  killed: "#4a3aa7",
  exception: "#2a78d6",
  lost: "#1baf7a",
  rejected: "#eda100",
};

/** The chart frame, so empty and full cards are the same height. */
export const FRAME = "h-55";
export const EMPTY = "flex min-h-55 flex-1 items-center justify-center text-center";
/** The always-on legend under a chart, and the colour dot on its rows. */
export const LEGEND = "mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1";
export const DOT = "h-2.5 w-2.5 shrink-0 rounded-full";

/** A share to one decimal, never rounding a failure away (Donut.tsx `percent`). */
export const percent = (value: number, total: number) => {
  const share = (value / total) * 100;
  if (value > 0 && share < 0.05) return "<0.1%";
  if (value < total && share >= 99.95) return "<100%";
  return `${share.toFixed(1)}%`;
};

/** "@openfn/language-http@6.5.1" → "http adaptor" (adaptorLabel.ts, simplified). */
export const adaptorLabel = (adaptor: string) => {
  const pkg = adaptor.replace(/@[^@/]*$/, "");
  return `${pkg.replace(/^@openfn\/language-/, "")} adaptor`;
};
