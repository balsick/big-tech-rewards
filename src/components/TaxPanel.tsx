import { useState } from "react";
import { useStore } from "../state/store.tsx";
import { Card, Check, Line, NumField, Segmented } from "./ui.tsx";
import { eur, eur0, pct } from "../lib/format.ts";
import {
  COMUNALE_TORINO,
  REGIONALE_PIEMONTE,
  dalLordoAlNetto,
  marginale,
  type Addizionale,
  type Regime,
  type Scaglione,
} from "../lib/tax.ts";
import { RAL_DEFAULT } from "../lib/meta.ts";

// Le addizionali, e perche' sono modificabili.
//
// Tutto il resto di questo conto e' nazionale: gli scaglioni IRPEF, le aliquote
// INPS, le detrazioni. Le addizionali no — cambiano per regione e per comune, e
// su una RAL da 60.000 valgono quasi 2.000 euro l'anno. Scriverle come costanti
// vorrebbe dire scrivere uno strumento che funziona in un solo comune d'Italia.
//
// Sono precompilate con quelle in uso a Torino perche' un modulo vuoto non
// spiega niente, e perche' avere davanti dei numeri veri e' il modo piu' rapido
// di capire che forma hanno le proprie.

function ScaglioniEditor({
  titolo,
  valore,
  onChange,
  esenzione,
  onEsenzione,
  labels,
}: {
  titolo: string;
  valore: Scaglione[];
  onChange: (s: Scaglione[]) => void;
  esenzione?: number;
  onEsenzione?: (v: number) => void;
  labels: { upTo: string; over: string; rate: string; exemption: string; exemptionHint: string };
}) {
  const { lang } = useStore();
  const set = (i: number, patch: Partial<Scaglione>) =>
    onChange(valore.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <div>
      <h3>{titolo}</h3>
      <div className="grid2">
        {valore.map((s, i) => (
          <NumField
            key={i}
            lang={lang}
            dec={2}
            label={s.fino === null ? labels.over : `${labels.upTo} ${s.fino.toLocaleString(lang === "it" ? "it-IT" : "en-GB")}`}
            suffix="%"
            value={s.aliquota}
            onChange={(v) => set(i, { aliquota: v })}
            hint={
              s.fino === null ? undefined : (
                <>
                  {labels.upTo}{" "}
                  <input
                    className="inp cifra"
                    style={{ width: "6.5rem", padding: "2px 6px", fontSize: 11, display: "inline-block" }}
                    inputMode="numeric"
                    aria-label={`${labels.upTo} — ${titolo}`}
                    value={s.fino}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, ""));
                      set(i, { fino: Number.isFinite(n) ? n : 0 });
                    }}
                  />
                </>
              )
            }
          />
        ))}
      </div>
      {onEsenzione ? (
        <div style={{ marginTop: 12 }}>
          <NumField
            lang={lang}
            dec={2}
            label={labels.exemption}
            suffix="€"
            value={esenzione ?? 0}
            onChange={onEsenzione}
            hint={labels.exemptionHint}
          />
        </div>
      ) : null}
    </div>
  );
}

const PIATTA = (a: number): Addizionale => ({ scaglioni: [{ fino: null, aliquota: a }], esenzione: 0 });

