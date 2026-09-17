import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DIZIONARI, linguaIniziale, type Dict, type Lang } from "../i18n/index.ts";
import { REGIME_DEFAULT, type Regime } from "../lib/tax.ts";

export type Tema = "light" | "dark" | "auto";

// Lo stato che sopravvive a un reload: lingua, tema e il regime fiscale, che
// una volta tarato sul proprio comune non si ha nessuna voglia di ritarare.
//
// Qui dentro finiscono solo **preferenze**, mai un importo: lingua, tema e le
// aliquote del proprio comune. I numeri personali — RAL, grant, percentuali —
// stanno altrove (`src/lib/salvataggio.ts`) e li salva soltanto il tasto
// esplicito dei due strumenti, perche' una preferenza si puo' ricordare senza
// chiedere e un dato no.

const CHIAVE_TEMA = "btr:theme";
const CHIAVE_LANG = "btr:lang";
const CHIAVE_REGIME = "btr:regime";

function leggi<T>(chiave: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(chiave);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function scrivi(chiave: string, valore: unknown) {
  try {
    localStorage.setItem(chiave, typeof valore === "string" ? valore : JSON.stringify(valore));
  } catch {
    /* quota piena o storage negato: la pagina funziona lo stesso */
  }
}

interface Store {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  tema: Tema;
  setTema: (v: Tema) => void;
  regime: Regime;
  setRegime: (r: Regime) => void;
  resetRegime: () => void;
}

const ctx = createContext<Store | null>(null);

function temaIniziale(): Tema {
  try {
    const v = localStorage.getItem(CHIAVE_TEMA);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    /* ignora */
  }
  return "auto";
}

export function Provider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => linguaIniziale());
  const [tema, setTemaState] = useState<Tema>(temaIniziale);
  const [regime, setRegimeState] = useState<Regime>(() => leggi(CHIAVE_REGIME, REGIME_DEFAULT));

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    scrivi(CHIAVE_LANG, l);
    document.documentElement.lang = l;
  }, []);

  const setTema = useCallback((v: Tema) => {
    setTemaState(v);
    scrivi(CHIAVE_TEMA, v);
  }, []);

  const setRegime = useCallback((r: Regime) => {
    setRegimeState(r);
    scrivi(CHIAVE_REGIME, r);
  }, []);

  const resetRegime = useCallback(() => {
    setRegimeState(REGIME_DEFAULT);
    scrivi(CHIAVE_REGIME, REGIME_DEFAULT);
  }, []);

  // Il tema si applica sull'elemento radice: "auto" non scrive niente e lascia
  // rispondere la media query, cosi' seguire il sistema resta il default vero e
  // non una copia dello stato del sistema al momento del primo caricamento.
  useEffect(() => {
    const root = document.documentElement;
    if (tema === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", tema);
  }, [tema]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Store>(
    () => ({ lang, setLang, t: DIZIONARI[lang], tema, setTema, regime, setRegime, resetRegime }),
    [lang, setLang, tema, setTema, regime, setRegime, resetRegime]
  );

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(ctx);
  if (!v) throw new Error("useStore fuori dal Provider");
  return v;
}
