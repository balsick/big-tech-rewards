import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, DateField, Disclosure, Line, NumField, Segmented, Select } from "./ui.tsx";
import Info from "./Info.tsx";
import { Chiudi, Piu } from "./Icone.tsx";
import VestingChart, { coloreGrant } from "./VestingChart.tsx";
import { dateShort, eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import {
  CALENDARIO_VESTING,
  prospetto,
  soloStipendio,
  unitaDelGrant,
  type Cadenza,
  type Grant,
} from "../lib/rsu.ts";
import { caricaQuote, storicoAllaData, type Quote } from "../lib/prices.ts";
import RegimeEditor from "./RegimeEditor.tsx";
import Salvataggio from "./Salvataggio.tsx";
import { cancella, disponibile, leggi, scrivi } from "../lib/salvataggio.ts";
import { RAL_DEFAULT } from "../lib/meta.ts";

// Le RSU, guardate da tre anni di distanza.
//
// Un grant per volta e' il modo sbagliato: con un'assegnazione nuova ogni anno
// e vestizioni trimestrali, in un anno qualsiasi vestono pezzi di tre o quattro
// grant diversi, e il fisco somma tutto quello che cade nello stesso anno. Per
// questo i grant qui sono una lista e il conto dell'aliquota si fa per anno.

let seq = 0;
const nuovoId = () => `g${++seq}`;

/**
 * Quello che si scrive.
 *
 * Il grant e' in dollari e il prezzo che li converte in unita' non si scrive:
 * lo dice l'archivio. Tranne quando non puo' dirlo — un grant con la data nel
 * futuro non ha una chiusura — e allora `prezzoScritto` prende il posto del
 * numero letto, come per ogni altro campo di questi due strumenti: il letto e'
 * il fondo, lo scritto e' quello che ci sta sopra.
 */
type GrantScritto = Omit<Grant, "prezzoGrant"> & { prezzoScritto: number | null };

// I due grant che quasi tutti hanno insieme, e che insieme spiegano perche'
// serve guardare tre anni: il welcome, che vesta 30-30-40 e quindi ha la coda
// pesante in fondo, e il bonus annuale, che vesta a pezzetti ogni trimestre.
// Nello stesso anno arrivano entrambi, e il fisco li somma.
function grantIniziali(oggi: string): GrantScritto[] {
  const anno = Number(oggi.slice(0, 4));
  return [
    {
      id: nuovoId(),
      etichetta: "Welcome grant",
      data: `${anno}-02-20`,
      valoreUsd: 20000,
      cadenza: "30-30-40",
      anni: 3,
      dateFisse: false,
      prezzoScritto: null,
    },
    {
      id: nuovoId(),
      etichetta: `Bonus ${anno}`,
      data: `${anno}-11-20`,
      valoreUsd: 10000,
      cadenza: "trimestrale",
      anni: 3,
      dateFisse: true,
      prezzoScritto: null,
    },
  ];
}
const CHIAVE = "rsu";

/** Quello che il tasto «salva» mette nel browser: solo i campi del modulo. */
interface StatoRsu {
  grants: GrantScritto[];
  ral: number;
  orizzonte: number;
  prezzo: number | null;
  cambio: number | null;
}

export default function RsuTool() {
  const { t, lang, regime } = useStore();
  const oggi = todayISO();
  const [salvato, setSalvato] = useState(() => leggi<StatoRsu>(CHIAVE));
  const s0 = salvato?.dati;
  const possibileSalvare = useMemo(() => disponibile(), []);

  const [grants, setGrants] = useState<GrantScritto[]>(() => s0?.grants ?? grantIniziali(oggi));
  const [ral, setRal] = useState(s0?.ral ?? RAL_DEFAULT);
  const [orizzonte, setOrizzonte] = useState(s0?.orizzonte ?? 3);
  const [scala, setScala] = useState<"eur" | "unita">("eur");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [prezzo, setPrezzo] = useState<number | null>(s0?.prezzo ?? null);
  const [cambio, setCambio] = useState<number | null>(s0?.cambio ?? null);

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

  // Il prezzo che converte i dollari in unita' e' quello del **giorno del
  // grant**, non quello di oggi: e' cosi' che il piano fissa le unita', ed e'
  // la ragione per cui un grant vecchio oggi vale piu' di uno nuovo dello
  // stesso importo.
  //
  // Un grant con la data nel futuro, pero', non ha una chiusura: il prezzo
  // migliore che si possa dire e' quello di adesso. L'archivio da' sempre
  // l'ultima chiusura *precedente* alla data chiesta, quindi per una data
  // futura tornerebbe una chiusura di mesi fa — vecchia e pure sbagliata di
  // verso. Il campo dice sempre da quale giorno viene il numero.
  const prezzoAlGrant = (
    g: GrantScritto
  ): { prezzo: number; quando: string; scritto: boolean; futuro: boolean } => {
    const futuro = g.data > oggi;
    if (g.prezzoScritto != null)
      return { prezzo: g.prezzoScritto, quando: "", scritto: true, futuro };
    const storico = futuro ? null : storicoAllaData(g.data);
    if (storico) return { prezzo: storico.close, quando: storico.closeOn, scritto: false, futuro };
    return { prezzo: vPrezzo, quando: quote?.date ?? oggi, scritto: false, futuro };
  };
  const risolti = useMemo<Grant[]>(
    // `prezzoAlGrant` legge l'archivio (una funzione pura), vPrezzo e la data
    // della quote: le dipendenze sono queste.
    () => grants.map((g) => ({ ...g, prezzoGrant: prezzoAlGrant(g).prezzo })),
    [grants, vPrezzo, quote?.date, oggi]
  );

  const p = useMemo(
    () =>
      prospetto(
        { grants: risolti, prezzo: vPrezzo, cambio: vCambio, ral, oggi, orizzonte, calendario: CALENDARIO_VESTING },
        regime
      ),
    [risolti, vPrezzo, vCambio, ral, oggi, orizzonte, regime]
  );

  const stato: StatoRsu = { grants, ral, orizzonte, prezzo, cambio };
  const sporco = JSON.stringify(stato) !== JSON.stringify(salvato?.dati ?? null);

  const stipendio = soloStipendio(ral, regime);
  const patch = (id: string, q: Partial<GrantScritto>) =>
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, ...q } : g)));

  const cadenze: { id: Cadenza; label: string }[] = [
    { id: "trimestrale", label: t.rsu.schedule.trimestrale },
    { id: "annuale", label: t.rsu.schedule.annuale },
    { id: "30-30-40", label: t.rsu.schedule["30-30-40"] },
    { id: "mensile", label: t.rsu.schedule.mensile },
  ];

  // Il numero per cui si apre la pagina sta **per primo** nel sorgente, quindi
  // per primo sul telefono; sul desktop la griglia lo rimette in colonna
  // destra, sopra il dettaglio, col modulo che resta fermo a sinistra.
  const perAnno = p.nettoTotale / Math.max(1, orizzonte);
  const risposta = !p.future.length ? (
    <Card>
      <p className="note">{t.rsu.noVesting}</p>
    </Card>
  ) : (
    <Card>
      <h2 className="risposta" style={{ marginBottom: 0 }} key={Math.round(p.nettoTotale)}>
        {t.rsu.horizonTitle(orizzonte)} <span className="big">{eur0(p.nettoTotale, lang)}</span>
      </h2>
      <p className="note">
        {t.rsu.totalLine(num(p.unitaTotali, lang, 2), eur0(p.lordoTotale, lang))}
      </p>
      <p className="hint">
        {t.rsu.salaryCompare(
          Math.round((p.lordoTotale / Math.max(1, orizzonte) / Math.max(1, ral)) * 100),
          eur0(stipendio.netto, lang),
          eur0(stipendio.netto + perAnno, lang)
        )}
      </p>
    </Card>
  );

  return (
    <div className="tool">
      <div className="sintesi">{risposta}</div>

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
                    className="icon-btn"
                    type="button"
                    onClick={() => setGrants((gs) => gs.filter((x) => x.id !== g.id))}
                    aria-label={`${t.rsu.removeGrant}: ${g.etichetta}`}
                  >
                    <Chiudi />
                  </button>
                ) : null}
              </div>
              <div className="grid2 has-date allinea">
                <DateField label={t.rsu.grantDate} value={g.data} onChange={(v) => patch(g.id, { data: v })} />
                <NumField
                  lang={lang}
                  label={t.rsu.grantValue}
                  suffix="$"
                  info={
                    <Info label={t.common.whatIsThis}>
                      <p>{t.rsu.grantValueWhy}</p>
                    </Info>
                  }
                  dec={0}
                  value={g.valoreUsd}
                  onChange={(v) => patch(g.id, { valoreUsd: v })}
                  hint={(() => {
                    const { prezzo, quando, scritto } = prezzoAlGrant(g);
                    if (!(prezzo > 0)) return t.rsu.grantValueNoPrice;
                    const unita = num(unitaDelGrant({ ...g, prezzoGrant: prezzo }), lang, 2);
                    return scritto
                      ? t.rsu.grantValueHintManual(unita, usd(prezzo, lang))
                      : t.rsu.grantValueHint(unita, usd(prezzo, lang), dateShort(quando, lang));
                  })()}
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
                {/* Il 30-30-40 ha la durata dentro il nome: tre vestizioni
                    annuali, e il campo non c'e' niente da cambiare. Mostrarlo
                    disabilitato con un "3" grigio dentro sembrava un campo
                    rotto, e sul telefono era una riga sprecata su quattro. */}
                {g.cadenza === "30-30-40" ? null : (
                  <NumField
                    lang={lang}
                    label={t.rsu.grantYears}
                    suffix={t.rsu.years}
                    dec={0}
                    value={g.anni}
                    onChange={(v) => patch(g.id, { anni: Math.max(1, Math.round(v)) })}
                  />
                )}
              </div>
              {/* Il prezzo del grant si scrive solo quando l'archivio non
                  puo' dirlo — data nel futuro — o quando l'hai gia' scritto:
                  un campo che compare e scompare al cambio di data non deve
                  portarsi via il numero che ci avevi messo. */}
              {(() => {
                const r = prezzoAlGrant(g);
                if (!r.futuro && !r.scritto) return null;
                return (
                  <div style={{ marginTop: 10 }}>
                    <NumField
                      lang={lang}
                      label={t.rsu.grantPrice}
                      suffix="$"
                      value={r.prezzo}
                      onChange={(v) => patch(g.id, { prezzoScritto: v })}
                      hint={r.scritto ? t.common.manual : t.rsu.grantPriceFuture}
                    />
                    {r.scritto ? (
                      <button
                        className="btn link"
                        type="button"
                        onClick={() => patch(g.id, { prezzoScritto: null })}
                      >
                        {t.common.reset}
                      </button>
                    ) : null}
                  </div>
                );
              })()}
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
                  etichetta: `Bonus ${anno + gs.length - 1}`,
                  data: `${anno}-02-20`,
                  valoreUsd: 10000,
                  cadenza: "trimestrale",
                  anni: 3,
                  dateFisse: true,
                  prezzoScritto: null,
                },
              ]);
            }}
          >
            <Piu />
            {t.rsu.addGrant}
          </button>

          <NumField
            lang={lang}
            label={t.common.ral}
            suffix="€"
            dec={0}
            value={ral}
            onChange={setRal}
            info={
              <Info label={t.common.whatIsThis}>
                <p>{t.common.ralWhy}</p>
                <p>{t.common.ralWhy2}</p>
              </Info>
            }
          />

          <div className="grid2 allinea" style={{ marginTop: 18 }}>
            <NumField
              lang={lang}
              label={t.common.price}
              suffix="$"
              info={
                <Info label={t.common.whatIsThis}>
                  <p>{t.rsu.priceNote}</p>
                </Info>
              }
              value={vPrezzo}
              onChange={setPrezzo}
              hint={
                prezzo !== null
                  ? t.common.manual
                  : quote
                    ? `${t.common.fromQuote} ${dateShort(quote.date, lang)}`
                    : ultimo
                      ? `${t.common.fromHistory} ${dateShort(ultimo.closeOn, lang)}`
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


          <h3>{t.rsu.horizon}</h3>
          <Segmented<"1" | "3" | "5">
            label={t.rsu.horizon}
            value={String(orizzonte) as "1" | "3" | "5"}
            onChange={(v) => setOrizzonte(Number(v))}
            options={[
              { id: "1", label: t.rsu.anni(1) },
              { id: "3", label: t.rsu.anni(3) },
              { id: "5", label: t.rsu.anni(5) },
            ]}
          />

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <Disclosure label={t.tax.title}>
              <RegimeEditor ral={ral} />
            </Disclosure>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <Salvataggio
              quando={salvato?.quando ?? null}
              sporco={sporco}
              possibile={possibileSalvare}
              onSalva={() => setSalvato(scrivi(CHIAVE, stato))}
              onDimentica={() => {
                cancella(CHIAVE);
                setSalvato(null);
              }}
            />
          </div>
        </Card>
      </div>

      <div className="dettagli">
        {p.future.length ? (
          <>
            <Card>
              <div className="row-inline" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>{t.rsu.chartTitle}</h2>
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
              <VestingChart p={p} grants={grants} lang={lang} mostraEuro={scala === "eur"} />
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

            <div className="grid3" style={{ marginTop: 14 }}>
              {p.anni.map((a) => (
                <Card key={a.anno}>
                  <h3 style={{ margin: 0, fontSize: "var(--t-15)", color: "var(--text)" }}>{a.anno}</h3>
                  <p className="mid" style={{ margin: "4px 0 0" }}>
                    {eur0(a.nettoEur, lang)}
                  </p>
                  <ul className="lines">
                    <Line name={t.rsu.yearUnits} value={num(a.unita, lang, 2)} />
                    <Line name={t.rsu.yearGross} value={eur0(a.lordoEur, lang)} />
                    <Line name={t.rsu.yearRate} value={pct(a.aliquota, lang)} tone="neg" />
                    <Line
                      name={t.rsu.yearShares}
                      hint={t.rsu.yearSharesHint}
                      value={num(a.azioniNette, lang, 0)}
                    />
                    {/* Il numero che rende paragonabile un anno di RSU a uno
                        stipendio: e' la domanda che uno si fa davvero guardando
                        queste schede, e con RAL e lordo separati la si deve
                        fare a mente. */}
                    <Line
                      name={t.rsu.yearRalEquiv}
                      hint={t.rsu.yearRalEquivHint}
                      value={eur0(ral + a.lordoEur, lang)}
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
                      <th className="r opz">{t.rsu.tableTranche}</th>
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
                          <td className="r opz">
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
              <p className="hint">
                {usd(vPrezzo, lang)} {t.common.perShare} · {t.common.fx} {num(vCambio, lang, 4)}
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
  );
}
