import { formatNumber } from "../../../utils/format";
import { Link } from "../../../routing/router";
import TextLink from "../../primitives/TextLink";
import { DOT, EMPTY, FRAME, LEGEND, percent } from "./palette";
import Text from "../../primitives/Text";
import { Row } from "../../primitives/Stack";

export interface Slice {
  key: string;
  label: string;
  color: string;
  value: number;
  /** Where the work orders this slice counts can be read. */
  href: string;
}

const SIZE = 220;
const C = SIZE / 2;
const OUTER = 80;
const INNER = 60;

/** A point on a circle, counter-clockwise from 3 o'clock (Recharts' default). */
const at = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.cos(rad), C - r * Math.sin(rad)] as const;
};

const arc = (from: number, to: number) => {
  const large = to - from > 180 ? 1 : 0;
  const [ox0, oy0] = at(OUTER, from);
  const [ox1, oy1] = at(OUTER, to);
  const [ix1, iy1] = at(INNER, to);
  const [ix0, iy0] = at(INNER, from);
  return `M ${ox0} ${oy0} A ${OUTER} ${OUTER} 0 ${large} 0 ${ox1} ${oy1} L ${ix1} ${iy1} A ${INNER} ${INNER} 0 ${large} 1 ${ix0} ${iy0} Z`;
};

/**
 * A part-to-whole ring with a headline figure in the middle and an always-on
 * legend (assets/js/health/charts/Donut.tsx). Drawn as plain SVG here in place
 * of Recharts; hovering a wedge shows its count and share. A wedge and its
 * legend row open the work orders it counts.
 */
export default function Donut({
  slices,
  emptyMessage,
  centre,
}: {
  slices: Slice[];
  emptyMessage: string;
  centre: (total: number) => { value: string; label: string };
}) {
  const total = slices.reduce((sum, { value }) => sum + value, 0);
  if (total === 0) return <Text as="p" tone="muted" className={EMPTY}>{emptyMessage}</Text>;

  const drawn = slices.filter((s) => s.value > 0);
  const only = drawn.length === 1 ? drawn[0] : undefined;
  let angle = 0;
  const middle = centre(total);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className={`${FRAME} relative`}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden="true">
          {only ? (
            <Link to={only.href} tabIndex={-1}>
              <circle cx={C} cy={C} r={(OUTER + INNER) / 2} fill="none" style={{ stroke: only.color }} strokeWidth={OUTER - INNER} className="cursor-pointer">
                <title>{`${only.label}: ${formatNumber(only.value)} (${percent(only.value, total)})`}</title>
              </circle>
            </Link>
          ) : (
            drawn.map((s) => {
              const from = angle;
              angle += (s.value / total) * 360;
              return (
                <Link key={s.key} to={s.href} tabIndex={-1}>
                  <path d={arc(from, angle)} style={{ fill: s.color, stroke: "var(--background-color-surface)" }} strokeWidth={2} className="cursor-pointer">
                    <title>{`${s.label}: ${formatNumber(s.value)} (${percent(s.value, total)})`}</title>
                  </path>
                </Link>
              );
            })
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <Text variant="stat-md" tone="strong">{middle.value}</Text>
          <Text variant="body-sm" tone="muted">{middle.label}</Text>
        </div>
      </div>
      <Text as="ul" tone="body" className={LEGEND}>
        {slices.map(({ key, label, color, value, href }) => (
          <li key={key}>
            <TextLink to={href} variant="plain" className="block">
              <Row as="span" gap="sm">
                <span aria-hidden="true" className={DOT} style={{ backgroundColor: color }} />
                <span className="capitalize">{label}</span>{" "}
                <span className="font-medium tabular-nums text-strong">{formatNumber(value)}</span>{" "}
                <span className="sr-only">({percent(value, total)})</span>
              </Row>
            </TextLink>
          </li>
        ))}
      </Text>
    </div>
  );
}
