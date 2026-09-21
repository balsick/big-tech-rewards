import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Answer, Card, Check, DateField, Disclosure, Line, NumField, Segmented, Select } from "./ui.tsx";
import Info from "./Info.tsx";
import SaveToBrowser from "./SaveToBrowser.tsx";
import RegimeEditor from "./RegimeEditor.tsx";
import VestingChart, { grantColour } from "./VestingChart.tsx";
import { Close, Plus } from "./Icons.tsx";
import { dateShort, eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import {
  PERFORMANCE_STEPS,
  WITHHOLDING_RATE,
  VESTING_CALENDAR,
  annualValueFor,
  expandAnnual,
  grantUnits,
  newGrantId,
  project,
  salaryOnly,
  withUniqueIds,
  type AnnualPlan,
  type Grant,
  type GrantInput,
  type VestingSchedule,
} from "../lib/rsu.ts";
import { dividends, fmvAt, historyAt, loadQuote, type Quote } from "../lib/prices.ts";
import { available, clear, read, write } from "../lib/storage.ts";

// RSUs, seen from three years away.
//
// One grant at a time is the wrong way: with a new award every year and
// quarterly vesting, in any given year slices of three or four different grants
// vest, and the taxman adds up everything landing in the same year. Hence a
// list of grants here, and a rate computed per year.

/**
 * What gets typed in.
 *
 * The grant is in dollars, and the price that turns those into units is not
 * typed: the archive supplies it. Except when it cannot — a grant dated in the
 * future has no close — and then `typedPrice` takes the place of the looked-up
 * number, like every other field in these two tools: the looked-up value is the
 * floor, the typed one sits on top.
 */
const KEY = "rsu";

/** What the save button puts in the browser: the form fields, nothing else. */
interface RsuState {
  oneOff: GrantInput[];
  annual: AnnualPlan;
  salary: number;
  horizonYears: number;
  performance?: number;
  price: number | null;
  fxRate: number | null;
  /**
   * Come si salvava prima: un elenco piatto, una riga per anno.
   *
   * Resta letto e non scritto. Un salvataggio vecchio si rimette **tutto fra
   * le una tantum**, e la regola annuale parte spenta: le righe che ci sono
   * sono quelle che l'utente ha scritto, e accenderla vorrebbe dire
   * aggiungerci sopra le stesse assegnazioni una seconda volta. Indovinare
   * quali di quelle righe *erano* la regola si può fare, e sarebbe indovinare
   * su dati di qualcuno.
   */
  grants?: GrantInput[];
}

// The two grants most people hold at once, and which together explain why three
export default function RsuTool() {
  // The grants, the salary, the rating and the horizon are the shared
  // description of this person's package: the walkthrough fills them in, the
  // total reward reads them, and this tool is where they get edited.
  const {
    t,
    lang,
    regime,
    salary,
    setSalary,
    grants,
    oneOff,
    setOneOff,
    annual,
    setAnnual,
    performance,
    setPerformance,
    horizonYears,
    setHorizonYears,
  } = useStore();
  const today = todayISO();

  const [saved, setSaved] = useState(() => read<RsuState>(KEY));
  const s0 = saved?.data;
  const canSave = useMemo(() => available(), []);

  // Whatever comes out of storage goes through `withUniqueIds`: a save written
  // by an earlier version can carry duplicate ids, and those make two rows share
  // one entry in the list.
  // A save is restored into the shared model, once, on mount. `withUniqueIds`
  // heals the saves written while the id generator was a counter.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !s0) return;
    restored.current = true;
    if (s0.oneOff) setOneOff(withUniqueIds(s0.oneOff));
    if (s0.annual) setAnnual(s0.annual);
    // Il formato vecchio: tutto fra le una tantum, e la regola spenta.
    if (!s0.oneOff && s0.grants) {
      setOneOff(withUniqueIds(s0.grants));
      setAnnual((a) => ({ ...a, enabled: false }));
    }
    if (typeof s0.salary === "number") setSalary(s0.salary);
    if (typeof s0.horizonYears === "number") setHorizonYears(s0.horizonYears);
    if (typeof s0.performance === "number") setPerformance(s0.performance);
  }, [s0, setOneOff, setAnnual, setSalary, setHorizonYears, setPerformance]);

  const [scale, setScale] = useState<"eur" | "units">("eur");
  // Which granularity the table is read at. Not saved: it is how you are
  // looking right now, not part of the plan you described.
  const [grain, setGrain] = useState<"quarter" | "tranche">("quarter");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [typedPrice, setTypedPrice] = useState<number | null>(s0?.price ?? null);
  const [typedFx, setTypedFx] = useState<number | null>(s0?.fxRate ?? null);

  useEffect(() => {
    let alive = true;
    loadQuote().then((q) => alive && q && setQuote(q));
    return () => {
      alive = false;
    };
  }, []);

  const latest = historyAt(today);
  const price = typedPrice ?? quote?.close ?? latest?.close ?? 0;
  const fx = typedFx ?? quote?.eurusd ?? latest?.eurusd ?? 1;

  // The price that turns dollars into units is the one from the **grant day**,
  // not today's: that is how the plan sets the units, and the reason an old
  // grant is worth more today than a new one of the same size.
  //
  // A grant dated in the future, though, has no close: the best price anyone
  // can name is the current one. The archive always returns the last close
  // *before* the date asked for, so for a future date it would return one from
  // months ago — stale, and wrong in the wrong direction. The field always says
  // which day the number comes from.
  /**
   * The price that turns a grant's dollars into units.
   *
   * Not the close of the grant day — the **fair market value**: the mean of the
   * closes of the 20 sessions before it. That is how the plan prices a grant,
   * and the gap is not decorative: on 20 February 2026 the close was 142.88 and
   * the fair market value 146.32, which is 2.4% fewer units than using the
   * close would have given.
   *
   * For a date still in the future the real figure cannot exist, so the rolling
   * 20-session mean stands in — and `kind` says which of the three it is, so
   * the field underneath can be honest about it.
   */
  const priceAtGrant = (
    g: GrantInput
  ): { price: number; on: string; typed: boolean; future: boolean; kind: "fmv" | "rolling" | "close" } => {
    const future = g.date > today;
    if (g.typedPrice != null) return { price: g.typedPrice, on: "", typed: true, future, kind: "fmv" };
    const f = fmvAt(g.date, quote);
    if (f) {
      const point = historyAt(g.date);
      return {
        price: f.price,
        on: f.kind === "rolling" ? (quote?.date ?? today) : (point?.date ?? g.date),
        typed: false,
        future,
        kind: f.kind,
      };
    }
    return { price, on: quote?.date ?? today, typed: false, future, kind: "close" };
  };

  const resolved = useMemo<Grant[]>(
    // `priceAtGrant` reads the archive (a pure function), the current price and
    // the quote date: those are the dependencies.
    () => grants.map((g) => ({ ...g, priceAtGrant: priceAtGrant(g).price })),
    [grants, price, quote, today]
  );

  const projection = useMemo(
    () =>
      project(
        { grants: resolved, price, fxRate: fx, salary, today, horizonYears, calendar: VESTING_CALENDAR, performance, dividends },
        regime
      ),
    [resolved, price, fx, salary, today, horizonYears, regime, performance]
  );

  // Only the quarters something vests in. An empty quarter is information in
  // the chart — it is the shape of the plan — but a table row of zeroes says
  // nothing the gap in the dates does not already say.
  const vesting = useMemo(() => projection.quarters.filter((q) => q.units > 0), [projection]);

  /** The payment the future ones are projected from, for the assumption note. */
  const lastDividend = dividends.length ? dividends[dividends.length - 1] : null;

  const state: RsuState = {
    oneOff,
    annual,
    salary,
    horizonYears,
    performance,
    price: typedPrice,
    fxRate: typedFx,
  };
  const dirty = JSON.stringify(state) !== JSON.stringify(saved?.data ?? null);

  const salaryNet = salaryOnly(salary, regime);
  const patch = (id: string, q: Partial<GrantInput>) =>
    setOneOff((gs) => gs.map((g) => (g.id === id ? { ...g, ...q } : g)));

  const schedules: { id: VestingSchedule; label: string }[] = [
    { id: "quarterly", label: t.rsu.schedule.quarterly },
    { id: "annual", label: t.rsu.schedule.annual },
    { id: "30-30-40", label: t.rsu.schedule["30-30-40"] },
    { id: "monthly", label: t.rsu.schedule.monthly },
  ];
  const scheduleHint = (s: VestingSchedule) =>
    s === "quarterly"
      ? t.rsu.schedule.quarterlyHint
      : s === "annual"
        ? t.rsu.schedule.annualHint
        : s === "30-30-40"
          ? t.rsu.schedule["30-30-40Hint"]
          : t.rsu.schedule.monthlyHint;

  const perYear = projection.totalNet / Math.max(1, horizonYears);
  const headline = !projection.upcoming.length ? (
    <Card>
      <p className="note">{t.rsu.noVesting}</p>
    </Card>
  ) : (
    <Card>
      {/* Shares first, then what they are worth. The euro net was the headline
          and the share count sat five lines down in a card, which is the wrong
          way round: RSUs pay in shares, and "how many actually turn up" is the
          question the withholding makes hard to answer. */}
      {/* L'orizzonte sta qui e non in fondo al pannello a sinistra: è il
          comando della frase che gli sta accanto — «nei prossimi tre anni, fino
          al 2029» — e in fondo alla colonna dei campi, sotto la performance,
          non lo trovava nessuno. */}
      <div
        className="row-inline"
        style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}
      >
        <h2 style={{ margin: 0 }}>
          {t.rsu.horizonSpan(projection.years[projection.years.length - 1]?.year ?? 0)}
        </h2>
        <Segmented<"1" | "3" | "5">
          label={t.rsu.horizon}
          value={String(horizonYears) as "1" | "3" | "5"}
          onChange={(v) => setHorizonYears(Number(v))}
          options={[
            { id: "1", label: t.rsu.yearCount(1) },
            { id: "3", label: t.rsu.yearCount(3) },
            { id: "5", label: t.rsu.yearCount(5) },
          ]}
        />
      </div>
      <Answer
        items={[
          { name: t.rsu.answerShares, value: num(projection.totalNetShares, lang, 0) },
          {
            name: t.rsu.answerValue,
            value: eur0(projection.netSharesEur, lang),
            alt: usd(projection.netSharesUsd, lang, 0),
            hint: t.rsu.answerValueHint(usd(price, lang)),
          },
          // The half nobody expects. It is in the answer rather than a footnote
          // because it is money leaving your account on a date you were not
          // thinking about, and the share count above is higher precisely
          // because of it.
          ...(projection.totalPayslipAdjustmentEur > 0.5
            ? [
                {
                  name: t.rsu.answerPayslip,
                  value: `\u2212${eur0(projection.totalPayslipAdjustmentEur, lang)}`,
                  hint: t.rsu.answerPayslipHint,
                },
              ]
            : []),
        ]}
      />
      <p className="note" style={{ marginTop: 14 }}>
        {t.rsu.totalLine(num(projection.totalUnits, lang, 2), eur0(projection.totalGross, lang))}
      </p>
      <p className="hint">
        {t.rsu.salaryCompare(
          Math.round((projection.totalGross / Math.max(1, horizonYears) / Math.max(1, salary)) * 100),
          eur0(salaryNet.net, lang),
          eur0(salaryNet.net + perYear, lang)
        )}
      </p>
    </Card>
  );

  return (
    <div className="tool">
      <div className="panel">
        <Card>
          <h2>{t.rsu.oneOffTitle}</h2>
          {/* Solo le una tantum: quelle annuali le descrive la regola qui
              sotto, e l'indice del colore combacia lo stesso perché nella
              lista completa le una tantum vengono prima. */}
          {oneOff.map((g, i) => {
            const p = priceAtGrant(g);
            return (
              <div
                key={g.id}
                style={{
                  marginTop: i ? 14 : 8,
                  paddingTop: i ? 14 : 0,
                  borderTop: i ? "1px solid var(--border)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="dot" style={{ background: grantColour(i) }} aria-hidden />
                  <input
                    className="inp"
                    aria-label={t.rsu.grantLabel}
                    value={g.label}
                    onChange={(ev) => patch(g.id, { label: ev.target.value })}
                    style={{ fontWeight: 620 }}
                  />
                  {oneOff.length > 1 ? (
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => setOneOff((gs) => gs.filter((x) => x.id !== g.id))}
                      aria-label={`${t.rsu.removeGrant}: ${g.label}`}
                    >
                      <Close />
                    </button>
                  ) : null}
                </div>

                <div className="grid2 has-date aligned">
                  <DateField label={t.rsu.grantDate} value={g.date} onChange={(v) => patch(g.id, { date: v })} />
                  <NumField
                    lang={lang}
                    label={t.rsu.grantValue}
                    suffix="$"
                    dec={0}
                    value={g.valueUsd}
                    onChange={(v) => patch(g.id, { valueUsd: v })}
                    info={
                      <Info label={t.common.whatIsThis}>
                        <p>{t.rsu.grantValueWhy}</p>
                        <p>{t.rsu.fmvWhy}</p>
                      </Info>
                    }
                    hint={
                      !(p.price > 0)
                        ? t.rsu.grantValueNoPrice
                        : p.typed
                          ? t.rsu.grantValueHintManual(
                              num(grantUnits({ ...g, priceAtGrant: p.price }), lang, 2),
                              usd(p.price, lang)
                            )
                          : p.kind === "rolling"
                            ? t.rsu.grantValueHintRolling(
                                num(grantUnits({ ...g, priceAtGrant: p.price }), lang, 2),
                                usd(p.price, lang)
                              )
                            : t.rsu.grantValueHint(
                                num(grantUnits({ ...g, priceAtGrant: p.price }), lang, 2),
                                usd(p.price, lang),
                                dateShort(p.on, lang)
                              )
                    }
                  />
                  <Select<VestingSchedule>
                    label={t.rsu.grantSchedule}
                    value={g.schedule}
                    options={schedules}
                    onChange={(v) => patch(g.id, { schedule: v })}
                    hint={scheduleHint(g.schedule)}
                  />
                  {/* 30-30-40 has its length in its name: three annual vests,
                      and there is nothing to change. Showing the field disabled
                      with a grey "3" in it looked broken. */}
                  {g.schedule === "30-30-40" ? null : (
                    <NumField
                      lang={lang}
                      label={t.rsu.grantYears}
                      suffix={t.rsu.years}
                      dec={0}
                      value={g.years}
                      onChange={(v) => patch(g.id, { years: Math.max(1, Math.round(v)) })}
                    />
                  )}
                </div>

                {/* The grant price is typed only when the archive cannot supply
                    it — a future date — or when you already typed one: a field
                    that appears and disappears with the date must not take the
                    number you put in it away with it. */}
                {p.future || p.typed ? (
                  <div style={{ marginTop: 10 }}>
                    <NumField
                      lang={lang}
                      label={t.rsu.grantPrice}
                      suffix="$"
                      value={p.price}
                      onChange={(v) => patch(g.id, { typedPrice: v })}
                      hint={p.typed ? t.common.manual : t.rsu.grantPriceFuture}
                    />
                    {p.typed ? (
                      <button className="btn link" type="button" onClick={() => patch(g.id, { typedPrice: null })}>
                        {t.common.reset}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {g.schedule === "quarterly" || g.schedule === "monthly" ? (
                  <div style={{ marginTop: 10 }}>
                    <Check
                      label={t.rsu.fixedDates}
                      checked={g.usePlanDates}
                      onChange={(v) => patch(g.id, { usePlanDates: v })}
                      hint={t.rsu.fixedDatesHint(VESTING_CALENDAR.join(", "))}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          <button
            className="btn"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() =>
              // Una tantum, non un altro anno di bonus: gli anni li fa la
              // regola qui sotto. Il tasto serve a una retention o a un
              // secondo welcome, che una regola non la descrive.
              setOneOff((gs) => [
                ...gs,
                {
                  id: newGrantId(),
                  label: t.rsu.oneOffNew,
                  date: `${today.slice(0, 4)}-${today.slice(5, 7)}-01`,
                  valueUsd: 10000,
                  schedule: "30-30-40",
                  years: 3,
                  usePlanDates: false,
                  performanceLinked: false,
                  typedPrice: null,
                },
              ])
            }
          >
            <Plus />
            {t.rsu.addOneOff}
          </button>

          {/* La regola dell'assegnazione annuale.
              Prima era una riga per anno, aggiunta a mano, con la stessa cifra
              riscritta e lo stesso schema riscelto ogni volta — e allungando
              l'orizzonte da tre a cinque anni gli ultimi due semplicemente non
              c'erano. Qui è una cosa sola: quanto, da che anno, e gli anni in
              cui è cambiata. */}
          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div className="row-inline" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{t.rsu.annualTitle}</h3>
              <Check
                label={t.rsu.annualOn}
                checked={annual.enabled}
                onChange={(v) => setAnnual((a) => ({ ...a, enabled: v }))}
              />
            </div>
            {/* `div` e non `p`: `Info` apre un popover, che è un `div`, e un
                `div` dentro un `p` il browser lo chiude prima. */}
            <div className="hint" style={{ marginTop: 4 }}>
              {t.rsu.annualIntro}
              <Info label={t.common.whatIsThis}>
                <p>{t.rsu.annualWhy}</p>
              </Info>
            </div>

            {annual.enabled ? (
              <>
                <div className="grid2 has-date aligned" style={{ marginTop: 10 }}>
                  <NumField
                    lang={lang}
                    label={t.rsu.annualValue}
                    suffix="$"
                    dec={0}
                    value={annual.valueUsd}
                    onChange={(v) => setAnnual((a) => ({ ...a, valueUsd: Math.max(0, v) }))}
                    hint={t.rsu.annualValueHint}
                  />
                  <NumField
                    lang={lang}
                    label={t.rsu.annualFrom}
                    dec={0}
                    value={annual.fromYear}
                    onChange={(v) =>
                      setAnnual((a) => ({
                        ...a,
                        fromYear: Math.max(2000, Math.min(2100, Math.round(v))),
                      }))
                    }
                    hint={t.rsu.annualFromHint}
                  />
                  <Select<VestingSchedule>
                    label={t.rsu.grantSchedule}
                    value={annual.schedule}
                    options={schedules}
                    onChange={(v) => setAnnual((a) => ({ ...a, schedule: v }))}
                    hint={scheduleHint(annual.schedule)}
                  />
                  {annual.schedule === "30-30-40" ? null : (
                    <NumField
                      lang={lang}
                      label={t.rsu.grantYears}
                      suffix={t.rsu.years}
                      dec={0}
                      value={annual.years}
                      onChange={(v) =>
                        setAnnual((a) => ({ ...a, years: Math.max(1, Math.round(v)) }))
                      }
                    />
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  <DateField
                    label={t.rsu.annualDay}
                    value={`${annual.fromYear}-${annual.monthDay}`}
                    onChange={(v) => setAnnual((a) => ({ ...a, monthDay: v.slice(5) }))}
                  />
                  <p className="hint" style={{ marginTop: 4 }}>
                    {t.rsu.annualDayHint}
                  </p>
                </div>

                {annual.schedule === "quarterly" || annual.schedule === "monthly" ? (
                  <div style={{ marginTop: 10 }}>
                    <Check
                      label={t.rsu.fixedDates}
                      checked={annual.usePlanDates}
                      onChange={(v) => setAnnual((a) => ({ ...a, usePlanDates: v }))}
                      hint={t.rsu.fixedDatesHint(VESTING_CALENDAR.join(", "))}
                    />
                  </div>
                ) : null}

                {/* I cambi. Non «il 2028 vale X» ma «dal 2028 vale X»: un
                    aumento resta, e l'anno in cui è arrivato è la cosa da
                    scrivere. */}
                <h4 style={{ margin: "16px 0 6px", fontSize: "var(--t-13)" }}>{t.rsu.stepsTitle}</h4>
                {annual.steps.length === 0 ? (
                  <p className="hint">{t.rsu.stepsEmpty}</p>
                ) : (
                  <ul className="lines">
                    {[...annual.steps]
                      .sort((a, b) => a.fromYear - b.fromYear)
                      .map((st) => (
                        <li key={st.fromYear} className="row-inline" style={{ gap: 8 }}>
                          <span style={{ minWidth: 0, flex: 1 }}>{t.rsu.stepFrom(st.fromYear)}</span>
                          <NumField
                            lang={lang}
                            label={t.rsu.stepValue}
                            suffix="$"
                            dec={0}
                            value={st.valueUsd}
                            onChange={(v) =>
                              setAnnual((a) => ({
                                ...a,
                                steps: a.steps.map((x) =>
                                  x.fromYear === st.fromYear ? { ...x, valueUsd: Math.max(0, v) } : x
                                ),
                              }))
                            }
                          />
                          <button
                            className="icon-btn"
                            type="button"
                            aria-label={`${t.rsu.stepRemove}: ${st.fromYear}`}
                            onClick={() =>
                              setAnnual((a) => ({
                                ...a,
                                steps: a.steps.filter((x) => x.fromYear !== st.fromYear),
                              }))
                            }
                          >
                            <Close />
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
                <button
                  className="btn link"
                  type="button"
                  onClick={() =>
                    setAnnual((a) => {
                      // Il cambio nuovo parte dall'anno dopo l'ultimo che c'è,
                      // e dal valore che quell'anno avrebbe avuto: così si
                      // ritocca un numero invece di scriverne due.
                      const ultimo = a.steps.reduce(
                        (m, x) => Math.max(m, x.fromYear),
                        Math.max(a.fromYear, Number(today.slice(0, 4)))
                      );
                      const anno = ultimo + 1;
                      if (a.steps.some((x) => x.fromYear === anno)) return a;
                      return {
                        ...a,
                        steps: [...a.steps, { fromYear: anno, valueUsd: annualValueFor(a, anno) }],
                      };
                    })
                  }
                >
                  <Plus />
                  {t.rsu.stepAdd}
                </button>

                {/* La regola srotolata: è quello che finisce nel grafico e nel
                    calendario, e vederlo qui evita di doverlo dedurre. */}
                <p className="hint" style={{ marginTop: 12 }}>
                  {t.rsu.annualPreview}{" "}
                  {expandAnnual(annual, Number(today.slice(0, 4)) + horizonYears)
                    .map((g) => `${g.date.slice(0, 4)} ${usd(g.valueUsd, lang, 0)}`)
                    .join(" · ")}
                </p>
              </>
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
              label={t.common.price}
              suffix="$"
              value={price}
              onChange={setTypedPrice}
              info={
                <Info label={t.common.whatIsThis}>
                  <p>{t.rsu.priceNote}</p>
                </Info>
              }
              hint={
                typedPrice !== null
                  ? t.common.manual
                  : quote
                    ? `${t.common.fromQuote} ${dateShort(quote.date, lang)}`
                    : latest
                      ? `${t.common.fromHistory} ${dateShort(latest.closeOn, lang)}`
                      : undefined
              }
            />
            <NumField
              lang={lang}
              label={t.common.fx}
              dec={4}
              value={fx}
              onChange={setTypedFx}
              hint={typedFx !== null ? t.common.manual : t.common.fxHint}
            />
          </div>

          {/* The rating scales the annual awards. A discrete band rather than a
              free field: 75 to 150 is the range a review can land in, and a
              number you invent inside it is no more informative than the step. */}
          <h3>{t.rsu.performance}</h3>
          <Segmented<string>
            label={t.rsu.performance}
            value={String(performance)}
            onChange={(v) => setPerformance(Number(v))}
            options={PERFORMANCE_STEPS.map((v) => ({ id: String(v), label: `${Math.round(v * 100)}%` }))}
          />
          <div className="hint" style={{ marginTop: 6 }}>
            {t.rsu.performanceHint} · {t.rsu.performanceOn}
            <Info label={t.common.whatIsThis}>
              <p>{t.rsu.performanceWhy}</p>
            </Info>
          </div>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
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

      <div className="results">
        <div className="summary">{headline}</div>

        <div className="detail">
        {projection.upcoming.length ? (
          <>
            {/* Gli anni prima del grafico: sono la risposta in numeri, e il
                grafico è la sua forma. Stavano sotto, e per leggere quanto fa
                il 2027 bisognava scorrere oltre un grafico che quella cifra
                non la scrive da nessuna parte. */}
            <div className="grid3">
              {projection.years.map((y) => (
                <Card key={y.year}>
                  <h3 style={{ margin: 0, fontSize: "var(--t-15)", color: "var(--text)" }}>{y.year}</h3>
                  <p className="mid">{eur0(y.netEur, lang)}</p>
                  {/* Without this the last card looks like the plan tailing
                      off, when it is only the window ending mid-year. */}
                  {y.partial ? <p className="hint">{t.rsu.yearPartial}</p> : null}
                  <ul className="lines">
                    <Line name={t.rsu.yearUnits} value={num(y.units, lang, 2)} />
                    <Line name={t.rsu.yearGross} value={eur0(y.grossEur, lang)} />
                    <Line name={t.rsu.yearRate} value={pct(y.taxRate, lang)} tone="neg" />
                    <Line name={t.rsu.yearSold} value={`\u2212${num(y.sharesWithheld, lang, 0)}`} tone="neg" />
                    <Line name={t.rsu.yearShares} hint={t.rsu.yearSharesHint} value={num(y.netShares, lang, 0)} />
                    {/* The number that makes a year of RSUs comparable to a
                        salary: it is the question people actually ask looking at
                        these cards, and with salary and gross kept apart they
                        have to do it in their head. */}
                    <Line
                      name={t.rsu.yearSalaryEquiv}
                      hint={t.rsu.yearSalaryEquivHint}
                      value={eur0(salary + y.grossEur, lang)}
                      sum
                    />
                  </ul>
                </Card>
              ))}
            </div>

            <Card>
              <div className="row-inline" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>{t.rsu.chartTitle}</h2>
                <Segmented<"eur" | "units">
                  label={t.rsu.chartTitle}
                  value={scale}
                  onChange={setScale}
                  options={[
                    { id: "eur", label: "€" },
                    { id: "units", label: t.rsu.yearUnits },
                  ]}
                />
              </div>
              <VestingChart
                projection={projection}
                grants={grants}
                lang={lang}
                showEuro={scale === "eur"}
                emptyLabel={t.rsu.quarterEmpty}
              />
              <div className="chips">
                {grants.map((g, i) => (
                  <span className="chip" key={g.id}>
                    <span className="dot" style={{ background: grantColour(i) }} aria-hidden />
                    {g.label}
                  </span>
                ))}
              </div>
              <div className="hint">
                {t.rsu.chartHint} {t.rsu.chartGross}
                <Info label={t.common.whatIsThis}>
                  <p>{t.rsu.sellToCover}</p>
                </Info>
              </div>
            </Card>


            {/* Why the share count and the euro net disagree. Without saying
                it, one of the two looks wrong — and the settlement runs both
                ways, so a card that only ever announced a further deduction
                would be telling half the truth. */}
            <Card>
              <h2>{t.rsu.payslipTitle}</h2>
              <p className="note">{t.rsu.withholdingFlat(pct(WITHHOLDING_RATE, lang))}</p>
              <p className="note">
                {Math.abs(projection.totalPayslipAdjustmentEur) < 0.5
                  ? t.rsu.payslipEven
                  : projection.totalPayslipAdjustmentEur > 0
                    ? t.rsu.payslipOwed(
                        pct(projection.years[0]?.taxRate ?? 0, lang),
                        eur0(projection.totalPayslipAdjustmentEur, lang)
                      )
                    : t.rsu.payslipRefund(
                        pct(projection.years[0]?.taxRate ?? 0, lang),
                        eur0(-projection.totalPayslipAdjustmentEur, lang)
                      )}
              </p>
              <div className="hint" style={{ marginTop: 10 }}>
                {t.rsu.netWithholding}
              </div>
              <div className="scroll-x" style={{ marginTop: 14 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t.common.year}</th>
                      <th className="r optional-phone">{t.rsu.yearRate}</th>
                      <th className="r">{t.rsu.yearSold}</th>
                      <th className="r">{t.rsu.yearShares}</th>
                      <th className="r">{t.rsu.payslipColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.years.map((y) => (
                      <tr key={y.year}>
                        <td style={{ fontWeight: 660 }}>{y.year}</td>
                        <td className="r optional-phone neg">{pct(y.taxRate, lang)}</td>
                        <td className="r neg">
                          &#8722;{num(y.sharesWithheld, lang, 0)} ({pct(y.withholdingRate, lang)})
                        </td>
                        <td className="r" style={{ fontWeight: 660 }}>
                          {num(y.netShares, lang, 0)}
                        </td>
                        {/* Signed: a refund is not a smaller deduction. */}
                        <td
                          className={`r ${y.payslipAdjustmentEur > 0 ? "neg" : "pos"}`}
                          style={{ fontWeight: 660 }}
                        >
                          {y.payslipAdjustmentEur > 0 ? "\u2212" : "+"}
                          {eur0(Math.abs(y.payslipAdjustmentEur), lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Units nobody was promised. */}
            {projection.dividendUnits > 0.005 ? (
              <Card>
                <h2>{t.rsu.dividendTitle}</h2>
                <p className="note">
                  {t.rsu.dividendLine(
                    num(projection.dividendUnits, lang, 2),
                    eur0(projection.dividendUnits * projection.perUnitEur, lang)
                  )}
                </p>
                <p className="hint" style={{ marginTop: 10 }}>
                  {t.rsu.dividendAssumption(usd(lastDividend?.amount ?? 0, lang))}
                </p>
              </Card>
            ) : null}

            <Card>
              <div className="row-inline" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>{t.rsu.tableTitle}</h2>
                <Segmented<"quarter" | "tranche">
                  label={t.rsu.tableTitle}
                  value={grain}
                  onChange={setGrain}
                  options={[
                    { id: "quarter", label: t.rsu.quarterlyTable },
                    { id: "tranche", label: t.rsu.trancheTable },
                  ]}
                />
              </div>
              {grain === "quarter" ? (
                <div className="scroll-x">
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
                        <tr
                          key={q.from}
                          className={k > 0 && q.year !== vesting[k - 1].year ? "year-break" : ""}
                        >
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
              ) : (
              <div className="scroll-y">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t.rsu.tableDate}</th>
                      <th>{t.rsu.tableGrant}</th>
                      <th className="r optional">{t.rsu.tableTranche}</th>
                      <th className="r">{t.rsu.tableUnits}</th>
                      <th className="r">{t.rsu.tableValue}</th>
                      <th className="r">{t.rsu.tableNet}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.upcoming.map((tr) => {
                      const y = projection.years.find((a) => a.year === Number(tr.date.slice(0, 4)));
                      const gross = tr.units * (fx > 0 ? price / fx : 0);
                      return (
                        <tr key={`${tr.grant}-${tr.date}`}>
                          <td>{dateShort(tr.date, lang)}</td>
                          <td>
                            <span
                              className="dot"
                              style={{
                                background: grantColour(grants.findIndex((g) => g.id === tr.grant)),
                                display: "inline-block",
                                marginRight: 6,
                              }}
                              aria-hidden
                            />
                            {tr.label}
                          </td>
                          <td className="r optional">
                            {tr.index}/{tr.total}
                          </td>
                          <td className="r">{num(tr.units, lang, 2)}</td>
                          <td className="r">{eur(gross, lang)}</td>
                          <td className="r">{eur(gross * (1 - (y?.taxRate ?? 0)), lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
              <div className="hint">
                {usd(price, lang)} {t.common.perShare} · {t.common.fx} {num(fx, lang, 4)}
                <Info label={t.common.whatIsThis}>
                  <p>{t.rsu.fractionNote}</p>
                </Info>
              </div>
            </Card>
          </>
        ) : null}

        <Card>
          <h2>{t.rsu.title}</h2>
          <p className="note">{t.rsu.intro}</p>
          <p className="note">{t.rsu.whyProspect}</p>
        </Card>
        </div>
      </div>
    </div>
  );
}
