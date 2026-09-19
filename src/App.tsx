import { useState } from "react";
import Header, { type Tab } from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";
import Disclaimer from "./components/Disclaimer.tsx";
import EsppTool from "./components/EsppTool.tsx";
import RsuTool from "./components/RsuTool.tsx";
import TotalReward from "./components/TotalReward.tsx";
import CalendarTool from "./components/CalendarTool.tsx";
import Guided from "./components/Guided.tsx";
import { alreadySeen, type Seed } from "./lib/guided.ts";
import { useStore } from "./state/store.tsx";
import { initialGrants } from "./lib/rsu.ts";
import { todayISO } from "./lib/format.ts";
import { flag } from "./lib/flags.ts";

export default function App() {
  const { t, setSalary, setEsppPct, setGrants } = useStore();
  const [tab, setTab] = useState<Tab>("espp");
  // The calendar is still being built: it exists for whoever puts
  // `?calendar=true` in the address and for nobody else. Read once — a flag
  // that could change under the app would be a second kind of state to reason
  // about, for no benefit.
  const [tabs] = useState<Tab[]>(() =>
    flag("calendar") ? ["espp", "rsu", "total", "calendar"] : ["espp", "rsu", "total"]
  );
  // Open on a first landing, and only then. Read once in the initialiser: in an
  // effect it would flash the page and then cover it.
  const [guided, setGuided] = useState(() => !alreadySeen());

  // The walkthrough's answers go straight into the shared model.
  //
  // They used to be passed down as a `seed` prop and applied by remounting the
  // tool with a new `key`, which worked and was a lot of machinery to make one
  // component accept new initial values. Now that the salary, the percentage
  // and the grants live in the store there is nothing to seed: the answers are
  // written where every tab already reads from, so all three are filled in and
  // not just the one you picked.
  const finish = (s: Seed) => {
    setSalary(s.salary);
    if (s.tool === "espp") setEsppPct(s.percent);
    else setGrants(initialGrants(todayISO(), s.welcomeUsd, s.bonusUsd));
    setTab(s.tool);
    setGuided(false);
  };

  return (
    <>
      <Header tab={tab} setTab={setTab} tabs={tabs} onGuide={() => setGuided(true)} />
      <main className="wrap">
        <Disclaimer />
        <p className="note" style={{ maxWidth: "62ch" }}>
          {t.app.intro}
        </p>
        {tab === "espp" ? (
          <EsppTool />
        ) : tab === "rsu" ? (
          <RsuTool />
        ) : tab === "calendar" ? (
          <CalendarTool />
        ) : (
          <TotalReward />
        )}
      </main>
      <Footer />
      <Guided open={guided} onClose={() => setGuided(false)} onFinish={finish} />
    </>
  );
}
