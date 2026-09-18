import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { DICTIONARIES, initialLang, type Dict, type Lang } from "../i18n/index.ts";
import { DEFAULT_REGIME, type TaxRegime } from "../lib/tax.ts";
import { DEFAULT_BONUS_PCT, DEFAULT_ESPP_PCT, DEFAULT_SALARY } from "../lib/meta.ts";
import { initialGrants, type GrantInput } from "../lib/rsu.ts";
import { todayISO } from "../lib/format.ts";

export type Theme = "light" | "dark" | "auto";

// The state that survives a reload: language, theme and the tax regime, which
// once tuned to your own town you have no desire to tune again.
//
// Only **preferences** land here, never an amount. Personal numbers — salary,
// grants, percentages — live elsewhere (`src/lib/storage.ts`) and are written
// only by the explicit button in each tool, because a preference can be
// remembered without asking and a piece of data cannot.
//
// The description of your own pay is the exception, and only halfway. The
// salary, the cash bonus, the ESPP percentage and the RSU grants are shared
// across the tabs **in memory**: it is one person's package seen three ways,
// and typing the salary into three screens is three chances to type it
// differently. It is also what makes the walkthrough worth anything — the two
// or three answers it collects land here and every tab is already filled in.
//
// They are deliberately NOT written to localStorage. That would persist amounts
// without being asked, which is exactly the promise the disclaimer makes at the
// top of the page. A reload forgets them unless a tool's save button was used.

const THEME_KEY = "btr:theme";
const LANG_KEY = "btr:lang";
const REGIME_KEY = "btr:regime";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    /* quota full or storage denied: the page works anyway */
  }
}

interface Store {
  lang: Lang;
  /** shared across the tabs, in memory only */
  salary: number;
  setSalary: (v: number) => void;
  /** the cash bonus, as a percentage of salary */
  bonusPct: number;
  setBonusPct: (v: number) => void;
  /** the share of pay put into the ESPP */
  esppPct: number;
  setEsppPct: (v: number) => void;
  /** the awards, as the RSU form holds them */
  grants: GrantInput[];
  setGrants: Dispatch<SetStateAction<GrantInput[]>>;
  /** the performance rating as a multiplier: 1 is target */
  performance: number;
  setPerformance: (v: number) => void;
  horizonYears: number;
  setHorizonYears: (v: number) => void;
  setLang: (l: Lang) => void;
  t: Dict;
  theme: Theme;
  setTheme: (v: Theme) => void;
  regime: TaxRegime;
  setRegime: (r: TaxRegime) => void;
  resetRegime: () => void;
}

const ctx = createContext<Store | null>(null);

function initialTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function Provider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => initialLang());
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [regime, setRegimeState] = useState<TaxRegime>(() => read(REGIME_KEY, DEFAULT_REGIME));
  const [salary, setSalary] = useState(DEFAULT_SALARY);
  const [bonusPct, setBonusPct] = useState(DEFAULT_BONUS_PCT);
  const [esppPct, setEsppPct] = useState(DEFAULT_ESPP_PCT);
  const [grants, setGrants] = useState<GrantInput[]>(() => initialGrants(todayISO()));
  const [performance, setPerformance] = useState(1);
  const [horizonYears, setHorizonYears] = useState(3);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write(LANG_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const setTheme = useCallback((v: Theme) => {
    setThemeState(v);
    write(THEME_KEY, v);
  }, []);

  const setRegime = useCallback((r: TaxRegime) => {
    setRegimeState(r);
    write(REGIME_KEY, r);
  }, []);

  const resetRegime = useCallback(() => {
    setRegimeState(DEFAULT_REGIME);
    write(REGIME_KEY, DEFAULT_REGIME);
  }, []);

  // The theme is applied on the root element: "auto" writes nothing and lets
  // the media query answer, so following the system stays the real default
  // rather than a copy of the system's state at first load.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Store>(
    () => ({
      lang,
      setLang,
      t: DICTIONARIES[lang],
      theme,
      setTheme,
      regime,
      setRegime,
      resetRegime,
      salary,
      setSalary,
      bonusPct,
      setBonusPct,
      esppPct,
      setEsppPct,
      grants,
      setGrants,
      performance,
      setPerformance,
      horizonYears,
      setHorizonYears,
    }),
    [
      lang,
      setLang,
      theme,
      setTheme,
      regime,
      setRegime,
      resetRegime,
      salary,
      bonusPct,
      esppPct,
      grants,
      performance,
      horizonYears,
    ]
  );

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(ctx);
  if (!v) throw new Error("useStore used outside the Provider");
  return v;
}
