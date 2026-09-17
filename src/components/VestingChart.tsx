import { eur0, num } from "../lib/format.ts";
import type { Lang } from "../i18n/index.ts";
import type { ChartPeriod, Projection } from "../lib/rsu.ts";

// The vesting chart: one quarter per bar, the colours are the grants.
//
// By month it was unreadable: thirty-six columns five pixels wide on a phone,
// nine out of ten empty, because a quarterly plan produces at most twelve vests
// in three years. The right granularity is the plan's, not the calendar's — and
// at thirteen columns the bars are wide enough to carry their own value above
// them, which is what you go looking for in a chart like this.
//
// Hand-written SVG: twenty rectangles and two axes, and a charting library
// would weigh more than the rest of the page put together. The colours come
// from the theme variables, so it follows dark mode without knowing it exists.

const COLOURS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const grantColour = (i: number) => COLOURS[i % COLOURS.length];

const W = 720;
const H = 230;
const PAD = { t: 22, r: 6, b: 38, l: 52 };

export default function VestingChart({
  projection,
  grants,
  lang,
  showEuro,
}: {
  projection: Projection;
  grants: { id: string; label: string }[];
  lang: Lang;
  showEuro: boolean;
}) {
  const quarters = projection.quarters;
  if (!quarters.length) return null;

  const valueOf = (q: ChartPeriod) => (showEuro ? q.grossEur : q.units);
  const max = Math.max(...quarters.map(valueOf), 1);
  // The scale rounds up to a readable figure: an axis ending at 11,383 says
  // nothing, one ending at 12,000 reads at a glance.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const ceiling = Math.ceil(max / (step / 2)) * (step / 2);

  const bw = (W - PAD.l - PAD.r) / quarters.length;
  const x = (i: number) => PAD.l + i * bw;
  const y = (v: number) => PAD.t + (1 - v / ceiling) * (H - PAD.t - PAD.b);
  const index = new Map(grants.map((g, i) => [g.id, i]));
  const fmt = (v: number) => (showEuro ? eur0(v, lang) : num(v, lang, 0));

  // A year label under the first quarter of each year, replacing twelve month
  // labels that would not have fitted anyway.
  const firstOfYear = new Set<number>();
  const seen = new Set<number>();
  quarters.forEach((q, i) => {
    if (!seen.has(q.year)) {
      seen.add(q.year);
      firstOfYear.add(i);
    }
  });

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="xMidYMid meet">
      {[0, ceiling / 2, ceiling].map((v) => (
        <g key={v}>
          <line className="axis" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} opacity={v === 0 ? 1 : 0.4} />
          <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}

      {quarters.map((q, i) => {
        let cursor = 0;
        const perUnit = q.units > 0 ? q.grossEur / q.units : 0;
        const total = valueOf(q);
        return (
          <g key={q.from}>
            {q.byGrant.map((seg) => {
              const v = showEuro ? seg.units * perUnit : seg.units;
              const y0 = y(cursor + v);
              const h = Math.max(1.5, y(cursor) - y0);
              cursor += v;
              return (
                <rect
                  key={seg.grant}
                  x={x(i) + bw * 0.16}
                  y={y0}
                  width={bw * 0.68}
                  height={h}
                  rx={2}
                  fill={grantColour(index.get(seg.grant) ?? 0)}
                />
              );
            })}

            {/* The value above the bar: it is the number people look for, and at
                thirteen columns there is finally room to write it. */}
            {total > 0 ? (
              <text className="bar-value" x={x(i) + bw / 2} y={y(total) - 6} textAnchor="middle">
                {fmt(total)}
              </text>
            ) : null}

            {q.units > 0 ? (
              <title>{`${q.year} Q${q.quarter} — ${num(q.units, lang, 2)} — ${eur0(q.grossEur, lang)}`}</title>
            ) : null}

            <text x={x(i) + bw / 2} y={H - PAD.b + 14} textAnchor="middle">
              {`Q${q.quarter}`}
            </text>
            {firstOfYear.has(i) ? (
              <text className="bar-year" x={x(i) + bw / 2} y={H - PAD.b + 28} textAnchor="middle">
                {q.year}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
