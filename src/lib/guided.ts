// The guided mode, and the one thing it must not do: come back uninvited.
//
// It opens by itself on a first landing, because someone who has never seen
// this page does not know which of the two tools answers their question. After
// that it is a button in the header and nothing else — a walkthrough that
// reappears every visit stops being help and becomes a door to close.
//
// What it remembers is a single flag, next to the theme and the language. Never
// an amount: the answers given here live in the page's memory and reach the
// tools directly, and they are saved only if the person asks with the tools'
// own save button.

const SEEN_KEY = "btr:guided-seen";

/** Whether this browser has already landed here once. */
export function alreadySeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage denied (private browsing): treat it as seen rather than opening
    // the walkthrough on every single visit.
    return true;
  }
}

export function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* nothing to remember it with: the flow still works, it just reopens */
  }
}

/**
 * The answers, on their way from the walkthrough to the tool.
 *
 * They travel as a prop and not through storage: writing them to the save slot
 * would put numbers in the browser that nobody asked to keep, which is the one
 * promise this page makes.
 */
export type Seed =
  | { tool: "espp"; salary: number; percent: number }
  | { tool: "rsu"; salary: number; welcomeUsd: number; bonusUsd: number };
