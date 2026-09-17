import { eur0, monthShort, num } from "../lib/format.ts";
import type { Lang } from "../i18n/index.ts";
import type { Prospetto } from "../lib/rsu.ts";

// Il grafico delle vestizioni: una barra per mese, i colori sono i grant.
//
// SVG scritto a mano e non una libreria: sono trentasei rettangoli e due assi,
// e una dipendenza da grafici peserebbe piu' di tutto il resto della pagina.
// I colori vengono dalle variabili del tema, quindi il grafico segue il tema
// scuro senza sapere che esiste.

const COLORI = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const coloreGrant = (i: number) => COLORI[i % COLORI.length];

const W = 720;
const H = 210;
const PAD = { t: 14, r: 8, b: 30, l: 46 };

export default function VestingChart({
  p,
  grants,
  lang,
  mostraEuro,
}: {
  p: Prospetto;
  grants: { id: string; etichetta: string }[];
  lang: Lang;
  mostraEuro: boolean;
}) {
  const mesi = p.mesi;
  if (!mesi.length) return null;

  const valore = (m: Prospetto["mesi"][number]) => (mostraEuro ? m.lordoEur : m.unita);
  const max = Math.max(...mesi.map(valore), 1);
  // La scala si arrotonda in alto a una cifra leggibile: un asse che finisce a
  // 11.383 non dice niente, uno che finisce a 12.000 si legge di sfuggita.
  const passo = Math.pow(10, Math.floor(Math.log10(max)));
  const tetto = Math.ceil(max / (passo / 2)) * (passo / 2);

  const bw = (W - PAD.l - PAD.r) / mesi.length;
  const x = (i: number) => PAD.l + i * bw;
  const y = (v: number) => PAD.t + (1 - v / tetto) * (H - PAD.t - PAD.b);
  const indice = new Map(grants.map((g, i) => [g.id, i]));

  const etichette = [0, tetto / 2, tetto];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="xMidYMid meet">
      {etichette.map((v) => (
        <g key={v}>
          <line className="axis" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} opacity={v === 0 ? 1 : 0.45} />
          <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end">
            {mostraEuro ? eur0(v, lang) : num(v, lang, 0)}
          </text>
        </g>
      ))}

      {mesi.map((m, i) => {
        let cursore = 0;
        const perAzione = m.unita > 0 ? m.lordoEur / m.unita : 0;
        return (
          <g key={m.mese}>
            {m.per.map((seg) => {
              const v = mostraEuro ? seg.unita * perAzione : seg.unita;
              const y0 = y(cursore + v);
              const h = Math.max(1, y(cursore) - y0);
              cursore += v;
              return (
                <rect
                  key={seg.grant}
                  x={x(i) + bw * 0.14}
                  y={y0}
                  width={Math.max(1.5, bw * 0.72)}
                  height={h}
                  rx={Math.min(2, bw * 0.2)}
                  fill={coloreGrant(indice.get(seg.grant) ?? 0)}
                />
              );
            })}
            {m.unita > 0 ? (
              <title>
                {`${m.mese} — ${num(m.unita, lang, 2)} — ${eur0(m.lordoEur, lang)}`}
              </title>
            ) : null}
            {/* Il gennaio di ogni anno porta l'anno, gli altri l'iniziale del
                mese solo se c'e' spazio: trentasei etichette su 720 px si
                sovrappongono, e un asse illeggibile e' peggio di uno vuoto. */}
            {m.mese.endsWith("-01") ? (
              <text x={x(i) + bw / 2} y={H - PAD.b + 22} textAnchor="middle" style={{ fontWeight: 700 }}>
                {m.mese.slice(0, 4)}
              </text>
            ) : null}
            {bw > 15 || m.unita > 0 ? (
              <text x={x(i) + bw / 2} y={H - PAD.b + 11} textAnchor="middle">
                {monthShort(m.mese, lang).slice(0, 1).toUpperCase()}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
