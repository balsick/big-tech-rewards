import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Answer, Card, Line, NumField } from "./ui.tsx";
import Info from "./Info.tsx";
import SaveToBrowser from "./SaveToBrowser.tsx";
import { available, clear, read, write } from "../lib/storage.ts";
import { eur0, num, pct, todayISO } from "../lib/format.ts";
import { grossToNet, type TaxRegime } from "../lib/tax.ts";
import { ESPP_PLAN, expectedContribution, simulateEspp } from "../lib/espp.ts";
import { VESTING_CALENDAR, project, type Grant } from "../lib/rsu.ts";
import { dividends, fmvAt, historyAt, loadQuote, type Quote } from "../lib/prices.ts";

// The whole package, year by year.
//
// The two tools each answer one question well and neither answers the one
// people actually ask, which is "what does this job pay". That number is not
// the salary and it is not the salary plus a share price: it is four things
// landing in the same tax year, and the tax is what makes them impossible to
// add up in your head — every extra euro of RSU is taxed at the margin of a
// total that includes the bonus, and the marginal rate in Italy is not even
// monotonic.
//
// What belongs in here is **employment income**: salary, cash bonus, the gross
// value of the shares that vest, and the ESPP discount. The market gain beyond
// the discount does not belong — that is a position in shares whose value the
// market decides, and putting it in a pay figure would be counting a hope as a
// salary.

const KEY = "total";

/**
 * Quello che il tasto mette nel browser: il campo di questa scheda, e basta.
 *
 * È uno solo — la percentuale del bonus — e per un po' non l'ha salvato
 * nessuno: le altre due schede salvano i campi che mostrano, e questa era
 * l'unica delle tre senza il tasto. Chi scriveva il suo 12% se lo ritrovava a
 * zero al ricaricamento, senza che niente lo dicesse.
 *
 * Lo stipendio e le altre righe qui sotto non ci stanno apposta: questa scheda
 * le **legge**, non le modifica, e le salva la scheda che le possiede. Salvare
 * anche loro vorrebbe dire due sorgenti per lo stesso numero, e quella che
 * vince dipenderebbe dall'ordine in cui le schede si montano.
 */
interface TotalState {
  bonusPct: number;
}

interface Row {
  year: number;
  salary: number;
  bonus: number;
  rsu: number;
  espp: number;
  gross: number;
  net: number;
  rate: number;
}

