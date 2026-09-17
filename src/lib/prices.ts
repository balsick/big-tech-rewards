import reference from "../data/reference-prices.json" with { type: "json" };

// Le quotazioni, e il motivo per cui non arrivano dal browser.
//
// Il fornitore che ha le chiusure storiche (Yahoo) **non manda gli header
// CORS**: una fetch dalla pagina viene bloccata dal browser, e non c'e' niente
// che il codice del client possa fare al riguardo. Le alternative CORS-aperte
// per le azioni vogliono una chiave, e una chiave in un bundle statico e'
// una chiave pubblica.
//
// Quindi il prezzo lo prende la CI: un workflow schedulato legge il simbolo da
// un GitHub secret, scarica la quotazione nel runner e scrive `quote.json`
// dentro il deploy. La pagina lo legge dalla propria origine — nessun CORS,
// nessuna chiave nel bundle, nessuna richiesta a terzi mentre navighi — e il
// prezzo e' fermo al massimo all'ultima chiusura. Resta sempre riscrivibile a
// mano, che e' l'unica cosa che funziona comunque.

export interface PuntoStorico {
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

export const storico: PuntoStorico[] = (reference as { prices: PuntoStorico[] }).prices;
export const storicoAggiornato: string = (reference as { updated: string }).updated;
export const dateChiave: string[] = (reference as { keyDates: string[] }).keyDates;

/** L'ultima chiusura salvata nei sorgenti a una data, o la prima se e' prima di tutte. */
export function storicoAllaData(data: string): PuntoStorico | null {
  if (!storico.length) return null;
  const prima = storico.filter((p) => p.date <= data);
  return prima.length ? prima[prima.length - 1] : storico[0];
}

/** Il prezzo generato in CI. `null` se il file non c'e' o non e' leggibile. */
export async function caricaQuote(): Promise<Quote | null> {
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
 * Il cambio in diretta, quando serve piu' fresco di una chiusura.
 *
 * Frankfurter e' l'unica fonte di questa pagina che il browser puo' chiamare da
 * solo: manda `access-control-allow-origin: *` e non vuole chiavi. Pubblica i
 * riferimenti BCE, che sono giornalieri — quindi non e' "in tempo reale", e'
 * "di oggi". Non sa niente delle azioni, solo valute.
 */
export async function cambioLive(): Promise<{ eurusd: number; date: string } | null> {
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
