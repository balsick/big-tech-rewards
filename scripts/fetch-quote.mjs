#!/usr/bin/env node
// Quotes are fetched by CI, not by the browser.
//
// The reason is technical and there is no way around it from the client: the
// provider that has the historical closes **does not send CORS headers**, so a
// fetch from the page is blocked by the browser. The CORS-open alternatives for
// equities want an API key, and a key inside a static bundle is a public key.
//
// So: this script runs in the runner, reads the symbol from a secret, and
// writes two files that end up in the deployment. The page reads them from its
// own origin — no CORS, no key in the bundle, no third-party request while
// anyone is browsing.
//
// The symbol appears nowhere in the sources and nowhere in the output: it comes
// in from the environment, stays in the runner, and the files it writes contain
// only numbers.
//
//   QUOTE_SYMBOL=... node scripts/fetch-quote.mjs [--history] [--soft]
//
//   --history  add the plan dates that have now passed to the history file
//   --soft     do not fail if the network is down: leave the files as they are

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const QUOTE = path.join(ROOT, "public", "quote.json");
const HISTORY = path.join(ROOT, "src", "data", "reference-prices.json");

const argv = new Set(process.argv.slice(2));
const WITH_HISTORY = argv.has("--history");
const SOFT = argv.has("--soft");

const SYMBOL = process.env.QUOTE_SYMBOL;
// The exchange rate identifies no company, so it can stay in the clear.
const FX_SYMBOL = process.env.FX_SYMBOL ?? "EURUSD=X";

function die(message) {
  // Never print the symbol: this log is public on a public repository.
  console.error(`fetch-quote: ${message}`);
  process.exit(SOFT ? 0 : 1);
}

if (!SYMBOL) die("QUOTE_SYMBOL is missing from the environment (set it as a GitHub secret)");

/**
 * Daily closes for a symbol, over a range — and the dividend history with it.
 *
 * `events=div` comes from the same request and the same secret, which is the
 * reason the dividends are taken from here rather than from the company's
 * investor-relations page: that URL contains the company's name, and no source
 * file in this repository is allowed to.
 */
