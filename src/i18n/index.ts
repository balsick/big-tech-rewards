import { it, type Dict } from "./it.ts";
import { en } from "./en.ts";

export type Lang = "it" | "en";
export const DIZIONARI: Record<Lang, Dict> = { it, en };
export type { Dict };

/** La lingua del browser, se la conosciamo; altrimenti italiano, come il fisco. */
export function linguaIniziale(): Lang {
  try {
    const salvata = localStorage.getItem("btr:lang");
    if (salvata === "it" || salvata === "en") return salvata;
  } catch {
    /* localStorage negato in navigazione privata: non e' un errore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("it") ? "it" : "en";
}
