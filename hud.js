import { formatTime } from "./formatTime.js";
import { THEMES } from "./themes.js";

const HIDE_DELAY_MS = 4000;

export function createHud(container, handlers) {
  const footer = document.createElement("footer");
  footer.className = "hud hud-visible";

  const panel = document.createElement("div");
  panel.className = "hud-panel";

  const errorEl = document.createElement("p");
  errorEl.className = "hud-error";
  errorEl.style.display = "none";
  panel.appendChild(errorEl);

  const row1 = document.createElement("div");
  row1.className = "hud-row";

  const playBtn = mkBtn("Play", "Play / pause");
  const stopBtn = mkBtn("Stop", "Stop current source");
  playBtn.disabled = true;
  stopBtn.disabled = true;

  const statusWrap = document.createElement("div");
  statusWrap.className = "hud-status";

  const statusText = document.createElement("p");
  statusText.className = "hud-status-text";
  statusText.textContent = "Drop a track, or use the buttons below";
  statusWrap.appendChild(statusText);

  const seekWrap = document.createElement("div");
  seekWrap.className = "hud-seek";
  seekWrap.style.display = "none";

  const curTime = document.createElement("span");
  curTime.textContent = "0:00";
  const seekInput = document.createElement("input");
  seekInput.type = "range";
  seekInput.min = "0";
  seekInput.max = "0";
  seekInput.step = "0.01";
  seekInput.value = "0";
  const durTime = document.createElement("span");
  durTime.textContent = "0:00";

  seekWrap.append(curTime, seekInput, durTime);
  statusWrap.appendChild(seekWrap);

  const micBtn = mkBtn("Mic", "Microphone");
  const uploadBtn = mkBtn("Upload", "Upload track");
  const fullBtn = mkBtn("Full", "Toggle fullscreen");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.style.display = "none";

  row1.append(playBtn, stopBtn, statusWrap, micBtn, uploadBtn, fileInput, fullBtn);

  const row2 = document.createElement("div");
  row2.className = "hud-row";

  const sensLabel = mkSlider("Sensitivity", 0.4, 2.4, 0.01, 1.15);
  const volLabel = mkSlider("Volume", 0, 1, 0.01, 0.85);

  const modeSelect = document.createElement("select");
  modeSelect.className = "hud-select";
  [["spire", "Spire"], ["wave", "Wave"], ["rings", "Rings"], ["pulse", "Pulse"]].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    modeSelect.appendChild(o);
  });

  const themeSelect = document.createElement("select");
  themeSelect.className = "hud-select";
  THEMES.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = t.name;
    themeSelect.appendChild(o);
  });

  // --- NEW: custom colour picker ---
  const colorWrap = document.createElement("label");
  colorWrap.className = "hud-color";
  const colorLabel = document.createElement("span");
  colorLabel.textContent = "Color";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#7fb8ff";
  colorWrap.append(colorLabel, colorInput);
  // --------------------------------

  row2.append(sensLabel.label, volLabel.label, modeSelect, themeSelect, colorWrap);
  panel.append(row1, row2);
  footer.appendChild(panel);
  container.appendChild(footer);

  playBtn.addEventListener("click", () => handlers.onPlayPause());
  stopBtn.addEventListener("click", () => handlers.onStop());
  micBtn.addEventListener("click", () => handlers.onStartMic());
  fullBtn.addEventListener("click", () => handlers.onFullscreenToggle());
  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handlers.onFileSelected(file);
    e.target.value = "";
  });
  seekInput.addEventListener("input", (e) => handlers.onSeek(Number(e.target.value)));
  sensLabel.input.addEventListener("input", (e) => handlers.onSensitivityChange(Number(e.target.value)));
  volLabel.input.addEventListener("input", (e) => handlers.onVolumeChange(Number(e.target.value)));
  modeSelect.addEventListener("change", (e) => handlers.onModeChange(e.target.value));
  themeSelect.addEventListener("change", (e) => handlers.onThemeChange(Number(e.target.value)));
  colorInput.addEventListener("input", (e) => handlers.onCustomColorChange(e.target.value));

  let hideTimer = null;
  let isIdle = true;

  function bumpVisible() {
    footer.classList.remove("hud-hidden");
    footer.classList.add("hud-visible");
    if (hideTimer) clearTimeout(hideTimer);
    if (!isIdle) {
      hideTimer = setTimeout(() => {
        footer.classList.remove("hud-visible");
        footer.classList.add("hud-hidden");
      }, HIDE_DELAY_MS);
    }
  }

  window.addEventListener("mousemove", bumpVisible);
  window.addEventListener("touchstart", bumpVisible);
  bumpVisible();

  return {
    update(state) {
      isIdle = !state.isFile && !state.isMic;
      if (state.error) {
        errorEl.textContent = state.error;
        errorEl.style.display = "block";
      } else {
        errorEl.style.display = "none";
      }
      let status;
      if (state.error) status = state.error;
      else if (state.isMic) status = "Live input";
      else if (state.fileName) status = state.fileName;
      else status = "Drop a track, or use the buttons below";
      statusText.textContent = status;

      playBtn.disabled = !state.isFile;
      playBtn.textContent = state.playing ? "Pause" : "Play";
      stopBtn.disabled = isIdle;
      fullBtn.textContent = state.fullscreen ? "Exit" : "Full";

      if (state.isFile) {
        seekWrap.style.display = "flex";
        seekInput.max = String(state.duration || 0);
        seekInput.value = String(Math.min(state.currentTime, state.duration));
        curTime.textContent = formatTime(state.currentTime);
        durTime.textContent = formatTime(state.duration);
      } else {
        seekWrap.style.display = "none";
      }

      volLabel.label.style.display = state.isMic ? "none" : "flex";
      if (document.activeElement !== sensLabel.input) sensLabel.input.value = String(state.sensitivity);
      if (document.activeElement !== volLabel.input) volLabel.input.value = String(state.volume);
      if (document.activeElement !== modeSelect) modeSelect.value = state.mode;
      if (document.activeElement !== themeSelect) themeSelect.value = String(state.themeIndex);
      if (document.activeElement !== colorInput) colorInput.value = state.customColor;
      bumpVisible();
    },
  };
}

function mkBtn(text, aria) {
  const b = document.createElement("button");
  b.className = "icon-btn";
  b.textContent = text;
  b.setAttribute("aria-label", aria);
  return b;
}

function mkSlider(labelText, min, max, step, value) {
  const label = document.createElement("label");
  label.className = "hud-slider";
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  label.append(span, input);
  return { label, input };
        }
