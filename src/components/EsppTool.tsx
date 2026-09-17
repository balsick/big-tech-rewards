import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, DateField, Disclosure, Line, NumField } from "./ui.tsx";
import Info from "./Info.tsx";
import { Livello } from "./Icone.tsx";
import { dateShort, eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import {
  PIANO_ESPP,
  accantonamentoAtteso,
  finestraEspp,
  minimoGarantito,
  simulaEspp,
  type PianoEspp,
} from "../lib/espp.ts";
import { caricaQuote, cambioLive, storicoAllaData, type Quote } from "../lib/prices.ts";
import RegimeEditor from "./RegimeEditor.tsx";
import Salvataggio from "./Salvataggio.tsx";
import { cancella, disponibile, leggi, scrivi } from "../lib/salvataggio.ts";
import { RAL_DEFAULT } from "../lib/meta.ts";

// L'ESPP: cosa succede il giorno dell'acquisto, e quanto rende il giro.
//
// Il modulo sta a sinistra e resta fermo, la risposta a destra si rifa' mentre
// scrivi: uno strumento e' un modulo e una risposta, e finche' stanno uno sotto
// l'altro cambiare un numero vuol dire scorrere per vedere cos'e' cambiato, che
// e' meta' del motivo per cui questi conti esistono.

const PASSI = Array.from({ length: 15 }, (_, i) => i + 1);

const CHIAVE = "espp";

/** Quello che il tasto «salva» mette nel browser: solo i campi del modulo. */
interface StatoEspp {
  inizio: string;
  acquisto: string;
  ral: number;
  percentuale: number;
  accantonato: number | null;
  prezzoInizio: number | null;
  prezzoFine: number | null;
  cambio: number | null;
  piano: PianoEspp;
}

export default function EsppTool() {
  const { t, lang, regime } = useStore();
  // Il salvataggio si legge una volta, negli inizializzatori: leggerlo in un
  // effetto vorrebbe dire mostrare i default per un fotogramma e poi
  // sovrascriverli sotto gli occhi.
  const [salvato, setSalvato] = useState(() => leggi<StatoEspp>(CHIAVE));
  const s0 = salvato?.dati;
  const possibileSalvare = useMemo(() => disponibile(), []);

  const [piano, setPiano] = useState<PianoEspp>(s0?.piano ?? PIANO_ESPP);
  const finestra = useMemo(() => finestraEspp(todayISO(), piano), [piano]);

  const [inizio, setInizio] = useState(s0?.inizio ?? finestra.inizio);
  const [acquisto, setAcquisto] = useState(s0?.acquisto ?? finestra.acquisto);
  const [ral, setRal] = useState(s0?.ral ?? RAL_DEFAULT);
  const [percentuale, setPercentuale] = useState(s0?.percentuale ?? 15);
  // L'accantonato si calcola dalla percentuale finche' non lo riscrivi: due
  // stati per un campo sarebbero due verita', quindi il calcolato e' il fondo e
  // lo scritto e' quello che ci sta sopra.
  const [accantonatoScritto, setAccantonato] = useState<number | null>(s0?.accantonato ?? null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFallita, setQuoteFallita] = useState(false);
  const [prezzoInizio, setPrezzoInizio] = useState<number | null>(s0?.prezzoInizio ?? null);
  const [prezzoFine, setPrezzoFine] = useState<number | null>(s0?.prezzoFine ?? null);
  const [cambio, setCambio] = useState<number | null>(s0?.cambio ?? null);
  const [cambioNota, setCambioNota] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    caricaQuote().then((q) => {
      if (!vivo) return;
      if (q) setQuote(q);
      else setQuoteFallita(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // I riferimenti: il prezzo d'inizio viene dall'archivio storico alla data
  // d'inizio, quello dell'acquisto dall'ultima chiusura disponibile — un prezzo
  // futuro non esiste, e dire di quando e' quello che c'e' e' l'unica cosa
  // onesta da fare.
  const storicoInizio = storicoAllaData(inizio);
  const storicoFine = storicoAllaData(acquisto);
  const baseInizio = storicoInizio?.close ?? quote?.close ?? 0;
  const baseFine = (acquisto > (quote?.date ?? "") ? quote?.close : storicoFine?.close) ?? quote?.close ?? storicoFine?.close ?? 0;
  const baseCambio = quote?.eurusd ?? storicoFine?.eurusd ?? 1;

  const vInizio = prezzoInizio ?? baseInizio;
  const vFine = prezzoFine ?? baseFine;
  const vCambio = cambio ?? baseCambio;

  const attesa = accantonamentoAtteso(ral, percentuale, piano.mesi);
  const accantonato = accantonatoScritto ?? attesa;

  const e = useMemo(
    () =>
      accantonato > 0 && vInizio > 0 && vFine > 0 && vCambio > 0 && ral > 0
        ? simulaEspp({ ral, accantonato, prezzoInizio: vInizio, prezzoFine: vFine, cambio: vCambio, piano }, regime)
        : null,
    [ral, accantonato, vInizio, vFine, vCambio, piano, regime]
  );

  const stato: StatoEspp = {
    inizio,
    acquisto,
    ral,
    percentuale,
    accantonato: accantonatoScritto,
    prezzoInizio,
    prezzoFine,
    cambio,
    piano,
  };
  // «Sporco» si decide confrontando il JSON e non i singoli campi: i campi
  // cambiano a ogni modifica dello strumento, il confronto no.
  const sporco = JSON.stringify(stato) !== JSON.stringify(salvato?.dati ?? null);

  const alMinimo = () => setPrezzoFine(vInizio);
  const giaAlMinimo = Math.abs(vFine - vInizio) < 1e-9;

  // Il numero per cui si apre la pagina sta **per primo** nel sorgente, quindi
  // per primo sul telefono; sul desktop la griglia lo rimette in colonna
  // destra, sopra il dettaglio, col modulo che resta fermo a sinistra.
  const risposta = !e ? (
    <Card>
      <p className="note">{t.espp.missing}</p>
    </Card>
  ) : (
    <Card>
      <h2 className="risposta" style={{ marginBottom: 0 }} key={Math.round(e.guadagno)}>
        {t.espp.youGain} <span className="big">{eur0(e.guadagno, lang)}</span>
      </h2>
      <p className="note">
        {t.espp.gainLine(
          pct(e.roi, lang),
          eur0(e.esborso, lang),
          num(e.azioni, lang, piano.frazioni ? 4 : 0),
          eur0(e.controvalore, lang),
          piano.mesi
        )}
      </p>
      <p className="hint">
        {t.espp.costBreak(eur0(e.speso, lang), eur0(Math.round(e.esborso) - Math.round(e.speso), lang))}{" "}
        {t.espp.annualised(pct(e.roiAnnuo, lang))}
      </p>
    </Card>
  );

  return (
    <div className="tool">
      <div className="sintesi">{risposta}</div>

      <div className="panel">
        <Card>
          <h2>{t.espp.title}</h2>
          <div className="grid2 has-date allinea">
            <DateField label={t.espp.windowStart} value={inizio} onChange={setInizio} />
            <DateField label={t.espp.windowEnd} value={acquisto} onChange={setAcquisto} />
          </div>

          <h3>{t.espp.contribution}</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="mid" style={{ fontSize: 26 }}>
              {num(percentuale, lang, 0)}%
            </span>
            <span className="hint" style={{ margin: 0 }}>
              {t.espp.contributionHint}
            </span>
          </div>
          {/* Uno slider discreto: i passi sono i punti percentuali, perche' e'
              cosi' che la percentuale si sceglie sul portale del piano. Il
              campo accanto resta libero per chi ha un numero preciso in testa,
              decimali compresi. */}
          <input
            type="range"
            min={1}
            max={piano.maxPct}
            step={1}
            value={percentuale}
            aria-label={t.espp.contribution}
            onChange={(ev) => {
              setPercentuale(Number(ev.target.value));
              setAccantonato(null);
            }}
          />
          <div className="ticks" aria-hidden>
            {PASSI.filter((p) => p <= piano.maxPct && (p === 1 || p % 5 === 0 || p === piano.maxPct)).map((p) => (
              <span key={p}>{p}%</span>
            ))}
          </div>
          {/* Il campo libero e' in **euro**, non in percentuale: il portale del
              piano accetta punti percentuali interi, quindi una percentuale
              scritta a mano non e' un caso in piu', e' lo stesso caso dello
              slider scritto peggio. Quello che invece non si ricava dalla
              percentuale e' l'importo vero — una finestra cominciata a metta',
              un mese di aspettativa, un tetto in valuta — e quello si scrive. */}
          <div style={{ marginTop: 12 }}>
            <NumField
              lang={lang}
              label={t.espp.saved}
              suffix="€"
              value={accantonato}
              onChange={setAccantonato}
              hint={
                accantonatoScritto === null
                  ? t.espp.savedHint(`${num(percentuale, lang, 0)}%`, piano.mesi)
                  : t.espp.savedManual
              }
            />
            {accantonatoScritto !== null ? (
              <button className="btn link" type="button" onClick={() => setAccantonato(null)}>
                {t.common.reset}
              </button>
            ) : null}
          </div>

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
              label={t.common.priceStart}
              suffix="$"
              value={vInizio}
              onChange={setPrezzoInizio}
              hint={
                prezzoInizio !== null
                  ? t.common.manual
                  : storicoInizio
                    ? `${t.common.fromHistory} ${dateShort(storicoInizio.closeOn, lang)}`
                    : t.common.fromQuote
              }
            />
            <NumField
              lang={lang}
              label={t.common.priceEnd}
              suffix="$"
              value={vFine}
              onChange={setPrezzoFine}
              hint={
                prezzoFine !== null
                  ? giaAlMinimo
                    ? t.espp.atMinimumOn
                    : t.common.manual
                  : quote
                    ? `${t.common.fromQuote} ${dateShort(quote.date, lang)}`
                    : storicoFine
                      ? `${t.common.fromHistory} ${dateShort(storicoFine.closeOn, lang)}`
                      : t.common.fromQuote
              }
            />
          </div>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={alMinimo}>
              <Livello />
              {t.espp.atMinimum}
            </button>
            <Info label={t.espp.atMinimum}>
              <p>{t.espp.atMinimumHint}</p>
            </Info>
            {prezzoFine !== null || prezzoInizio !== null ? (
              <button
                className="btn link"
                type="button"
                onClick={() => {
                  setPrezzoFine(null);
                  setPrezzoInizio(null);
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
            value={vCambio}
            onChange={setCambio}
            hint={cambio !== null ? (cambioNota ?? t.common.manual) : t.common.fxHint}
          />
          <button
            className="btn link"
            type="button"
            onClick={() =>
              cambioLive().then((r) => {
                if (!r) return;
                setCambio(r.eurusd);
                setCambioNota(`${t.common.fromLive} — ${r.date}`);
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
                  value={piano.sconto}
                  onChange={(v) => setPiano({ ...piano, sconto: v })}
                />
                <NumField
                  lang={lang}
                  label={t.espp.periodMonths}
                  dec={0}
                  value={piano.mesi}
                  onChange={(v) => setPiano({ ...piano, mesi: Math.max(1, Math.round(v)) })}
                />
                <NumField
                  lang={lang}
                  label={t.espp.cap}
                  suffix="%"
                  dec={0}
                  value={piano.maxPct}
                  onChange={(v) => setPiano({ ...piano, maxPct: Math.max(1, Math.round(v)) })}
                />
                <NumField
                  lang={lang}
                  label={t.espp.capUsd}
                  suffix="$"
                  dec={0}
                  value={piano.maxUsd}
                  onChange={(v) => setPiano({ ...piano, maxUsd: Math.max(0, v) })}
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
                  checked={piano.lookback}
                  onChange={(v) => setPiano({ ...piano, lookback: v })}
                />
                <Check
                  label={t.espp.fractional}
                  checked={piano.frazioni}
                  onChange={(v) => setPiano({ ...piano, frazioni: v })}
                />
              </div>
            </Disclosure>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
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
        {quoteFallita && !quote ? (
          <Card>
            <p className="note">{t.common.quoteMissing}</p>
          </Card>
        ) : null}

        {e ? (
          <>
            <Card>
              <h2>{t.espp.payslipTitle}</h2>
              <p className="mid">{eur0(e.trattenuta, lang)}</p>
              <p className="note">{t.espp.payslipLine(eur0(e.beneficio, lang), pct(e.aliquota, lang))}</p>
              <p className="note">
                {t.espp.payslipRest(
                  eur(e.restoInBusta, lang),
                  eur0(Math.abs(e.cedolino), lang),
                  e.cedolino < 0 ? t.espp.lower : t.espp.higher
                )}
              </p>
              {/* Senza questa riga il "resto che torna in busta" diventa di
                  colpo enorme e non si capisce perche': il tetto e' l'unica
                  cosa che lo spiega. */}
              {e.oltreIlTetto > 0.5 ? (
                <p className="hint">
                  {t.espp.capHit(eur0(e.oltreIlTetto, lang), usd(piano.maxUsd, lang, 0))}
                </p>
              ) : null}
            </Card>

            <Card>
              <h2>{t.espp.ralEquivTitle}</h2>
              <p className="mid">{eur0(e.ralEquivalente, lang)}</p>
              <p className="note">
                {t.espp.ralEquivLine(
                  Math.round(e.quotaSuRal * 100),
                  eur0(e.guadagno, lang),
                  eur0(e.perMese, lang)
                )}
              </p>
            </Card>

            <Card>
              <h2>{t.espp.stepsTitle}</h2>
              <ul className="lines">
                <Line
                  name={t.espp.steps.reference}
                  hint={t.espp.steps.referenceHint(piano.lookback)}
                  value={usd(e.prezzoRiferimento, lang)}
                />
                <Line
                  name={t.espp.steps.buy}
                  hint={t.espp.steps.buyHint(`${num(piano.sconto, lang, 2)}%`, usd(e.prezzoRiferimento, lang))}
                  value={usd(e.prezzoAcquisto, lang)}
                />
                <Line name={t.espp.steps.savedUsd} hint={eur(accantonato, lang)} value={usd(e.accantonatoUsd, lang)} />
                <Line
                  name={t.espp.steps.bought}
                  hint={piano.frazioni ? undefined : t.espp.steps.boughtHint}
                  value={num(e.azioni, lang, piano.frazioni ? 4 : 0)}
                />
                <Line name={t.espp.steps.cost} value={eur(e.speso, lang)} />
                <Line name={t.espp.steps.rest} value={eur(e.restoInBusta, lang)} />
                <Line name={t.espp.steps.value} value={eur(e.controvalore, lang)} />
                <Line name={t.espp.steps.tax} value={`\u2212${eur(e.trattenuta, lang)}`} tone="neg" />
                <Line name={t.espp.steps.out} value={eur(e.esborso, lang)} sum />
              </ul>
            </Card>

            {vFine < vInizio ? (
              <Card>
                <h2>{t.espp.fellTitle}</h2>
                <p className="note">{t.espp.fell(usd(vInizio, lang), usd(vFine, lang))}</p>
              </Card>
            ) : null}
          </>
        ) : null}

        {/* La spiegazione sta **dopo** il risultato: chi arriva qui vuole prima
            il numero, e il regolamento lo legge se quel numero lo sorprende. */}
        <Card>
          <h2>{t.espp.howTitle}</h2>
          <ul className="lines" style={{ gap: 12 }}>
            <li style={{ display: "block" }}>
              <strong style={{ fontSize: "var(--t-13)" }}>{t.espp.how1Title}</strong>
              <p className="note" style={{ marginTop: 2 }}>{t.espp.how1}</p>
            </li>
            <li style={{ display: "block" }}>
              <strong style={{ fontSize: "var(--t-13)" }}>{t.espp.how2Title}</strong>
              <p className="note" style={{ marginTop: 2 }}>{t.espp.how2}</p>
            </li>
          </ul>
          <p className="hint">{t.espp.guaranteed(pct(minimoGarantito(piano.sconto), lang))}</p>
        </Card>
      </div>
    </div>
  );
}
