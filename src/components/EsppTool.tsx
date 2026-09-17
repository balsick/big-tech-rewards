import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, DateField, Disclosure, Line, NumField } from "./ui.tsx";
import { eur, eur0, num, pct, todayISO, usd } from "../lib/format.ts";
import {
  PIANO_ESPP,
  accantonamentoAtteso,
  finestraEspp,
  minimoGarantito,
  simulaEspp,
  type PianoEspp,
} from "../lib/espp.ts";
import { caricaQuote, cambioLive, storicoAllaData, type Quote } from "../lib/prices.ts";
import { RAL_DEFAULT } from "../lib/meta.ts";

// L'ESPP: cosa succede il giorno dell'acquisto, e quanto rende il giro.
//
// Il modulo sta a sinistra e resta fermo, la risposta a destra si rifa' mentre
// scrivi: uno strumento e' un modulo e una risposta, e finche' stanno uno sotto
// l'altro cambiare un numero vuol dire scorrere per vedere cos'e' cambiato, che
// e' meta' del motivo per cui questi conti esistono.

const PASSI = Array.from({ length: 15 }, (_, i) => i + 1);

export default function EsppTool() {
  const { t, lang, regime } = useStore();
  const [piano, setPiano] = useState<PianoEspp>(PIANO_ESPP);
  const finestra = useMemo(() => finestraEspp(todayISO(), piano), [piano]);

  const [inizio, setInizio] = useState(finestra.inizio);
  const [acquisto, setAcquisto] = useState(finestra.acquisto);
  const [ral, setRal] = useState(RAL_DEFAULT);
  const [percentuale, setPercentuale] = useState(15);
  // L'accantonato si calcola dalla percentuale finche' non lo riscrivi: due
  // stati per un campo sarebbero due verita', quindi il calcolato e' il fondo e
  // lo scritto e' quello che ci sta sopra.
  const [accantonatoScritto, setAccantonato] = useState<number | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFallita, setQuoteFallita] = useState(false);
  const [prezzoInizio, setPrezzoInizio] = useState<number | null>(null);
  const [prezzoFine, setPrezzoFine] = useState<number | null>(null);
  const [cambio, setCambio] = useState<number | null>(null);
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

  const alMinimo = () => setPrezzoFine(vInizio);
  const giaAlMinimo = Math.abs(vFine - vInizio) < 1e-9;

  return (
    <div className="tool">
      <div className="panel">
        <Card>
          <h2>{t.espp.title}</h2>
          <div className="grid2">
            <DateField label={t.espp.windowStart} value={inizio} onChange={setInizio} />
            <DateField label={t.espp.windowEnd} value={acquisto} onChange={setAcquisto} />
          </div>

          <h3>{t.espp.contribution}</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="mid" style={{ fontSize: 26 }}>
              {num(percentuale, lang, 2)}%
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
            value={Math.min(Math.max(Math.round(percentuale), 1), piano.maxPct)}
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
          <div className="grid2" style={{ marginTop: 10 }}>
            <NumField
              lang={lang}
              label={t.espp.contributionFree}
              suffix="%"
              value={percentuale}
              onChange={(v) => {
                setPercentuale(v);
                setAccantonato(null);
              }}
              hint={percentuale > piano.maxPct ? t.espp.capWarning(piano.maxPct) : undefined}
            />
            <NumField
              lang={lang}
              label={t.espp.saved}
              suffix="€"
              value={accantonato}
              onChange={setAccantonato}
              hint={
                accantonatoScritto === null
                  ? t.espp.savedHint(`${num(percentuale, lang, 2)}%`, piano.mesi)
                  : t.espp.savedManual
              }
            />
          </div>

          <h3>{t.common.ral}</h3>
          <NumField lang={lang} label={t.common.ral} suffix="€" dec={0} value={ral} onChange={setRal} />
          <p className="hint">{t.common.ralWhy}</p>

          <h3>{t.common.price}</h3>
          <div className="grid2">
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
                    ? `${t.common.fromHistory} — ${storicoInizio.closeOn}`
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
                  ? t.common.manual
                  : quote
                    ? `${t.common.fromQuote} — ${quote.date}`
                    : storicoFine
                      ? `${t.common.fromHistory} — ${storicoFine.closeOn}`
                      : t.common.fromQuote
              }
            />
          </div>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button
              className={`btn ${giaAlMinimo ? "" : "primary"}`}
              type="button"
              onClick={alMinimo}
              aria-pressed={giaAlMinimo}
            >
              {t.espp.atMinimum}
            </button>
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
          <p className="hint">{t.espp.atMinimumHint}</p>

          <h3>{t.common.fx}</h3>
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
        </Card>
      </div>

      <div>
        <Card className="accent-card">
          <h2>{t.espp.lookbackTitle}</h2>
          <p className="note">{t.espp.lookback}</p>
          <p className="note">{t.espp.incomeWarning}</p>
          <p className="hint">{t.espp.guaranteed(pct(minimoGarantito(piano.sconto), lang))}</p>
        </Card>

        {quoteFallita && !quote ? (
          <Card delay={40} className="warn-card">
            <p className="note">{t.common.quoteMissing}</p>
          </Card>
        ) : null}

        {!e ? (
          <Card delay={60}>
            <p className="note">{t.espp.missing}</p>
          </Card>
        ) : (
          <>
            <Card delay={60}>
              <div className="eyebrow">{t.espp.youGain}</div>
              <div className="big">{eur0(e.guadagno, lang)}</div>
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
                {t.espp.costBreak(eur0(e.speso, lang), eur0(Math.round(e.esborso) - Math.round(e.speso), lang))}
                {" — "}
                {t.espp.annualised(pct(e.roiAnnuo, lang))}
              </p>
            </Card>

            <Card delay={120}>
              <div className="eyebrow">{t.espp.payslipTitle}</div>
              <div className="mid">{eur0(e.trattenuta, lang)}</div>
              <p className="note">{t.espp.payslipLine(eur0(e.beneficio, lang), pct(e.aliquota, lang))}</p>
              <p className="note">
                {t.espp.payslipRest(
                  eur(e.restoInBusta, lang),
                  eur0(Math.abs(e.cedolino), lang),
                  e.cedolino < 0 ? t.espp.lower : t.espp.higher
                )}
              </p>
            </Card>

            <Card delay={180}>
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
                <Line
                  name={t.espp.steps.savedUsd}
                  hint={eur(accantonato, lang)}
                  value={usd(e.accantonatoUsd, lang)}
                />
                <Line
                  name={t.espp.steps.bought}
                  hint={piano.frazioni ? undefined : t.espp.steps.boughtHint}
                  value={num(e.azioni, lang, piano.frazioni ? 4 : 0)}
                />
                <Line name={t.espp.steps.cost} value={eur(e.speso, lang)} />
                <Line name={t.espp.steps.rest} value={eur(e.restoInBusta, lang)} />
                <Line name={t.espp.steps.value} value={eur(e.controvalore, lang)} />
                <Line name={t.espp.steps.tax} value={`−${eur(e.trattenuta, lang)}`} tone="neg" />
                <Line name={t.espp.steps.out} value={eur(e.esborso, lang)} sum />
              </ul>
            </Card>

            <Card delay={240}>
              <div className="eyebrow">{t.espp.ralEquivTitle}</div>
              <div className="mid">{eur0(e.ralEquivalente, lang)}</div>
              <p className="note">
                {t.espp.ralEquivLine(
                  Math.round(e.quotaSuRal * 100),
                  eur0(e.guadagno, lang),
                  eur0(e.perMese, lang)
                )}
              </p>
            </Card>

            {vFine < vInizio ? (
              <Card delay={300} className="good-card">
                <h2>{t.espp.fellTitle}</h2>
                <p className="note">{t.espp.fell(usd(vInizio, lang), usd(vFine, lang))}</p>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
