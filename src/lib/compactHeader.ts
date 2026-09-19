import { useEffect, useState } from "react";

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
      // Which threshold applies depends on where we already are.
      setCompact((was) => (was ? y > EXPAND_BELOW : y > COLLAPSE_AT));
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
