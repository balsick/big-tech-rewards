import { marginale, type Regime, type VoceLorda } from "./tax.ts";

// L'ESPP, e le due cose che nessun conto a mente indovina.
//
// **Il lookback**: il prezzo che paghi non e' lo sconto sul prezzo di oggi, e'
// lo sconto sul *minore* fra il valore a inizio periodo e quello del giorno
// dell'acquisto. E' la ragione per cui il piano conviene anche quando il titolo
// scende, e per cui il rendimento minimo non e' lo sconto ma sconto/(1-sconto):
// con il 15% di sconto il minimo garantito e' +17,65%, non +15%.
//
// **Lo sconto e' reddito da lavoro, non un guadagno di borsa**: l'azienda te lo
// mette in busta come imponibile e ti trattiene le tasse lì, nel cedolino del
// mese dell'acquisto, senza che un euro di quel beneficio ti sia mai passato
// per il conto. Chi non se lo aspetta trova un cedolino piu' leggero e non sa
// perche'.

export interface PianoEspp {
  /** percentuale di sconto sul prezzo di riferimento */
  sconto: number;
  /** se il prezzo si applica al minore fra inizio e fine periodo */
  lookback: boolean;
  /** durata del periodo di accumulo, in mesi */
  mesi: number;
  /** tetto contributivo del piano, in percentuale della retribuzione */
  maxPct: number;
  /**
   * Tetto in dollari per periodo, oltre il quale la trattenuta non compra piu'
   * azioni e torna indietro.
   *
   * Non e' una regola aziendale, e' il limite fiscale americano: 25.000 dollari
   * l'anno di valore di mercato alla data di concessione. Con il 15% di sconto
   * quei 25.000 di valore si comprano con 21.250 di contributi, cioe' 10.625
   * per finestra semestrale — ed e' il motivo per cui il numero e' quello e non
   * un altro.
   *
   * Morde solo sopra una certa retribuzione: con il 15% su sei mesi ci si
   * arriva intorno ai 123.000 euro di RAL. Sotto non si vede, e sopra si vede
   * eccome, perche' la parte oltre il tetto resta ferma per mesi senza comprare
   * niente.
   */
  maxUsd: number;
  /** i giorni dell'anno in cui cade un acquisto, come MM-GG */
  acquisti: string[];
  /** il piano compra anche frazioni di azione? quasi mai */
  frazioni: boolean;
}

export const PIANO_ESPP: PianoEspp = {
  sconto: 15,
  lookback: true,
  mesi: 6,
  maxPct: 15,
  maxUsd: 10625,
  acquisti: ["04-01", "10-01"],
  frazioni: false,
};

export interface IpotesiEspp {
  /** serve solo per l'aliquota marginale con cui viene tassato lo sconto */
  ral: number;
  /** euro trattenuti in busta nel periodo, fino al giorno dell'acquisto */
  accantonato: number;
  prezzoInizio: number; // USD per azione
  prezzoFine: number; // USD per azione, giorno dell'acquisto
  /** dollari per un euro: gli euro si MOLTIPLICANO per diventare dollari */
  cambio: number;
  piano: PianoEspp;
}

export interface EsitoEspp {
  prezzoRiferimento: number; // USD: il minore dei due, se c'e' il lookback
  prezzoAcquisto: number; // USD
  /** quello che entra davvero nell'acquisto, tetto compreso */
  accantonatoUsd: number;
  /** quanto e' stato messo da parte prima del tetto */
  accantonatoLordoUsd: number;
  /** EUR che tornano indietro perche' oltre il tetto del piano */
  oltreIlTetto: number;
  azioni: number;
  speso: number; // EUR effettivamente convertiti in azioni
  restoInBusta: number; // EUR che non compra un'azione intera e torna indietro
  controvalore: number; // EUR al prezzo di mercato del giorno dell'acquisto
  /** lo sconto: imponibile in busta nel mese dell'acquisto */
  beneficio: number;
  aliquota: number; // quanto se ne prende il fisco, al margine della RAL
  trattenuta: number;
  /** effetto netto su quel cedolino: il resto che torna meno la trattenuta */
  cedolino: number;
  esborso: number; // i soldi tuoi: azioni + tasse sullo sconto
  guadagno: number;
  roi: number;
  /** lo stesso rendimento riportato a base annua, per confrontarlo con altro */
  roiAnnuo: number;
  perMese: number;
  /** di quanto dovrebbero aumentarti la RAL per darti lo stesso netto */
  ralEquivalente: number;
  quotaSuRal: number;
}

