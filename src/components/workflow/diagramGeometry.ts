import type { EdgeConditionType, Position, WorkflowGraph } from "../../types/workflow-graph";
import { NODE_RUN_BORDER, NODE_RUN_FILL } from "../../theme/runStateColours";

/**
 * Geometry shared by the hand-rolled diagram (Lightning draws it with
 * @xyflow/react; these numbers come from workflow-diagram/styles.ts and
 * constants.ts so the canvas lines up with Lightning's).
 */

/** nodeIconStyles(): a 100px shape drawn with a 2px stroke. */
export const NODE_SIZE = 100;
export const STROKE = 2;
/** The node's DOM box (the svg is capped at 110px). */
export const NODE_BOX = 110;
/** Handles sit on the shape's centre line: strokeWidth + anchorx. */
export const ANCHOR_X = STROKE + NODE_SIZE / 2;

export const FIT_PADDING = 0.3;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 1;

// Every canvas colour is a theme variable (src/theme/theme.css holds
// Lightning's hex values from workflow-diagram/styles.ts), so a theme can
// recolour the canvas. Use them in `style`, not SVG presentation attributes.
export const EDGE_COLOR = "var(--ui-diagram-edge)";
export const EDGE_COLOR_DISABLED = "var(--ui-diagram-edge-disabled)";
export const EDGE_COLOR_DIDNT_RUN = "var(--ui-diagram-edge-didnt-run)";
export const EDGE_COLOR_SELECTED = "var(--ui-diagram-selected)";
export const EDGE_COLOR_SELECTED_DISABLED = "var(--ui-diagram-selected-disabled)";
// eslint-disable-next-line no-restricted-syntax -- Lightning's error colour (workflow-diagram/styles.ts), kept for parity
export const ERROR_COLOR = "#ef4444";

export type NodeRunState = "success" | "fail" | "crash" | "running" | null;

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function graphBounds(graph: WorkflowGraph): Rect | null {
  const points = Object.values(graph.positions);
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) + NODE_BOX - x, height: Math.max(...ys) + NODE_BOX - y };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** xyflow's getViewportForBounds: centre the bounds with `padding` around them. */
export function fitViewport(bounds: Rect, width: number, height: number, padding = FIT_PADDING): Viewport {
  const zoom = clampZoom(Math.min(width / (bounds.width * (1 + padding)), height / (bounds.height * (1 + padding))));
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom, zoom };
}

/** Bottom-centre of the source shape to top-centre of the target. */
export function edgeEndpoints(source: Position, target: Position) {
  return {
    sx: source.x + ANCHOR_X,
    sy: source.y + NODE_SIZE + STROKE,
    tx: target.x + ANCHOR_X,
    ty: target.y,
  };
}

/** xyflow's getBezierPath for a bottom → top connection. */
export function bezierPath(sx: number, sy: number, tx: number, ty: number, curvature = 0.4): string {
  const distance = ty - sy;
  const offset = distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);
  return `M${sx},${sy} C${sx},${sy + offset} ${tx},${ty - offset} ${tx},${ty}`;
}

/** The glyph in an edge's condition badge (from-workflow.tsx getEdgeLabel). */
export function conditionGlyph(type: EdgeConditionType): string {
  switch (type) {
    case "on_job_success":
      return "✓";
    case "on_job_failure":
      return "X";
    case "always":
      return "∞";
    default:
      return "{ }";
  }
}

/** styles.ts edgeLabelStyles' primaryColor. Lightning's highlight of the selected node's paths is switched off (update-selection.ts), so there is none here. */
export function edgeColor({
  selected,
  enabled,
  didntRun,
}: {
  selected?: boolean;
  enabled: boolean;
  didntRun?: boolean;
}): string {
  if (enabled) {
    if (selected) return EDGE_COLOR_SELECTED;
    if (didntRun) return EDGE_COLOR_DIDNT_RUN;
    return EDGE_COLOR;
  }
  return selected ? EDGE_COLOR_SELECTED_DISABLED : EDGE_COLOR_DISABLED;
}

/** styles.ts nodeIconStyles: stroke and fill for a node shape. */
export function nodeShapeStyle(selected: boolean, runState: NodeRunState) {
  return {
    stroke: selected ? EDGE_COLOR_SELECTED : runState ? NODE_RUN_BORDER[runState] : EDGE_COLOR,
    fill: runState ? NODE_RUN_FILL[runState] : "var(--background-color-surface)",
  };
}
