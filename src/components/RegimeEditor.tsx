import { useStore } from "../state/store.tsx";
import { Check, NumField, Segmented } from "./ui.tsx";
import Info from "./Info.tsx";
import { pct } from "../lib/format.ts";
import {
  COMUNALE_TORINO,
  REGIONALE_PIEMONTE,
  marginale,
  type Addizionale,
  type Regime,
  type Scaglione,
} from "../lib/tax.ts";

// Le addizionali, e perche' sono modificabili.
//
// Tutto il resto di questo conto e' nazionale: gli scaglioni IRPEF, le aliquote
// INPS, le detrazioni. Le addizionali no — cambiano per regione e per comune, e
// su una RAL da 50.000 valgono quasi 1.800 euro l'anno. Scriverle come costanti
// vorrebbe dire scrivere uno strumento che funziona in un solo comune d'Italia.
//
// Sta dentro i due strumenti e non in una schermata sua perche' non e' uno
// strumento: e' la taratura di quelli che ci sono. Le RSU e l'ESPP rispondono
// «quanto mi arriva», e questo pannello e' il pezzo di quella risposta che
// dipende da dove abiti — non una terza domanda.

function ScaglioniEditor({
  titolo,
  valore,
  onChange,
  esenzione,
  onEsenzione,
}: {
  titolo: string;
  valore: Scaglione[];
  onChange: (s: Scaglione[]) => void;
  esenzione?: number;
  onEsenzione?: (v: number) => void;
}) {
  const { t, lang } = useStore();
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
            label={
              s.fino === null
                ? t.tax.over
                : `${t.tax.upTo} ${s.fino.toLocaleString(lang === "it" ? "it-IT" : "en-GB")}`
            }
            suffix="%"
            value={s.aliquota}
            onChange={(v) => set(i, { aliquota: v })}
            hint={
              s.fino === null ? undefined : (
                <>
                  {t.tax.upTo}{" "}
                  <input
                    className="inp cifra soglia"
                    inputMode="numeric"
                    aria-label={`${t.tax.upTo} — ${titolo}`}
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
            label={t.tax.exemption}
            suffix="€"
            value={esenzione ?? 0}
            onChange={onEsenzione}
            hint={t.tax.exemptionHint}
          />
        </div>
      ) : null}
    </div>
  );
}

const PIATTA = (a: number): Addizionale => ({ scaglioni: [{ fino: null, aliquota: a }], esenzione: 0 });

/** Il pannello di taratura: precompilato Torino, tutto riscrivibile. */
export default function RegimeEditor({ ral }: { ral: number }) {
  const { t, lang, regime, setRegime, resetRegime } = useStore();
  const patch = (p: Partial<Regime>) => setRegime({ ...regime, ...p });

  // La cosa che serve davvero vederla cambiare mentre si tocca un'aliquota:
  // il marginale e' l'unico numero di questo pannello che finisce nei due
  // strumenti, quindi sta in cima e si rifa' a ogni tasto.
  const m = marginale({ ral }, 1000, regime);

  return (
    <div>
      <p className="note">{t.tax.intro}</p>

      {/* Niente scheda dentro la scheda: il blocco si stacca con una riga e
          un po' d'aria, che basta a dire "questo e' il risultato" senza
          costruire un secondo contenitore dentro il primo. */}
      <div
        style={{
          margin: "14px 0",
          paddingTop: 14,
          borderTop: "1px solid var(--border)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {t.tax.marginalTitle}
          <Info label={t.common.whatIsThis}>
            <p>{t.tax.marginalWhy}</p>
          </Info>
        </h3>
        <p className="mid" style={{ margin: 0 }}>
          {pct(m.aliquota, lang)}
        </p>
        <p className="note">{t.tax.marginalLine(pct(m.aliquota, lang))}</p>
      </div>

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
      />

      <ScaglioniEditor
        titolo={t.tax.municipal}
        valore={regime.comunale.scaglioni}
        onChange={(s) => patch({ comunale: { ...regime.comunale, scaglioni: s } })}
        esenzione={regime.comunale.esenzione}
        onEsenzione={(v) => patch({ comunale: { ...regime.comunale, esenzione: v } })}
      />

      <ScaglioniEditor
        titolo={t.tax.irpef}
        valore={regime.scaglioni}
        onChange={(s) => patch({ scaglioni: s })}
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
    </div>
  );
}
