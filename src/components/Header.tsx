import { useStore } from "../state/store.tsx";
import { Segmented } from "./ui.tsx";
import { Github, Moon, Sun } from "./Icons.tsx";
import { REPO } from "../lib/meta.ts";
import type { Lang } from "../i18n/index.ts";
import type { Theme } from "../state/store.tsx";

export type Tab = "espp" | "rsu";

export default function Header({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t, lang, setLang, theme, setTheme } = useStore();
  return (
    <header className="top">
      <div className="wrap">
        <div className="top-row">
          <div className="brand">
            {t.app.title}
            <small>{t.app.tagline}</small>
          </div>
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
          {(["espp", "rsu"] as Tab[]).map((k) => (
            <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
              {t.nav[k]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
