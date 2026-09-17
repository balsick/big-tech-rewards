import { useState } from "react";
import Header, { type Tab } from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";
import EsppTool from "./components/EsppTool.tsx";
import RsuTool from "./components/RsuTool.tsx";
import Guided from "./components/Guided.tsx";
import { alreadySeen, type Seed } from "./lib/guided.ts";
import { useStore } from "./state/store.tsx";

export default function App() {
  const { t } = useStore();
  const [tab, setTab] = useState<Tab>("espp");
  // Open on a first landing, and only then. Read once in the initialiser: in an
  // effect it would flash the page and then cover it.
  const [guided, setGuided] = useState(() => !alreadySeen());
  const [seed, setSeed] = useState<Seed | null>(null);
  // The answers reach an already-mounted tool by remounting it: a `key` change
  // is what makes a component take new initial values, and these are initial
  // values — the fields stay editable afterwards.
  const [seedKey, setSeedKey] = useState(0);

  const finish = (s: Seed) => {
    setSeed(s);
    setSeedKey((k) => k + 1);
    setTab(s.tool);
    setGuided(false);
  };

  return (
    <>
      <Header tab={tab} setTab={setTab} onGuide={() => setGuided(true)} />
      <main className="wrap">
        <p className="note" style={{ maxWidth: "62ch", paddingTop: 14 }}>
          {t.app.intro}
        </p>
        {tab === "espp" ? (
          <EsppTool key={`espp-${seedKey}`} seed={seed?.tool === "espp" ? seed : null} />
        ) : (
          <RsuTool key={`rsu-${seedKey}`} seed={seed?.tool === "rsu" ? seed : null} />
        )}
      </main>
      <Footer />
      <Guided open={guided} onClose={() => setGuided(false)} onFinish={finish} />
    </>
  );
}
