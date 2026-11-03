import { adaptorIconUrl } from "../../utils/adaptors";
import type { WorkflowGraph } from "../../types/workflow-graph";
import { NODE_BOX, type Rect, type Viewport } from "./diagramGeometry";

const WIDTH = 200;
const HEIGHT = 150;
// React Flow's minimap node, in theme variables so a dark theme can recolour it.
const MINIMAP_NODE = { fill: "var(--background-color-surface)", stroke: "var(--ui-diagram-minimap-stroke)" };

interface Props {
  graph: WorkflowGraph;
  viewport: Viewport;
  /** The canvas's on-screen size, to draw the visible area. */
  canvasSize: { width: number; height: number };
  /** Centre the canvas on a point (canvas coordinates). */
  onCenter?: (x: number, y: number) => void;
}

/**
 * The bottom-right minimap (xyflow `<MiniMap>` with Lightning's
 * MiniMapNode): every node drawn small, the visible area clear and the rest
 * masked grey. Clicking it centres the canvas there.
 */
export default function DiagramMiniMap({ graph, viewport, canvasSize, onCenter }: Props) {
  const view: Rect = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: canvasSize.width / viewport.zoom,
    height: canvasSize.height / viewport.zoom,
  };
  // getBoundsOfRects(nodes, view)
  let minX = view.x;
  let minY = view.y;
  let maxX = view.x + view.width;
  let maxY = view.y + view.height;
  for (const p of Object.values(graph.positions)) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_BOX);
    maxY = Math.max(maxY, p.y + NODE_BOX);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const scale = Math.max(bw / WIDTH, bh / HEIGHT);
  const viewWidth = scale * WIDTH;
  const viewHeight = scale * HEIGHT;
  const offset = 5 * scale;
  const x = minX - (viewWidth - bw) / 2 - offset;
  const y = minY - (viewHeight - bh) / 2 - offset;
  const w = viewWidth + offset * 2;
  const h = viewHeight + offset * 2;

  return (
    <div
      className="absolute right-4 bottom-4 z-5 border-2 border-subtle bg-surface"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`${x} ${y} ${w} ${h}`}
        className="block cursor-pointer"
        onClick={(e) => {
          if (!onCenter) return;
          const r = e.currentTarget.getBoundingClientRect();
          onCenter(x + ((e.clientX - r.left) / r.width) * w, y + ((e.clientY - r.top) / r.height) * h);
        }}
      >
        {graph.triggers.map((t) => {
          const p = graph.positions[t.id];
          if (!p) return null;
          return (
            <g key={t.id}>
              <circle cx={p.x + 60} cy={p.y + 60} r={60} strokeWidth={8} style={MINIMAP_NODE} />
              <foreignObject x={p.x + 30} y={p.y + 30} width={60} height={60}>
                <span className={`${t.type === "cron" ? "hero-clock" : "hero-globe-alt"} block h-full w-full text-muted`} />
              </foreignObject>
            </g>
          );
        })}
        {graph.jobs.map((j) => {
          const p = graph.positions[j.id];
          if (!p) return null;
          const icon = adaptorIconUrl(j.adaptor);
          return (
            <g key={j.id}>
              <rect x={p.x} y={p.y} width={120} height={120} strokeWidth={8} rx={20} style={MINIMAP_NODE} />
              {icon && <image x={p.x + 20} y={p.y + 20} width={80} height={80} href={icon} />}
            </g>
          );
        })}
        <path
          d={`M${x - offset},${y - offset}h${w + offset * 2}v${h + offset * 2}h${-w - offset * 2}z
              M${view.x},${view.y}h${view.width}v${view.height}h${-view.width}z`}
          style={{ fill: "var(--ui-diagram-minimap-mask)" }}
          fillRule="evenodd"
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}
