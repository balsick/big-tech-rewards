import { useState } from "react";
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
  emptyLabel,
}: {
  projection: Projection;
  grants: { id: string; label: string }[];
  lang: Lang;
  showEuro: boolean;
  emptyLabel: string;
}) {
  const quarters = projection.quarters;
  // Hovering tells you what a bar is made of. The value written above it is the
  // total; the split between grants is the reason the bar has colours at all,
  // and until now the only way to read it was to count pixels.
  const [hovered, setHovered] = useState<number | null>(null);

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

  const active = hovered !== null ? quarters[hovered] : null;
  // The read-out goes to the corner **opposite** the column being pointed at,
  // rather than following it. Following looked obvious and covered the very bar
  // it was describing; two fixed corners never do, and the eye finds a panel
  // that stays put faster than one that slides under the cursor.
  const tipOnRight = hovered !== null && hovered < quarters.length / 2;

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        preserveAspectRatio="xMidYMid meet"
        // The column is worked out from the pointer's x rather than from a
        // listener per bar. One handler instead of thirteen, it keeps up when
        // the mouse moves fast, and it does not depend on enter/leave firing on
        // an SVG child — which is exactly where per-rect listeners let go.
        onMouseMove={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect();
          if (!r.width) return;
          // `width: 100%` with a matching aspect ratio means the viewBox maps
          // linearly onto the rendered box, so one multiplication is enough.
          const vbX = ((ev.clientX - r.left) / r.width) * W;
          const i = Math.floor((vbX - PAD.l) / bw);
          setHovered(i >= 0 && i < quarters.length ? i : null);
        }}
        onMouseLeave={() => setHovered(null)}
      >
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
          const dimmed = hovered !== null && hovered !== i;
          return (
            <g key={q.from} opacity={dimmed ? 0.4 : 1} style={{ transition: "opacity 150ms ease" }}>
              {/* The band marks the whole column, so an empty quarter reacts
                  too: "nothing arrives here" is an answer worth hovering for. */}
              {hovered === i ? (
                <rect
                  x={x(i)}
                  y={PAD.t - 14}
                  width={bw}
                  height={H - PAD.t - PAD.b + 14}
                  rx={4}
                  fill="var(--surface-2)"
                />
              ) : null}

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

        {/* These carry the <title>, which is what a screen reader reads, and
            they also make a thin bar — or an empty quarter — as easy to point
            at as a tall one. */}
        {quarters.map((q, i) => (
          <rect
            key={`hit-${q.from}`}
            x={x(i)}
            y={PAD.t - 14}
            width={bw}
            height={H - PAD.t - PAD.b + 14}
            fill="transparent"
          >
            <title>
              {q.units > 0
                ? `${q.year} Q${q.quarter} — ${num(q.units, lang, 2)} — ${eur0(q.grossEur, lang)}`
                : `${q.year} Q${q.quarter} — ${emptyLabel}`}
            </title>
          </rect>
        ))}
      </svg>

      {active ? (
        <div className={`chart-tip ${tipOnRight ? "at-right" : "at-left"}`} aria-hidden>
          <strong>{`${active.year} Q${active.quarter}`}</strong>
          {active.units > 0 ? (
            <>
              {active.byGrant.map((seg) => {
                const g = grants.find((x2) => x2.id === seg.grant);
                const perUnit = active.units > 0 ? active.grossEur / active.units : 0;
                return (
                  <div key={seg.grant} className="tip-row">
                    <span className="dot" style={{ background: grantColour(index.get(seg.grant) ?? 0) }} />
                    <span className="tip-name">{g?.label}</span>
                    <span className="tnum">
                      {showEuro ? eur0(seg.units * perUnit, lang) : num(seg.units, lang, 2)}
                    </span>
                  </div>
                );
              })}
              {active.byGrant.length > 1 ? (
                <div className="tip-row tip-total">
                  <span className="tip-name">{fmt(valueOf(active))}</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="tip-row tip-empty">{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
