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
}

export interface Quote {
  date: string;
  close: number;
  eurusd: number;
  eurusdOn?: string;
  generatedAt?: string;
}

export const history: HistoricalPoint[] = (reference as { prices: HistoricalPoint[] }).prices;
export const historyUpdated: string = (reference as { updated: string }).updated;
export const keyDates: string[] = (reference as { keyDates: string[] }).keyDates;

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
