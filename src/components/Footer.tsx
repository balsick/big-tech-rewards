import { useStore } from "../state/store.tsx";
import { REPO } from "../lib/meta.ts";
import { ANNO_FISCALE } from "../lib/tax.ts";
import { storicoAggiornato } from "../lib/prices.ts";

// Il piede dice tre cose, e le dice tutte e tre per esteso perche' sono la
// ragione per cui uno strumento del genere puo' stare online senza fare danni:
// non raccoglie niente, non e' ufficiale, e chi l'ha scritto non garantisce
// nulla. Non sono note a margine: sono il contratto con chi legge.

export default function Footer() {
  const { t } = useStore();
  return (
    <footer className="bottom">
      <div className="wrap">
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
        <div className="meta">
          <a href={REPO} target="_blank" rel="noreferrer noopener">
            {t.footer.source}
          </a>
          <span>
            {t.footer.taxYear}: {ANNO_FISCALE}
          </span>
          <span className="cifra">{storicoAggiornato}</span>
        </div>
      </div>
    </footer>
  );
}
