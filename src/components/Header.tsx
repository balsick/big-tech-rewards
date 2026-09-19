import { useStore } from "../state/store.tsx";
import { Segmented } from "./ui.tsx";
import { Compass, Github, Moon, Sun } from "./Icons.tsx";
import { REPO } from "../lib/meta.ts";
import type { Lang } from "../i18n/index.ts";
import type { Theme } from "../state/store.tsx";

export type Tab = "espp" | "rsu" | "total" | "calendar";

export default function Header({
  tab,
  setTab,
  tabs,
  onGuide,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  /** which tabs exist — a feature still behind a flag is simply not in here */
  tabs: Tab[];
  onGuide: () => void;
}) {
  const { t, lang, setLang, theme, setTheme } = useStore();
  return (
    <header className="top">
      <div className="wrap">
        <div className="top-row">
          <div className="brand">
            {t.app.title}
            <small>{t.app.tagline}</small>
          </div>
          {/* The way back into the walkthrough. It is the one pressable thing
              in the header, so it is filled rather than outlined: next to two
              outlined pills it read as a third label. */}
          <button type="button" className="btn primary guidami" onClick={onGuide}>
            <Compass />
            {t.guided.open}
          </button>
          <a className="repo-link" href={REPO} target="_blank" rel="noreferrer noopener">
            <Github />
            {t.header.repo}
          </a>
          <Segmented<Theme>
            label={t.header.theme}
            value={theme}
            onChange={setTheme}
            options={[
              { id: "light", label: <Sun />, title: t.header.themeLight },
              { id: "dark", label: <Moon />, title: t.header.themeDark },
              { id: "auto", label: "A", title: t.header.themeAuto },
            ]}
          />
          <Segmented<Lang>
            label={t.header.lang}
            value={lang}
            onChange={setLang}
            options={[
              { id: "it", label: "ITA" },
              { id: "en", label: "ENG" },
            ]}
          />
        </div>
        <nav className="tabs" aria-label={t.app.title}>
          {tabs.map((k) => (
            <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
              {t.nav[k]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
