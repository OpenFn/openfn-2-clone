import { edgeConditionOptions } from "../../constants";
import type { EdgeConditionType, Position } from "../../types/workflow-graph";
import {
  EDGE_COLOR,
  EDGE_COLOR_SELECTED,
  bezierPath,
  conditionGlyph,
  edgeColor,
  edgeEndpoints,
} from "./diagramGeometry";

interface Props {
  id: string;
  source: Position;
  target: Position;
  conditionType: EdgeConditionType;
  conditionLabel?: string | null;
  enabled?: boolean;
  selected?: boolean;
  /** While viewing a run: the path wasn't taken. */
  didntRun?: boolean;
  /** Picks it; `keyboard` when picked with Enter or Space. Without one it isn't a button (the read-only preview). */
  onClick?: ((how?: { keyboard: boolean }) => void) | undefined;
}

/**
 * A path between two nodes (workflow-diagram/edges/Edge.tsx + styles.ts):
 * a bezier with a closed arrow, dashed when disabled, and the round
 * condition badge (✓, X, ∞ or { }) at its midpoint, with the condition
 * label alongside when there is one. Rendered in canvas coordinates.
 */
export default function DiagramEdge({
  id,
  source,
  target,
  conditionType,
  conditionLabel,
  enabled = true,
  selected = false,
  didntRun = false,
  onClick,
}: Props) {
  const { sx, sy, tx, ty } = edgeEndpoints(source, target);
  const path = bezierPath(sx, sy, tx, ty);
  const color = edgeColor({ selected, enabled, didntRun });
  const stroke = selected ? EDGE_COLOR_SELECTED : EDGE_COLOR;
  const markerId = `arrow-${id}`;
  const label =
    conditionLabel && conditionLabel.length > 22 ? conditionLabel.slice(0, 22) + "..." : conditionLabel;

  const conditionName = edgeConditionOptions.find(([, value]) => value === conditionType)?.[0];

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <>
      <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} style={{ zIndex: selected ? 2 : 0 }}>
        <defs>
          <marker
            id={markerId}
            markerWidth={15}
            markerHeight={32}
            viewBox="-10 -10 20 20"
            markerUnits="strokeWidth"
            orient="auto-start-reverse"
            refX={0}
            refY={0}
          >
            <polyline
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              points="-5,-4 0,0 -5,4 -5,-4"
              style={{ stroke, fill: stroke }}
            />
          </marker>
        </defs>
        <path
          d={path}
          fill="none"
          style={{ stroke }}
          strokeWidth={2}
          strokeDasharray={enabled ? undefined : "6, 6"}
          opacity={enabled ? (didntRun ? 0.3 : 1) : 0.5}
          markerEnd={`url(#${markerId})`}
        />
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="cursor-pointer"
          style={{ pointerEvents: "stroke" }}
          onClick={handle}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(-50%, -50%) translate(${(sx + tx) / 2}px,${(sy + ty) / 2}px)`,
          zIndex: selected ? 3 : 1,
          borderColor: color,
          color,
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          opacity: enabled ? 1 : 0.9,
        }}
        role={onClick && "button"}
        tabIndex={onClick && 0}
        aria-label={`${conditionName} path${conditionLabel ? `: ${conditionLabel}` : ""}`}
        className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        onClick={handle}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onClick?.({ keyboard: true });
        }}
        onPointerDown={(e) => e.stopPropagation()}
        data-testid={`edge-label-${id}`}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            display: "flex",
            height: 46,
            width: 46,
            borderStyle: "solid",
            borderWidth: 2,
            borderRadius: "100%",
            borderColor: "inherit",
            backgroundColor: "var(--background-color-surface)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {conditionGlyph(conditionType)}
        </span>
        {label && (
          <span
            style={{
              borderStyle: "solid",
              borderWidth: 2,
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
              borderColor: "inherit",
              backgroundColor: "var(--background-color-surface)",
              padding: "2px 6px",
              paddingLeft: 8,
              marginLeft: -11,
              height: 34,
              borderLeft: "solid 2px var(--background-color-surface)",
              whiteSpace: "nowrap",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
            }}
          >
            {label}
          </span>
        )}
      </div>
    </>
  );
}
