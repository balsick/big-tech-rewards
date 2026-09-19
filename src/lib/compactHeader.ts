import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Whether the header should be in its compact form.
 *
 * Two conditions, and both matter. It only applies on a narrow screen — on a
 * desktop the header is already one row and shrinking it on scroll would be
 * churn for nothing — and it only applies once you have actually started
 * reading.
 *
 * **It expands only at the very top, and that is not fussiness.** Expanding
 * makes the header 140px taller, which makes the document taller, and the
 * browser's scroll anchoring then moves `scrollY` to keep the visible content
 * where it was — straight back past the collapse threshold, which collapses it
 * again. Measured: asking for scrollY 20 landed at 160 and the header flipped
 * back. A wider hysteresis does not help, because the feedback is the size of
 * the header, not of the jitter.
 *
 * At scrollY 0 there is no content above the viewport for anchoring to hold on
 * to, so the header simply grows downwards and nothing moves. Collapsing at 72
 * and expanding only at the top also reads as a rule rather than a threshold:
 * it comes back when you go back.
 */
const COLLAPSE_AT = 72;
const EXPAND_BELOW = 0;
const NARROW = "(max-width: 899px)";

/**
 * Swaps the state inside a view transition when the browser has one.
 *
 * The two forms hold the same four controls in different places and shapes, so
 * what should happen between them is a move, not a swap. A view transition
 * gets that for free: the browser keeps a snapshot of the outgoing elements,
 * matches them to the incoming ones by `view-transition-name`, and animates
 * position and size between the two — across different parts of the tree,
 * which is exactly what a hand-written transition cannot do.
 *
 * Two guards. It runs only where the API exists, and not at all when motion is
 * unwelcome: a header that rearranges itself under you is the kind of movement
 * `prefers-reduced-motion` is about. Both fall back to setting the state, and
 * the result is the same header without the travel.
 */
interface Transition {
  finished?: Promise<unknown>;
  ready?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
}

function swap(apply: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => Transition };
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || still) {
    apply();
    return;
  }
  // The callback has to leave the DOM in its new state before it returns, or
  // there is nothing for the browser to snapshot against.
  const run = doc.startViewTransition(() => flushSync(apply));

  // A transition gets skipped for ordinary reasons — another one starting, the
  // tab going to the background — and its promises reject when it does. That
  // is not a failure: the DOM change already happened, only the animation did
  // not. Unhandled, each one surfaces as an uncaught rejection in the console,
  // which is how a working feature comes to look broken.
  run?.finished?.catch(() => {});
  run?.ready?.catch(() => {});
  run?.updateCallbackDone?.catch(() => {});
}

export function useCompactHeader(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const narrow = window.matchMedia(NARROW);
    let frame = 0;

    const read = () => {
      frame = 0;
      if (!narrow.matches) {
        setCompact(false);
        return;
      }
      const y = window.scrollY;
      // Which threshold applies depends on where we already are. Read outside
      // the updater: a view transition has to be started from the decision,
      // not from inside React's state update.
      setCompact((was) => {
        const next = was ? y > EXPAND_BELOW : y > COLLAPSE_AT;
        if (next !== was) {
          // Re-enter through the transition rather than returning the new
          // value here, so the DOM change happens inside the snapshot.
          queueMicrotask(() => swap(() => setCompact(next)));
        }
        return was;
      });
    };

    // Coalesced into a frame: scroll fires far more often than the header can
    // usefully change, and reading `scrollY` in the handler itself is what
    // makes these sticky headers stutter.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    narrow.addEventListener("change", read);
    read();

    return () => {
      window.removeEventListener("scroll", onScroll);
      narrow.removeEventListener("change", read);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return compact;
}

/** light → dark → auto → light: the order the segmented control shows. */
export const nextTheme = (t: "light" | "dark" | "auto"): "light" | "dark" | "auto" =>
  t === "light" ? "dark" : t === "dark" ? "auto" : "light";
