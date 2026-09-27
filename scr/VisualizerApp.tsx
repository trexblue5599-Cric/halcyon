import { useEffect, useRef, useState, type DragEvent } from "react";
import { AudioEngine } from "./audioEngine";
import { mapToBars, idleSpectrum, smoothToward, decayPeaks } from "./spectrum";
import { drawVisualizer } from "./draw";
import { THEMES } from "./themes";
import { usePersistedPrefs } from "./usePersistedPrefs";
import { Hud } from "./Hud";
import type { VizMode } from "./types";
import { BAR_COUNT } from "./types";

const MODES: VizMode[] = ["spire", "orbit", "halo"];

export function VisualizerApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine>(new AudioEngine());

  const { prefs, setPrefs } = usePersistedPrefs();
  const mode = MODES[prefs.modeIndex] ?? "spire";

  const [source, setSource] = useState<"idle" | "mic" | "file">("idle");
  const [playing, setPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const smoothed = useRef(new Float32Array(BAR_COUNT));
  const peaks = useRef(new Float32Array(BAR_COUNT));

  // --- Render loop -----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const freq = engineRef.current.getFrequencyData();
      const target = freq
        ? mapToBars(freq, BAR_COUNT, prefs.sensitivity)
        : idleSpectrum(BAR_COUNT, now / 1000);

      smoothToward(smoothed.current, target, dt, 10);
      decayPeaks(peaks.current, smoothed.current, dt, 0.6);

      drawVisualizer({
        ctx,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        bars: smoothed.current,
        peaks: peaks.current,
        theme: THEMES[prefs.themeIndex] ?? THEMES[0]!,
        mode,
      });

      if (engineRef.current.audioEl) {
        setCurrentTime(engineRef.current.audioEl.currentTime);
        setPlaying(!engineRef.current.audioEl.paused);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode, prefs.themeIndex, prefs.sensitivity]);

  // --- Keep engine volume in sync ---------------------------------------
  useEffect(() => {
    engineRef.current.setVolume(prefs.volume);
  }, [prefs.volume]);

  // --- Keyboard shortcuts ------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        engineRef.current.togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "1") setPrefs({ modeIndex: 0 });
      else if (e.key === "2") setPrefs({ modeIndex: 1 });
      else if (e.key === "3") setPrefs({ modeIndex: 2 });
      else if (e.key === "Escape" && source !== "idle") {
        engineRef.current.stop();
        resetSourceState();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // --- Fullscreen ---------------------------------------------------------
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }

  function resetSourceState() {
    setSource("idle");
    setPlaying(false);
    setFileName(null);
    setDuration(0);
    setCurrentTime(0);
  }

  async function handleStartMic() {
    try {
      setError(null);
      await engineRef.current.startMic();
      setSource("mic");
      setFileName(null);
    } catch {
      setError("Couldn't access the microphone — check your browser permissions.");
    }
  }

  async function handleFile(file: File) {
    try {
      setError(null);
      const { duration } = await engineRef.current.playFile(file);
      setSource("file");
      setFileName(file.name);
      setDuration(duration);
      setPlaying(true);
    } catch {
      setError("Couldn't play that file — try a different audio format.");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) void handleFile(file);
    else setError("Drop an audio file to visualize it.");
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100vh", background: "#050506" }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {dragOver ? (
        <div className="drop-overlay">
          <p>Drop to visualize</p>
        </div>
      ) : null}

      <Hud
        mode={mode}
        onModeChange={(m) => setPrefs({ modeIndex: MODES.indexOf(m) })}
        themeIndex={prefs.themeIndex}
        onThemeChange={(i) => setPrefs({ themeIndex: i })}
        sensitivity={prefs.sensitivity}
        onSensitivityChange={(v) => setPrefs({ sensitivity: v })}
        volume={prefs.volume}
        onVolumeChange={(v) => setPrefs({ volume: v })}
        isFile={source === "file"}
        isMic={source === "mic"}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        fileName={fileName}
        error={error}
        fullscreen={fullscreen}
        onPlayPause={() => engineRef.current.togglePlay()}
        onStop={() => {
          engineRef.current.stop();
          resetSourceState();
        }}
        onSeek={(t) => engineRef.current.seek(t)}
        onStartMic={handleStartMic}
        onFileSelected={handleFile}
        onFullscreenToggle={toggleFullscreen}
      />
    </div>
  );
}