async function closes(symbol, fromSec, toSec, withEvents = false) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${fromSec}&period2=${toSec}${withEvents ? "&events=div" : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`the provider answered ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  const stamps = r?.timestamp ?? [];
  const close = r?.indicators?.quote?.[0]?.close ?? [];
  const out = [];
  stamps.forEach((t, i) => {
    const c = close[i];
    if (typeof c === "number" && Number.isFinite(c)) {
      out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: c });
    }
  });
  if (!out.length) throw new Error("the provider returned no closes at all");
  out.dividends = Object.values(r?.events?.dividends ?? {})
    .map((d) => ({ date: new Date(d.date * 1000).toISOString().slice(0, 10), amount: d.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

const round = (v, d) => Number(v.toFixed(d));

/**
 * The fair market value at a date: the mean of the closes of the 20 trading
 * sessions BEFORE it, the date itself excluded.
 *
 * This is the plan's definition of the price that turns a dollar grant into a
 * number of units, and it is not the close of the day: on 2026-02-20 the close
 * was 142.88 and this is 146.32. Getting it wrong by using the close misstates
 * every unit count by a couple of percent.
 *
 * `null` when there are not 20 sessions behind the date, rather than an average
 * of however many there are — a 12-session mean is a different number wearing
 * the same name.
 */
const FMV_SESSIONS = 20;
function fmvAt(series, date) {
  const before = series.filter((x) => x.date < date).slice(-FMV_SESSIONS);
  if (before.length < FMV_SESSIONS) return null;
  return round(before.reduce((sum, x) => sum + x.close, 0) / FMV_SESSIONS, 4);
}
const at = (series, date) => {
  const before = series.filter((x) => x.date <= date);
  return before.length ? before[before.length - 1] : null;
};

const today = new Date().toISOString().slice(0, 10);
// Eleven years back: covers the whole plan history and fits in one request.
const FROM = Math.floor(Date.UTC(new Date().getUTCFullYear() - 11, 0, 1) / 1000);
const TO = Math.floor(Date.now() / 1000) + 86400;

let equity, fx;
try {
  [equity, fx] = await Promise.all([closes(SYMBOL, FROM, TO, true), closes(FX_SYMBOL, FROM, TO)]);
} catch (e) {
  die(`quotes unavailable: ${e.message}`);
}

// ------------------------------------------------------------------ quote.json

const last = equity[equity.length - 1];
const lastFx = fx[fx.length - 1];
const previous = fs.existsSync(QUOTE) ? JSON.parse(fs.readFileSync(QUOTE, "utf8")) : {};

const nextQuote = {
  $comment:
    previous.$comment ??
    "Generated by scripts/fetch-quote.mjs in CI. The symbol comes from a GitHub secret and does not appear here.",
  date: last.date,
  close: round(last.close, 4),
  eurusd: round(lastFx.close, 6),
  eurusdOn: lastFx.date,
  // What a grant dated today would be priced at: the rolling 20-session mean.
  // The page needs it for a grant date in the future, where the real figure
  // cannot exist yet.
  fmv20: round(equity.slice(-FMV_SESSIONS).reduce((sum, x) => sum + x.close, 0) / FMV_SESSIONS, 4),
  currency: "USD",
  generatedAt: new Date().toISOString(),
  // A close from three days ago is not an error (at a weekend it is the norm),
  // but more than a week means something upstream has broken.
  stale: (Date.parse(today) - Date.parse(last.date)) / 86400000 > 7,
};

fs.writeFileSync(QUOTE, `${JSON.stringify(nextQuote, null, 2)}\n`);
console.log(`fetch-quote: quote.json updated to the close of ${last.date}`);

// --------------------------------------------------------------- history

if (WITH_HISTORY) {
  const file = JSON.parse(fs.readFileSync(HISTORY, "utf8"));
  const keyDates = file.keyDates;
  const present = new Set(file.prices.map((p) => p.date));
  const years = new Set(file.prices.map((p) => Number(p.date.slice(0, 4))));
  years.add(new Date().getUTCFullYear());

  const added = [];
  for (const year of [...years].sort()) {
    for (const md of keyDates) {
      const date = `${year}-${md}`;
      // Only plan dates that have already passed: a future date has no close,
      // and writing it with the latest available one would be a made-up number.
      if (date > today || present.has(date)) continue;
      const e = at(equity, date);
      const f = at(fx, date);
      if (!e || !f) continue;
      const fmv = fmvAt(equity, date);
      added.push({
        date,
        close: round(e.close, 4),
        closeOn: e.date,
        eurusd: round(f.close, 6),
        eurusdOn: f.date,
        ...(fmv === null ? {} : { fmv }),
      });
    }
  }

  // The dividend history: date, dollars per share, and the close of that day,
  // which is what the equivalent units are priced at. Rewritten whole rather
  // than appended to, because a restated dividend should correct itself.
  const closeAt = (date) => {
    const before = equity.filter((x) => x.date <= date);
    return before.length ? before[before.length - 1].close : null;
  };
  const divRows = (equity.dividends ?? [])
    .filter((d) => d.date >= "2016-01-01")
    .map((d) => ({ date: d.date, amount: round(d.amount, 4), close: closeAt(d.date) }))
    .filter((d) => d.close !== null)
    .map((d) => ({ ...d, close: round(d.close, 4) }));
  const divChanged = JSON.stringify(divRows) !== JSON.stringify(file.dividends ?? []);
  if (divRows.length) file.dividends = divRows;

  // Rows written before the fair market value existed have no `fmv`. Filling
  // them here rather than in a one-off migration means the file repairs itself
  // on the next run, from the same series the new rows come from.
  let backfilled = 0;
  for (const row of file.prices) {
    if (typeof row.fmv === "number") continue;
    const fmv = fmvAt(equity, row.date);
    if (fmv !== null) {
      row.fmv = fmv;
      backfilled++;
    }
  }

  if (added.length || backfilled || divChanged) {
    file.prices = [...file.prices, ...added].sort((x, y) => x.date.localeCompare(y.date));
    file.updated = today;
    fs.writeFileSync(HISTORY, `${JSON.stringify(file, null, 2)}\n`);
    console.log(
      `fetch-quote: ${added.length} plan dates added, ${backfilled} fair market values filled in, ` +
        `${divRows.length} dividend payments stored`
    );
  } else {
    console.log("fetch-quote: no new dates to add to the history");
  }
}
