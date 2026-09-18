import { useStore } from "../state/store.tsx";
import { REPO } from "../lib/meta.ts";
import { TAX_YEAR } from "../lib/tax.ts";
import { historyUpdated } from "../lib/prices.ts";

// What is left at the foot of the page once the three statements moved to the
// top: where the source is, which tax year the parameters are, and when the
// stored prices were last refreshed. Provenance, which is the one thing a
// footer is actually the right place for.

export default function Footer() {
  const { t } = useStore();
  return (
    <footer className="bottom">
      <div className="wrap">
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
