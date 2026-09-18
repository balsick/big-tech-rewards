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

/**
 * The cash bonus, as a percentage of salary.
 *
 * A starting point, not a rule: the figure is in the contract and varies by
 * role and by year, so it is a field you overwrite rather than a constant the
 * tool believes in.
 */
export const DEFAULT_BONUS_PCT = 7;

/** The ESPP contribution the tool opens on: the plan maximum, which is the
 *  interesting case and the one most people who enrol end up at. */
export const DEFAULT_ESPP_PCT = 15;
