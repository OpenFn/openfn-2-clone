import type { RunDisplayState, StepExitReason } from "../types/history";
import type { WorkOrderDisplayState } from "../types/workflows";

/**
 * Run-state colours. Each state takes a tone, and every place a state is
 * drawn (pill, dot, the text by the dot, step icon, canvas node, health
 * chart) uses that tone's roles, so a state is one colour everywhere
 * (docs/colour.md, Run states).
 */
export type RunTone = "success" | "danger" | "info" | "warning" | "severe" | "neutral";

const STATE_TONE: Record<RunDisplayState, RunTone> = {
  rejected: "danger",
  pending: "neutral",
  running: "info",
  available: "neutral",
  claimed: "info",
  started: "info",
  success: "success",
  failed: "danger",
  crashed: "severe",
  cancelled: "neutral",
  killed: "warning",
  exception: "neutral",
  lost: "neutral",
};

const STEP_TONE: Record<StepExitReason | "pending", RunTone> = {
  pending: "neutral",
  success: "success",
  fail: "danger",
  crash: "severe",
  cancel: "neutral",
  kill: "warning",
  exception: "neutral",
  lost: "neutral",
};

/** Each tone's classes, written out so Tailwind sees them. */
const TONE: Record<RunTone, { pill: string; dot: string; text: string; icon: string }> = {
  success: { pill: "bg-success-badge text-success", dot: "bg-success-strong", text: "text-success-strong", icon: "text-success-icon" },
  danger: { pill: "bg-danger-badge text-danger", dot: "bg-danger-strong", text: "text-danger-strong", icon: "text-danger-icon" },
  info: { pill: "bg-info-badge text-info", dot: "bg-info-strong", text: "text-info-strong", icon: "text-info-icon" },
  warning: { pill: "bg-warning-badge text-warning-strong", dot: "bg-warning-strong", text: "text-warning-strong", icon: "text-warning-icon" },
  severe: { pill: "bg-severe-badge text-severe", dot: "bg-severe-strong", text: "text-severe-strong", icon: "text-severe-icon" },
  neutral: { pill: "bg-sunken text-body", dot: "bg-neutral-strong", text: "text-muted", icon: "text-muted" },
};

const map = <K extends string>(tones: Record<K, RunTone>, part: keyof (typeof TONE)[RunTone]) =>
  Object.fromEntries(Object.entries(tones).map(([k, t]) => [k, TONE[t as RunTone][part]])) as Record<K, string>;

/** A work-order or run state pill. Goes in Pill's `className`. */
export const STATE_PILL = map(STATE_TONE, "pill");
/** The work-order dot. */
export const WORK_ORDER_DOT: Record<WorkOrderDisplayState, string> = map(STATE_TONE, "dot");
/** The work-order state's text, next to the dot. */
export const WORK_ORDER_TEXT: Record<WorkOrderDisplayState, string> = map(STATE_TONE, "text");
/** A step's exit-reason icon. */
export const STEP_ICON = map(STEP_TONE, "icon");
/** The run icon on a canvas node. */
export const NODE_RUN_ICON: Record<string, string> = { running: TONE.info.icon, ...map(STEP_TONE, "icon") };

/** The solid and badge fill of a tone, for `style` (SVG and charts). */
export const toneSolid = (tone: RunTone) => `var(--background-color-${tone}-strong)`;
const toneBadge = (tone: RunTone) => (tone === "neutral" ? "var(--background-color-sunken)" : `var(--background-color-${tone}-badge)`);

/** A canvas node's stroke and fill, keyed by step exit reason or "running". */
const NODE_TONE: Record<string, RunTone> = { running: "info", success: "success", fail: "danger", crash: "severe" };
export const NODE_RUN_BORDER: Record<string, string> = Object.fromEntries(Object.entries(NODE_TONE).map(([k, t]) => [k, toneSolid(t)]));
export const NODE_RUN_FILL: Record<string, string> = Object.fromEntries(Object.entries(NODE_TONE).map(([k, t]) => [k, toneBadge(t)]));

/** A state's tone, for charts. */
export const stateTone = (state: RunDisplayState) => STATE_TONE[state];
