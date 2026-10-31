import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import IconButton from "../primitives/IconButton";
import { NODE_SIZE, STROKE, nodeShapeStyle, type NodeRunState, EDGE_COLOR, EDGE_COLOR_SELECTED } from "./diagramGeometry";
import Tooltip from "../primitives/Tooltip";
import { NODE_RUN_ICON } from "../../theme/runStateColours";

const RUN_ICONS: Record<string, string> = {
  running: "hero-arrow-path-solid animate-spin",
  success: "hero-check-circle-solid",
  fail: "hero-x-circle-solid",
  crash: "hero-x-circle-solid",
};

interface Props {
  id: string;
  shape: "circle" | "rect";
  label: string;
  sublabel?: string;
  /** Drawn inside the shape: an adaptor icon or a trigger glyph. */
  icon: ReactNode;
  /** Small icon in the top-left corner (the lock on an authenticated webhook). */
  secondaryIcon?: ReactNode;
  selected?: boolean;
  /** Disabled triggers draw at half opacity (styles.ts styleNode). */
  disabled?: boolean;
  runState?: NodeRunState;
  /** When a run is shown, nodes it didn't reach fade to 30%. */
  didRun?: boolean;
  /** Duration (jobs) or start time (trigger) shown to the right while viewing a run. */
  runMeta?: string | undefined;
  /** Who started the run, shown as a play badge on the start node. */
  startedBy?: string | undefined;
  /** Shows the "+" path button under the node on hover (jobs only). */
  onAddPath?: (() => void) | undefined;
  /** Picks it; `keyboard` when picked with Enter or Space. Without one it isn't a button (the read-only preview). */
  onClick?: ((how?: { keyboard: boolean }) => void) | undefined;
}

/**
 * A node on the canvas (workflow-diagram/nodes/Node.tsx): a 100px rounded
 * square (job) or circle (trigger) with its icon, the name and sublabel to
 * the right, and run state badges when a run is selected.
 */
export default function DiagramNode({
  id,
  shape,
  label,
  sublabel,
  icon,
  secondaryIcon,
  selected = false,
  disabled = false,
  runState = null,
  didRun = true,
  runMeta,
  startedBy,
  onAddPath,
  onClick,
}: Props) {
  const style = nodeShapeStyle(selected, runState);
  const run = runState ? RUN_ICONS[runState] : null;
  const runningHint = runState === "running" ? "Step is running" : undefined;
  const startedHint = startedBy && `Started by ${startedBy}`;
  return (
    <div
      className={cn("group", didRun ? "opacity-100" : "opacity-30")}
      style={disabled ? { opacity: 0.5 } : undefined}
      data-id={id}
      data-testid={shape === "circle" ? `trigger-node-${id}` : `job-node-${id}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Focusable and picked with Enter or Space, as React Flow's nodes are in Lightning. */}
      <div
        role={onClick && "button"}
        tabIndex={onClick && 0}
        className="flex cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onClick?.({ keyboard: true });
        }}
      >
        <div className="relative">
          {run && shape === "rect" && (
            <Tooltip content={runningHint}>
              <div className="absolute -left-2 -top-2 pointer-events-auto z-10" role={runningHint && "img"} aria-label={runningHint}>
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 w-6 h-6 ml-1 mt-1 bg-surface rounded-full" />
                  <div className={cn("relative flex justify-center items-center w-8 h-8 rounded-full", runState && NODE_RUN_ICON[runState])}>
                    <span className={cn(run, "w-full h-full")} />
                  </div>
                </div>
              </div>
            </Tooltip>
          )}
          {startedBy && (
            <Tooltip content={startedHint}>
              <div
                role="img"
                aria-label={startedHint}
                className="absolute -top-2 flex gap-2 items-center z-10"
                style={{ left: "calc(100% - 24px)" }}
              >
                <div className="flex justify-center items-center w-7 h-7 rounded-full text-inverse bg-inverse">
                  <span className="hero-play-solid w-3 h-3" />
                </div>
              </div>
            </Tooltip>
          )}
          {runMeta && (
            <div className="absolute top-2 ml-2 flex gap-2 items-center text-nowrap font-mono" style={{ left: "calc(100% + 6px)" }}>
              {runMeta}
            </div>
          )}
          <svg width={NODE_SIZE + STROKE * 2} height={NODE_SIZE + STROKE * 2} style={{ overflow: "visible" }}>
            {shape === "circle" ? (
              <ellipse
                cx={STROKE + NODE_SIZE / 2}
                cy={STROKE + NODE_SIZE / 2}
                rx={NODE_SIZE / 2}
                ry={NODE_SIZE / 2}
                strokeWidth={STROKE}
                style={style}
              />
            ) : (
              <rect x={STROKE} y={STROKE} rx={16} width={NODE_SIZE} height={NODE_SIZE} strokeWidth={STROKE} style={style} />
            )}
          </svg>
          <div
            style={{
              position: "absolute",
              left: 0.175 * NODE_SIZE + STROKE,
              top: 0.175 * NODE_SIZE + STROKE,
              height: 0.65 * NODE_SIZE,
              width: 0.65 * NODE_SIZE,
              color: selected ? EDGE_COLOR_SELECTED : EDGE_COLOR,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
          {secondaryIcon && (
            <div
              style={{
                position: "absolute",
                left: "2%",
                top: "2%",
                height: 0.3 * NODE_SIZE,
                width: 0.3 * NODE_SIZE,
                color: selected ? EDGE_COLOR_SELECTED : EDGE_COLOR,
              }}
            >
              {secondaryIcon}
            </div>
          )}
        </div>
        {/* eslint-disable-next-line no-restricted-syntax -- diagram geometry: the label is placed against the node */}
        <div className="flex flex-col mt-8 absolute left-[116px] top-0 pointer-events-none min-w-[275px]">
          {/* eslint-disable-next-line no-restricted-syntax -- diagram geometry: the label is placed against the node */}
          <p className="line-clamp-2 text-base max-w-[220px] text-ellipsis overflow-hidden">{label}</p>
          {/* eslint-disable-next-line no-restricted-syntax -- diagram geometry sets its own type */}
          {sublabel && <p className="line-clamp-2 text-sm text-muted">{sublabel}</p>}
        </div>
      </div>
      {onAddPath && (
        <div
          style={{ width: NODE_SIZE, marginLeft: 2, marginTop: -18, justifyContent: "center" }}
          className="pointer-events-none relative z-10 flex items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
        >
          <IconButton
            variant="primary"
            size="xs"
            icon={<span className="hero-plus pointer-events-none h-4 w-4" aria-hidden="true" />}
            label="Add a path to a new step"
            // eslint-disable-next-line local/primitive-classname -- debt: F529 state, F525 margin, F526 box (pointer-events-auto ml-1 rounded-lg)
            className="pointer-events-auto ml-1 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onAddPath();
            }}
          />
        </div>
      )}
    </div>
  );
}
