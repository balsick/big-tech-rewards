import { dalLordoAlNetto, marginale, type Regime } from "./tax.ts";

// Le RSU: unita' assegnate che diventano azioni un pezzo per volta.
//
// Due cose, e sono diverse. **Le unita' sono il fatto**: quante ne sono state
// assegnate e quando diventano tue, e non cambiano perche' il mercato ha avuto
// una brutta giornata. **Il valore e' una lente**: quanto varrebbero a un certo
// prezzo, utile a capire l'ordine di grandezza e inutile a qualsiasi altro
// scopo, perche' quei soldi non sono tuoi e domani e' un altro prezzo.
//
// Il pezzo che questo strumento aggiunge e' la **prospettiva**: con un grant
// nuovo ogni anno e vestizioni trimestrali, in un anno qualsiasi vestono pezzi
// di tre o quattro grant diversi, e il totale che cade in quell'anno decide
// l'aliquota con cui viene tassato tutto il resto. Un grant per volta e' il
// modo sbagliato di guardarlo: per questo qui i grant sono una lista e
// l'orizzonte e' di tre anni.

export type Cadenza = "annuale" | "30-30-40" | "trimestrale" | "mensile";

export interface Grant {
  id: string;
  etichetta: string;
  /** data dell'assegnazione, ISO */
  data: string;
  /**
   * Il valore assegnato, in dollari.
   *
   * E' cosi' che un grant viene comunicato — «ti diamo 20.000 dollari in RSU» —
   * e non in unita': le unita' sono il *risultato*, e le fissa il prezzo del
   * giorno dell'assegnazione. Chiederle in input vorrebbe dire far fare a mano
   * la divisione che il piano ha gia' fatto.
   */
  valoreUsd: number;
  /**
   * Il prezzo del giorno dell'assegnazione, che converte i dollari in unita'.
   *
   * Sta nel grant e non fra i parametri globali perche' e' una proprieta' di
   * *quel* grant: due assegnazioni di anni diversi valgono lo stesso in dollari
   * e un numero di azioni completamente diverso, ed e' esattamente la ragione
   * per cui un grant vecchio oggi vale piu' di uno nuovo.
   */
  prezzoGrant: number;
  cadenza: Cadenza;
  /** durata complessiva del piano, in anni */
  anni: number;
  /** se le vestizioni si allineano al calendario del piano invece che al grant */
  dateFisse: boolean;
}

/** Le unita' che quel grant ha prodotto: dollari assegnati / prezzo del giorno. */
export const unitaDelGrant = (g: Grant): number =>
  g.prezzoGrant > 0 ? g.valoreUsd / g.prezzoGrant : 0;

/** I giorni in cui il piano fa vestire, come MM-GG. */
export const CALENDARIO_VESTING = ["02-20", "05-20", "08-20", "11-20"];

/**
 * Il giorno si schiaccia sul mese corto: un grant del 31 gennaio vesta il 28
 * febbraio, non il 3 marzo.
 */
