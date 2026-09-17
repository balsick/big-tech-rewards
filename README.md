# Big Tech Rewards

Two simulators for equity compensation — **RSU** and **ESPP** — under Italian
payroll taxation. A static site, every calculation in the browser, no data
collection.

👉 **[balsick.github.io/big-tech-rewards](https://balsick.github.io/big-tech-rewards/)**

The interface is bilingual (Italian / English). The code, the comments and this
README are in English; the tax rules they model are Italian, and so are the
Italian-language strings in `src/i18n/it.ts`.

---

## ⚠️ This is not an official tool

**It is not affiliated with, endorsed by or sponsored by any company, stock
plan, broker or tax authority.** Rates, formulas and quotes may be wrong,
incomplete or out of date. The authors **disclaim all responsibility** for the
correctness of the information provided and for any decision taken on the basis
of it. This is not financial, tax or investment advice: always check the numbers
against your payslip, your plan documents and a professional.

## 🔒 No data collection

No analytics, no cookies, no trackers, no server — there is no backend this page
*could* send anything to. The numbers you type stay in the page's memory and go
away when you close it.

If retyping the forms every visit is a nuisance, there is an **explicit button**
at the foot of each tool's left column: it saves the fields in that browser's
`localStorage`, on that device, and "Forget everything" next to it removes them.
No autosave and no pre-ticked box: a promise to keep nothing holds if the user
decides when to make the exception. Without pressing it, `localStorage` holds
only three preferences — language, theme and your local surtax rates — never an
amount.

The only network request is to `quote.json`, served from this same origin. There
is a second, **optional** fetch, only if you press "refresh the rate": it goes to
[Frankfurter](https://frankfurter.dev) for the day's ECB EUR/USD reference, and
sends nothing beyond the request itself.

---

## What is in it

### ESPP

The discounted share purchase plan, and the two things no mental arithmetic gets
right:

- **the lookback** — the price you pay is the discount on the **lower** of the
  value at the start of the period and the value on purchase day, which is why
  the plan pays off even when the stock falls. The guaranteed minimum is not the
  discount but `discount/(1−discount)`: at 15% that is **+17.65%**, not +15%;
- **the discount is employment income**, not a stock market gain: it lands on
  your payslip as taxable pay and the tax is withheld right there, in the month
  of the purchase, without a single euro of that benefit ever passing through
  your account.

The percentage is picked with a discrete 1–15% slider, whole points as on the
plan's own portal; the free field next to it is in **euro**, not in percent,
because a hand-typed percentage is not another case — it is the slider's case
typed worse. What the percentage cannot give you is the real amount: a window you
joined halfway through, a month of unpaid leave, a cap in another currency.

There is also the **$10,625 per period cap**, which is not a round number picked
at random but the US tax limit: $25,000 a year of market value at grant, bought
with $21,250 of contributions at a 15% discount. It starts to bite above roughly
€123,000 of gross salary, and the tool says so when it does — otherwise the
"refund" suddenly becomes enormous with nothing to explain it.

The **"try the floor"** button sets the purchase price equal to the starting one
— a flat stock — so only the discount is left: the plan's floor.

### RSU

The units are the fact, the value is a lens. What this tool adds is the
**three-year projection** over a **list** of grants, with annual, 30-30-40,
quarterly or monthly vesting, and quarterly vests optionally snapped to the
plan's fixed calendar.

It is needed because with a new grant every year and quarterly vesting, in any
given year slices of three or four different grants vest — and **the taxman adds
up everything that vests in the same year**. It is the year's total that sets the
rate, not the individual tranche, so looking at one grant at a time gives the
wrong number.

The grant is typed **in dollars**, not in shares, because that is how it is
communicated: the units are the result, and the price on the **grant date** sets
them — which the tool looks up in its stored history. It also shows something you
cannot see in share counts: two grants of the same amount made in different years
are worth very different sums today. For a grant dated **in the future** no close
exists, so the price becomes a field, prefilled with the latest known quote and
overwritable: that is where you try "and what if the stock were at…".

### Tax and local surtaxes

Not a third screen: it is the **calibration** of the other two, at the foot of
the left column in both. RSUs and ESPP answer "how much reaches me", and this
panel is the part of that answer that depends on where you live.

| Item | 2026 value | Notes |
| --- | --- | --- |
| Income tax brackets | 23% ≤ 28,000 · 33% 28–50,000 · 43% > 50,000 | the second fell from 35% in the 2026 budget |
| Social security | 9.19% + minor rates, +1% above €56,224, stops at €122,295 | 2026 first band and ceiling |
| Employment credit | art. 13 §1 | 1,955 / 1,910 + 1,190·… / 1,910·… |
| Payroll tax cut | €1,000 between 20–32,000, fading to 40,000 | plus the low-income supplement below 20,000 |
| Clawback above 200,000 | −€440 of credits | neutralises the cut to 33% |
| Regional surtax | Piedmont 2026-27: 1.62 / 2.68 / 3.31 / 3.33% | **editable** |
| Municipal surtax | Turin: 0.8 / 1.1 / 1.2%, exemption €11,790 | **editable** |

Local surtaxes are the only part of the calculation no national constant can
guess — they change by region and municipality and come to nearly €1,800 a year
on a €50,000 salary — so **all of them are editable**, rates and brackets, and
they persist between visits.

The marginal rate is computed **by difference** rather than with a formula,
because four things pile up at the margin: the income tax bracket, the credits
phasing out, the extra 1% of social security above the first band, and the surtax
brackets. The result is a curve you would not guess: the worst point is **around
€36,000 of gross salary, where the real margin approaches 63%** — twenty points
above the nominal rate, and more than someone on €70,000 pays.

---

## Quotes, and the CORS problem

The provider that has the historical closes (Yahoo Finance) **does not send CORS
headers**: a `fetch` from the page is blocked by the browser, and there is
nothing client code can do about it. Verified:

```
$ curl -sS -D - -H 'Origin: https://balsick.github.io' \
    'https://query1.finance.yahoo.com/v8/finance/chart/SYMBOL?interval=1d&range=5d' \
    | grep -i access-control
# (nothing)
```

The same goes for Stooq. The CORS-open alternatives for **equities** want an API
key, and a key inside a static bundle is a public key. The only source the browser
can call by itself is Frankfurter, which knows only **currencies**.

### What this repo does

CI fetches the quote, not the browser:

1. `.github/workflows/deploy.yml` runs on every push and every morning at 06:00
   UTC, Tuesday to Saturday — that is, after every close;
2. `scripts/fetch-quote.mjs` reads the symbol from the `QUOTE_SYMBOL` secret,
   downloads the quote **inside the runner** and writes `public/quote.json`;
3. the build ends up in the Pages artifact, and the page reads `quote.json`
   **from its own origin**.

Result: no CORS, no key in the bundle, no third-party request while you browse,
and a price at most one close old. The field always stays overwritable by hand,
which is the only thing that works regardless.

`quote.json` is regenerated on every deploy, which is why the schedule sits on
the deploy rather than on a separate workflow: **a commit made with
`GITHUB_TOKEN` does not trigger other workflows**, so a job that refreshed the
file expecting the deploy to start on its own would never publish anything. The
second workflow, `refresh-quote.yml`, exists only to append newly passed plan
dates to the committed history — six times a year — and the next morning's
deploy takes them online.

### The alternatives, and why not

| Strategy | Verdict |
| --- | --- |
| Direct `fetch` to Yahoo/Stooq from the browser | **impossible**: no CORS headers |
| Keyed API (Finnhub, Twelve Data, Alpha Vantage) | the key would ship in the bundle, i.e. public |
| Public CORS proxy (`corsproxy.io`, `r.jina.ai`) | unreliable, and would hand the symbol to a third party |
| Your own proxy (Cloudflare Worker, Vercel function) | works and gives real time, but it is no longer a purely static site: one more service to run |
| **Quote generated in CI** ✅ | what is here: same-origin, no keys, one day behind |
| Manual entry only | always available as a fallback, and the page says so |

If real time were ever needed, the place for it is your own proxy: `loadQuote()`
in [`src/lib/prices.ts`](src/lib/prices.ts) would change by one line.

## No ticker in the sources

Nowhere in this repository are the company name or the ticker written down. The
symbol lives in a **GitHub secret**, enters the runner from the environment and
does not leave it: the files derived from it contain only numbers and dates.

- `src/data/reference-prices.json` — the reference closes on the only days the
  plan uses: the **20th of February, May, August and November** (the vestings)
  and the **1st of April and October** (the ESPP purchases). When the market was
  shut on that day, the previous close applies and `closeOn` says which day it is
  from.
- `public/quote.json` — the latest close available, generated in CI.

The Action logs are clean too: `fetch-quote.mjs` never prints the symbol, because
on a public repository anyone can read those logs.

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:5173/big-tech-rewards/
npm test             # 25 tests on the tax engine, ESPP and RSU (no dependencies)
npm run typecheck
npm run build
```

To refresh the quote locally you need the symbol in the environment — do not
commit the value anywhere:

```bash
QUOTE_SYMBOL=... npm run quote -- --history
```

### Putting it online on your own account

1. `Settings → Secrets and variables → Actions` → new secret **`QUOTE_SYMBOL`**
   with the ticker;
2. `Settings → Pages` → *Source: **GitHub Actions***;
3. change `base` in [`vite.config.ts`](vite.config.ts) and `REPO` in
   [`src/lib/meta.ts`](src/lib/meta.ts) if the repository has another name;
4. adjust the surtaxes in the **Tax & local surtaxes** panel to your own town, or
   change the defaults in [`src/lib/tax.ts`](src/lib/tax.ts).

Without the secret the deploy still goes through (`--soft`): the site keeps the
`quote.json` already in the repo, and prices are typed by hand.

## How it is built

Vite, React, TypeScript and a hand-written stylesheet — no CSS framework, no
charting library (the vesting chart is twenty SVG rectangles reading the theme
variables), no test dependencies. The bundle is about 92 kB gzipped.

```
src/lib/tax.ts       income tax, social security, credits, surtaxes, marginal rate
src/lib/espp.ts      lookback, discount, guaranteed floor, plan cap
src/lib/rsu.ts       tranches, plan calendar, per-year projection
src/lib/prices.ts    quote.json, stored history, live FX
src/lib/storage.ts   the explicit save, and nothing automatic
src/i18n/            the Italian and English dictionaries
test/tax.test.ts     the tests, runnable with plain `node --test`
```

The interface follows the [Impeccable](https://impeccable.style) craft floor in
**Operate** mode: a fixed rem type scale rather than fluid, one consistent
control vocabulary, accent colour reserved for actions and states, drawn icons
instead of unicode glyphs, no eyebrow labels above headings, no nested cards, and
a single moment of motion — the number redrawing when a field changes — rather
than a staggered entrance at load.

## Licence

[MIT](LICENSE). No warranty, express or implied — see the disclaimer above.
