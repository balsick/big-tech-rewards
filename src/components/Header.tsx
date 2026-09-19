import { useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "../state/store.tsx";
import { Segmented } from "./ui.tsx";
import { Compass, Github, Moon, Sun } from "./Icons.tsx";
import { REPO } from "../lib/meta.ts";
import { nextTheme, useCompactHeader } from "../lib/compactHeader.ts";
import type { Lang } from "../i18n/index.ts";
import type { Theme } from "../state/store.tsx";

export type Tab = "espp" | "rsu" | "total" | "calendar";

// The header, in two forms.
//
// On arrival it says what this is, offers the walkthrough and links the source
// — the two things a stranger needs before typing a salary into a web page.
// Once you are reading, none of that is doing any work, and on a phone it was
// taking 190px, nearly a quarter of the screen, to do it.
//
// So it collapses into one row: the tabs, which are the only thing used WHILE
// reading, and the controls as icons. The name goes, the way a large title
// gives way to a nav bar. What does not go is anything you need mid-task.

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
  const compact = useCompactHeader();
  const nav = useRef<HTMLElement>(null);
  const masthead = useRef<HTMLElement>(null);

  // The bar sticks BELOW the masthead on a desktop, and a sticky element needs
  // that offset as a length. Measured rather than guessed: the masthead's
  // height depends on the type scale and on how the controls wrap, and a
  // hard-coded number would be wrong the first time either changes.
  useLayoutEffect(() => {
    const el = masthead.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const write = () =>
      document.documentElement.style.setProperty("--masthead-h", `${Math.round(el.offsetHeight)}px`);
    const ro = new ResizeObserver(write);
    ro.observe(el);
    write();
    return () => ro.disconnect();
  }, []);

  // Collapsing narrows the tab strip, so the tab you are on can end up off its
  // left edge — the one label that has to stay readable. Bring it back.
  useEffect(() => {
    if (!compact) return;
    const active = nav.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [compact, tab]);

  // The same control in two places, one at a time. A view transition matches
  // outgoing to incoming by this name, so it must belong to whichever copy is
  // actually on screen — two elements sharing a name is an error, and here
  // both copies exist in the tree at once.
  const vt = (name: string, mine: boolean) => ({ viewTransitionName: mine ? name : "none" });

  const themeName = (v: Theme) =>
    v === "light" ? t.header.themeLight : v === "dark" ? t.header.themeDark : t.header.themeAuto;
  const themeGlyph = (v: Theme) => (v === "light" ? <Sun /> : v === "dark" ? <Moon /> : "A");

  return (
    <>
      {/* Two siblings, not a parent and a child.
          A sticky element only sticks inside its own containing block, so a
          sticky bar nested in a masthead that scrolls away stops sticking the
          moment the masthead leaves — measured: it held for 190px and then
          went with it. As siblings, the bar's containing block is the page. */}
      <header className={`top${compact ? " compact" : ""}`} ref={masthead}>
      <div className="wrap">
        <div className="top-row">
          <div className="brand">
            {t.app.title}
            <small>{t.app.tagline}</small>
          </div>

          {/* The way back into the walkthrough. It is the one pressable thing
              in the header, so it is filled rather than outlined: next to two
              outlined pills it read as a third label. */}
          <button
            type="button"
            className="btn primary guidami"
            onClick={onGuide}
            style={vt("vt-guide", !compact)}
          >
            <Compass />
            {t.guided.open}
          </button>

          <a
            className="repo-link"
            href={REPO}
            target="_blank"
            rel="noreferrer noopener"
            style={vt("vt-repo", !compact)}
          >
            <Github />
            {t.header.repo}
          </a>

          <Segmented<Theme>
            style={vt("vt-theme", !compact)}
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
            style={vt("vt-lang", !compact)}
            label={t.header.lang}
            value={lang}
            onChange={setLang}
            options={[
              { id: "it", label: "ITA" },
              { id: "en", label: "ENG" },
            ]}
          />
        </div>
      </div>
      </header>

      {/* The bar that stays. Its height never changes — that is the whole
          point of it being a separate element: a sticky box that resizes
          changes the document's height, the browser's scroll anchoring moves
          the scroll position to compensate, and the new position flips the
          header back. Measured before this split: thirteen state changes in
          one downward scroll, with scrollY bouncing between 0 and 152. */}
      <div className={`tabs-bar${compact ? " compact" : ""}`}>
        <div className="wrap">
          <nav className="tabs" aria-label={t.app.title} ref={nav}>
            {tabs.map((k) => (
              <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
                {t.nav[k]}
              </button>
            ))}
          </nav>
          {compact ? (
            <div className="quick">
              <button
                type="button"
                className="seg-one"
                onClick={onGuide}
                aria-label={t.guided.open}
                title={t.guided.open}
                style={vt("vt-guide", compact)}
              >
                <Compass />
              </button>
              <a
                className="seg-one"
                href={REPO}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t.header.repo}
                title={t.header.repo}
                style={vt("vt-repo", compact)}
              >
                <Github />
              </a>
              <button
                type="button"
                className="seg-one"
                onClick={() => setTheme(nextTheme(theme))}
                aria-label={t.header.themeNext(themeName(theme), themeName(nextTheme(theme)))}
                title={themeName(theme)}
                style={vt("vt-theme", compact)}
              >
                {themeGlyph(theme)}
              </button>
              <button
                type="button"
                className="seg-one"
                onClick={() => setLang(lang === "it" ? "en" : "it")}
                aria-label={t.header.langNext(lang === "it" ? "English" : "Italiano")}
                style={vt("vt-lang", compact)}
              >
                {lang === "it" ? "ITA" : "ENG"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
