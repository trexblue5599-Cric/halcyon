import { useEffect, useRef, useState } from "react";
import { formatTime } from "./formatTime";
import { THEMES } from "./themes";
import type { VizMode } from "./types";

type HudProps = {
  mode: VizMode;
  onModeChange: (m: VizMode) => void;
  themeIndex: number;
  onThemeChange: (i: number) => void;
  sensitivity: number;
  onSensitivityChange: (v: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isFile: boolean;
  isMic: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  fileName: string | null;
  error: string | null;
  fullscreen: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (t: number) => void;
  onStartMic: () => void;
  onFileSelected: (file: File) => void;
  onFullscreenToggle: () => void;
};

const HIDE_DELAY_MS = 3000;

export function Hud(props: HudProps) {
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const idle = !props.isFile && !props.isMic;

  const bumpVisible = () => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!idle) {
      hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
    }
  };

  useEffect(() => {
    bumpVisible();
    window.addEventListener("mousemove", bumpVisible);
    window.addEventListener("touchstart", bumpVisible);
    return () => {
      window.removeEventListener("mousemove", bumpVisible);
      window.removeEventListener("touchstart", bumpVisible);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idle]);

  const status = props.error
    ? props.error
    : props.isMic
      ? "Live input"
      : props.fileName ?? "Drop a track, or use the buttons below";

  return (
    <footer className={`hud ${visible ? "hud-visible" : "hud-hidden"}`}>
      <div className="hud-panel">
        {props.error ? <p className="hud-error">{props.error}</p> : null}

        <div className="hud-row">
          <button
            className="icon-btn"
            onClick={props.onPlayPause}
            disabled={!props.isFile}
            aria-label={props.playing ? "Pause" : "Play"}
          >
            {props.playing ? "Pause" : "Play"}
          </button>
          <button className="icon-btn" onClick={props.onStop} disabled={idle} aria-label="Stop">
            Stop
          </button>

          <div className="hud-status">
            <p className="hud-status-text">{status}</p>
            {props.isFile ? (
              <div className="hud-seek">
                <span>{formatTime(props.currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={props.duration || 0}
                  step={0.01}
                  value={Math.min(props.currentTime, props.duration)}
                  onChange={(e) => props.onSeek(Number(e.target.value))}
                  aria-label="Seek"
                />
                <span>{formatTime(props.duration)}</span>
              </div>
            ) : null}
          </div>

          <button className="icon-btn" onClick={props.onStartMic} aria-label="Microphone">
            Mic
          </button>
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Upload track">
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) props.onFileSelected(file);
              e.target.value = "";
            }}
          />
          <button className="icon-btn" onClick={props.onFullscreenToggle} aria-label="Toggle fullscreen">
            {props.fullscreen ? "Exit" : "Full"}
          </button>
        </div>

        <div className="hud-row">
          <label className="hud-slider">
            <span>Sensitivity</span>
            <input
              type="range"
              min={0.4}
              max={2.4}
              step={0.01}
              value={props.sensitivity}
              onChange={(e) => props.onSensitivityChange(Number(e.target.value))}
            />
          </label>

          {!props.isMic ? (
            <label className="hud-slider">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={props.volume}
                onChange={(e) => props.onVolumeChange(Number(e.target.value))}
              />
            </label>
          ) : null}

          <select
            className="hud-select"
            value={props.mode}
            onChange={(e) => props.onModeChange(e.target.value as VizMode)}
            aria-label="Visual mode"
          >
            <option value="spire">Spire</option>
            <option value="orbit">Orbit</option>
            <option value="halo">Halo</option>
          </select>

          <select
            className="hud-select"
            value={props.themeIndex}
            onChange={(e) => props.onThemeChange(Number(e.target.value))}
            aria-label="Color theme"
          >
            {THEMES.map((t, i) => (
              <option key={t.id} value={i}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </footer>
  );
}
