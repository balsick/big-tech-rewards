import { it, type Dict } from "./it.ts";
import { en } from "./en.ts";

export type Lang = "it" | "en";
export const DICTIONARIES: Record<Lang, Dict> = { it, en };
export type { Dict };

/** The browser's language if we know it; otherwise Italian, like the tax code. */
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("btr:lang");
    if (saved === "it" || saved === "en") return saved;
  } catch {
    /* localStorage denied in private browsing: not an error */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("it") ? "it" : "en";
}
