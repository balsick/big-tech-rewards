import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, DateField, Disclosure, Line, NumField } from "./ui.tsx";
import Info from "./Info.tsx";
import SaveToBrowser from "./SaveToBrowser.tsx";
import RegimeEditor from "./RegimeEditor.tsx";
import { FlatLine } from "./Icons.tsx";
import { dateShort, eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import {
  ESPP_PLAN,
  currentWindow,
  expectedContribution,
  guaranteedFloor,
  simulateEspp,
  type EsppPlan,
} from "../lib/espp.ts";
import { historyAt, liveFxRate, loadQuote, type Quote } from "../lib/prices.ts";
import { available, clear, read, write } from "../lib/storage.ts";
import { DEFAULT_SALARY } from "../lib/meta.ts";

// The ESPP: what happens on purchase day, and how much the round trip returns.
//
// The form sits on the left and stays put, the answer on the right redraws as
// you type. A tool is a form and an answer, and as long as they sit one under
// the other, changing a number means scrolling to see what changed — which is
// half the reason these calculations exist.

const STEPS = Array.from({ length: 15 }, (_, i) => i + 1);

const KEY = "espp";

/** What the save button puts in the browser: the form fields, nothing else. */
interface EsppState {
  start: string;
  purchase: string;
  salary: number;
  percent: number;
  contribution: number | null;
  priceAtStart: number | null;
  priceAtPurchase: number | null;
  fxRate: number | null;
  plan: EsppPlan;
}

export default function EsppTool() {
  const { t, lang, regime } = useStore();

  // The save is read once, in the initialisers: reading it in an effect would
  // mean showing the defaults for one frame and then overwriting them in front
  // of the user.
  const [saved, setSaved] = useState(() => read<EsppState>(KEY));
  const s0 = saved?.data;
  const canSave = useMemo(() => available(), []);

  const [plan, setPlan] = useState<EsppPlan>(s0?.plan ?? ESPP_PLAN);
  const window_ = useMemo(() => currentWindow(todayISO(), plan), [plan]);

  const [start, setStart] = useState(s0?.start ?? window_.start);
  const [purchase, setPurchase] = useState(s0?.purchase ?? window_.purchase);
  const [salary, setSalary] = useState(s0?.salary ?? DEFAULT_SALARY);
  const [percent, setPercent] = useState(s0?.percent ?? 15);
  // The contribution follows the percentage until you overwrite it: two states
  // for one field would be two truths, so the computed one is the floor and the
  // typed one sits on top.
  const [typedContribution, setTypedContribution] = useState<number | null>(s0?.contribution ?? null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [typedStartPrice, setTypedStartPrice] = useState<number | null>(s0?.priceAtStart ?? null);
  const [typedEndPrice, setTypedEndPrice] = useState<number | null>(s0?.priceAtPurchase ?? null);
  const [typedFx, setTypedFx] = useState<number | null>(s0?.fxRate ?? null);
  const [fxNote, setFxNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadQuote().then((q) => {
      if (!alive) return;
      if (q) setQuote(q);
      else setQuoteFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The references: the start price comes from the stored history at the start
  // date, the purchase price from the latest close available — a future price
  // does not exist, and saying when the one you have is from is the only honest
  // thing to do.
  const historyStart = historyAt(start);
  const historyEnd = historyAt(purchase);
  const defaultStart = historyStart?.close ?? quote?.close ?? 0;
  const defaultEnd =
    (purchase > (quote?.date ?? "") ? quote?.close : historyEnd?.close) ?? quote?.close ?? historyEnd?.close ?? 0;
  const defaultFx = quote?.eurusd ?? historyEnd?.eurusd ?? 1;

  const startPrice = typedStartPrice ?? defaultStart;
  const endPrice = typedEndPrice ?? defaultEnd;
  const fx = typedFx ?? defaultFx;

  const expected = expectedContribution(salary, percent, plan.months);
  const contribution = typedContribution ?? expected;

  const result = useMemo(
    () =>
      contribution > 0 && startPrice > 0 && endPrice > 0 && fx > 0 && salary > 0
        ? simulateEspp(
            { salary, contributed: contribution, priceAtStart: startPrice, priceAtPurchase: endPrice, fxRate: fx, plan },
            regime
          )
        : null,
    [salary, contribution, startPrice, endPrice, fx, plan, regime]
  );

  const state: EsppState = {
    start,
    purchase,
    salary,
    percent,
    contribution: typedContribution,
    priceAtStart: typedStartPrice,
    priceAtPurchase: typedEndPrice,
    fxRate: typedFx,
    plan,
  };
  // "Dirty" is decided by comparing the JSON rather than the individual fields:
  // the fields change every time the tool changes, the comparison does not.
  const dirty = JSON.stringify(state) !== JSON.stringify(saved?.data ?? null);

  const setFlat = () => setTypedEndPrice(startPrice);
  const isFlat = Math.abs(endPrice - startPrice) < 1e-9;

  // The number people open this page for comes **first** in the source, so it
  // comes first on a phone; on desktop the grid puts it back in the right
  // column, above the detail, with the form fixed on the left.
  const headline = !result ? (
    <Card>
      <p className="note">{t.espp.missing}</p>
    </Card>
  ) : (
    <Card>
      <h2 className="answer" style={{ marginBottom: 0 }} key={Math.round(result.gain)}>
        {t.espp.youGain} <span className="big">{eur0(result.gain, lang)}</span>
      </h2>
      <p className="note">
        {t.espp.gainLine(
          pct(result.roi, lang),
          eur0(result.outlay, lang),
          num(result.shares, lang, plan.fractionalShares ? 4 : 0),
          eur0(result.marketValue, lang),
          plan.months
        )}
      </p>
      <p className="hint">
        {t.espp.costBreak(
          eur0(result.spent, lang),
          eur0(Math.round(result.outlay) - Math.round(result.spent), lang)
        )}{" "}
        {t.espp.annualised(pct(result.annualisedRoi, lang))}
      </p>
    </Card>
  );

  return (
    <div className="tool">
      <div className="summary">{headline}</div>

      <div className="panel">
        <Card>
          <h2>{t.espp.title}</h2>
          <div className="grid2 has-date aligned">
            <DateField label={t.espp.windowStart} value={start} onChange={setStart} />
            <DateField label={t.espp.windowEnd} value={purchase} onChange={setPurchase} />
          </div>

          <h3>{t.espp.contribution}</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="mid" style={{ fontSize: 26 }}>
              {num(percent, lang, 0)}%
            </span>
            <span className="hint" style={{ margin: 0 }}>
              {t.espp.contributionHint}
            </span>
          </div>
          {/* A discrete slider: the steps are whole percentage points, because
              that is how the percentage is picked on the plan's own portal. */}
          <input
            type="range"
            min={1}
            max={plan.maxPct}
            step={1}
            value={percent}
            aria-label={t.espp.contribution}
            onChange={(ev) => {
              setPercent(Number(ev.target.value));
              setTypedContribution(null);
            }}
          />
          <div className="ticks" aria-hidden>
            {STEPS.filter((p) => p <= plan.maxPct && (p === 1 || p % 5 === 0 || p === plan.maxPct)).map((p) => (
              <span key={p}>{p}%</span>
            ))}
          </div>

          {/* The free field is in **euro**, not in percent: the plan portal takes
              whole percentage points, so a hand-typed percentage is not another
              case, it is the slider's case typed worse. What the percentage
              cannot give you is the real amount — a window you joined halfway,
              a month of unpaid leave, a cap in another currency. */}
          <div style={{ marginTop: 12 }}>
            <NumField
              lang={lang}
              label={t.espp.saved}
              suffix="€"
              value={contribution}
              onChange={setTypedContribution}
              hint={
                typedContribution === null
                  ? t.espp.savedHint(`${num(percent, lang, 0)}%`, plan.months)
                  : t.espp.savedManual
              }
            />
            {typedContribution !== null ? (
              <button className="btn link" type="button" onClick={() => setTypedContribution(null)}>
                {t.common.reset}
              </button>
            ) : null}
          </div>

          <NumField
            lang={lang}
            label={t.common.salary}
            suffix="€"
            dec={0}
            value={salary}
            onChange={setSalary}
            info={
              <Info label={t.common.whatIsThis}>
                <p>{t.common.salaryWhy}</p>
                <p>{t.common.salaryWhy2}</p>
              </Info>
            }
          />

          <div className="grid2 aligned" style={{ marginTop: 18 }}>
            <NumField
              lang={lang}
              label={t.common.priceStart}
              suffix="$"
              value={startPrice}
              onChange={setTypedStartPrice}
              hint={
                typedStartPrice !== null
                  ? t.common.manual
                  : historyStart
                    ? `${t.common.fromHistory} ${dateShort(historyStart.closeOn, lang)}`
                    : t.common.fromQuote
              }
            />
            <NumField
              lang={lang}
              label={t.common.priceEnd}
              suffix="$"
              value={endPrice}
              onChange={setTypedEndPrice}
              hint={
                typedEndPrice !== null
                  ? isFlat
                    ? t.espp.flatStockOn
                    : t.common.manual
                  : quote
                    ? `${t.common.fromQuote} ${dateShort(quote.date, lang)}`
                    : historyEnd
                      ? `${t.common.fromHistory} ${dateShort(historyEnd.closeOn, lang)}`
                      : t.common.fromQuote
              }
            />
          </div>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={setFlat}>
              <FlatLine />
              {t.espp.flatStock}
            </button>
            <Info label={t.espp.flatStock}>
              <p>{t.espp.flatStockHint}</p>
            </Info>
            {typedEndPrice !== null || typedStartPrice !== null ? (
              <button
                className="btn link"
                type="button"
                onClick={() => {
                  setTypedEndPrice(null);
                  setTypedStartPrice(null);
                }}
              >
                {t.common.reset}
              </button>
            ) : null}
          </div>

          <NumField
            lang={lang}
            label={t.common.fx}
            dec={4}
            value={fx}
            onChange={setTypedFx}
            hint={typedFx !== null ? (fxNote ?? t.common.manual) : t.common.fxHint}
          />
          <button
            className="btn link"
            type="button"
            onClick={() =>
              liveFxRate().then((r) => {
                if (!r) return;
                setTypedFx(r.eurusd);
                setFxNote(`${t.common.fromLive} ${r.date}`);
              })
            }
          >
            {t.common.liveFx}
          </button>

          <div style={{ marginTop: 16 }}>
            <Disclosure label={t.espp.planTitle}>
              <div className="grid2">
                <NumField
                  lang={lang}
                  label={t.espp.discount}
                  suffix="%"
                  value={plan.discount}
                  onChange={(v) => setPlan({ ...plan, discount: v })}
                />
                <NumField
                  lang={lang}
                  label={t.espp.periodMonths}
                  dec={0}
                  value={plan.months}
                  onChange={(v) => setPlan({ ...plan, months: Math.max(1, Math.round(v)) })}
                />
                <NumField
                  lang={lang}
                  label={t.espp.cap}
                  suffix="%"
                  dec={0}
                  value={plan.maxPct}
                  onChange={(v) => setPlan({ ...plan, maxPct: Math.max(1, Math.round(v)) })}
                />
                <NumField
                  lang={lang}
                  label={t.espp.capUsd}
                  suffix="$"
                  dec={0}
                  value={plan.maxUsd}
                  onChange={(v) => setPlan({ ...plan, maxUsd: Math.max(0, v) })}
                  info={
                    <Info label={t.common.whatIsThis}>
                      <p>{t.espp.capUsdHint}</p>
                    </Info>
                  }
                />
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <Check
                  label={t.espp.lookbackOn}
                  checked={plan.lookback}
                  onChange={(v) => setPlan({ ...plan, lookback: v })}
                />
                <Check
                  label={t.espp.fractional}
                  checked={plan.fractionalShares}
                  onChange={(v) => setPlan({ ...plan, fractionalShares: v })}
                />
              </div>
            </Disclosure>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <Disclosure label={t.tax.title}>
              <RegimeEditor salary={salary} />
            </Disclosure>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <SaveToBrowser
              savedAt={saved?.at ?? null}
              dirty={dirty}
              available={canSave}
              onSave={() => setSaved(write(KEY, state))}
              onForget={() => {
                clear(KEY);
                setSaved(null);
              }}
            />
          </div>
        </Card>
      </div>

      <div className="detail">
        {quoteFailed && !quote ? (
          <Card>
            <p className="note">{t.common.quoteMissing}</p>
          </Card>
        ) : null}

        {result ? (
          <>
            <Card>
              <h2>{t.espp.payslipTitle}</h2>
              <p className="mid">{eur0(result.taxWithheld, lang)}</p>
              <p className="note">
                {t.espp.payslipLine(eur0(result.discountValue, lang), pct(result.taxRate, lang))}
              </p>
              <p className="note">
                {t.espp.payslipRest(
                  eur(result.refunded, lang),
                  eur0(Math.abs(result.payslipEffect), lang),
                  result.payslipEffect < 0 ? t.espp.lower : t.espp.higher
                )}
              </p>
              {/* Without this line the "refund" suddenly becomes enormous and
                  nothing explains why: the cap is the only thing that does. */}
              {result.aboveCap > 0.5 ? (
                <p className="hint">
                  {t.espp.capHit(eur0(result.aboveCap, lang), usd(plan.maxUsd, lang, 0))}
                </p>
              ) : null}
            </Card>

            <Card>
              <h2>{t.espp.salaryEquivTitle}</h2>
              <p className="mid">{eur0(result.salaryEquivalent, lang)}</p>
              <p className="note">
                {t.espp.salaryEquivLine(
                  Math.round(result.shareOfSalary * 100),
                  eur0(result.gain, lang),
                  eur0(result.perMonth, lang)
                )}
              </p>
            </Card>

            <Card>
              <h2>{t.espp.stepsTitle}</h2>
              <ul className="lines">
                <Line
                  name={t.espp.steps.reference}
                  hint={t.espp.steps.referenceHint(plan.lookback)}
                  value={usd(result.referencePrice, lang)}
                />
                <Line
                  name={t.espp.steps.buy}
                  hint={t.espp.steps.buyHint(`${num(plan.discount, lang, 2)}%`, usd(result.referencePrice, lang))}
                  value={usd(result.purchasePrice, lang)}
                />
                <Line
                  name={t.espp.steps.savedUsd}
                  hint={eur(contribution, lang)}
                  value={usd(result.contributedUsd, lang)}
                />
                <Line
                  name={t.espp.steps.bought}
                  hint={plan.fractionalShares ? undefined : t.espp.steps.boughtHint}
                  value={num(result.shares, lang, plan.fractionalShares ? 4 : 0)}
                />
                <Line name={t.espp.steps.cost} value={eur(result.spent, lang)} />
                <Line name={t.espp.steps.rest} value={eur(result.refunded, lang)} />
                <Line name={t.espp.steps.value} value={eur(result.marketValue, lang)} />
                <Line name={t.espp.steps.tax} value={`−${eur(result.taxWithheld, lang)}`} tone="neg" />
                <Line name={t.espp.steps.out} value={eur(result.outlay, lang)} sum />
              </ul>
            </Card>

            {endPrice < startPrice ? (
              <Card>
                <h2>{t.espp.fellTitle}</h2>
                <p className="note">{t.espp.fell(usd(startPrice, lang), usd(endPrice, lang))}</p>
              </Card>
            ) : null}
          </>
        ) : null}

        {/* The explanation comes **after** the result: whoever lands here wants
            the number first, and reads the rules if that number surprises them. */}
        <Card>
          <h2>{t.espp.howTitle}</h2>
          <ul className="lines" style={{ gap: 12 }}>
            <li style={{ display: "block" }}>
              <strong style={{ fontSize: "var(--t-13)" }}>{t.espp.how1Title}</strong>
              <p className="note" style={{ marginTop: 2 }}>
                {t.espp.how1}
              </p>
            </li>
            <li style={{ display: "block" }}>
              <strong style={{ fontSize: "var(--t-13)" }}>{t.espp.how2Title}</strong>
              <p className="note" style={{ marginTop: 2 }}>
                {t.espp.how2}
              </p>
            </li>
          </ul>
          <p className="hint">{t.espp.guaranteed(pct(guaranteedFloor(plan.discount), lang))}</p>
        </Card>
      </div>
    </div>
  );
}
