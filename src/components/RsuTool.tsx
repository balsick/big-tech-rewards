import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, DateField, Disclosure, Line, NumField, Segmented, Select } from "./ui.tsx";
import Info from "./Info.tsx";
import SaveToBrowser from "./SaveToBrowser.tsx";
import RegimeEditor from "./RegimeEditor.tsx";
import VestingChart, { grantColour } from "./VestingChart.tsx";
import { Close, Plus } from "./Icons.tsx";
import { dateShort, eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import {
  VESTING_CALENDAR,
  grantUnits,
  newGrantId,
  project,
  salaryOnly,
  withUniqueIds,
  type Grant,
  type VestingSchedule,
} from "../lib/rsu.ts";
import { historyAt, loadQuote, type Quote } from "../lib/prices.ts";
import { available, clear, read, write } from "../lib/storage.ts";
import { DEFAULT_SALARY } from "../lib/meta.ts";

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
type GrantInput = Omit<Grant, "priceAtGrant"> & { typedPrice: number | null };

const KEY = "rsu";

/** What the save button puts in the browser: the form fields, nothing else. */
interface RsuState {
  grants: GrantInput[];
  salary: number;
  horizonYears: number;
  price: number | null;
  fxRate: number | null;
}

// The two grants most people hold at once, and which together explain why three
// years are needed: the welcome grant, which vests 30-30-40 and so has its
// weight at the end, and the annual bonus, which vests in slices every quarter.
// They land in the same years, and the taxman adds them up.
function initialGrants(today: string): GrantInput[] {
  const year = Number(today.slice(0, 4));
  return [
    {
      id: newGrantId(),
      label: "Welcome grant",
      date: `${year}-02-20`,
      valueUsd: 20000,
      schedule: "30-30-40",
      years: 3,
      usePlanDates: false,
      typedPrice: null,
    },
    {
      id: newGrantId(),
      label: `Bonus ${year}`,
      date: `${year}-11-20`,
      valueUsd: 10000,
      schedule: "quarterly",
      years: 3,
      usePlanDates: true,
      typedPrice: null,
    },
  ];
}

export default function RsuTool() {
  const { t, lang, regime } = useStore();
  const today = todayISO();

  const [saved, setSaved] = useState(() => read<RsuState>(KEY));
  const s0 = saved?.data;
  const canSave = useMemo(() => available(), []);

  // Whatever comes out of storage goes through `withUniqueIds`: a save written
  // by an earlier version can carry duplicate ids, and those make two rows share
  // one entry in the list.
  const [grants, setGrants] = useState<GrantInput[]>(() =>
    s0?.grants ? withUniqueIds(s0.grants) : initialGrants(today)
  );
  const [salary, setSalary] = useState(s0?.salary ?? DEFAULT_SALARY);
  const [horizonYears, setHorizonYears] = useState(s0?.horizonYears ?? 3);
  const [scale, setScale] = useState<"eur" | "units">("eur");

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
  const priceAtGrant = (g: GrantInput): { price: number; on: string; typed: boolean; future: boolean } => {
    const future = g.date > today;
    if (g.typedPrice != null) return { price: g.typedPrice, on: "", typed: true, future };
    const point = future ? null : historyAt(g.date);
    if (point) return { price: point.close, on: point.closeOn, typed: false, future };
    return { price, on: quote?.date ?? today, typed: false, future };
  };

  const resolved = useMemo<Grant[]>(
    // `priceAtGrant` reads the archive (a pure function), the current price and
    // the quote date: those are the dependencies.
    () => grants.map((g) => ({ ...g, priceAtGrant: priceAtGrant(g).price })),
    [grants, price, quote?.date, today]
  );

  const projection = useMemo(
    () => project({ grants: resolved, price, fxRate: fx, salary, today, horizonYears, calendar: VESTING_CALENDAR }, regime),
    [resolved, price, fx, salary, today, horizonYears, regime]
  );

  const state: RsuState = { grants, salary, horizonYears, price: typedPrice, fxRate: typedFx };
  const dirty = JSON.stringify(state) !== JSON.stringify(saved?.data ?? null);

  const salaryNet = salaryOnly(salary, regime);
  const patch = (id: string, q: Partial<GrantInput>) =>
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, ...q } : g)));

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
      <h2 className="answer" style={{ marginBottom: 0 }} key={Math.round(projection.totalNet)}>
        {t.rsu.horizonTitle(projection.years[projection.years.length - 1]?.year ?? 0)}{" "}
        <span className="big">{eur0(projection.totalNet, lang)}</span>
      </h2>
      <p className="note">
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
          <h2>{t.rsu.grants}</h2>
          {grants.map((g, i) => {
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
                  {grants.length > 1 ? (
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => setGrants((gs) => gs.filter((x) => x.id !== g.id))}
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
            className="btn primary"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() => {
              const year = Number(today.slice(0, 4));
              setGrants((gs) => [
                ...gs,
                {
                  id: newGrantId(),
                  label: `Bonus ${year + gs.length - 1}`,
                  date: `${year}-11-20`,
                  valueUsd: 10000,
                  schedule: "quarterly",
                  years: 3,
                  usePlanDates: true,
                  typedPrice: null,
                },
              ]);
            }}
          >
            <Plus />
            {t.rsu.addGrant}
          </button>

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

          <h3>{t.rsu.horizon}</h3>
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
              <p className="hint">
                {t.rsu.chartHint} {t.rsu.chartGross}
                <Info label={t.common.whatIsThis}>
                  <p>{t.rsu.sellToCover}</p>
                </Info>
              </p>
            </Card>

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
                    <Line name={t.rsu.yearSold} value={`\u2212${num(y.sharesSold, lang, 0)}`} tone="neg" />
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
              <h2>{t.rsu.tableTitle}</h2>
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
              <p className="hint">
                {usd(price, lang)} {t.common.perShare} · {t.common.fx} {num(fx, lang, 4)}
                <Info label={t.common.whatIsThis}>
                  <p>{t.rsu.fractionNote}</p>
                </Info>
              </p>
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