/** Il rendimento lordo che il piano garantisce a titolo fermo: s/(1-s). */
export const minimoGarantito = (sconto: number) =>
  sconto >= 100 ? Infinity : sconto / (100 - sconto);

/** Quanto si accantona in un periodo, data la retribuzione e la percentuale. */
export function accantonamentoAtteso(ral: number, pct: number, mesi: number): number {
  return (Math.max(0, ral) * Math.max(0, pct) * Math.max(0, mesi)) / (100 * 12);
}

export function simulaEspp(i: IpotesiEspp, regime?: Regime): EsitoEspp {
  const { piano } = i;
  const mesi = piano.mesi > 0 ? piano.mesi : 6;
  const riferimento = piano.lookback
    ? Math.min(i.prezzoInizio, i.prezzoFine)
    : i.prezzoFine;
  const prezzoAcquisto = riferimento * (1 - piano.sconto / 100);

  // Il tetto del piano taglia prima di comprare: la parte oltre non diventa
  // azioni, torna in busta insieme al resto che non fa un'azione intera.
  const accantonatoLordoUsd = i.accantonato * i.cambio;
  const tetto = piano.maxUsd > 0 ? piano.maxUsd : Infinity;
  const accantonatoUsd = Math.min(accantonatoLordoUsd, tetto);
  const oltreIlTetto = i.cambio > 0 ? Math.max(0, accantonatoLordoUsd - accantonatoUsd) / i.cambio : 0;
  const grezze = prezzoAcquisto > 0 ? accantonatoUsd / prezzoAcquisto : 0;
  const azioni = piano.frazioni ? Math.round(grezze * 1e4) / 1e4 : Math.floor(grezze);

  const speso = i.cambio > 0 ? (azioni * prezzoAcquisto) / i.cambio : 0;
  const restoInBusta = i.accantonato - speso;
  const controvalore = i.cambio > 0 ? (azioni * i.prezzoFine) / i.cambio : 0;
  const beneficio = Math.max(0, controvalore - speso);

  // L'aliquota non e' una costante: lo sconto si somma alla RAL, e sul margine
  // si accavallano scaglione, detrazione che si spegne e addizionali. E' la
  // stessa domanda di "quanto resta di un aumento", quindi la stessa funzione.
  const base: VoceLorda = { ral: i.ral };
  const m = beneficio > 0 ? marginale(base, beneficio, regime) : { quota: 0, aliquota: 0 };
  const trattenuta = beneficio * m.aliquota;

  const esborso = speso + trattenuta;
  const guadagno = controvalore - esborso;
  const roi = esborso > 0 ? guadagno / esborso : 0;
  const perMese = guadagno / mesi;
  const ralEquivalente = m.quota > 0 ? (perMese * 12) / m.quota : 0;

  return {
    prezzoRiferimento: riferimento,
    prezzoAcquisto,
    accantonatoUsd,
    accantonatoLordoUsd,
    oltreIlTetto,
    azioni,
    speso,
    restoInBusta,
    controvalore,
    beneficio,
    aliquota: m.aliquota,
    trattenuta,
    cedolino: restoInBusta - trattenuta,
    esborso,
    guadagno,
    roi,
    // I soldi non stanno fermi per tutto il periodo: la prima trattenuta ci
    // resta sei mesi, l'ultima un giorno. La durata media dell'immobilizzo e'
    // circa meta' del periodo, quindi il rendimento annualizzato si ottiene
    // rapportandolo a mesi/2 e non a mesi: e' il numero che rende un ESPP
    // confrontabile con qualsiasi altro investimento.
    roiAnnuo: mesi > 0 ? roi * (24 / mesi) : 0,
    perMese,
    ralEquivalente,
    quotaSuRal: i.ral > 0 ? ralEquivalente / i.ral : 0,
  };
}

/**
 * La finestra in corso: quella che si chiude col primo acquisto che deve
 * ancora arrivare. Il giorno dell'acquisto conta come dentro — e' quello il
 * giorno in cui succede.
 */
export function finestraEspp(oggi: string, piano: PianoEspp): { inizio: string; acquisto: string } {
  const anno = Number(oggi.slice(0, 4));
  const giorni = [...piano.acquisti].sort();
  for (const a of [anno, anno + 1]) {
    for (const md of giorni) {
      const acquisto = `${a}-${md}`;
      if (acquisto < oggi) continue;
      const [y, m, d] = acquisto.split("-").map(Number);
      const indietro = new Date(Date.UTC(y, m - 1 - piano.mesi, d));
      return { inizio: indietro.toISOString().slice(0, 10), acquisto };
    }
  }
  return { inizio: oggi, acquisto: oggi };
}