export default function TotalReward() {
  const { t, lang, regime, salary, bonusPct, setBonusPct, esppPct, grants, performance, horizonYears } =
    useStore();
  const today = todayISO();
  const [quote, setQuote] = useState<Quote | null>(null);

  const [saved, setSaved] = useState(() => read<TotalState>(KEY));
  const s0 = saved?.data;
  const canSave = useMemo(() => available(), []);

  // Il salvataggio si rimette nel modello condiviso una volta sola, al
  // montaggio: dopo comanda quello che scrivi.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !s0) return;
    restored.current = true;
    if (typeof s0.bonusPct === "number") setBonusPct(s0.bonusPct);
  }, [s0, setBonusPct]);

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

  // The ESPP discount for a whole year: two windows, each at the tab's
  // percentage. The reference and purchase prices are the ones available now —
  // a future window cannot have a real close, so this is the flat-price case,
  // which is also the honest floor.
  const esppYear = useMemo(() => {
    const contributed = expectedContribution(salary, esppPct, ESPP_PLAN.months);
    if (!(contributed > 0) || !(price > 0) || !(fx > 0)) return 0;
    const one = simulateEspp(
      { salary, contributed, priceAtStart: price, priceAtPurchase: price, fxRate: fx, plan: ESPP_PLAN },
      regime
    );
    return one.discountValue * (ESPP_PLAN.purchaseDays.length || 2);
  }, [salary, esppPct, price, fx, regime]);

  const rows = useMemo<Row[]>(() => {
    const bonus = (salary * bonusPct) / 100;
    return projection.years.map((y) => {
      const extra = bonus + y.grossEur + esppYear;
      const gross = salary + extra;
      // One calculation on the whole year, not four separate ones: the rate the
      // RSUs pay depends on the bonus being there, which is the entire reason
      // this table cannot be four columns added up afterwards.
      const net = grossToNet({ salary: gross }, regime as TaxRegime).net;
      return {
        year: y.year,
        salary,
        bonus,
        rsu: y.grossEur,
        espp: esppYear,
        gross,
        net,
        rate: gross > 0 ? (gross - net) / gross : 0,
      };
    });
  }, [projection, salary, bonusPct, esppYear, regime]);

  const totals = rows.reduce(
    (a, r) => ({
      gross: a.gross + r.gross,
      net: a.net + r.net,
      variable: a.variable + r.bonus + r.rsu + r.espp,
    }),
    { gross: 0, net: 0, variable: 0 }
  );

  const state: TotalState = { bonusPct };
  const dirty = JSON.stringify(state) !== JSON.stringify(saved?.data ?? null);

  return (
    <div className="tool">
      <div className="panel">
        <Card>
          <h2>{t.total.title}</h2>
          <p className="note">{t.total.intro}</p>
          <NumField
            lang={lang}
            label={t.total.bonus}
            suffix="%"
            dec={1}
            value={bonusPct}
            onChange={(v) => setBonusPct(Math.max(0, Math.min(100, v)))}
            hint={t.total.bonusHint(eur0((salary * bonusPct) / 100, lang))}
            info={
              <Info label={t.common.whatIsThis}>
                <p>{t.total.bonusWhy}</p>
              </Info>
            }
          />
          <ul className="lines" style={{ marginTop: 16 }}>
            <Line name={t.common.salary} value={eur0(salary, lang)} />
            <Line name={t.espp.contribution} value={`${num(esppPct, lang, 0)}%`} />
            <Line name={t.rsu.grants} value={num(grants.length, lang, 0)} />
            <Line name={t.rsu.performance} value={`${num(performance * 100, lang, 0)}%`} />
          </ul>
          <p className="hint" style={{ marginTop: 12 }}>
            {t.total.rsuNote}
          </p>

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
        <div className="summary">
          <Card>
            <Answer
              items={[
                { name: t.total.answerGross, value: eur0(totals.gross, lang) },
                { name: t.total.answerNet, value: eur0(totals.net, lang) },
              ]}
            />
            <p className="note" style={{ marginTop: 14 }}>
              {t.total.variableShare(pct(totals.gross > 0 ? totals.variable / totals.gross : 0, lang, 0))}
            </p>
            <p className="hint">{t.total.variableHint}</p>
          </Card>
        </div>

        <div className="detail">
          <Card>
            <h2>{t.total.title}</h2>
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t.total.colYear}</th>
                    <th className="r optional-phone">{t.total.colSalary}</th>
                    <th className="r optional-phone">{t.total.colBonus}</th>
                    <th className="r">{t.total.colRsu}</th>
                    <th className="r optional">{t.total.colEspp}</th>
                    <th className="r">{t.total.colGross}</th>
                    <th className="r optional">{t.total.colRate}</th>
                    <th className="r">{t.total.colNet}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.year}>
                      <td style={{ fontWeight: 660 }}>{r.year}</td>
                      <td className="r optional-phone">{eur0(r.salary, lang)}</td>
                      <td className="r optional-phone">{eur0(r.bonus, lang)}</td>
                      <td className="r">{eur0(r.rsu, lang)}</td>
                      <td className="r optional">{eur0(r.espp, lang)}</td>
                      <td className="r">{eur0(r.gross, lang)}</td>
                      <td className="r optional neg">{pct(r.rate, lang)}</td>
                      <td className="r" style={{ fontWeight: 660, fontSize: "var(--t-20)" }}>
                        {eur0(r.net, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="lines" style={{ marginTop: 14 }}>
              <Line name={`${t.total.totalRow} · ${t.total.colGross}`} value={eur0(totals.gross, lang)} sum />
              <Line name={`${t.total.totalRow} · ${t.total.colNet}`} value={eur0(totals.net, lang)} sum />
            </ul>
            <p className="hint" style={{ marginTop: 12 }}>
              {t.total.rateNote}
            </p>
            <p className="hint" style={{ marginTop: 8 }}>
              {t.total.esppNote}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
