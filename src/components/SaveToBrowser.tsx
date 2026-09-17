import { useStore } from "../state/store.tsx";
import { dateLong } from "../lib/format.ts";
import Info from "./Info.tsx";

// The save block: a button, what happens when you press it, and the way back.
//
// The copy is not decoration. "Save" on a web page means three different things
// to three different people — an account, a file, a server — and here it is
// none of them: it is this browser's memory on this device. If that is not
// written down, the only way to know is to trust, which is exactly what this
// page asks you not to have to do.

export default function SaveToBrowser({
  savedAt,
  dirty,
  available,
  onSave,
  onForget,
}: {
  /** ISO timestamp of the last save, or null if there is none */
  savedAt: string | null;
  /** whether the current state differs from the saved one */
  dirty: boolean;
  available: boolean;
  onSave: () => void;
  onForget: () => void;
}) {
  const { t, lang } = useStore();

  if (!available) {
    return (
      <div>
        <h3 style={{ marginTop: 0 }}>{t.save.title}</h3>
        <p className="hint">{t.save.unavailable}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>
        {t.save.title}
        <Info label={t.common.whatIsThis}>
          <p>{t.save.where}</p>
          <p>{t.save.nothingLeaves}</p>
        </Info>
      </h3>
      <div className="row-inline">
        <button
          className={`btn ${savedAt && !dirty ? "" : "primary"}`}
          type="button"
          onClick={onSave}
          disabled={!!savedAt && !dirty}
        >
          {savedAt && !dirty ? t.save.upToDate : savedAt ? t.save.buttonDirty : t.save.button}
        </button>
        {savedAt ? (
          <button className="btn link" type="button" onClick={onForget}>
            {t.save.forget}
          </button>
        ) : null}
      </div>
      {savedAt ? <p className="hint">{t.save.savedOn(dateLong(savedAt.slice(0, 10), lang))}</p> : null}
    </div>
  );
}
