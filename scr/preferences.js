const STORAGE_KEY = "visualizer-prefs";

const DEFAULT_PREFS = {
  modeIndex: 0,
  themeIndex: 0,
  sensitivity: 1.15,
  volume: 0.85,
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Load prefs (fills in defaults for missing keys). */
export function loadPrefs() {
  return readPrefs();
}

/** Save prefs to localStorage. Silently fails in private mode. */
export function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can fail (private browsing, quota) — preferences just won't persist.
  }
}
