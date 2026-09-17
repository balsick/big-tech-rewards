import { useId, useRef, type ReactNode } from "react";
import { useStore } from "../state/store.tsx";

// Explanation on demand.
//
// These screens have a lot to explain — why the salary is needed, where a save
// ends up, why the marginal rate is computed by difference — and inline under
// every field that prose is read once and then becomes noise between one field
// and the next, stretching the form by whole screenfuls. Behind a button it
// stays findable and stops being in the way.
//
// It lives in the browser's **top layer** (the `popover` attribute) rather than
// in the flow: an absolutely positioned panel inside a scrolling or sticky
// container gets clipped, which is how these helpers usually break. The native
// popover also brings Escape, click-outside and focus handling, which are
// always got wrong by hand.

export default function Info({ label, children }: { label?: string; children: ReactNode }) {
  const id = useId().replace(/:/g, "_");
  const anchor = useRef<HTMLButtonElement>(null);
  const { t } = useStore();

  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="info"
        popoverTarget={id}
        aria-label={label ?? t.common.whatIsThis}
        onClick={() => {
          // A native popover opens in the middle of the screen: nudge it next
          // to the button that opened it, keeping it inside the viewport.
          const pop = document.getElementById(id);
          const btn = anchor.current;
          if (!pop || !btn) return;
          requestAnimationFrame(() => {
            const r = btn.getBoundingClientRect();
            const w = pop.offsetWidth;
            const h = pop.offsetHeight;
            const margin = 12;
            const left = Math.min(
              Math.max(margin, r.left + r.width / 2 - w / 2),
              window.innerWidth - w - margin
            );
            // Below the button when there is room, above it otherwise.
            const below = r.bottom + 8;
            const top = below + h < window.innerHeight - margin ? below : Math.max(margin, r.top - h - 8);
            pop.style.left = `${left}px`;
            pop.style.top = `${top}px`;
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
