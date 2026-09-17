// Saving, deliberately explicit.
//
// These two tools get filled in with your own salary and your own grants, and
// retyping all of it every visit is a real nuisance. But storing those numbers
// **without asking** would be the wrong thing to do on a page that promises to
// keep nothing: the promise holds if the user decides, not if the code decides
// for them.
//
// So: a button. No autosave, no pre-ticked "remember me", and a way to forget
// everything sitting right next to the way to save it.
//
// Where it goes: this browser's `localStorage`, on this device. Not an account
// and not a file — there is no server to reach, because this page does not have
// one.

export interface Saved<T> {
  data: T;
  /** ISO timestamp of the save, so the page can say when it happened */
  at: string;
}

const PREFIX = "btr:save:";

/**
 * Whether storage can be used at all.
 *
 * In private browsing, with site data blocked, or inside certain iframes,
 * `localStorage` exists but **throws** the moment you touch it. It has to be
 * probed by writing, not by checking that the object is there.
 */
export function available(): boolean {
  try {
    const k = `${PREFIX}__probe`;
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function read<T>(key: string): Saved<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const j = JSON.parse(raw) as Saved<T>;
    return j && typeof j.at === "string" && j.data !== undefined ? j : null;
  } catch {
    // An unreadable save (old format, truncated JSON) is not an error to show:
    // it is a save that is not there.
    return null;
  }
}

export function write<T>(key: string, data: T): Saved<T> | null {
  const s: Saved<T> = { data, at: new Date().toISOString() };
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(s));
    return s;
  } catch {
    return null;
  }
}

export function clear(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing to remove, or storage denied: either way it is gone */
  }
}
