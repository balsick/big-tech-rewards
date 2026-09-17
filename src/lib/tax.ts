// La fiscalita' italiana del reddito da lavoro dipendente, per il solo scopo di
// rispondere a una domanda: **quanto resta di un euro in piu'**.
//
// RSU ed ESPP non sono guadagni di borsa: al vesting e all'acquisto sono
// reddito da lavoro che si somma allo stipendio. Quindi non conta l'aliquota
// media della busta, conta lo scaglione in cui quel reddito in piu' cade — che
// e' la ragione per cui questo file esiste e per cui lo strumento chiede la RAL.
//
// Tutti i parametri stanno qui, in un posto solo, e quelli che cambiano da
// comune a comune sono modificabili dall'interfaccia: le addizionali sono
// l'unica parte di questo conto che nessuna costante nazionale puo' indovinare.

export const ANNO_FISCALE = 2026;

// ------------------------------------------------------------------ contributi

/**
 * INPS a carico del lavoratore.
 *
 * `aliquota` e' il 9,19% del Fondo Pensioni Lavoratori Dipendenti; `minori`
 * raccoglie i contributi aggiuntivi che molte buste sommano sempre (CIGS,
 * fondo di garanzia) e che cambiano per settore e dimensione aziendale, quindi
 * e' un campo e non una costante.
 *
 * Sopra la prima fascia di retribuzione pensionabile si aggiunge l'aliquota
 * aggiuntiva dell'1% (art. 3-ter D.L. 384/1992), e sopra il massimale annuo i
 * contributi si fermano del tutto — vale per chi e' iscritto dopo il 1995, che
 * e' chiunque stia usando questo strumento.
 */
export interface ParametriInps {
  aliquota: number; // % base a carico del lavoratore
  minori: number; // % di contributi minori
  primaFascia: number; // oltre questa quota scatta l'1% aggiuntivo
  massimale: number; // oltre questo non si versa piu' nulla
  applicaMassimale: boolean;
}

export const INPS_2026: ParametriInps = {
  aliquota: 9.19,
  minori: 0.5666,
  primaFascia: 56224,
  massimale: 122295,
  applicaMassimale: true,
};

export function contributi(imponibile: number, p: ParametriInps): number {
  const base = p.applicaMassimale ? Math.min(Math.max(0, imponibile), p.massimale) : Math.max(0, imponibile);
  const ordinari = ((p.aliquota + p.minori) / 100) * base;
  const extra = base > p.primaFascia ? 0.01 * (base - p.primaFascia) : 0;
  return ordinari + extra;
}

// ---------------------------------------------------------------------- IRPEF

export interface Scaglione {
  /** Limite superiore dello scaglione; `null` significa "oltre". */
  fino: number | null;
  aliquota: number; // %
}

/**
 * Gli scaglioni 2026: la Legge di Bilancio ha portato il secondo dal 35% al
 * 33%. Sono progressivi per scaglioni, non per fascia: chi supera i 28.000 non
 * paga il 33% su tutto, lo paga sulla parte che sta fra 28.000 e 50.000.
 */
export const IRPEF_2026: Scaglione[] = [
  { fino: 28000, aliquota: 23 },
  { fino: 50000, aliquota: 33 },
  { fino: null, aliquota: 43 },
];

/** Imposta su uno scaglionario qualsiasi, applicato davvero per scaglioni. */
export function perScaglioni(imponibile: number, scaglioni: Scaglione[]): number {
  let resto = Math.max(0, imponibile);
  let prima = 0;
  let imposta = 0;
  for (const s of scaglioni) {
    const tetto = s.fino ?? Infinity;
    const quota = Math.min(resto, tetto - prima);
    if (quota <= 0) break;
    imposta += (quota * s.aliquota) / 100;
    resto -= quota;
    prima = tetto;
  }
  return imposta;
}

