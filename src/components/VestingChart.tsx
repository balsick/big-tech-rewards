import { eur0, num } from "../lib/format.ts";
import type { Lang } from "../i18n/index.ts";
import type { Prospetto } from "../lib/rsu.ts";

// Il grafico delle vestizioni: un trimestre per barra, i colori sono i grant.
//
// A mesi era illeggibile: trentasei colonne larghe cinque pixel su un telefono,
// e nove su dieci vuote, perche' un piano trimestrale produce al massimo dodici
// vestizioni in tre anni. La granularita' giusta e' quella del piano, non
// quella del calendario — e a tredici colonne le barre tornano larghe
// abbastanza da portarsi sopra il proprio valore, che e' quello che si va a
// cercare guardando un grafico del genere.
//
// SVG scritto a mano: sono venti rettangoli e due assi, e una libreria di
// grafici peserebbe piu' di tutto il resto della pagina. I colori vengono dalle
// variabili del tema, quindi segue lo scuro senza sapere che esiste.

const COLORI = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const coloreGrant = (i: number) => COLORI[i % COLORI.length];

const W = 720;
const H = 230;
const PAD = { t: 22, r: 6, b: 38, l: 52 };

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
  const q = p.trimestri;
  if (!q.length) return null;

  const valore = (x: Prospetto["trimestri"][number]) => (mostraEuro ? x.lordoEur : x.unita);
  const max = Math.max(...q.map(valore), 1);
  // La scala si arrotonda in alto a una cifra leggibile: un asse che finisce a
  // 11.383 non dice niente, uno che finisce a 12.000 si legge di sfuggita.
  const passo = Math.pow(10, Math.floor(Math.log10(max)));
  const tetto = Math.ceil(max / (passo / 2)) * (passo / 2);

  const bw = (W - PAD.l - PAD.r) / q.length;
  const x = (i: number) => PAD.l + i * bw;
  const y = (v: number) => PAD.t + (1 - v / tetto) * (H - PAD.t - PAD.b);
  const indice = new Map(grants.map((g, i) => [g.id, i]));
  const fmt = (v: number) => (mostraEuro ? eur0(v, lang) : num(v, lang, 0));

  // Un'etichetta d'anno sotto il primo trimestre di ogni anno: sostituisce
  // dodici etichette di mese che non ci starebbero comunque.
  const primoDellAnno = new Set<number>();
  const visti = new Set<number>();
  q.forEach((t, i) => {
    if (!visti.has(t.anno)) {
      visti.add(t.anno);
      primoDellAnno.add(i);
    }
  });

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="xMidYMid meet">
      {[0, tetto / 2, tetto].map((v) => (
        <g key={v}>
          <line className="axis" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} opacity={v === 0 ? 1 : 0.4} />
          <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}

      {q.map((t, i) => {
        let cursore = 0;
        const perAzione = t.unita > 0 ? t.lordoEur / t.unita : 0;
        const tot = valore(t);
        return (
          <g key={t.da}>
            {t.per.map((seg) => {
              const v = mostraEuro ? seg.unita * perAzione : seg.unita;
              const y0 = y(cursore + v);
              const h = Math.max(1.5, y(cursore) - y0);
              cursore += v;
              return (
                <rect
                  key={seg.grant}
                  x={x(i) + bw * 0.16}
                  y={y0}
                  width={bw * 0.68}
                  height={h}
                  rx={2}
                  fill={coloreGrant(indice.get(seg.grant) ?? 0)}
                />
              );
            })}

            {/* Il valore sopra la barra: e' il numero che si va a cercare, e a
                tredici colonne c'e' finalmente lo spazio per scriverlo. */}
            {tot > 0 ? (
              <text className="valore" x={x(i) + bw / 2} y={y(tot) - 6} textAnchor="middle">
                {fmt(tot)}
              </text>
            ) : null}

            {t.unita > 0 ? (
              <title>{`${t.anno} Q${t.trimestre} — ${num(t.unita, lang, 2)} — ${eur0(t.lordoEur, lang)}`}</title>
            ) : null}

            <text x={x(i) + bw / 2} y={H - PAD.b + 14} textAnchor="middle">
              {`Q${t.trimestre}`}
            </text>
            {primoDellAnno.has(i) ? (
              <text className="anno" x={x(i) + bw / 2} y={H - PAD.b + 28} textAnchor="middle">
                {t.anno}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
