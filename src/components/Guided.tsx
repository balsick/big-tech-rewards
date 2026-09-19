import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Answer, Card, Line, NumField } from "./ui.tsx";
import { Close } from "./Icons.tsx";
import { dateShort, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import { ESPP_PLAN, defaultWindow, expectedContribution, simulateEspp } from "../lib/espp.ts";
import { VESTING_CALENDAR, grantUnits, project, type Grant } from "../lib/rsu.ts";
import { dividends, historyAt, loadQuote, type Quote } from "../lib/prices.ts";
import { markSeen, type Seed } from "../lib/guided.ts";
import { DEFAULT_SALARY } from "../lib/meta.ts";

// The guided mode: two or three questions, then the answer.
//
// The tools ask for everything because everything is changeable; someone
// arriving for the first time does not know which of the two answers their
// question, let alone what a lookback is. This asks the fewest things that
// cannot be guessed — the percentage, the grant values, the salary — fills the
// rest from the plan and the market, and shows the result.
//
// What it must not do is become a second calculator. Every number below comes
// from the same engines the tools use, and the answers travel into the tool at
// the end, so the walkthrough is a way in rather than a place to stay.

type Where =
  | { at: "choose" }
  | { at: "espp"; step: 0 | 1 }
  | { at: "rsu"; step: 0 | 1 | 2 }
  | { at: "result"; tool: "espp" | "rsu" };

/** A drawn illustration per tool: the lookback, and quarterly vesting. */
const ArtEspp = () => (
  <svg width="196" height="86" viewBox="0 0 196 86" fill="none" aria-hidden focusable="false">
    <line x1="10" y1="74" x2="186" y2="74" stroke="var(--border-strong)" strokeWidth="1" />
    <path d="M22 56 L 96 44 L 170 20" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 5" />
    <circle cx="22" cy="56" r="5" fill="var(--border-strong)" />
    <circle cx="170" cy="20" r="5" fill="var(--border-strong)" />
    <path d="M22 56 L 170 56" stroke="var(--chart-1)" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="170" cy="56" r="6.5" fill="var(--chart-1)" />
    <rect x="104" y="30" width="60" height="20" rx="6" fill="var(--accent-soft)" />
    <text x="134" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--accent-ink)">
      &#8722;15%
    </text>
  </svg>
);

const ArtRsu = () => (
  <svg width="196" height="86" viewBox="0 0 196 86" fill="none" aria-hidden focusable="false">
    <line x1="10" y1="74" x2="186" y2="74" stroke="var(--border-strong)" strokeWidth="1" />
    {[
      [20, 30, 16, 44, "var(--chart-1)"],
      [42, 60, 16, 14, "var(--chart-2)"],
      [64, 60, 16, 14, "var(--chart-2)"],
      [86, 60, 16, 14, "var(--chart-2)"],
      [108, 30, 16, 44, "var(--chart-1)"],
      [130, 60, 16, 14, "var(--chart-2)"],
      [152, 60, 16, 14, "var(--chart-2)"],
      [174, 60, 12, 14, "var(--chart-2)"],
    ].map(([x, y, w, h, fill], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill={fill as string} />
    ))}
  </svg>
);

/** The sliders icon of "full mode": every control, all at once. */
const Controls = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden focusable="false">
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="2.2" fill="var(--surface)" />
    <circle cx="15" cy="12" r="2.2" fill="var(--surface)" />
    <circle cx="8" cy="17" r="2.2" fill="var(--surface)" />
  </svg>
);

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <path d="M5 12h13M12 5l7 7-7 7" />
  </svg>
);

function Dots({ n, at }: { n: number; at: number }) {
  return (
    <div className="guida-punti" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={i === at ? "on" : undefined} />
      ))}
    </div>
  );
}

