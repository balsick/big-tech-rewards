export type Lang = "it" | "en";

const loc = (l: Lang) => (l === "it" ? "it-IT" : "en-GB");

/**
 * Grouping is forced on, never left to the locale.
 *
 * `Intl`'s default is "auto", and for several locales that means `min2`: no
 * thousands separator until five digits. The result is that "70.000 €" and
 * "1215 €" sit next to each other in the same card, one grouped and one not,
 * which reads as a bug in the number rather than a rule of the locale.
 */
const GROUPED = { useGrouping: "always" } as const;

export const eur = (v: number, l: Lang, dec = 2) =>
  new Intl.NumberFormat(loc(l), {
    ...GROUPED,
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v);

export const eur0 = (v: number, l: Lang) => eur(v, l, 0);

export const usd = (v: number, l: Lang, dec = 2) =>
  new Intl.NumberFormat(loc(l), {
    ...GROUPED,
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v);

export const num = (v: number, l: Lang, dec = 2) =>
  new Intl.NumberFormat(loc(l), { ...GROUPED, minimumFractionDigits: 0, maximumFractionDigits: dec }).format(v);

/**
 * The short form for places where the full one does not fit — a bar label on a
 * narrow column, for instance.
 *
 * Hand-rolled rather than `Intl` compact notation, which in Italian spells out
 * "8,7 Mila": longer than the "8710 €" it was meant to shorten. */
export const shortNum = (v: number, l: Lang) =>
  Math.abs(v) >= 1000 ? `${num(v / 1000, l, 1)}k` : num(v, l, 0);

export const shortEur = (v: number, l: Lang) => `${shortNum(v, l)} €`;

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
 * A number can be written as a sum: "1200+300" for two entries, "24/3" for your
 * own share. Comma or dot, either works. `null` when the sum is not finished: a
 * trailing operator while you are still typing is not an error.
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
 * How a number is written into a field: comma in Italian, dot in English, and
 * without the decimal zeros nobody needs.
 *
 * Zeros are stripped **only after the decimal separator**: a regex that took
 * them off the end whatever came before turned 60000 into 6, and a salary field
 * rewriting itself to six euro is something nobody reports, because it is a
 * plausible number in the wrong place.
 */
export const toField = (v: number, l: Lang, dec = 2) => {
  let s = v.toFixed(dec);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return l === "it" ? s.replace(".", ",") : s;
};
