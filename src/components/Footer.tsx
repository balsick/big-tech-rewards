import { useStore } from "../state/store.tsx";
import { REPO } from "../lib/meta.ts";
import { TAX_YEAR } from "../lib/tax.ts";
import { historyUpdated } from "../lib/prices.ts";

// The footer says three things, and it says all three in full, because they are
// the reason a tool like this can be online without doing harm: it collects
// nothing, it is not official, and whoever wrote it guarantees nothing. These
// are not small print — they are the contract with whoever is reading.

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
            {t.footer.taxYear}: {TAX_YEAR}
          </span>
          <span className="tnum">{historyUpdated}</span>
        </div>
      </div>
    </footer>
  );
}
