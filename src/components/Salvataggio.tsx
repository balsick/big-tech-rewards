import { useStore } from "../state/store.tsx";
import { dateLong } from "../lib/format.ts";

// Il blocco del salvataggio: un tasto, cosa succede quando lo premi, e il modo
// di tornare indietro.
//
// Il testo non e' decorazione. «Salva» in una pagina web vuol dire tre cose
// diverse a tre persone diverse — un account, un file, un server — e qui non e'
// nessuna delle tre: e' la memoria di questo browser su questo dispositivo. Se
// non lo si scrive, l'unico modo di saperlo e' fidarsi, ed e' esattamente
// quello che questa pagina chiede di non dover fare.

export default function Salvataggio({
  quando,
  sporco,
  possibile,
  onSalva,
  onDimentica,
}: {
  /** ISO dell'ultimo salvataggio, o null se non c'e' */
  quando: string | null;
  /** se lo stato corrente e' diverso da quello salvato */
  sporco: boolean;
  possibile: boolean;
  onSalva: () => void;
  onDimentica: () => void;
}) {
  const { t, lang } = useStore();

  if (!possibile) {
    return (
      <div>
        <h3 style={{ marginTop: 0 }}>{t.salva.title}</h3>
        <p className="hint">{t.salva.unavailable}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{t.salva.title}</h3>
      <div className="row-inline" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button
          className={`btn ${quando && !sporco ? "" : "primary"}`}
          type="button"
          onClick={onSalva}
          disabled={!!quando && !sporco}
        >
          {quando && !sporco ? t.salva.upToDate : quando ? t.salva.buttonDirty : t.salva.button}
        </button>
        {quando ? (
          <button className="btn link" type="button" onClick={onDimentica}>
            {t.salva.forget}
          </button>
        ) : null}
      </div>
      {quando ? <p className="hint">{t.salva.savedOn(dateLong(quando.slice(0, 10), lang))}</p> : null}
      <p className="hint">{t.salva.where}</p>
      <p className="hint">{t.salva.nothingLeaves}</p>
    </div>
  );
}
