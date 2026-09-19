import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Segmented } from "./ui.tsx";
import { ArrowDownToLine } from "./Icons.tsx";
import { eur0, monthShort, num, todayISO, usd } from "../lib/format.ts";
import { ESPP_PLAN, defaultWindow, enrolmentDates } from "../lib/espp.ts";
import { VESTING_CALENDAR, project, type Grant } from "../lib/rsu.ts";
import { buildCalendar, type CalendarMonth } from "../lib/calendar.ts";
import { dividends, fmvAt, historyAt, loadQuote, type Quote } from "../lib/prices.ts";

// The month-by-month view.
//
// Everything on screen comes from the same shared model the other tabs edit,
// so this is a third way of reading one description of your pay rather than a
// fourth set of assumptions. The row is the unit: a month, what happens in it,
// what reaches the bank, and what reaches the brokerage account — the last two
// kept in separate columns because they are separate accounts, and adding them
// would say the month you buy is a bad month when it is the month you were
// paid the most.

export default function CalendarTool() {
  const {
    t,
    lang,
    regime,
    salary,
    esppPct,
    esppPurchase,
    esppEnrolled,
    grants,
    performance,
    horizonYears,
  } = useStore();
  const today = todayISO();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [months, setMonths] = useState<12 | 24 | 36>(12);

  useEffect(() => {
    let alive = true;
    loadQuote().then((q) => alive && q && setQuote(q));
    return () => {
      alive = false;
    };
  }, []);

  const latest = historyAt(today);
  const price = quote?.close ?? latest?.close ?? 0;
  const fx = quote?.eurusd ?? latest?.eurusd ?? 1;

  const resolved = useMemo<Grant[]>(
    () => grants.map((g) => ({ ...g, priceAtGrant: g.typedPrice ?? fmvAt(g.date, quote)?.price ?? price })),
    [grants, quote, price]
  );

  const projection = useMemo(
    () =>
      project(
        { grants: resolved, price, fxRate: fx, salary, today, horizonYears, calendar: VESTING_CALENDAR, performance, dividends },
        regime
      ),
    [resolved, price, fx, salary, today, horizonYears, regime, performance]
  );

  // The same two answers the ESPP tab is showing: which window, and when you
  // joined — the lookback reaches back to the enrolment, and reading it from
  // anywhere else would put two different prices in two tabs.
  const chosen = useMemo(() => {
    const d = defaultWindow(today, ESPP_PLAN);
    return esppPurchase && esppPurchase !== d.purchase
      ? { start: enrolmentDates(d.start, ESPP_PLAN, 1)[0], purchase: esppPurchase, closed: false }
      : d;
  }, [today, esppPurchase]);
  const enrolmentStart = esppEnrolled && esppEnrolled <= chosen.start ? esppEnrolled : chosen.start;
  const startPrice = historyAt(enrolmentStart)?.close ?? price;

  const calendar = useMemo(
    () =>
      buildCalendar({
        salary,
        today,
        months,
        espp: esppPct > 0 ? { pct: esppPct, plan: ESPP_PLAN, priceAtStart: startPrice } : null,
        projection,
        price,
        fxRate: fx,
        regime,
      }),
    [salary, today, months, esppPct, startPrice, projection, price, fx, regime]
  );

  const ordinary = calendar.ordinaryNet;
  const widest = Math.max(...calendar.months.map((m) => m.net), 1);
  const bar = (m: CalendarMonth) => Math.max(3, Math.round((Math.max(0, m.net) / widest) * 132));

  const label = (m: CalendarMonth) => `${monthShort(m.ym, lang)} ${String(m.year).slice(2)}`;

  /** The pills that say what this month is. */
  const what = (m: CalendarMonth) => {
    const out: { key: string; text: string; tone: "flat" | "blue" | "bad" | "warn" }[] = [];
    // The legend names four things by colour; a pill the legend promises in
    // blue has to BE blue. The contribution one was falling through to the
    // neutral branch, so the legend swatch and the pill disagreed.
    if (m.esppTax > 0.5) out.push({ key: "tax", text: t.calendar.esppTax(`−${eur0(m.esppTax, lang)}`), tone: "bad" });
    if (m.esppContribution > 0.5)
      out.push({
        key: "contrib",
        text: m.esppTax > 0.5
          ? t.calendar.esppRestart(`−${eur0(m.esppContribution, lang)}`)
          : t.calendar.contribution(`−${eur0(m.esppContribution, lang)}`),
        tone: "blue",
      });
    if (m.rsuSettlement > 0.5)
      out.push({ key: "settle", text: t.calendar.settlement(`−${eur0(m.rsuSettlement, lang)}`), tone: "bad" });
    if (m.rsuSettlement < -0.5)
      out.push({ key: "back", text: t.calendar.settlementBack(`+${eur0(-m.rsuSettlement, lang)}`), tone: "flat" });
    if (m.payslips > 1) out.push({ key: "extra", text: t.calendar.extraPay, tone: "warn" });
    return out;
  };

  const tone = (k: "flat" | "blue" | "bad" | "warn") =>
    k === "bad"
      ? { color: "var(--bad)", background: "var(--bad-soft)" }
      : k === "warn"
        ? { color: "var(--warn)", background: "var(--warn-soft)" }
        : { color: "var(--text)", background: "var(--surface-2)" };

  /**
   * The dot the legend matches on.
   *
   * The tax and extra-pay pills carry their colour as a tint, so the legend's
   * swatch and the pill agree on sight. The contribution pill is deliberately
   * neutral — six months out of six it would be a wall of blue — so it carries
   * the colour as a dot instead, which is exactly the shape the legend uses.
   */
  const dotOf = (k: "flat" | "blue" | "bad" | "warn") =>
    k === "blue" ? "var(--chart-2)" : null;

  if (!(salary > 0) || !calendar.months.length) {
    return (
      <div className="tool">
        <Card>
          <p className="note">{t.calendar.empty}</p>
        </Card>
      </div>
    );
  }


  return (
    <div className="tool wide">
      <div className="results">
        <div className="detail">
          <Card>
            <div className="row-inline" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>{t.calendar.title}</h2>
              <Segmented<"12" | "24" | "36">
                label={t.calendar.horizon}
                value={String(months) as "12" | "24" | "36"}
                onChange={(v) => setMonths(Number(v) as 12 | 24 | 36)}
                options={[
                  { id: "12", label: t.calendar.monthCount(12) },
                  { id: "24", label: t.calendar.monthCount(24) },
                  { id: "36", label: t.calendar.monthCount(36) },
                ]}
              />
            </div>

            {/* The two-ledger idea is the one thing worth saying before the
                table; the headline figures above it were restating what the
                rows already show, one row at a time and better. */}
            <p className="note" style={{ marginTop: 0, marginBottom: 14 }}>
              {t.calendar.intro}
            </p>
            {esppPct > 0 ? null : (
              <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
                {t.calendar.noEspp}
              </p>
            )}

            <div className="scroll-x">
              <table className="tbl cal">
                <thead>
                  <tr>
                    <th>{t.calendar.colMonth}</th>
                    <th>{t.calendar.colWhat}</th>
                    <th className="r">{t.calendar.colBank}</th>
                    <th>{t.calendar.colShares}</th>
                  </tr>
                </thead>
                <tbody>
                  {calendar.months.map((m, k) => {
                    const pills = what(m);
                    const shares = m.rsuShares + m.esppShares;
                    return (
                      <tr
                        key={m.ym}
                        className={`${k > 0 && m.year !== calendar.months[k - 1].year ? "year-break" : ""}${
                          shares > 0 ? " has-shares" : ""
                        }`}
                      >
                        <td style={{ fontWeight: 660 }}>{label(m)}</td>
                        <td>
                          {pills.length ? (
                            <span className="pills">
                              {pills.map((p) => (
                                <span key={p.key} className="pill" style={tone(p.tone)}>
                                  {dotOf(p.tone) ? (
                                    <i className="pill-dot" style={{ background: dotOf(p.tone)! }} />
                                  ) : null}
                                  {p.text}
                                </span>
                              ))}
                              {m.vestUnits > 0 ? (
                                <span className="pill-plain">
                                  {t.calendar.vested(num(m.vestUnits, lang, 0), num(m.vestWithheld, lang, 0))}
                                </span>
                              ) : null}
                              {m.esppShares > 0 ? (
                                <span className="pill-plain">{t.calendar.bought(num(m.esppShares, lang, 0))}</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="pill-plain">{t.calendar.ordinary}</span>
                          )}
                        </td>
                        <td className="r">
                          <span className="cal-net">
                            <span className={m.net < ordinary * 0.5 ? "neg" : undefined}>{eur0(m.net, lang)}</span>
                            <span
                              className="cal-bar"
                              style={{
                                width: `${bar(m)}px`,
                                background:
                                  m.net < ordinary * 0.5
                                    ? "var(--bad)"
                                    : m.payslips > 1
                                      ? "var(--warn)"
                                      : m.esppContribution > 0.5
                                        ? "var(--chart-2)"
                                        : "var(--border-strong)",
                              }}
                            />
                          </span>
                        </td>
                        <td>
                          {shares > 0 ? (
                            <span className="cal-shares">
                              <ArrowDownToLine />
                              <span className="cal-shares-t">
                                <strong>{t.calendar.arriving(num(shares, lang, 0))}</strong>
                                <span>
                                  {usd(m.sharesUsd, lang, 0)} · {eur0(m.sharesEur, lang)}
                                </span>
                              </span>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="cal-legend">
              <span>
                <i style={{ background: "var(--chart-2)" }} />
                {t.calendar.legendContribution}
              </span>
              <span>
                <i style={{ background: "var(--bad)" }} />
                {t.calendar.legendTax}
              </span>
              <span>
                <i style={{ background: "var(--warn)" }} />
                {t.calendar.legendExtra}
              </span>
              <span>
                <ArrowDownToLine />
                {t.calendar.legendShares}
              </span>
            </div>

            <p className="hint" style={{ marginTop: 12 }}>
              {t.calendar.timing}
            </p>
            <p className="hint" style={{ marginTop: 8 }}>
              {t.calendar.assumptions}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
