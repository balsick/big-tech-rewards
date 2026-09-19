import { useEffect, useState, type RefObject } from "react";
import { flushSync } from "react-dom";

/**
 * Whether the header should be in its compact form.
 *
 * The answer is not "have you scrolled far enough" but "have the labelled
 * controls left the screen". A fixed threshold got that wrong by construction:
 * collapsing at 72px while the masthead is 135px tall leaves a band of scroll
 * where the labelled controls are still half on screen AND the icons are
 * already in the bar — the same four controls, twice, at the same time.
 *
 * So the masthead itself is the trigger. An observer reports when it stops
 * intersecting the viewport at all, which is exactly the moment the icons
 * become a replacement rather than a duplicate, and it stays right when the
 * masthead's height changes with the type scale or the language.
 *
 * It only applies on a narrow screen: a desktop header is already one row.
 */
const NARROW = "(max-width: 899px)";

interface Transition {
  finished?: Promise<unknown>;
  ready?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
}

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

export function useCompactHeader(masthead: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = masthead.current;
    if (!el || typeof window === "undefined" || !window.matchMedia) return;
    const narrow = window.matchMedia(NARROW);

    const set = (next: boolean) => {
      setCompact((was) => {
        if (next !== was) queueMicrotask(() => swap(() => setCompact(next)));
        return was;
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      set(false);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => set(narrow.matches && !entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);

    // A change of width can make the question moot: on a desktop the header is
    // one row and never compacts, whatever the masthead is doing.
    const onWidth = () => {
      if (!narrow.matches) set(false);
    };
    narrow.addEventListener("change", onWidth);

    return () => {
      io.disconnect();
      narrow.removeEventListener("change", onWidth);
    };
  }, [masthead]);

  return compact;
}

/** light → dark → auto → light: the order the segmented control shows. */
export const nextTheme = (t: "light" | "dark" | "auto"): "light" | "dark" | "auto" =>
  t === "light" ? "dark" : t === "dark" ? "auto" : "light";