export const irpefLorda = (imponibile: number, scaglioni = IRPEF_2026) =>
  perScaglioni(imponibile, scaglioni);

// ------------------------------------------------------------------ detrazioni

/**
 * Detrazione per redditi da lavoro dipendente, art. 13 co. 1 TUIR.
 *
 * Non e' un dettaglio: e' il motivo per cui a 30.000 di RAL non si paga il 23%
 * medio, e soprattutto e' il motivo per cui **l'aliquota marginale reale non
 * coincide con lo scaglione**. Fra 28.000 e 50.000 la detrazione si azzera in
 * modo lineare, e ogni euro in piu' se ne porta via 1.910/22.000 = 8,7 centesimi
 * in aggiunta al 33%: fra i 28k e i 50k il margine vero sfiora il 50%, e
 * nessuna tabella di scaglioni lo dice.
 */
export function detrazioneLavoro(redditoComplessivo: number): number {
  const r = Math.max(0, redditoComplessivo);
  if (r <= 15000) return 1955;
  if (r <= 28000) return 1910 + (1190 * (28000 - r)) / 13000;
  if (r <= 50000) return (1910 * (50000 - r)) / 22000;
  return 0;
}

/**
 * Il taglio del cuneo fiscale diventato strutturale: sotto i 20.000 una somma
 * che si aggiunge al netto (non una detrazione, non abbatte imposta), fra
 * 20.000 e 40.000 una detrazione in piu' che si spegne dopo i 32.000.
 */
export function ulterioreDetrazione(redditoComplessivo: number): number {
  const r = Math.max(0, redditoComplessivo);
  if (r <= 20000) return 0;
  if (r <= 32000) return 1000;
  if (r <= 40000) return (1000 * (40000 - r)) / 8000;
  return 0;
}

export function sommaIntegrativa(redditoLavoro: number): number {
  const r = Math.max(0, redditoLavoro);
  if (r <= 0 || r > 20000) return 0;
  const pct = r <= 8500 ? 7.1 : r <= 15000 ? 5.3 : 4.8;
  return (r * pct) / 100;
}

/**
 * Oltre 200.000 di reddito complessivo il vantaggio del 33% viene neutralizzato
 * abbattendo le detrazioni di 440 euro. Riguarda pochissimi, ma chi ci sta
 * dentro se ne accorge e ha ragione a chiederselo.
 */
const RECUPERO_OLTRE_200K = 440;
const SOGLIA_RECUPERO = 200000;

// ---------------------------------------------------------------- addizionali

/**
 * Addizionali regionale e comunale: l'unica parte di questo conto che non ha
 * una risposta nazionale. Sono ~1.800 euro l'anno su una RAL da 60.000 e
 * cambiano di quasi il doppio fra una regione e l'altra, quindi sono
 * modificabili scaglione per scaglione invece di essere una costante.
 *
 * `esenzione` e' una soglia, non una franchigia: se il reddito la supera,
 * l'addizionale si paga su **tutto** il reddito, non sull'eccedenza. E' il modo
 * in cui la scrivono i comuni, e sbagliarlo cambia il conto di centinaia di
 * euro proprio a chi guadagna meno.
 */
export interface Addizionale {
  scaglioni: Scaglione[];
  esenzione: number;
}

/** Piemonte, anni d'imposta 2026-2027 (aliquota base 1,23% + maggiorazioni). */
export const REGIONALE_PIEMONTE: Addizionale = {
  scaglioni: [
    { fino: 15000, aliquota: 1.62 },
    { fino: 28000, aliquota: 2.68 },
    { fino: 50000, aliquota: 3.31 },
    { fino: null, aliquota: 3.33 },
  ],
  esenzione: 0,
};

/** Torino: delibera C.C. 195/2022, confermata per il 2026. */
export const COMUNALE_TORINO: Addizionale = {
  scaglioni: [
    { fino: 28000, aliquota: 0.8 },
    { fino: 50000, aliquota: 1.1 },
    { fino: null, aliquota: 1.2 },
  ],
  esenzione: 11790,
};

