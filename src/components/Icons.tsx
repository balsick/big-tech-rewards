// Icons, drawn rather than typed.
//
// A unicode glyph standing in for an icon is not an icon: "×" changes weight
// and shape from one system to the next, and next to a real icon you can see it
// does not belong to the same family — on iOS "☀" was even promoted to a
// coloured emoji next to a monochrome moon. These are all drawn on the same
// 24-unit grid with the same 1.75 stroke, and take their colour from the text.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export const Sun = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...base}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
  </svg>
);

export const Moon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...base} fill="currentColor" stroke="none">
    <path d="M12.6 2a1 1 0 0 0-.86 1.52A7.2 7.2 0 0 1 3.6 13.9a1 1 0 0 0-1.3 1.2A10 10 0 1 0 12.6 2Z" />
  </svg>
);

export const Close = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Plus = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** The disclosure chevron: it rotates, it does not swap glyph. */
export const Chevron = ({ size = 14, open = false }: { size?: number; open?: boolean }) => (
  <svg
    width={size}
    height={size}
    {...base}
    style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 160ms ease" }}
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

/** A flat line after a rise: the "try the floor" scenario. */
export const FlatLine = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} {...base}>
    <path d="M4 18h16M7 14l3.5-4 3 3L18 7" />
  </svg>
);

export const Github = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable="false" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.07-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.15 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);
