/**
 * Features still being built, switched on by the address bar.
 *
 * `?calendar=true` and nothing else: no toggle in the interface, no preference
 * remembered, no flag in storage. Something half-finished should be reachable
 * by whoever is working on it and invisible to everyone else, and a query
 * parameter is the only mechanism that is exactly that — it costs one line, it
 * is shareable as a link, and it cannot leak into the build for people who did
 * not ask for it.
 */
export type Flag = "calendar";

const on = (name: Flag): boolean => {
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    return v === "true" || v === "1";
  } catch {
    // No window, or a malformed query string: the feature is simply off.
    return false;
  }
};

export const flag = (name: Flag): boolean => on(name);
