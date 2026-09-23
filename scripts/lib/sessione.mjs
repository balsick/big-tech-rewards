// Quando una barra giornaliera è una chiusura, e quando no.
//
// Il fornitore fa due cose, e lo script ci ha creduto tutte e due le volte:
//
//   - **durante** la seduta la barra di oggi esiste già, e porta il prezzo di
//     questo istante. Letta come chiusura è un numero inventato: il 17
//     settembre un giro delle 14:16 di New York ha scritto «la chiusura del
//     17» quattro ore prima che il 17 chiudesse.
//   - **appena dopo** la campana la barra c'è e il suo `close` è `null` — il
//     dato giornaliero non è ancora consolidato — mentre la chiusura vera sta
//     in `meta.regularMarketPrice`. Il 22 settembre erano 198,27, e scartare
//     la barra nulla (che è giusto) lasciava come ultima chiusura utile i
//     194,23 di lunedì: il sito restava indietro di una seduta.
//
// La risposta è nella risposta stessa: `regularMarketTime` con `gmtoffset`
// dice che ore erano **sull'orologio della borsa** all'ultima quotazione
// regolare. Dopo la campana quella quotazione **è** la chiusura del suo
// giorno; prima, di oggi non è ancora una chiusura niente.
//
// Vale per il titolo, non per il cambio: il cambio non ha una campana — si
// scambia tutto il giorno — e lì l'ultima barra è il tasso migliore che c'è.

/** L'orario della campana, sull'orologio della borsa. */
export const CAMPANA = "16:00";

const oraLocale = (epochSec, gmtoffset) =>
  new Date((epochSec + gmtoffset) * 1000).toISOString().slice(11, 16);
const giornoLocale = (epochSec, gmtoffset) =>
  new Date((epochSec + gmtoffset) * 1000).toISOString().slice(0, 10);

/**
 * Le chiusure, tenendo solo le sedute finite.
 *
 * Non muta l'elenco che riceve. Senza i campi che servono lo lascia com'è: un
 * fornitore che non dice che ore sono in borsa non autorizza a indovinarlo.
 *
 * Una mezza giornata di borsa (chiusura alle 13:00) qui risulta «ancora
 * aperta» fino alle 16:00, quindi per qualche ora si tiene la chiusura del
 * giorno prima. È il verso sicuro dell'errore: meglio un dato vecchio di uno
 * inventato, e il giro dopo rimette tutto a posto.
 */
export function soloSeduteChiuse(chiusure, meta = {}) {
  if (typeof meta.regularMarketTime !== "number" || typeof meta.gmtoffset !== "number") {
    return chiusure;
  }
  const giorno = giornoLocale(meta.regularMarketTime, meta.gmtoffset);
  const chiusa = oraLocale(meta.regularMarketTime, meta.gmtoffset) >= CAMPANA;
  const out = chiusure.filter((x) => (chiusa ? true : x.date < giorno));
  if (chiusa && typeof meta.regularMarketPrice === "number" && !out.some((x) => x.date === giorno)) {
    out.push({ date: giorno, close: meta.regularMarketPrice });
  }
  return out;
}
