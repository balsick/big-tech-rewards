import { useStore } from "../state/store.tsx";

// The three things this page has to say before it says anything else: it
// collects nothing, it is not official, and whoever wrote it guarantees
// nothing.
//
// They used to be at the foot of the page, which is the conventional place and
// the wrong one. A disclaimer you reach after using the tool is a disclaimer
// you read after deciding to trust it — and the first of the three is not small
// print at all: "nothing you type leaves this device" is the reason it is
// reasonable to type a salary into a web page in the first place, and that
// belongs above the field, not under it.
//
// Collapsed to one line after the first read would be a nice touch and is
// deliberately absent: it would mean remembering that you read it, and the only
// place to remember it is the storage this text promises not to use.

export default function Disclaimer() {
  const { t } = useStore();
  return (
    <section className="disclaimer-top" aria-label={t.footer.privacyTitle}>
      <div className="disclaimer">
        <div>
          <h2>{t.footer.privacyTitle}</h2>
          <p>{t.footer.privacy}</p>
        </div>
        <div>
          <h2>{t.footer.unofficialTitle}</h2>
          <p>{t.footer.unofficial}</p>
        </div>
        <div>
          <h2>{t.footer.liabilityTitle}</h2>
          <p>{t.footer.liability}</p>
        </div>
      </div>
    </section>
  );
}
