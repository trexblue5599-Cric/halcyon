const STORAGE_KEY = "visualizer-prefs";

const DEFAULT_PREFS = {
  modeIndex: 0,
  themeIndex: 0,
  sensitivity: 1.15,
  volume: 0.85,
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}