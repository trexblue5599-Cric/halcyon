import { AudioEngine } from "./audioEngine.js";
import { mapToBars, idleSpectrum, smoothToward, decayPeaks } from "./spectrum.js";
import { drawVisualizer } from "./draw.js";
import { THEMES, applyCustomColor } from "./themes.js";
import { loadPrefs, savePrefs } from "./preferences.js";
import { createHud } from "./hud.js";
import { BAR_COUNT } from "./constants.js";

const MODES = ["spire", "wave", "rings", "pulse"];

function init() {
  const root = document.getElementById("app");
  if (!root) {
    document.body.innerHTML = "<p style='color:red;padding:20px;font-size:20px'>ERROR: #app not found</p>";
    return;
  }

  root.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#050506;overflow:hidden";

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;display:block";
  root.appendChild(canvas);

  const dropOverlay = document.createElement("div");
  dropOverlay.className = "drop-overlay";
  dropOverlay.style.display = "none";
  dropOverlay.innerHTML = "<p>Drop to visualize</p>";
  root.appendChild(dropOverlay);

  const landing = document.createElement("div");
landing.className = "landing";
landing.innerHTML = `
  <img class="landing-logo" src="assets/logo.png" alt="T-Rex Blue Official" />
  <h1>Halcyon</h1>
  <p class="brand-sub">T-Rex Blue Official</p>
  <div class="divider"></div>
  <p class="tagline">A real-time audio visualizer. Drop a track or use your microphone — sound shapes light in motion.</p>
  <button type="button">Enter</button>
  <p class="contact">Contact · <a href="mailto:trexblueofficial@gmail.com">trexblueofficial@gmail.com</a></p>
`;
root.appendChild(landing);

  const prefs = loadPrefs();

  // Apply saved custom colour to the custom theme before anything renders
  if (prefs.customColor) applyCustomColor(prefs.customColor);

  let mode = MODES[prefs.modeIndex] || "spire";
  let source = "idle";
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

  const hud = createHud(root, {
    onPlayPause: () => engine.togglePlay(),
    onStop: () => { engine.stop(); resetSourceState(); syncHud(); },
    onSeek: (t) => engine.seek(t),
    onStartMic: handleStartMic,
    onFileSelected: handleFile,
    onFullscreenToggle: toggleFullscreen,
    onModeChange: (m) => { mode = m; prefs.modeIndex = MODES.indexOf(m); savePrefs(prefs); },
    onThemeChange: (i) => { prefs.themeIndex = i; savePrefs(prefs); syncHud(); },
    onSensitivityChange: (v) => { prefs.sensitivity = v; savePrefs(prefs); },
    onVolumeChange: (v) => { prefs.volume = v; savePrefs(prefs); engine.setVolume(v); },
    onCustomColorChange: (hex) => {
      prefs.customColor = hex;
      applyCustomColor(hex);
      savePrefs(prefs);
      // Auto-switch to the Custom theme when the user picks a colour
      prefs.themeIndex = THEMES.findIndex((t) => t.id === "custom");
      syncHud();
    },
  });

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth || document.documentElement.clientWidth || 360;
    const h = window.innerHeight || document.documentElement.clientHeight || 640;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 100));

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
      width: window.innerWidth,
      height: window.innerHeight,
      bars: smoothed,
      peaks: peaks,
      theme: THEMES[prefs.themeIndex] || THEMES[0],
      mode: mode,
    });

    if (engine.audioEl) {
      currentTime = engine.audioEl.currentTime;
      playing = !engine.audioEl.paused;
      syncHud();
    }

    requestAnimationFrame(tick);
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    landing.classList.add("hidden");
    try { engine.ensureContext(); } catch (e) {}
    requestAnimationFrame(tick);
  }
  landing.querySelector("button").addEventListener("click", start);
  root.addEventListener("drop", () => { if (!started) start(); }, { once: true });

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
      error = "Couldn't access the microphone.";
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
      error = "Couldn't play that file.";
      syncHud();
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen();
  }

  function syncHud() {
    hud.update({
      isFile: source === "file",
      isMic: source === "mic",
      playing,
      currentTime,
      duration,
      fileName,
      error,
      fullscreen,
      mode,
      themeIndex: prefs.themeIndex,
      sensitivity: prefs.sensitivity,
      volume: prefs.volume,
      customColor: prefs.customColor,
    });
  }

  document.addEventListener("fullscreenchange", () => {
    fullscreen = Boolean(document.fullscreenElement);
    syncHud();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); engine.togglePlay(); }
    else if (e.key === "f" || e.key === "F") toggleFullscreen();
    else if (e.key === "1") { mode = "spire"; prefs.modeIndex = 0; savePrefs(prefs); syncHud(); }
    else if (e.key === "2") { mode = "wave"; prefs.modeIndex = 1; savePrefs(prefs); syncHud(); }
    else if (e.key === "3") { mode = "rings"; prefs.modeIndex = 2; savePrefs(prefs); syncHud(); }
      else if (e.key === "4") { mode = "pulse"; prefs.modeIndex = 3; savePrefs(prefs); syncHud(); }
    else if (e.key === "Escape" && source !== "idle") { engine.stop(); resetSourceState(); syncHud(); }
  });

  root.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!dragOver) { dragOver = true; dropOverlay.style.display = "flex"; }
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
    else { error = "Drop an audio file."; syncHud(); }
  });

  engine.setVolume(prefs.volume);
  syncHud();
}

function safeInit() {
  try {
    init();
  } catch (e) {
    document.body.innerHTML =
      "<pre style='color:#ffdcdc;background:#3a0d0d;padding:16px;font:13px/1.5 monospace;white-space:pre-wrap'>" +
      "Startup error: " + (e && e.stack ? e.stack : e) +
      "</pre>";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeInit);
} else {
  safeInit();
}
