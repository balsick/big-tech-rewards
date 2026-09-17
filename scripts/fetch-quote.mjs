#!/usr/bin/env node
// Le quotazioni le prende la CI, non il browser.
//
// Il motivo e' tecnico e non c'e' modo di aggirarlo dal client: il fornitore
// che ha le chiusure storiche **non manda gli header CORS**, quindi una fetch
// dalla pagina viene bloccata dal browser. Le alternative CORS-aperte per le
// azioni vogliono una chiave, e una chiave dentro un bundle statico e' una
// chiave pubblica.
//
// Quindi: questo script gira nel runner, legge il simbolo da un secret, e
// scrive due file che finiscono nel deploy. La pagina li legge dalla propria
// origine — nessun CORS, nessuna chiave nel bundle, nessuna richiesta a terzi
// mentre uno naviga.
//
// Il simbolo non compare da nessuna parte nei sorgenti ne' nell'output: entra
// dall'ambiente, resta nel runner, e i file che scrive contengono solo numeri.
//
//   QUOTE_SYMBOL=...  node scripts/fetch-quote.mjs [--history] [--soft]
//
//   --history  aggiunge al file storico le date del piano ormai passate
//   --soft     non fallisce se la rete non risponde: lascia i file come sono

import fs from "node:fs";
import path from "node:path";

const RADICE = path.resolve(import.meta.dirname, "..");
const QUOTE = path.join(RADICE, "public", "quote.json");
const STORICO = path.join(RADICE, "src", "data", "reference-prices.json");

const argv = new Set(process.argv.slice(2));
const CON_STORICO = argv.has("--history");
const SOFT = argv.has("--soft");

const SIMBOLO = process.env.QUOTE_SYMBOL;
// Il cambio non identifica nessuna azienda, quindi puo' stare in chiaro.
const SIMBOLO_FX = process.env.FX_SYMBOL ?? "EURUSD=X";

function morire(messaggio) {
  // Mai stampare il simbolo: questo log e' pubblico su un repo pubblico.
  console.error(`fetch-quote: ${messaggio}`);
  process.exit(SOFT ? 0 : 1);
}

if (!SIMBOLO) morire("manca QUOTE_SYMBOL nell'ambiente (impostalo come GitHub secret)");

/** Le chiusure giornaliere di un simbolo, in un intervallo. */
async function chiusure(simbolo, daSec, aSec) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}` +
    `?interval=1d&period1=${daSec}&period2=${aSec}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`il fornitore ha risposto ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  const stamp = r?.timestamp ?? [];
  const close = r?.indicators?.quote?.[0]?.close ?? [];
  const out = [];
  stamp.forEach((t, i) => {
    const c = close[i];
    if (typeof c === "number" && Number.isFinite(c)) {
      out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: c });
    }
  });
  if (!out.length) throw new Error("il fornitore non ha restituito nessuna chiusura");
  return out;
}

const arrotonda = (v, d) => Number(v.toFixed(d));
const allaData = (serie, data) => {
  const prima = serie.filter((x) => x.date <= data);
  return prima.length ? prima[prima.length - 1] : null;
};

const oggi = new Date().toISOString().slice(0, 10);
// Undici anni indietro: copre tutto lo storico del piano e sta in una richiesta.
const DA = Math.floor(Date.UTC(new Date().getUTCFullYear() - 11, 0, 1) / 1000);
const A = Math.floor(Date.now() / 1000) + 86400;

let azione, cambio;
try {
  [azione, cambio] = await Promise.all([chiusure(SIMBOLO, DA, A), chiusure(SIMBOLO_FX, DA, A)]);
} catch (e) {
  morire(`quotazioni non disponibili: ${e.message}`);
}

// ------------------------------------------------------------------ quote.json

const ultima = azione[azione.length - 1];
const ultimoFx = cambio[cambio.length - 1];
const precedente = fs.existsSync(QUOTE) ? JSON.parse(fs.readFileSync(QUOTE, "utf8")) : {};

const nuovaQuote = {
  $comment: precedente.$comment ??
    "Generato da scripts/fetch-quote.mjs in CI. Il simbolo arriva da un GitHub secret e non compare qui.",
  date: ultima.date,
  close: arrotonda(ultima.close, 4),
  eurusd: arrotonda(ultimoFx.close, 6),
  eurusdOn: ultimoFx.date,
  currency: "USD",
  generatedAt: new Date().toISOString(),
  // Una chiusura di tre giorni fa non e' un errore (nel weekend e' la norma),
  // ma piu' di una settimana vuol dire che qualcosa si e' rotto a monte.
  stale: (Date.parse(oggi) - Date.parse(ultima.date)) / 86400000 > 7,
};

fs.writeFileSync(QUOTE, `${JSON.stringify(nuovaQuote, null, 2)}\n`);
console.log(`fetch-quote: quote.json aggiornato alla chiusura del ${ultima.date}`);

// --------------------------------------------------------------- storico

if (CON_STORICO) {
  const file = JSON.parse(fs.readFileSync(STORICO, "utf8"));
  const chiave = file.keyDates;
  const presenti = new Set(file.prices.map((p) => p.date));
  const anni = new Set(file.prices.map((p) => Number(p.date.slice(0, 4))));
  anni.add(new Date().getUTCFullYear());

  const aggiunte = [];
  for (const anno of [...anni].sort()) {
    for (const md of chiave) {
      const data = `${anno}-${md}`;
      // Solo date del piano gia' passate: una data futura non ha una chiusura,
      // e scriverla con l'ultima disponibile sarebbe un numero inventato.
      if (data > oggi || presenti.has(data)) continue;
      const a = allaData(azione, data);
      const f = allaData(cambio, data);
      if (!a || !f) continue;
      aggiunte.push({
        date: data,
        close: arrotonda(a.close, 4),
        closeOn: a.date,
        eurusd: arrotonda(f.close, 6),
        eurusdOn: f.date,
      });
    }
  }

  if (aggiunte.length) {
    file.prices = [...file.prices, ...aggiunte].sort((x, y) => x.date.localeCompare(y.date));
    file.updated = oggi;
    fs.writeFileSync(STORICO, `${JSON.stringify(file, null, 2)}\n`);
    console.log(`fetch-quote: ${aggiunte.length} date del piano aggiunte allo storico`);
  } else {
    console.log("fetch-quote: nessuna data nuova da aggiungere allo storico");
  }
}
