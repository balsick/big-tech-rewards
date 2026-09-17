import { useStore } from "../state/store.tsx";
import { Segmented } from "./ui.tsx";
import { REPO } from "../lib/meta.ts";
import type { Lang } from "../i18n/index.ts";
import type { Tema } from "../state/store.tsx";

export type Tab = "espp" | "rsu" | "tax";

// L'icona di GitHub disegnata a mano: una dipendenza in meno e nessun carattere
// tipografico da scaricare per un logo di sedici pixel.
const Mark = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden focusable="false" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.07-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.15 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

export default function Header({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t, lang, setLang, tema, setTema } = useStore();
  return (
    <header className="top">
      <div className="wrap">
        <div className="top-row">
          <div className="brand">
            {t.app.title}
            <small>{t.app.tagline}</small>
          </div>
          <a className="repo-link" href={REPO} target="_blank" rel="noreferrer noopener">
            <Mark />
            {t.header.repo}
          </a>
          <Segmented<Tema>
            label={t.header.theme}
            value={tema}
            onChange={setTema}
            options={[
              { id: "light", label: "☀", title: t.header.themeLight },
              { id: "dark", label: "☽", title: t.header.themeDark },
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
          {(["espp", "rsu", "tax"] as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-current={tab === k ? "page" : undefined}
              onClick={() => setTab(k)}
            >
              {t.nav[k]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
