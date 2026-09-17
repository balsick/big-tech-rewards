# Big Tech Rewards

Due simulatori per i compensi in azioni — **RSU** ed **ESPP** — con la fiscalità
italiana del reddito da lavoro dipendente. Sito statico, tutto il conto nel
browser, nessuna raccolta di dati.

👉 **[balsick.github.io/big-tech-rewards](https://balsick.github.io/big-tech-rewards/)**

> *English:* two calculators for equity compensation (RSU and ESPP) under
> Italian payroll taxation. Static site, everything computed client-side, no
> data collection. The UI is bilingual (IT/EN); the code and this README are in
> Italian, because the tax rules they model are.

---

## ⚠️ Non è uno strumento ufficiale

**Non è associato, approvato o sponsorizzato da nessuna azienda, nessun piano
azionario, nessun broker e nessuna amministrazione fiscale.** Aliquote, formule
e quotazioni possono essere sbagliate, incomplete o superate. Gli autori
**declinano ogni responsabilità** sulla correttezza delle informazioni fornite e
su qualsiasi decisione presa in base a esse. Non è consulenza finanziaria,
fiscale o di investimento: verifica sempre i numeri con la tua busta paga, i
documenti del tuo piano e un professionista.

## 🔒 Nessuna raccolta di dati

Nessun analytics, nessun cookie, nessun tracker, nessun server. I numeri che
scrivi restano nella memoria della pagina e se ne vanno quando la chiudi: non
vengono salvati e non vengono trasmessi. In `localStorage` finiscono soltanto
tre preferenze — lingua, tema e le aliquote delle addizionali — mai un importo.

L'unica richiesta di rete è a `quote.json`, servito da questa stessa origine.
C'è un secondo fetch **opzionale**, solo se premi «aggiorna il cambio»: va a
[Frankfurter](https://frankfurter.dev) per il riferimento BCE EUR/USD del
giorno, e non manda niente oltre la richiesta.

---

## Cosa c'è dentro

### ESPP

Il piano di acquisto azioni a sconto, e le due cose che nessun conto a mente
indovina:

- **il lookback** — il prezzo che paghi è lo sconto sul **minore** fra il valore
  a inizio periodo e quello del giorno dell'acquisto, per cui il piano conviene
  anche quando il titolo scende. Il minimo garantito non è lo sconto ma
  `sconto/(1−sconto)`: col 15% è **+17,65%**, non +15%;
- **lo sconto è reddito da lavoro**, non un guadagno di borsa: finisce in busta
  come imponibile e le tasse vengono trattenute lì, nel cedolino del mese
  dell'acquisto, senza che un euro di quel beneficio ti sia mai passato per il
  conto.

La percentuale si sceglie con uno slider discreto 1–15% (i punti percentuali,
come sul portale del piano) oppure si scrive libera, decimali compresi. Il
pulsante **«Al minimo»** mette il prezzo dell'acquisto uguale a quello d'inizio
— titolo fermo — così resta solo lo sconto: è il pavimento del piano.

### RSU

Le unità sono il fatto, il valore è una lente. Il pezzo che questo strumento
aggiunge è la **prospettiva a tre anni** su una **lista** di assegnazioni, con
vestizione annuale, 30-30-40, trimestrale o mensile, e con le trimestrali
allineabili al calendario fisso del piano.

Serve perché con un grant nuovo ogni anno e vestizioni trimestrali, in un anno
qualsiasi vestono pezzi di tre o quattro grant diversi — e **il fisco somma
tutto quello che vesta nello stesso anno**. È il totale dell'anno a decidere
l'aliquota, non la singola tranche, quindi guardare un grant per volta dà il
numero sbagliato.

### Tasse e addizionali

Il motore fiscale, con tutto quello che serve per un'aliquota marginale vera:

| Voce | Valore 2026 | Note |
| --- | --- | --- |
| Scaglioni IRPEF | 23% ≤ 28.000 · 33% 28–50.000 · 43% > 50.000 | la seconda è scesa dal 35% col bilancio 2026 |
| INPS | 9,19% + minori, +1% oltre 56.224 €, stop a 122.295 € | prima fascia e massimale 2026 |
| Detrazione lavoro dipendente | art. 13 co. 1 TUIR | 1.955 / 1.910 + 1.190·… / 1.910·… |
| Cuneo fiscale | 1.000 € fra 20–32.000, in calo fino a 40.000 | più la somma integrativa sotto i 20.000 |
| Recupero oltre 200.000 | −440 € di detrazioni | neutralizza il taglio al 33% |
| Addizionale regionale | Piemonte 2026-27: 1,62 / 2,68 / 3,31 / 3,33% | **modificabile** |
| Addizionale comunale | Torino: 0,8 / 1,1 / 1,2%, esenzione 11.790 € | **modificabile** |

Le addizionali sono l'unica parte del conto che nessuna costante nazionale può
indovinare — cambiano per regione e per comune e su una RAL da 60.000 valgono
quasi 2.000 euro l'anno — quindi sono **tutte modificabili**, aliquote e
scaglioni, e restano salvate fra una visita e l'altra.

L'aliquota marginale si calcola **per differenza** e non con una formula, perché
sul margine si accavallano quattro cose: lo scaglione IRPEF, le detrazioni che
si spengono, l'1% INPS sopra la prima fascia e gli scaglioni delle addizionali.
Il risultato è una curva che non si indovina: il punto peggiore è **intorno ai
36.000 di RAL, dove il margine reale sfiora il 63%** — venti punti sopra
l'aliquota nominale, e più di quanto paga chi sta a 70.000.

---

## Le quotazioni, e il problema del CORS

Il fornitore che ha le chiusure storiche (Yahoo Finance) **non manda gli header
CORS**: una `fetch` dalla pagina viene bloccata dal browser, e non c'è niente
che il codice del client possa fare al riguardo. Verificato:

```
$ curl -sS -D - -H 'Origin: https://balsick.github.io' \
    'https://query1.finance.yahoo.com/v8/finance/chart/SYMBOL?interval=1d&range=5d' \
    | grep -i access-control
# (niente)
```

Lo stesso vale per Stooq. Le alternative CORS-aperte per le **azioni** vogliono
una chiave, e una chiave dentro un bundle statico è una chiave pubblica.
L'unica fonte che il browser può chiamare da solo è Frankfurter, che però
conosce solo le **valute**.

### La soluzione adottata

La quotazione la prende la **CI**, non il browser:

1. `.github/workflows/refresh-quote.yml` gira dopo ogni chiusura;
2. `scripts/fetch-quote.mjs` legge il simbolo dal secret `QUOTE_SYMBOL`,
   scarica la quotazione **nel runner** e scrive `public/quote.json`;
3. il commit su `main` fa ripartire il deploy, e la pagina legge `quote.json`
   **dalla propria origine**.

Risultato: nessun CORS, nessuna chiave nel bundle, nessuna richiesta a terzi
mentre uno naviga, e un prezzo fermo al massimo all'ultima chiusura. Il campo
resta sempre riscrivibile a mano, che è l'unica cosa che funziona comunque.

### Le alternative, e perché no

| Strategia | Verdetto |
| --- | --- |
| `fetch` diretta a Yahoo/Stooq dal browser | **impossibile**: nessun header CORS |
| API con chiave (Finnhub, Twelve Data, Alpha Vantage) | la chiave finirebbe nel bundle, cioè pubblica |
| Proxy CORS pubblico (`corsproxy.io`, `r.jina.ai`) | inaffidabile, e manderebbe il simbolo a un terzo |
| Proxy proprio (Cloudflare Worker, funzione Vercel) | funziona e dà il tempo reale, ma non è più un sito solo statico: un servizio in più da gestire |
| **Quote generata in CI** ✅ | quello che c'è: same-origin, zero chiavi, un giorno di ritardo |
| Solo inserimento manuale | resta sempre disponibile come ripiego, e la pagina lo dice |

Se un giorno servisse il tempo reale, il posto dove metterlo è il proxy
proprio: `caricaQuote()` in [`src/lib/prices.ts`](src/lib/prices.ts) cambierebbe
di una riga.

## Niente ticker nei sorgenti

Da nessuna parte in questo repository sono scritti il nome dell'azienda o il
simbolo del titolo. Il simbolo vive in un **GitHub secret**, entra dall'ambiente
nel runner e non esce: i file che ne derivano contengono solo numeri e date.

- `src/data/reference-prices.json` — le chiusure di riferimento nei soli giorni
  che il piano usa: il **20 di febbraio, maggio, agosto e novembre** (le
  vestizioni) e il **1° di aprile e di ottobre** (gli acquisti ESPP). Quando quel
  giorno il mercato era chiuso vale l'ultima chiusura precedente, e `closeOn`
  dice di quando è.
- `public/quote.json` — l'ultima chiusura disponibile, generata in CI.

Anche i log delle Action sono puliti: `fetch-quote.mjs` non stampa mai il
simbolo, perché su un repo pubblico quei log li legge chiunque.

---

## Far girare tutto in locale

```bash
npm install
npm run dev          # http://localhost:5173/big-tech-rewards/
npm test             # 23 test sul motore fiscale, ESPP e RSU (zero dipendenze)
npm run typecheck
npm run build
```

Per aggiornare la quotazione in locale serve il simbolo nell'ambiente — non
committare il valore da nessuna parte:

```bash
QUOTE_SYMBOL=... npm run quote -- --history
```

### Metterlo online sul proprio account

1. `Settings → Secrets and variables → Actions` → nuovo secret
   **`QUOTE_SYMBOL`** con il simbolo del titolo;
2. `Settings → Pages` → *Source: **GitHub Actions***;
3. cambia `base` in [`vite.config.ts`](vite.config.ts) e `REPO` in
   [`src/lib/meta.ts`](src/lib/meta.ts) se il repo ha un altro nome;
4. adatta le addizionali nel pannello **Tasse** al tuo comune, o cambia i
   default in [`src/lib/tax.ts`](src/lib/tax.ts).

Senza il secret il deploy va avanti comunque (`--soft`): il sito resta con il
`quote.json` già in repo, e i prezzi si scrivono a mano.

## Com'è fatto

Vite, React, TypeScript e un foglio di stile scritto a mano — nessun framework
CSS, nessuna libreria di grafici (il grafico delle vestizioni sono trentasei
rettangoli di SVG che leggono le variabili del tema), nessuna dipendenza di
test. Il bundle sta in 90 kB compressi.

```
src/lib/tax.ts       IRPEF, INPS, detrazioni, addizionali, aliquota marginale
src/lib/espp.ts      lookback, sconto, minimo garantito
src/lib/rsu.ts       tranche, calendario del piano, prospetto per anno
src/lib/prices.ts    quote.json, storico, cambio live
src/i18n/            i dizionari italiano e inglese
test/tax.test.ts     i test, eseguibili con il solo `node --test`
```

## Licenza

[MIT](LICENSE). Nessuna garanzia, espressa o implicita — vedi il disclaimer
sopra.