export default function TaxPanel() {
  const { t, lang, regime, setRegime, resetRegime } = useStore();
  const [ral, setRal] = useState(RAL_DEFAULT);
  const [aumento, setAumento] = useState(5000);

  const patch = (p: Partial<Regime>) => setRegime({ ...regime, ...p });
  const labels = {
    upTo: t.tax.upTo,
    over: t.tax.over,
    rate: t.tax.rate,
    exemption: t.tax.exemption,
    exemptionHint: t.tax.exemptionHint,
  };

  const netto = dalLordoAlNetto({ ral }, regime);
  const m = marginale({ ral }, aumento, regime);

  return (
    <div className="tool">
      <div className="panel">
        <Card>
          <h2>{t.tax.title}</h2>
          <p className="note">{t.tax.intro}</p>

          <h3>{t.tax.presets}</h3>
          <Segmented<"torino" | "piatta">
            label={t.tax.presets}
            value={
              regime.regionale.scaglioni.length > 1 || regime.comunale.scaglioni.length > 1
                ? "torino"
                : "piatta"
            }
            onChange={(v) =>
              patch(
                v === "torino"
                  ? { regionale: REGIONALE_PIEMONTE, comunale: COMUNALE_TORINO }
                  : { regionale: PIATTA(1.23), comunale: PIATTA(0.8) }
              )
            }
            options={[
              { id: "torino", label: t.tax.presetTorino },
              { id: "piatta", label: t.tax.presetFlat },
            ]}
          />

          <ScaglioniEditor
            titolo={t.tax.regional}
            valore={regime.regionale.scaglioni}
            onChange={(s) => patch({ regionale: { ...regime.regionale, scaglioni: s } })}
            labels={labels}
          />

          <ScaglioniEditor
            titolo={t.tax.municipal}
            valore={regime.comunale.scaglioni}
            onChange={(s) => patch({ comunale: { ...regime.comunale, scaglioni: s } })}
            esenzione={regime.comunale.esenzione}
            onEsenzione={(v) => patch({ comunale: { ...regime.comunale, esenzione: v } })}
            labels={labels}
          />

          <ScaglioniEditor
            titolo={t.tax.irpef}
            valore={regime.scaglioni}
            onChange={(s) => patch({ scaglioni: s })}
            labels={labels}
          />
          <p className="hint">{t.tax.irpefHint}</p>

          <h3>{t.tax.inps}</h3>
          <div className="grid2">
            <NumField
              lang={lang}
              label={t.tax.inpsRate}
              suffix="%"
              dec={4}
              value={regime.inps.aliquota}
              onChange={(v) => patch({ inps: { ...regime.inps, aliquota: v } })}
            />
            <NumField
              lang={lang}
              label={t.tax.inpsMinor}
              suffix="%"
              dec={4}
              value={regime.inps.minori}
              onChange={(v) => patch({ inps: { ...regime.inps, minori: v } })}
              hint={t.tax.inpsMinorHint}
            />
            <NumField
              lang={lang}
              label={t.tax.inpsFirstBand}
              suffix="€"
              dec={0}
              value={regime.inps.primaFascia}
              onChange={(v) => patch({ inps: { ...regime.inps, primaFascia: v } })}
              hint={t.tax.inpsFirstBandHint}
            />
            <NumField
              lang={lang}
              label={t.tax.inpsCeiling}
              suffix="€"
              dec={0}
              value={regime.inps.massimale}
              onChange={(v) => patch({ inps: { ...regime.inps, massimale: v } })}
              hint={t.tax.inpsCeilingHint}
            />
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <Check
              label={t.tax.applyCeiling}
              checked={regime.inps.applicaMassimale}
              onChange={(v) => patch({ inps: { ...regime.inps, applicaMassimale: v } })}
            />
            <NumField
              lang={lang}
              label={t.tax.months}
              dec={0}
              value={regime.mensilita}
              onChange={(v) => patch({ mensilita: Math.max(1, v) })}
              hint={t.tax.monthsHint}
            />
            <button className="btn" type="button" onClick={resetRegime}>
              {t.common.reset}
            </button>
          </div>
        </Card>
      </div>

      <div>
        <Card>
          <h2>{t.tax.breakdownTitle}</h2>
          <div className="grid2" style={{ marginTop: 8 }}>
            <NumField lang={lang} label={t.common.ral} suffix="€" dec={0} value={ral} onChange={setRal} />
            <NumField lang={lang} label={t.tax.raise} suffix="€" dec={0} value={aumento} onChange={setAumento} />
          </div>
          <p className="hint">{t.common.ralWhy}</p>
        </Card>

        <Card delay={60}>
          <div className="eyebrow">{t.tax.perMonth(regime.mensilita)}</div>
          <div className="big">{eur0(netto.perMensilita, lang)}</div>
          <p className="note">
            {t.tax.keepsLine(eur0(netto.netto, lang), eur0(netto.lordo, lang), Math.round(netto.tasso * 100))}
          </p>
          <ul className="lines">
            <Line name={t.tax.breakdown.gross} value={eur0(netto.lordo, lang)} strong />
            <Line name={t.tax.breakdown.inps} value={`−${eur0(netto.inps, lang)}`} tone="neg" />
            <Line name={t.tax.breakdown.taxable} value={eur0(netto.imponibileIrpef, lang)} />
            <Line name={t.tax.breakdown.irpefGross} value={`−${eur0(netto.irpefLorda, lang)}`} tone="neg" />
            {netto.detrazioni > 0 ? (
              <Line name={t.tax.breakdown.deductions} value={`+${eur0(netto.detrazioni, lang)}`} tone="pos" />
            ) : null}
            <Line name={t.tax.breakdown.regional} value={`−${eur0(netto.regionale, lang)}`} tone="neg" />
            <Line name={t.tax.breakdown.municipal} value={`−${eur0(netto.comunale, lang)}`} tone="neg" />
            {netto.integrativa > 0 ? (
              <Line name={t.tax.breakdown.supplement} value={`+${eur0(netto.integrativa, lang)}`} tone="pos" />
            ) : null}
            <Line name={t.tax.breakdown.net} value={eur(netto.netto, lang)} sum />
          </ul>
        </Card>

        <Card delay={120} className="accent-card">
          <div className="eyebrow">{t.tax.marginalTitle}</div>
          <div className="mid">{pct(m.aliquota, lang)}</div>
          <p className="note">{t.tax.marginalLine(pct(m.aliquota, lang))}</p>
          <ul className="lines">
            <Line name={t.tax.raise} value={eur0(aumento, lang)} />
            <Line name={t.common.net} value={eur0(m.netto, lang)} tone="pos" sum />
          </ul>
          <p className="hint" style={{ marginTop: 10 }}>
            {t.tax.marginalWhy}
          </p>
        </Card>
      </div>
    </div>
  );
}
