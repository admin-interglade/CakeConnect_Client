import React from 'react';

/**
 * The shop and date cut-off overrides this app has written since it started.
 *
 * `POST /cutoff/shops` and `POST /cutoff/date` have no matching read: nothing
 * lists the overrides they create and nothing deletes one (docs/api-gaps.md
 * G24). So the precedence explainer would have nothing above the global to
 * show, which would read as "no override is set" — the one thing we cannot say.
 *
 * This holds what we do know: what this device saved, and when. It is labelled
 * as such on screen and never presented as server truth. It is deliberately not
 * persisted — an override recorded last week is a claim about the server that
 * this app has no way to re-check.
 *
 * A module-level store rather than a query cache entry, because none of it came
 * from a query: there is no endpoint behind it to refetch or invalidate.
 */

export type SessionOverride = {
  cutoffTime: string;
  /** ISO instant the write succeeded, so the screen can say how stale it is. */
  savedAt: string;
};

export type SessionOverrides = {
  /** Keyed by shop id. */
  shops: Record<string, SessionOverride>;
  /** Keyed by `YYYY-MM-DD`. */
  dates: Record<string, SessionOverride>;
};

const EMPTY: SessionOverrides = { shops: {}, dates: {} };

let overrides: SessionOverrides = EMPTY;

const listeners = new Set<() => void>();

function publish(next: SessionOverrides) {
  overrides = next;
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Stable between writes, which `useSyncExternalStore` requires. */
const getSnapshot = () => overrides;

/** Called from the mutation that succeeded, never from a render. */
export function rememberShopOverride(shopId: string, cutoffTime: string) {
  publish({
    ...overrides,
    shops: {
      ...overrides.shops,
      [shopId]: { cutoffTime, savedAt: new Date().toISOString() },
    },
  });
}

export function rememberDateOverride(date: string, cutoffTime: string) {
  publish({
    ...overrides,
    dates: {
      ...overrides.dates,
      [date]: { cutoffTime, savedAt: new Date().toISOString() },
    },
  });
}

export function useSessionOverrides(): SessionOverrides {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export default useSessionOverrides;
