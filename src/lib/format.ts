export type Lang = "it" | "en";

const loc = (l: Lang) => (l === "it" ? "it-IT" : "en-GB");

export const eur = (v: number, l: Lang, dec = 2) =>
  new Intl.NumberFormat(loc(l), { style: "currency", currency: "EUR", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);

export const eur0 = (v: number, l: Lang) => eur(v, l, 0);

export const usd = (v: number, l: Lang, dec = 2) =>
  new Intl.NumberFormat(loc(l), { style: "currency", currency: "USD", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);

export const num = (v: number, l: Lang, dec = 2) =>
  new Intl.NumberFormat(loc(l), { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(v);

export const pct = (v: number, l: Lang, dec = 1) =>
  `${new Intl.NumberFormat(loc(l), { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v * 100)}%`;

export const dateLong = (iso: string, l: Lang) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(loc(l), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const dateShort = (iso: string, l: Lang) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(loc(l), { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });

export const monthShort = (ym: string, l: Lang) =>
  new Date(`${ym}-15T12:00:00Z`).toLocaleDateString(loc(l), { month: "short", timeZone: "UTC" });

export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Un numero si puo' scrivere come un conto: "1200+300" per due voci, "24/3"
 * per la propria parte. Virgola o punto, indifferente. `null` quando il conto
 * non e' finito: un operatore in fondo mentre si sta ancora scrivendo non e'
 * un errore.
 */
export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(/\s| /g, "").replace(/[−–—]/g, "-").replace(/[x×]/gi, "*").replace(/÷/g, "/");
  if (!t) return null;
  const pezzi = t.match(/(?:^-)?\d+(?:[.,]\d*)?|[+\-*/]/g);
  if (!pezzi || pezzi.join("") !== t) return null;
  const n: number[] = [];
  const s: string[] = [];
  for (let i = 0; i < pezzi.length; i++) {
    if (i % 2 === 0) {
      const v = parseFloat(pezzi[i].replace(",", "."));
      if (!isFinite(v)) return null;
      n.push(v);
    } else s.push(pezzi[i]);
  }
  if (n.length !== s.length + 1) return null;
  for (let i = 0; i < s.length; ) {
    if (s[i] === "*" || s[i] === "/") {
      if (s[i] === "/" && n[i + 1] === 0) return null;
      n.splice(i, 2, s[i] === "*" ? n[i] * n[i + 1] : n[i] / n[i + 1]);
      s.splice(i, 1);
    } else i++;
  }
  let out = n[0];
  for (let i = 0; i < s.length; i++) out = s[i] === "+" ? out + n[i + 1] : out - n[i + 1];
  return isFinite(out) ? out : null;
}

/**
 * Come si scrive un numero in un campo: virgola in italiano, punto in inglese,
 * e senza gli zeri decimali che non servono.
 *
 * Gli zeri si tolgono **solo dopo la virgola**: una regex che li toglieva dalla
 * fine qualunque cosa ci fosse prima trasformava 60000 in 6, e un campo RAL che
 * si riscrive da solo a sei euro non lo segnala nessuno, perche' e' un numero
 * plausibile in un posto sbagliato.
 */
export const toField = (v: number, l: Lang, dec = 2) => {
  let s = v.toFixed(dec);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return l === "it" ? s.replace(".", ",") : s;
};
