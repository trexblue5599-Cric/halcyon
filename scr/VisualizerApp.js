import { AudioEngine } from "./audioEngine.js";
import { mapToBars, idleSpectrum, smoothToward, decayPeaks } from "./spectrum.js";
import { drawVisualizer } from "./draw.js";
import { THEMES } from "./themes.js";
import { loadPrefs, savePrefs } from "./preferences.js";
import { createHud } from "./hud.js";
import { BAR_COUNT } from "./constants.js";

const MODES = ["spire", "orbit", "halo"];

/* ── DOM setup ── */
const root = document.getElementById("app");
root.style.cssText = "position:relative;width:100%;height:100vh;background:#050506;overflow:hidden";

const canvas = document.createElement("canvas");
canvas.style.cssText = "width:100%;height:100%;display:block";
root.appendChild(canvas);

const dropOverlay = document.createElement("div");
dropOverlay.className = "drop-overlay";
dropOverlay.style.display = "none";
dropOverlay.innerHTML = "<p>Drop to visualize</p>";
root.appendChild(dropOverlay);

/* ── State ── */
let prefs = loadPrefs();
let mode = MODES[prefs.modeIndex] ?? "spire";

let source = "idle";       // "idle" | "mic" | "file"
let playing = false;
let fileName = null;
let duration = 0;
let currentTime = 0;
let error = null;
let fullscreen = false;
let dragOver = false;

const smoothed = new Float32Array(BAR_COUNT);
const peaks = new Float32Array(BAR_COUNT);

const engine = new AudioEngine();

/* ── Build HUD ── */
const hud = createHud(root, {
  onPlayPause: () => engine.togglePlay(),
  onStop: () => {
    engine.stop();
    resetSourceState();
    syncHud();
  },
  onSeek: (t) => engine.seek(t),
  onStartMic: handleStartMic,
  onFileSelected: handleFile,
  onFullscreenToggle: toggleFullscreen,
  onModeChange: (m) => {
    mode = m;
    prefs.modeIndex = MODES.indexOf(m);
    savePrefs(prefs);
  },
  onThemeChange: (i) => {
    prefs.themeIndex = i;
    savePrefs(prefs);
  },
  onSensitivityChange: (v) => {
    prefs.sensitivity = v;
    savePrefs(prefs);
  },
  onVolumeChange: (v) => {
    prefs.volume = v;
    savePrefs(prefs);
    engine.setVolume(v);
  },
});

/* ── Canvas sizing ── */
const ctx = canvas.getContext("2d");
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ── Render loop ── */
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const freq = engine.getFrequencyData();
  const target = freq
    ? mapToBars(freq, BAR_COUNT, prefs.sensitivity)
    : idleSpectrum(BAR_COUNT, now / 1000);

  smoothToward(smoothed, target, dt, 10);
  decayPeaks(peaks, smoothed, dt, 0.6);

  drawVisualizer({
    ctx,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    bars: smoothed,
    peaks: peaks,
    theme: THEMES[prefs.themeIndex] ?? THEMES[0],
    mode: mode,
  });

  // Live-update HUD values
  if (engine.audioEl) {
    currentTime = engine.audioEl.currentTime;
    playing = !engine.audioEl.paused;
    syncHud();
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* ── State helpers ── */
function resetSourceState() {
  source = "idle";
  playing = false;
  fileName = null;
  duration = 0;
  currentTime = 0;
}

async function handleStartMic() {
  try {
    error = null;
    await engine.startMic();
    source = "mic";
    fileName = null;
    syncHud();
  } catch (e) {
    error = "Couldn't access the microphone — check your browser permissions.";
    syncHud();
  }
}

async function handleFile(file) {
  try {
    error = null;
    const result = await engine.playFile(file);
    source = "file";
    fileName = file.name;
    duration = result.duration;
    playing = true;
    syncHud();
  } catch (e) {
    error = "Couldn't play that file — try a different audio format.";
    syncHud();
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    root.requestFullscreen();
  }
}

function syncHud() {
  hud.update({
    isFile: source === "file",
    isMic: source === "mic",
    playing: playing,
    currentTime: currentTime,
    duration: duration,
    fileName: fileName,
    error: error,
    fullscreen: fullscreen,
    mode: mode,
    themeIndex: prefs.themeIndex,
    sensitivity: prefs.sensitivity,
    volume: prefs.volume,
  });
}

/* ── Fullscreen listener ── */
document.addEventListener("fullscreenchange", () => {
  fullscreen = Boolean(document.fullscreenElement);
  syncHud();
});

/* ── Keyboard shortcuts ── */
window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    engine.togglePlay();
  } else if (e.key === "f" || e.key === "F") {
    toggleFullscreen();
  } else if (e.key === "1") {
    mode = "spire"; prefs.modeIndex = 0; savePrefs(prefs); syncHud();
  } else if (e.key === "2") {
    mode = "orbit"; prefs.modeIndex = 1; savePrefs(prefs); syncHud();
  } else if (e.key === "3") {
    mode = "halo"; prefs.modeIndex = 2; savePrefs(prefs); syncHud();
  } else if (e.key === "Escape" && source !== "idle") {
    engine.stop();
    resetSourceState();
    syncHud();
  }
});

/* ── Drag & drop ── */
root.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (!dragOver) {
    dragOver = true;
    dropOverlay.style.display = "flex";
  }
});

root.addEventListener("dragleave", () => {
  dragOver = false;
  dropOverlay.style.display = "none";
});

root.addEventListener("drop", (e) => {
  e.preventDefault();
  dragOver = false;
  dropOverlay.style.display = "none";
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file && file.type.startsWith("audio/")) handleFile(file);
  else {
    error = "Drop an audio file to visualize it.";
    syncHud();
  }
});

/* ── Initial volume sync ── */
engine.setVolume(prefs.volume);

/* ── Initial HUD state ── */
syncHud();
