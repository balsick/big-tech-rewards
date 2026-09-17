import { useState } from "react";
import Header, { type Tab } from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";
import EsppTool from "./components/EsppTool.tsx";
import RsuTool from "./components/RsuTool.tsx";
import TaxPanel from "./components/TaxPanel.tsx";
import { useStore } from "./state/store.tsx";

export default function App() {
  const { t } = useStore();
  const [tab, setTab] = useState<Tab>("espp");
  return (
    <>
      <Header tab={tab} setTab={setTab} />
      <main className="wrap">
        <p className="note" style={{ maxWidth: "62ch", paddingTop: 14 }}>
          {t.app.intro}
        </p>
        {tab === "espp" ? <EsppTool /> : tab === "rsu" ? <RsuTool /> : <TaxPanel />}
      </main>
      <Footer />
    </>
  );
}
