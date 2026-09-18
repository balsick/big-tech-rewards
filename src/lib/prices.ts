import reference from "../data/reference-prices.json" with { type: "json" };

// Quotes, and why they do not come from the browser.
//
// The provider that has the historical closes (Yahoo) **does not send CORS
// headers**: a fetch from the page is blocked by the browser, and there is
// nothing client code can do about it. The CORS-open alternatives for equities
// want an API key, and a key inside a static bundle is a public key.
//
// So CI fetches the price: a scheduled workflow reads the symbol from a GitHub
// secret, downloads the quote inside the runner and writes `quote.json` into
// the deployment. The page reads it from its own origin — no CORS, no key in
// the bundle, no third-party request while you browse — and the price is at
// most one close old. It always stays overwritable by hand, which is the only
// thing that works regardless.

export interface HistoricalPoint {
  date: string;
  close: number;
  closeOn: string;
  eurusd: number;
  eurusdOn: string;
  /**
   * The fair market value on that date: the mean of the closes of the 20
   * trading sessions **before** it, the date itself excluded.
   *
   * This — not the close of the day — is what prices an RSU grant, and the two
   * are not close to each other: on 20 February 2026 the close was 142.88 and
   * the fair market value 146.32, a 2.4% difference in the number of units a
   * grant buys. Absent on rows old enough to have no 20 sessions behind them.
   */
  fmv?: number;
}

export interface Quote {
  date: string;
  close: number;
  eurusd: number;
  eurusdOn?: string;
  generatedAt?: string;
  /**
   * The 20-session mean as of the latest close: the fair market value a grant
   * dated today would be priced at.
   *
   * The best available stand-in for a grant still in the future, where the real
   * figure cannot exist yet — and a better one than a single day's close, since
   * that is not how any grant is priced.
   */
  fmv20?: number;
}

export interface DividendPayment {
  /** payment date, ISO */
  date: string;
  /** dollars per share */
  amount: number;
  /** the close on that day, which is what the equivalent units are priced at */
  close: number;
}

export const history: HistoricalPoint[] = (reference as { prices: HistoricalPoint[] }).prices;
export const dividends: DividendPayment[] = (reference as { dividends?: DividendPayment[] }).dividends ?? [];
export const historyUpdated: string = (reference as { updated: string }).updated;
export const keyDates: string[] = (reference as { keyDates: string[] }).keyDates;

/**
 * The fair market value to price a grant dated `date`.
 *
 * A stored one when the date is a plan date that has passed, the rolling
 * 20-session mean when it has not, and the plain close only as a last resort —
 * in which case it is wrong by a couple of percent and the caller should say
 * where the number came from.
 */
export function fmvAt(date: string, quote: Quote | null): { price: number; kind: "fmv" | "rolling" | "close" } | null {
  const point = historyAt(date);
  const exact = history.find((p) => p.date === date);
  if (exact?.fmv) return { price: exact.fmv, kind: "fmv" };
  if (date > (point?.date ?? "") && quote?.fmv20) return { price: quote.fmv20, kind: "rolling" };
  if (point?.fmv) return { price: point.fmv, kind: "fmv" };
  if (quote?.fmv20) return { price: quote.fmv20, kind: "rolling" };
  return point ? { price: point.close, kind: "close" } : null;
}

/** The last close stored in the sources at a date, or the first one if earlier than all. */
export function historyAt(date: string): HistoricalPoint | null {
  if (!history.length) return null;
  const before = history.filter((p) => p.date <= date);
  return before.length ? before[before.length - 1] : history[0];
}

/** The price generated in CI. `null` if the file is missing or unreadable. */
export async function loadQuote(): Promise<Quote | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}quote.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    const j = (await res.json()) as Quote;
    return typeof j?.close === "number" && typeof j?.eurusd === "number" && j.date ? j : null;
  } catch {
    return null;
  }
}

/**
 * The exchange rate live, when a close is not fresh enough.
 *
 * Frankfurter is the only source on this page the browser can call by itself:
 * it sends `access-control-allow-origin: *` and wants no key. It publishes ECB
 * reference rates, which are daily — so this is not "real time", it is "today".
 * It knows nothing about equities, only currencies.
 */
export async function liveFxRate(): Promise<{ eurusd: number; date: string } | null> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD");
    if (!res.ok) return null;
    const j = (await res.json()) as { date: string; rates?: { USD?: number } };
    const v = j?.rates?.USD;
    return typeof v === "number" ? { eurusd: v, date: j.date } : null;
  } catch {
    return null;
  }
}
