import { useId, useRef, type ReactNode } from "react";
import { useStore } from "../state/store.tsx";

// La spiegazione a richiesta.
//
// Queste schermate hanno molto da spiegare — perche' serve la RAL, dove finisce
// un salvataggio, perche' l'aliquota si calcola per differenza — e messa in
// linea sotto ogni campo quella prosa si legge una volta e poi diventa rumore
// fra un campo e l'altro, allungando il modulo di schermate intere. Dietro a un
// bottone resta reperibile e smette di stare in mezzo.
//
// Sta nel **top layer** del browser (attributo `popover`) e non dentro il
// flusso: un pannello posizionato in assoluto dentro un contenitore che scorre
// o che e' `sticky` viene tagliato, ed e' il modo in cui questi aiuti si
// rompono di solito. Il popover nativo porta con se' anche la chiusura con Esc,
// il click fuori e la gestione del focus, che a mano si sbagliano sempre.

export default function Info({ label, children }: { label?: string; children: ReactNode }) {
  const id = useId().replace(/:/g, "_");
  const rif = useRef<HTMLButtonElement>(null);
  const { t } = useStore();

  return (
    <>
      <button
        ref={rif}
        type="button"
        className="info"
        popoverTarget={id}
        aria-label={label ?? t.common.whatIsThis}
        onClick={() => {
          // Il popover nativo nasce in mezzo allo schermo: lo si accosta al
          // bottone che l'ha aperto, restando dentro i margini della finestra.
          const p = document.getElementById(id);
          const b = rif.current;
          if (!p || !b) return;
          requestAnimationFrame(() => {
            const r = b.getBoundingClientRect();
            const w = p.offsetWidth;
            const h = p.offsetHeight;
            const margine = 12;
            const sinistra = Math.min(
              Math.max(margine, r.left + r.width / 2 - w / 2),
              window.innerWidth - w - margine
            );
            // Sotto il bottone se c'e' posto, sopra se no.
            const sotto = r.bottom + 8;
            const alto = sotto + h < window.innerHeight - margine ? sotto : Math.max(margine, r.top - h - 8);
            p.style.left = `${sinistra}px`;
            p.style.top = `${alto}px`;
          });
        }}
      >
        i
      </button>
      <div id={id} popover="auto" className="pop" role="note">
        {children}
      </div>
    </>
  );
}
