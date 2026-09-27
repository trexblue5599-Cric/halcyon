import { useEffect, useState } from "react";

const STORAGE_KEY = "visualizer-prefs";

export type Prefs = {
  modeIndex: number;
  themeIndex: number;
  sensitivity: number;
  volume: number;
};

const DEFAULT_PREFS: Prefs = {
  modeIndex: 0,
  themeIndex: 0,
  sensitivity: 1.15,
  volume: 0.85,
};

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Persists a small preferences object to localStorage. Playback state
 * (what's playing, current time) intentionally does NOT go through this —
 * only durable preferences that should survive a page reload.
 */
export function usePersistedPrefs() {
  const [prefs, setPrefsState] = useState<Prefs>(readPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Storage can fail (private browsing, quota) — preferences just won't persist.
    }
  }, [prefs]);

  const setPrefs = (partial: Partial<Prefs>) => {
    setPrefsState((prev) => ({ ...prev, ...partial }));
  };

  return { prefs, setPrefs };
}