export default function Guided({
  open,
  onClose,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  /** hands the answers to the tool and switches to it */
  onFinish: (seed: Seed) => void;
}) {
  const { t, lang, regime } = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const [where, setWhere] = useState<Where>({ at: "choose" });

  const [percent, setPercent] = useState(15);
  const [salary, setSalary] = useState(DEFAULT_SALARY);
  const [welcomeUsd, setWelcomeUsd] = useState(20000);
  const [bonusUsd, setBonusUsd] = useState(10000);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    let alive = true;
    loadQuote().then((q) => alive && q && setQuote(q));
    return () => {
      alive = false;
    };
  }, []);

  // A real <dialog> rather than a div with a high z-index: it brings the top
  // layer, the focus trap and Escape with it, and all three are things that get
  // written badly by hand.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      markSeen();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const window_ = useMemo(() => defaultWindow(today, ESPP_PLAN), [today]);

  // The prices the walkthrough never asks for: the close stored in the sources
  // at the start of the period, and the latest one for purchase day.
  const historyStart = historyAt(window_.start);
  const startPrice = historyStart?.close ?? quote?.close ?? 0;
  const endPrice = quote?.close ?? historyAt(window_.purchase)?.close ?? 0;
  const fx = quote?.eurusd ?? historyAt(window_.purchase)?.eurusd ?? 0;

  const contributed = expectedContribution(salary, percent, ESPP_PLAN.months);
  const espp = useMemo(
    () =>
      startPrice > 0 && endPrice > 0 && fx > 0 && contributed > 0
        ? simulateEspp(
            { salary, contributed, priceAtStart: startPrice, priceAtPurchase: endPrice, fxRate: fx, plan: ESPP_PLAN },
            regime
          )
        : null,
    [salary, contributed, startPrice, endPrice, fx, regime]
  );

  const welcomeDate = `${year}-02-20`;
  const bonusDate = `${year}-11-20`;
  const priceAt = (date: string) => (date <= today ? (historyAt(date)?.close ?? quote?.close ?? 0) : (quote?.close ?? 0));

  const grants: Grant[] = useMemo(
    () => [
      {
        id: "w",
        label: "Welcome grant",
        date: welcomeDate,
        valueUsd: welcomeUsd,
        priceAtGrant: priceAt(welcomeDate),
        schedule: "30-30-40",
        years: 3,
        usePlanDates: false,
      },
      {
        id: "b",
        label: `Bonus ${year}`,
        date: bonusDate,
        valueUsd: bonusUsd,
        priceAtGrant: priceAt(bonusDate),
        schedule: "quarterly",
        years: 3,
        usePlanDates: true,
      },
    ],
    // eslint-disable-next-line
    [welcomeUsd, bonusUsd, quote?.close, welcomeDate, bonusDate]
  );

  const rsu = useMemo(
    () =>
      endPrice > 0 && fx > 0
        ? project({ grants, price: endPrice, fxRate: fx, salary, today, horizonYears: 3, calendar: VESTING_CALENDAR, dividends }, regime)
        : null,
    [grants, endPrice, fx, salary, today, regime]
  );

  // Only the quarters something actually vests in. An empty quarter is
  // information in the chart — it is the shape of the plan — but in a table
  // answering "when do shares arrive" a row of zeroes says nothing the gap in
  // the dates does not already say.
  const vesting = useMemo(() => (rsu ? rsu.quarters.filter((q) => q.units > 0) : []), [rsu]);

  const leave = () => {
    markSeen();
    onClose();
  };

  // ------------------------------------------------------------- the frame

  const head = (label: string) => (
    <div className="guida-testa">
      <span className="guida-passo">{label}</span>
      <span style={{ flexGrow: 1 }} />
      <button type="button" className="btn link guida-esci" onClick={leave}>
        <Close size={12} />
        <span className="guida-esci-lungo">{t.guided.exit}</span>
        <span className="guida-esci-corto">{t.guided.exitShort}</span>
      </button>
    </div>
  );

  const why = (text: string) => (
    <div className="guida-perche">
      <div>
        <div className="guida-perche-t">{t.guided.whyTitle}</div>
        <p className="note" style={{ margin: 0 }}>
          {text}
        </p>
        <p className="hint">{t.common.salaryWhy2}</p>
      </div>
    </div>
  );

  const salaryStep = (tool: "espp" | "rsu", n: number, tot: number, back: Where, next: Where) => (
    <>
      {head(t.guided.step(n, tot, tool.toUpperCase()))}
      <div className="guida-corpo">
        <h2>{t.guided.salaryTitle}</h2>
        <p className="note">{t.guided.salarySub}</p>
        <div style={{ marginTop: 20 }}>
          <NumField lang={lang} label={t.common.salary} suffix="€" dec={0} value={salary} onChange={setSalary} />
        </div>
        {why(t.common.salaryWhy)}
      </div>
      <div className="guida-piede">
        <button type="button" className="btn" onClick={() => setWhere(back)}>
          {t.guided.back}
        </button>
        <span style={{ flexGrow: 1 }} />
        <Dots n={tot} at={n - 1} />
        <button type="button" className="btn primary" onClick={() => setWhere(next)}>
          {t.guided.see}
          <Arrow />
        </button>
      </div>
    </>
  );

  // ------------------------------------------------------------- the steps

  let content: React.ReactNode = null;

  if (where.at === "choose") {
    content = (
      <>
        {head(t.guided.title)}
        <div className="guida-corpo">
          <h2>{t.guided.chooseTitle}</h2>
          <p className="note">{t.guided.chooseSub}</p>
          <div className="guida-scelta">
            <button type="button" onClick={() => setWhere({ at: "espp", step: 0 })}>
              <span className="guida-art">
                <ArtEspp />
              </span>
              <span className="guida-scelta-t">
                {t.espp.title}
                <Arrow />
              </span>
              <span className="guida-scelta-d">{t.guided.esppDesc}</span>
            </button>
            <button type="button" onClick={() => setWhere({ at: "rsu", step: 0 })}>
              <span className="guida-art">
                <ArtRsu />
              </span>
              <span className="guida-scelta-t">
                {t.rsu.title}
                <Arrow />
              </span>
              <span className="guida-scelta-d">{t.guided.rsuDesc}</span>
            </button>
          </div>
        </div>
        {/* The third way out, and it only earns its place on a phone: there the
            sheet is full screen, so nothing of the app shows behind it and the
            × says "close" without saying what is on the other side. */}
        <div className="guida-piede guida-piede-completa">
          <button type="button" className="guida-completa" onClick={leave}>
            <Controls />
            <span>
              <strong>{t.guided.full}</strong>
              <small>{t.guided.fullSub}</small>
            </span>
            <Arrow />
          </button>
        </div>
      </>
    );
  } else if (where.at === "espp" && where.step === 0) {
    content = (
      <>
        {head(t.guided.step(1, 2, "ESPP"))}
        <div className="guida-corpo">
          <h2>{t.guided.pctTitle}</h2>
          <p className="note">{t.guided.pctSub}</p>
          <div className="guida-pct">
            <span className="big">{num(percent, lang, 0)}%</span>
            <span className="hint" style={{ margin: 0 }}>
              {t.espp.contributionHint}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={ESPP_PLAN.maxPct}
            step={1}
            value={percent}
            aria-label={t.espp.contribution}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
          <div className="ticks" aria-hidden>
            <span>1%</span>
            <span>5%</span>
            <span>10%</span>
            <span>15%</span>
          </div>
          <p className="hint" style={{ marginTop: 22 }}>
            {t.guided.esppPrefilled(
              dateShort(window_.start, lang),
              dateShort(window_.purchase, lang),
              usd(ESPP_PLAN.maxUsd, lang, 0)
            )}
          </p>
        </div>
        <div className="guida-piede">
          <button type="button" className="btn" onClick={() => setWhere({ at: "choose" })}>
            {t.guided.back}
          </button>
          <span style={{ flexGrow: 1 }} />
          <Dots n={2} at={0} />
          <button type="button" className="btn primary" onClick={() => setWhere({ at: "espp", step: 1 })}>
            {t.guided.next}
            <Arrow />
          </button>
        </div>
      </>
    );
  } else if (where.at === "espp") {
    content = salaryStep("espp", 2, 2, { at: "espp", step: 0 }, { at: "result", tool: "espp" });
  } else if (where.at === "rsu" && where.step === 0) {
    const u = grantUnits(grants[0]);
    content = (
      <>
        {head(t.guided.step(1, 3, "RSU"))}
        <div className="guida-corpo">
          <h2>{t.guided.welcomeTitle}</h2>
          <p className="note">{t.guided.welcomeSub}</p>
          <div style={{ marginTop: 20 }}>
            <NumField
              lang={lang}
              label={t.guided.welcomeField}
              suffix="$"
              dec={0}
              value={welcomeUsd}
              onChange={setWelcomeUsd}
              hint={u > 0 ? t.rsu.grantValueHint(num(u, lang, 2), usd(grants[0].priceAtGrant, lang), dateShort(welcomeDate, lang)) : undefined}
            />
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            {t.guided.welcomePrefilled(dateShort(welcomeDate, lang))}
          </p>
        </div>
        <div className="guida-piede">
          <button type="button" className="btn" onClick={() => setWhere({ at: "choose" })}>
            {t.guided.back}
          </button>
          <span style={{ flexGrow: 1 }} />
          <Dots n={3} at={0} />
          <button type="button" className="btn primary" onClick={() => setWhere({ at: "rsu", step: 1 })}>
            {t.guided.next}
            <Arrow />
          </button>
        </div>
      </>
    );
  } else if (where.at === "rsu" && where.step === 1) {
    const u = grantUnits(grants[1]);
    content = (
      <>
        {head(t.guided.step(2, 3, "RSU"))}
        <div className="guida-corpo">
          <h2>{t.guided.bonusTitle}</h2>
          <p className="note">{t.guided.bonusSub}</p>
          <div style={{ marginTop: 20 }}>
            <NumField
              lang={lang}
              label={t.guided.bonusField}
              suffix="$"
              dec={0}
              value={bonusUsd}
              onChange={setBonusUsd}
              hint={u > 0 ? t.rsu.grantValueHint(num(u, lang, 2), usd(grants[1].priceAtGrant, lang), dateShort(quote?.date ?? today, lang)) : undefined}
            />
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            {t.guided.bonusPrefilled(dateShort(bonusDate, lang))}
          </p>
        </div>
        <div className="guida-piede">
          <button type="button" className="btn" onClick={() => setWhere({ at: "rsu", step: 0 })}>
            {t.guided.back}
          </button>
          <span style={{ flexGrow: 1 }} />
          <Dots n={3} at={1} />
          <button type="button" className="btn primary" onClick={() => setWhere({ at: "rsu", step: 2 })}>
            {t.guided.next}
            <Arrow />
          </button>
        </div>
      </>
    );
  } else if (where.at === "rsu") {
    content = salaryStep("rsu", 3, 3, { at: "rsu", step: 1 }, { at: "result", tool: "rsu" });
  }

  // ------------------------------------------------------------ the result

  const finish = () => {
    markSeen();
    onFinish(
      where.at === "result" && where.tool === "rsu"
        ? { tool: "rsu", salary, welcomeUsd, bonusUsd }
        : { tool: "espp", salary, percent }
    );
  };

  if (where.at === "result") {
    const lastYear = rsu?.years[rsu.years.length - 1]?.year ?? year;
    content = (
      <>
        {head(`${where.tool.toUpperCase()} · ${t.guided.preview}`)}
        <div className="guida-corpo guida-esito">
          {where.tool === "espp" ? (
            espp ? (
              <>
                <h2 style={{ marginBottom: 12 }}>
                  {t.guided.esppHeadline(`${num(percent, lang, 0)}%`, eur0(salary, lang))}
                </h2>
                {/* Shares, what they are worth, and the gain — in that order,
                    because the gain is the consequence of the first two and not
                    a fourth fact. It used to be the big number on a card of its
                    own below, which stated the conclusion in larger type than
                    the figures it comes from. */}
                <Answer
                  items={[
                    { name: t.espp.answerShares, value: num(espp.shares, lang, 0) },
                    {
                      name: t.espp.answerValue,
                      value: eur0(espp.marketValue, lang),
                      alt: usd(espp.marketValueUsd, lang, 0),
                      // The MARKET price, not the discounted one. What they
                      // are worth is 39 x 188.71; what they cost is 39 x
                      // 108.19, and pairing the market value with the purchase
                      // price made the line contradict its own figure.
                      hint: t.espp.answerValueHint(usd(endPrice, lang)),
                    },
                    {
                      name: t.espp.youGain,
                      value: eur0(espp.gain, lang),
                      hint: t.espp.gainRoi(pct(espp.roi, lang), eur0(espp.outlay, lang)),
                    },
                  ]}
                />
                <p className="note" style={{ marginTop: 14 }}>
                  {t.guided.esppHeadlineSub(
                    eur0(contributed, lang),
                    num(espp.shares, lang, 0),
                    usd(espp.purchasePrice, lang)
                  )}
                </p>
                {/* Two cards now, not three: the gain moved up into the
                    answer, and leaving its card behind would have printed the
                    same figure twice with the copy below the larger of the
                    two. What is left is the two things the gain does not say —
                    what the payslip loses, and what it is worth as a raise. */}
                <div className="guida-carte">
                  <Card className="accent">
                    <h3>{t.espp.payslipTitle}</h3>
                    <p className="big">{eur0(espp.withheldOnPayslip, lang)}</p>
                    <p className="note">
                      {t.espp.payslipLine(
                        eur0(espp.discountValue, lang),
                        pct(espp.taxRate - espp.surtaxLater / Math.max(1, espp.discountValue), lang)
                      )}
                    </p>
                    <p className="note">
                      {t.espp.payslipSurtax(
                        eur0(espp.surtaxLater, lang),
                        eur0(espp.taxWithheld, lang),
                        pct(espp.taxRate, lang)
                      )}
                    </p>
                  </Card>
                  <Card>
                    <h3>{t.espp.salaryEquivTitle}</h3>
                    <p className="big">{eur0(espp.salaryEquivalent, lang)}</p>
                    <p className="note">
                      {t.espp.salaryEquivLine(
                        Math.round(espp.shareOfSalary * 100),
                        eur0(espp.gain, lang),
                        eur0(espp.perMonth, lang)
                      )}
                    </p>
                  </Card>
                </div>
              </>
            ) : (
              <p className="note">{t.guided.missing}</p>
            )
          ) : rsu && rsu.upcoming.length ? (
            <>
              <h2 style={{ marginBottom: 12 }}>{t.rsu.horizonSpan(lastYear)}</h2>
              <Answer
                items={[
                  { name: t.rsu.answerShares, value: num(rsu.totalNetShares, lang, 0) },
                  {
                    name: t.rsu.answerValue,
                    value: eur0(rsu.netSharesEur, lang),
                    alt: usd(rsu.netSharesUsd, lang, 0),
                    hint: t.rsu.answerValueHint(usd(endPrice, lang)),
                  },
                ]}
              />
              <p className="note" style={{ marginTop: 14 }}>
                {t.guided.rsuHeadlineSub(num(rsu.totalUnits, lang, 2), eur0(rsu.totalGross, lang))}
              </p>
              <div className="scroll-x" style={{ marginTop: 16 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t.guided.rsuQuarter}</th>
                      <th className="r optional-phone">{t.rsu.tableUnits}</th>
                      <th className="r">{t.rsu.tableValue}</th>
                      <th className="r optional">{t.rsu.yearRate}</th>
                      <th className="r optional-phone">{t.rsu.yearSold}</th>
                      <th className="r">{t.rsu.yearShares}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vesting.map((q, k) => (
                      <tr key={q.from} className={k > 0 && q.year !== vesting[k - 1].year ? "year-break" : ""}>
                        <td>
                          <span style={{ fontWeight: 660 }}>{`${q.year} Q${q.quarter}`}</span>
                          {q.vestOn ? <span className="cell-sub">{dateShort(q.vestOn, lang)}</span> : null}
                        </td>
                        <td className="r optional-phone">{num(q.units, lang, 2)}</td>
                        <td className="r">{eur0(q.grossEur, lang)}</td>
                        <td className="r optional neg">{pct(q.taxRate, lang)}</td>
                        <td className="r neg optional-phone">&#8722;{num(q.sharesWithheld, lang, 0)}</td>
                        <td className="r" style={{ fontWeight: 660, fontSize: "var(--t-20)" }}>
                          {num(q.netShares, lang, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="lines" style={{ marginTop: 14 }}>
                <Line
                  name={t.guided.total}
                  value={`${num(rsu.totalNetShares, lang, 0)} ${t.common.shares}`}
                  sum
                />
                <Line
                  name={t.rsu.answerValue}
                  value={`${eur0(rsu.netSharesEur, lang)} · ${usd(rsu.netSharesUsd, lang, 0)}`}
                  sum
                />
              </ul>
              <p className="hint" style={{ marginTop: 12 }}>
                {t.rsu.sellToCover}
              </p>
              <p className="hint" style={{ marginTop: 8 }}>
                {t.guided.rsuRateIsYearly}
              </p>
            </>
          ) : (
            <p className="note">{t.guided.missing}</p>
          )}
        </div>
        <div className="guida-piede">
          <button type="button" className="btn" onClick={() => setWhere({ at: "choose" })}>
            {t.guided.redo}
          </button>
          <span style={{ flexGrow: 1 }} />
          <button type="button" className="btn primary" onClick={finish}>
            {t.guided.openTool}
            <Arrow />
          </button>
        </div>
      </>
    );
  }

  return (
    <dialog
      ref={dialog}
      className={`guida ${where.at === "result" ? "larga" : ""}`}
      aria-label={t.guided.title}
      onCancel={(e) => {
        e.preventDefault();
        leave();
      }}
      onClose={leave}
    >
      {content}
    </dialog>
  );
}
