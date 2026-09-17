import { useStore } from "../state/store.tsx";
import { Check, NumField, Segmented } from "./ui.tsx";
import Info from "./Info.tsx";
import { pct } from "../lib/format.ts";
import {
  MUNICIPAL_TURIN,
  REGIONAL_PIEDMONT,
  marginalRate,
  type Bracket,
  type Surtax,
  type TaxRegime,
} from "../lib/tax.ts";

// Local surtaxes, and why they are editable.
//
// Everything else in this calculation is national: the income tax brackets, the
// social security rates, the credits. Not the surtaxes — they change by region
// and by municipality, and they come to nearly 1,800 euro a year on a 50,000
// salary. Hard-coding them would mean writing a tool that works in exactly one
// Italian town.
//
// It sits inside the two tools rather than on a screen of its own because it is
// not a tool: it is the calibration of the ones that are here. RSUs and ESPP
// answer "how much reaches me", and this panel is the part of that answer that
// depends on where you live — not a third question.

function BracketsEditor({
  title,
  brackets,
  onChange,
  exemption,
  onExemption,
}: {
  title: string;
  brackets: Bracket[];
  onChange: (b: Bracket[]) => void;
  exemption?: number;
  onExemption?: (v: number) => void;
}) {
  const { t, lang } = useStore();
  const set = (i: number, patch: Partial<Bracket>) =>
    onChange(brackets.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  return (
    <div>
      <h3>{title}</h3>
      <div className="grid2">
        {brackets.map((b, i) => (
          <NumField
            key={i}
            lang={lang}
            dec={2}
            label={
              b.upTo === null
                ? t.tax.over
                : `${t.tax.upTo} ${b.upTo.toLocaleString(lang === "it" ? "it-IT" : "en-GB")}`
            }
            suffix="%"
            value={b.rate}
            onChange={(v) => set(i, { rate: v })}
            hint={
              b.upTo === null ? undefined : (
                <>
                  {t.tax.upTo}{" "}
                  <input
                    className="inp tnum threshold"
                    inputMode="numeric"
                    aria-label={`${t.tax.upTo} — ${title}`}
                    value={b.upTo}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, ""));
                      set(i, { upTo: Number.isFinite(n) ? n : 0 });
                    }}
                  />
                </>
              )
            }
          />
        ))}
      </div>
      {onExemption ? (
        <div style={{ marginTop: 12 }}>
          <NumField
            lang={lang}
            dec={2}
            label={t.tax.exemption}
            suffix="€"
            value={exemption ?? 0}
            onChange={onExemption}
            hint={t.tax.exemptionHint}
          />
        </div>
      ) : null}
    </div>
  );
}

const FLAT = (rate: number): Surtax => ({ brackets: [{ upTo: null, rate }], exemption: 0 });

/** The calibration panel: prefilled for Turin, every figure overwritable. */
export default function RegimeEditor({ salary }: { salary: number }) {
  const { t, lang, regime, setRegime, resetRegime } = useStore();
  const patch = (p: Partial<TaxRegime>) => setRegime({ ...regime, ...p });

  // The one thing worth watching change while you touch a rate: the marginal
  // rate is the only number in this panel that reaches the two tools, so it
  // sits at the top and redraws on every keystroke.
  const m = marginalRate({ salary }, 1000, regime);

  return (
    <div>
      <p className="note">{t.tax.intro}</p>

      {/* No card inside a card: the block separates with a rule and some air,
          which is enough to say "this is the result" without building a second
          container inside the first. */}
      <div style={{ margin: "14px 0", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <h3 style={{ marginTop: 0 }}>
          {t.tax.marginalTitle}
          <Info label={t.common.whatIsThis}>
            <p>{t.tax.marginalWhy}</p>
          </Info>
        </h3>
        <p className="mid" style={{ margin: 0 }}>
          {pct(m.rate, lang)}
        </p>
        <p className="note">{t.tax.marginalLine(pct(m.rate, lang))}</p>
      </div>

      <h3>{t.tax.presets}</h3>
      <Segmented<"turin" | "flat">
        label={t.tax.presets}
        value={regime.regional.brackets.length > 1 || regime.municipal.brackets.length > 1 ? "turin" : "flat"}
        onChange={(v) =>
          patch(
            v === "turin"
              ? { regional: REGIONAL_PIEDMONT, municipal: MUNICIPAL_TURIN }
              : { regional: FLAT(1.23), municipal: FLAT(0.8) }
          )
        }
        options={[
          { id: "turin", label: t.tax.presetTurin },
          { id: "flat", label: t.tax.presetFlat },
        ]}
      />

      <BracketsEditor
        title={t.tax.regional}
        brackets={regime.regional.brackets}
        onChange={(b) => patch({ regional: { ...regime.regional, brackets: b } })}
      />

      <BracketsEditor
        title={t.tax.municipal}
        brackets={regime.municipal.brackets}
        onChange={(b) => patch({ municipal: { ...regime.municipal, brackets: b } })}
        exemption={regime.municipal.exemption}
        onExemption={(v) => patch({ municipal: { ...regime.municipal, exemption: v } })}
      />

      <BracketsEditor
        title={t.tax.incomeTax}
        brackets={regime.brackets}
        onChange={(b) => patch({ brackets: b })}
      />
      <p className="hint">{t.tax.incomeTaxHint}</p>

      <h3>{t.tax.socialSecurity}</h3>
      <div className="grid2">
        <NumField
          lang={lang}
          label={t.tax.ssRate}
          suffix="%"
          dec={4}
          value={regime.socialSecurity.rate}
          onChange={(v) => patch({ socialSecurity: { ...regime.socialSecurity, rate: v } })}
        />
        <NumField
          lang={lang}
          label={t.tax.ssMinor}
          suffix="%"
          dec={4}
          value={regime.socialSecurity.minorRates}
          onChange={(v) => patch({ socialSecurity: { ...regime.socialSecurity, minorRates: v } })}
          hint={t.tax.ssMinorHint}
        />
        <NumField
          lang={lang}
          label={t.tax.ssFirstBand}
          suffix="€"
          dec={0}
          value={regime.socialSecurity.firstBandCap}
          onChange={(v) => patch({ socialSecurity: { ...regime.socialSecurity, firstBandCap: v } })}
          hint={t.tax.ssFirstBandHint}
        />
        <NumField
          lang={lang}
          label={t.tax.ssCeiling}
          suffix="€"
          dec={0}
          value={regime.socialSecurity.ceiling}
          onChange={(v) => patch({ socialSecurity: { ...regime.socialSecurity, ceiling: v } })}
          hint={t.tax.ssCeilingHint}
        />
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <Check
          label={t.tax.applyCeiling}
          checked={regime.socialSecurity.applyCeiling}
          onChange={(v) => patch({ socialSecurity: { ...regime.socialSecurity, applyCeiling: v } })}
        />
        <NumField
          lang={lang}
          label={t.tax.months}
          dec={0}
          value={regime.payPeriods}
          onChange={(v) => patch({ payPeriods: Math.max(1, v) })}
          hint={t.tax.monthsHint}
        />
        <button className="btn" type="button" onClick={resetRegime}>
          {t.common.reset}
        </button>
      </div>
    </div>
  );
}
