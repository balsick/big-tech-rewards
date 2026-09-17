// Il salvataggio, che e' esplicito di proposito.
//
// Questi due strumenti si compilano con la propria RAL e i propri grant, e
// ricompilarli da capo a ogni visita e' una seccatura vera. Ma salvare quei
// numeri **senza chiedere** sarebbe la cosa sbagliata da fare in una pagina che
// promette di non conservare niente: la promessa vale se e' l'utente a
// decidere, non se e' il codice a decidere per lui.
//
// Quindi: un tasto. Niente salvataggio automatico, niente "ricorda i miei
// dati" preselezionato, e un modo per dimenticare tutto che sta accanto al modo
// per salvare.
//
// Dove finisce: nel `localStorage` di questo browser, su questo dispositivo.
// Non e' un account e non e' un file — non c'e' nessun server a cui arrivare,
// perche' questa pagina non ne ha uno.

export interface Salvato<T> {
  dati: T;
  /** ISO del momento del salvataggio, per poterlo dire in pagina */
  quando: string;
}

const PREFISSO = "btr:save:";

/**
 * Se lo storage si puo' usare.
 *
 * In navigazione privata, con i dati del sito bloccati o dentro certi iframe,
 * `localStorage` esiste ma **solleva** appena lo si tocca. Va provato scrivendo,
 * non controllando che l'oggetto ci sia.
 */
export function disponibile(): boolean {
  try {
    const k = `${PREFISSO}__prova`;
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function leggi<T>(chiave: string): Salvato<T> | null {
  try {
    const raw = localStorage.getItem(PREFISSO + chiave);
    if (!raw) return null;
    const j = JSON.parse(raw) as Salvato<T>;
    return j && typeof j.quando === "string" && j.dati !== undefined ? j : null;
  } catch {
    // Un salvataggio illeggibile (formato vecchio, JSON troncato) non e' un
    // errore da mostrare: e' un salvataggio che non c'e'.
    return null;
  }
}

export function scrivi<T>(chiave: string, dati: T): Salvato<T> | null {
  const s: Salvato<T> = { dati, quando: new Date().toISOString() };
  try {
    localStorage.setItem(PREFISSO + chiave, JSON.stringify(s));
    return s;
  } catch {
    return null;
  }
}

export function cancella(chiave: string): void {
  try {
    localStorage.removeItem(PREFISSO + chiave);
  } catch {
    /* niente da cancellare, o storage negato: in entrambi i casi non c'e' piu' */
  }
}
