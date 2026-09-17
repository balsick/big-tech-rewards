/** Where the code lives. Used by the header and the footer. */
export const REPO = "https://github.com/balsick/big-tech-rewards";

/**
 * The salary both tools start from.
 *
 * A round, generic number, picked because it is the top of the last income tax
 * bracket: it shows straight away the most useful thing here — what changes at
 * the margin the moment you cross it. It lives here rather than in the
 * components because a constant copied twice is a constant that eventually
 * means two different things.
 */
export const DEFAULT_SALARY = 50000;
