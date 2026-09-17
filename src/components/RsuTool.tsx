import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, DateField, Line, NumField, Segmented, Select } from "./ui.tsx";
import VestingChart, { coloreGrant } from "./VestingChart.tsx";
import { dateShort, eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import { CALENDARIO_VESTING, prospetto, soloStipendio, type Cadenza, type Grant } from "../lib/rsu.ts";
import { caricaQuote, storicoAllaData, type Quote } from "../lib/prices.ts";
import { RAL_DEFAULT } from "../lib/meta.ts";

// Le RSU, guardate da tre anni di distanza.
//
// Un grant per volta e' il modo sbagliato: con un'assegnazione nuova ogni anno
// e vestizioni trimestrali, in un anno qualsiasi vestono pezzi di tre o quattro
// grant diversi, e il fisco somma tutto quello che cade nello stesso anno. Per
// questo i grant qui sono una lista e il conto dell'aliquota si fa per anno.

let seq = 0;
const nuovoId = () => `g${++seq}`;

function grantIniziali(oggi: string): Grant[] {
  const anno = Number(oggi.slice(0, 4));
  return [
    {
      id: nuovoId(),
      etichetta: `Grant ${anno - 1}`,
      data: `${anno - 1}-02-20`,
      unita: 400,
      cadenza: "trimestrale",
      anni: 3,
      dateFisse: true,
    },
    {
      id: nuovoId(),
      etichetta: `Grant ${anno}`,
      data: `${anno}-02-20`,
      unita: 300,
      cadenza: "trimestrale",
      anni: 3,
      dateFisse: true,
    },
  ];
}

export default function RsuTool() {
  const { t, lang, regime } = useStore();
  const oggi = todayISO();
  const [grants, setGrants] = useState<Grant[]>(() => grantIniziali(oggi));
  const [ral, setRal] = useState(RAL_DEFAULT);
  const [orizzonte, setOrizzonte] = useState(3);
  const [scala, setScala] = useState<"eur" | "unita">("eur");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [prezzo, setPrezzo] = useState<number | null>(null);
  const [cambio, setCambio] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    caricaQuote().then((q) => vivo && q && setQuote(q));
    return () => {
      vivo = false;
    };
  }, []);

  const ultimo = storicoAllaData(oggi);
  const vPrezzo = prezzo ?? quote?.close ?? ultimo?.close ?? 0;
  const vCambio = cambio ?? quote?.eurusd ?? ultimo?.eurusd ?? 1;

  const p = useMemo(
    () => prospetto({ grants, prezzo: vPrezzo, cambio: vCambio, ral, oggi, orizzonte, calendario: CALENDARIO_VESTING }, regime),
    [grants, vPrezzo, vCambio, ral, oggi, orizzonte, regime]
  );

  const stipendio = soloStipendio(ral, regime);
  const patch = (id: string, q: Partial<Grant>) =>
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, ...q } : g)));

  const cadenze: { id: Cadenza; label: string }[] = [
    { id: "trimestrale", label: t.rsu.schedule.trimestrale },
    { id: "annuale", label: t.rsu.schedule.annuale },
    { id: "30-30-40", label: t.rsu.schedule["30-30-40"] },
    { id: "mensile", label: t.rsu.schedule.mensile },
  ];

  return (
    <div className="tool">
      <div className="panel">
        <Card>
          <h2>{t.rsu.grants}</h2>
          {grants.map((g, i) => (
            <div
              key={g.id}
              style={{
                marginTop: i ? 14 : 8,
                paddingTop: i ? 14 : 0,
                borderTop: i ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="dot" style={{ background: coloreGrant(i) }} aria-hidden />
                <input
                  className="inp"
                  aria-label={t.rsu.grantLabel}
                  value={g.etichetta}
                  onChange={(ev) => patch(g.id, { etichetta: ev.target.value })}
                  style={{ fontWeight: 650 }}
                />
                {grants.length > 1 ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setGrants((gs) => gs.filter((x) => x.id !== g.id))}
                    aria-label={`${t.rsu.removeGrant}: ${g.etichetta}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className="grid2">
                <DateField label={t.rsu.grantDate} value={g.data} onChange={(v) => patch(g.id, { data: v })} />
                <NumField
                  lang={lang}
                  label={t.rsu.grantUnits}
                  dec={4}
                  value={g.unita}
                  onChange={(v) => patch(g.id, { unita: v })}
                />
                <Select<Cadenza>
                  label={t.rsu.grantSchedule}
                  value={g.cadenza}
                  options={cadenze}
                  onChange={(v) => patch(g.id, { cadenza: v })}
                  hint={
                    g.cadenza === "trimestrale"
                      ? t.rsu.schedule.trimestraleHint
                      : g.cadenza === "annuale"
                        ? t.rsu.schedule.annualeHint
                        : g.cadenza === "30-30-40"
                          ? t.rsu.schedule["30-30-40Hint"]
                          : t.rsu.schedule.mensileHint
                  }
                />
                <NumField
                  lang={lang}
                  label={t.rsu.grantYears}
                  suffix={t.rsu.years}
                  dec={0}
                  value={g.anni}
                  onChange={(v) => patch(g.id, { anni: Math.max(1, Math.round(v)) })}
                  disabled={g.cadenza === "30-30-40"}
                />
              </div>
              {g.cadenza === "trimestrale" || g.cadenza === "mensile" ? (
                <div style={{ marginTop: 10 }}>
                  <Check
                    label={t.rsu.fixedDates}
                    checked={g.dateFisse}
                    onChange={(v) => patch(g.id, { dateFisse: v })}
                    hint={t.rsu.fixedDatesHint(CALENDARIO_VESTING.join(", "))}
                  />
                </div>
              ) : null}
            </div>
          ))}
          <button
            className="btn primary"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() => {
              const anno = Number(oggi.slice(0, 4));
              setGrants((gs) => [
                ...gs,
                {
                  id: nuovoId(),
                  etichetta: `Grant ${anno + gs.length - 1}`,
                  data: `${anno}-02-20`,
                  unita: 300,
                  cadenza: "trimestrale",
                  anni: 3,
                  dateFisse: true,
                },
              ]);
            }}
          >
            + {t.rsu.addGrant}
          </button>

          <h3>{t.common.ral}</h3>
          <NumField lang={lang} label={t.common.ral} suffix="€" dec={0} value={ral} onChange={setRal} />
          <p className="hint">{t.common.ralWhy}</p>

          <h3>{t.common.price}</h3>
          <div className="grid2">
            <NumField
              lang={lang}
              label={t.common.price}
              suffix="$"
              value={vPrezzo}
              onChange={setPrezzo}
              hint={
                prezzo !== null
                  ? t.common.manual
                  : quote
                    ? `${t.common.fromQuote} — ${quote.date}`
                    : ultimo
                      ? `${t.common.fromHistory} — ${ultimo.closeOn}`
                      : undefined
              }
            />
            <NumField
              lang={lang}
              label={t.common.fx}
              dec={4}
              value={vCambio}
              onChange={setCambio}
              hint={cambio !== null ? t.common.manual : t.common.fxHint}
            />
          </div>
          <p className="hint">{t.rsu.priceNote}</p>

          <h3>{t.rsu.horizon}</h3>
          <Segmented<"1" | "3" | "5">
            label={t.rsu.horizon}
            value={String(orizzonte) as "1" | "3" | "5"}
            onChange={(v) => setOrizzonte(Number(v))}
            options={[
              { id: "1", label: `1 ${t.rsu.years}` },
              { id: "3", label: `3 ${t.rsu.years}` },
              { id: "5", label: `5 ${t.rsu.years}` },
            ]}
          />
        </Card>
      </div>

      <div>
        <Card>
          <h2>{t.rsu.title}</h2>
          <p className="note">{t.rsu.intro}</p>
          <p className="note">{t.rsu.whyProspect}</p>
        </Card>

        {!p.future.length ? (
          <Card delay={60}>
            <p className="note">{t.rsu.noVesting}</p>
          </Card>
        ) : (
          <>
            <Card delay={60}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ marginRight: "auto", marginBottom: 0 }}>{t.rsu.chartTitle}</h2>
                <Segmented<"eur" | "unita">
                  label={t.rsu.chartTitle}
                  value={scala}
                  onChange={setScala}
                  options={[
                    { id: "eur", label: "€" },
                    { id: "unita", label: t.rsu.yearUnits },
                  ]}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <VestingChart p={p} grants={grants} lang={lang} mostraEuro={scala === "eur"} />
              </div>
              <div className="chips">
                {grants.map((g, i) => (
                  <span className="chip" key={g.id}>
                    <span className="dot" style={{ background: coloreGrant(i) }} aria-hidden />
                    {g.etichetta}
                  </span>
                ))}
              </div>
              <p className="hint">{t.rsu.chartHint}</p>
            </Card>

            <Card delay={120}>
              <div className="eyebrow">{t.rsu.totalTitle}</div>
              <div className="big">{eur0(p.nettoTotale, lang)}</div>
              <p className="note">
                {t.rsu.totalLine(num(p.unitaTotali, lang, 2), eur0(p.lordoTotale, lang), eur0(p.nettoTotale, lang))}
              </p>
              <p className="hint">
                {t.rsu.salaryCompare(
                  Math.round((p.lordoTotale / Math.max(1, orizzonte) / Math.max(1, ral)) * 100)
                )}{" "}
                {stipendio.netto > 0
                  ? `— ${eur0(stipendio.netto, lang)} → ${eur0(stipendio.netto + p.nettoTotale / Math.max(1, orizzonte), lang)} ${t.common.net}/${t.common.year}`
                  : ""}
              </p>
            </Card>

            <div className="grid3" style={{ marginTop: 16 }}>
              {p.anni.map((a, i) => (
                <Card key={a.anno} delay={150 + i * 40}>
                  <div className="eyebrow">{t.rsu.yearTitle(a.anno)}</div>
                  <div className="mid" style={{ fontSize: 24 }}>
                    {eur0(a.nettoEur, lang)}
                  </div>
                  <ul className="lines">
                    <Line name={t.rsu.yearUnits} value={num(a.unita, lang, 2)} />
                    <Line name={t.rsu.yearGross} value={eur0(a.lordoEur, lang)} />
                    <Line name={t.rsu.yearRate} value={pct(a.aliquota, lang)} tone="neg" />
                    <Line
                      name={t.rsu.yearShares}
                      hint={t.rsu.yearSharesHint}
                      value={num(a.azioniNette, lang, 0)}
                    />
                  </ul>
                </Card>
              ))}
            </div>

            <Card delay={320}>
              <h2>{t.rsu.tableTitle}</h2>
              <div className="scroll-y">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t.rsu.tableDate}</th>
                      <th>{t.rsu.tableGrant}</th>
                      <th className="r">{t.rsu.tableTranche}</th>
                      <th className="r">{t.rsu.tableUnits}</th>
                      <th className="r">{t.rsu.tableValue}</th>
                      <th className="r">{t.rsu.tableNet}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.future.map((tr) => {
                      const anno = p.anni.find((a) => a.anno === Number(tr.data.slice(0, 4)));
                      const lordo = tr.unita * (vCambio > 0 ? vPrezzo / vCambio : 0);
                      return (
                        <tr key={`${tr.grant}-${tr.data}`}>
                          <td>{dateShort(tr.data, lang)}</td>
                          <td>
                            <span
                              className="dot"
                              style={{
                                background: coloreGrant(grants.findIndex((g) => g.id === tr.grant)),
                                display: "inline-block",
                                marginRight: 6,
                              }}
                              aria-hidden
                            />
                            {tr.etichetta}
                          </td>
                          <td className="r">
                            {tr.indice}/{tr.totali}
                          </td>
                          <td className="r">{num(tr.unita, lang, 2)}</td>
                          <td className="r">{eur(lordo, lang)}</td>
                          <td className="r">{eur(lordo * (1 - (anno?.aliquota ?? 0)), lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="hint">{t.rsu.fractionNote}</p>
              <p className="hint">
                {usd(vPrezzo, lang)} {t.common.perShare} · {t.common.fx} {num(vCambio, lang, 4)}
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