export function addizionale(imponibile: number, a: Addizionale): number {
  if (imponibile <= a.esenzione) return 0;
  return perScaglioni(imponibile, a.scaglioni);
}

// ------------------------------------------------------------- dalla RAL al netto

export interface Regime {
  scaglioni: Scaglione[];
  inps: ParametriInps;
  regionale: Addizionale;
  comunale: Addizionale;
  mensilita: number;
}

export const REGIME_DEFAULT: Regime = {
  scaglioni: IRPEF_2026,
  inps: INPS_2026,
  regionale: REGIONALE_PIEMONTE,
  comunale: COMUNALE_TORINO,
  mensilita: 14,
};

export interface VoceLorda {
  ral: number;
  bonus?: number;
  /** RSU al vesting ed ESPP: reddito da lavoro come tutto il resto. */
  equity?: number;
  altro?: number;
}

export interface Netto {
  lordo: number;
  inps: number;
  imponibileIrpef: number;
  irpefLorda: number;
  detrazioni: number;
  irpef: number;
  regionale: number;
  comunale: number;
  integrativa: number;
  netto: number;
  /** quanto resta di ogni euro lordo, in media */
  tasso: number;
  perMensilita: number;
  mensilita: number;
}

export function dalLordoAlNetto(v: VoceLorda, r: Regime = REGIME_DEFAULT): Netto {
  const lordo = Math.max(0, v.ral + (v.bonus ?? 0) + (v.equity ?? 0) + (v.altro ?? 0));
  const inps = contributi(lordo, r.inps);
  const imponibile = lordo - inps;

  const lorda = irpefLorda(imponibile, r.scaglioni);
  let detrazioni = detrazioneLavoro(imponibile) + ulterioreDetrazione(imponibile);
  if (imponibile > SOGLIA_RECUPERO) detrazioni = Math.max(0, detrazioni - RECUPERO_OLTRE_200K);
  // Le detrazioni abbattono l'imposta, non la rendono negativa: quello che
  // avanza e' capienza persa, non un credito.
  const irpef = Math.max(0, lorda - detrazioni);

  const reg = addizionale(imponibile, r.regionale);
  const com = addizionale(imponibile, r.comunale);
  // La somma integrativa non abbatte imposta: si aggiunge al netto.
  const integrativa = sommaIntegrativa(imponibile);

  const netto = imponibile - irpef - reg - com + integrativa;
  return {
    lordo,
    inps,
    imponibileIrpef: imponibile,
    irpefLorda: lorda,
    detrazioni: Math.min(detrazioni, lorda),
    irpef,
    regionale: reg,
    comunale: com,
    integrativa,
    netto,
    tasso: lordo > 0 ? netto / lordo : 0,
    perMensilita: netto / r.mensilita,
    mensilita: r.mensilita,
  };
}

/**
 * Quanto resta davvero di un lordo in piu'.
 *
 * Si calcola per differenza e non con una formula, perche' sul margine si
 * accavallano quattro cose insieme: lo scaglione IRPEF, la detrazione che si
 * spegne, l'1% INPS sopra la prima fascia e gli scaglioni delle addizionali.
 * Sommarle a mano e' esattamente il conto che nessuno fa giusto.
 */
export function marginale(
  base: VoceLorda,
  extra: number,
  r: Regime = REGIME_DEFAULT
): { netto: number; quota: number; aliquota: number } {
  if (extra === 0) return { netto: 0, quota: 0, aliquota: 0 };
  const prima = dalLordoAlNetto(base, r).netto;
  const dopo = dalLordoAlNetto({ ...base, equity: (base.equity ?? 0) + extra }, r).netto;
  const netto = dopo - prima;
  const quota = netto / extra;
  return { netto, quota, aliquota: 1 - quota };
}