export function piuMesi(iso: string, mesi: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const tot = m - 1 + mesi;
  const anno = y + Math.floor(tot / 12);
  const mese = (tot % 12) + 1;
  const ultimo = new Date(Date.UTC(anno, mese, 0)).getUTCDate();
  return `${anno}-${String(mese).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** La prima data del calendario del piano che cade da `iso` compreso in avanti. */
function prossimaFissa(iso: string, calendario: string[]): string {
  const anno = Number(iso.slice(0, 4));
  const giorni = [...calendario].sort();
  for (const a of [anno, anno + 1]) {
    for (const md of giorni) {
      const data = `${a}-${md}`;
      if (data >= iso) return data;
    }
  }
  return iso;
}

export interface Tranche {
  grant: string;
  etichetta: string;
  data: string;
  unita: number;
  indice: number;
  totali: number;
}

/**
 * Le tranche di un grant.
 *
 * Le quote restano frazionarie — il 30% di 479 e' 143,7, non 144 — perche' e'
 * cosi' che il piano e' scritto: l'arrotondamento ad azioni intere avviene al
 * vesting, su quello che resta dopo la trattenuta, e la frazione che avanza
 * l'azienda la paga in contanti in busta. Arrotondare qui vorrebbe dire
 * arrotondare due volte, e la seconda sul numero sbagliato.
 */
export function tranche(g: Grant, calendario = CALENDARIO_VESTING): Tranche[] {
  const anni = Math.max(1, Math.round(g.anni));
  const unitaTotali = unitaDelGrant(g);
  const quote: number[] =
    g.cadenza === "30-30-40"
      ? [0.3, 0.3, 0.4]
      : g.cadenza === "annuale"
        ? Array.from({ length: anni }, () => 1 / anni)
        : g.cadenza === "trimestrale"
          ? Array.from({ length: anni * 4 }, () => 1 / (anni * 4))
          : Array.from({ length: anni * 12 }, () => 1 / (anni * 12));
  const passo = g.cadenza === "trimestrale" ? 3 : g.cadenza === "mensile" ? 1 : 12;

  let dato = 0;
  return quote.map((q, i) => {
    const u =
      i === quote.length - 1
        ? Math.round((unitaTotali - dato) * 1e4) / 1e4
        : Math.round(unitaTotali * q * 1e4) / 1e4;
    dato += u;
    const naturale = piuMesi(g.data, passo * (i + 1));
    // Le date fisse valgono per le cadenze che ci stanno dentro: allineare una
    // vestizione annuale al calendario trimestrale la sposterebbe di mesi.
    const data =
      g.dateFisse && (g.cadenza === "trimestrale" || g.cadenza === "mensile")
        ? prossimaFissa(naturale, calendario)
        : naturale;
    return { grant: g.id, etichetta: g.etichetta, data, unita: u, indice: i + 1, totali: quote.length };
  });
}

export interface AnnoRSU {
  anno: number;
  unita: number;
  lordoEur: number;
  aliquota: number;
  nettoEur: number;
  /** azioni che arrivano davvero sul conto, il resto se lo prende la trattenuta */
  azioniNette: number;
  tranche: Tranche[];
}

export interface Prospetto {
  tranche: Tranche[];
  /** solo quelle che cadono nell'orizzonte e non sono ancora vestite */
  future: Tranche[];
  anni: AnnoRSU[];
  unitaTotali: number;
  lordoTotale: number;
  nettoTotale: number;
  /** mese per mese, per il grafico */
  mesi: { mese: string; per: { grant: string; unita: number }[]; unita: number; lordoEur: number }[];
}

export interface IpotesiRSU {
  grants: Grant[];
  /** USD per azione */
  prezzo: number;
  /** dollari per un euro */
  cambio: number;
  ral: number;
  /** da che giorno parte l'orizzonte */
  oggi: string;
  /** quanti anni guardare avanti */
  orizzonte: number;
  calendario?: string[];
}

/**
 * La prospettiva a tre anni.
 *
 * L'aliquota si calcola **per anno**, non per tranche: il fisco somma tutto
 * quello che vesta nello stesso anno allo stipendio di quell'anno, quindi una
 * tranche da 10.000 euro in un anno in cui ne vestono altre 30.000 e' tassata
 * al margine di 40.000, non al suo. Per questo il conto non si puo' fare grant
 * per grant, ed e' la ragione per cui questa funzione esiste.
 */
export function prospetto(i: IpotesiRSU, regime?: Regime): Prospetto {
  const cal = i.calendario ?? CALENDARIO_VESTING;
  const tutte = i.grants.flatMap((g) => tranche(g, cal)).sort((a, b) => a.data.localeCompare(b.data));
  const fine = piuMesi(i.oggi, Math.round(i.orizzonte * 12));
  const future = tutte.filter((t) => t.data >= i.oggi && t.data < fine);

  const perAzioneEur = i.cambio > 0 ? i.prezzo / i.cambio : 0;

  const anni = [...new Set(future.map((t) => Number(t.data.slice(0, 4))))]
    .sort()
    .map((anno) => {
      const dellAnno = future.filter((t) => Number(t.data.slice(0, 4)) === anno);
      const unita = dellAnno.reduce((s, t) => s + t.unita, 0);
      const lordoEur = unita * perAzioneEur;
      const m = lordoEur > 0 ? marginale({ ral: i.ral }, lordoEur, regime) : { quota: 1, aliquota: 0 };
      return {
        anno,
        unita,
        lordoEur,
        aliquota: m.aliquota,
        nettoEur: lordoEur * m.quota,
        azioniNette: Math.floor(unita * m.quota),
        tranche: dellAnno,
      };
    });

  // Il grafico vuole una riga per mese anche quando in quel mese non vesta
  // niente: i buchi sono l'informazione, non il rumore.
  const mesi: Prospetto["mesi"] = [];
  const n = Math.round(i.orizzonte * 12);
  for (let k = 0; k < n; k++) {
    const d = piuMesi(i.oggi, k);
    const mese = d.slice(0, 7);
    const dentro = future.filter((t) => t.data.slice(0, 7) === mese);
    const per = i.grants
      .map((g) => ({
        grant: g.id,
        unita: dentro.filter((t) => t.grant === g.id).reduce((s, t) => s + t.unita, 0),
      }))
      .filter((x) => x.unita > 0);
    const unita = dentro.reduce((s, t) => s + t.unita, 0);
    mesi.push({ mese, per, unita, lordoEur: unita * perAzioneEur });
  }

  return {
    tranche: tutte,
    future,
    anni,
    unitaTotali: future.reduce((s, t) => s + t.unita, 0),
    lordoTotale: anni.reduce((s, a) => s + a.lordoEur, 0),
    nettoTotale: anni.reduce((s, a) => s + a.nettoEur, 0),
    mesi,
  };
}

/** Lo stipendio nudo, per mostrare di quanto le RSU cambiano l'anno. */
export const soloStipendio = (ral: number, regime?: Regime) => dalLordoAlNetto({ ral }, regime);
