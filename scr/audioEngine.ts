import type { SourceKind } from "./types";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private outputGain: GainNode | null = null;
  private freqData: Uint8Array | null = null;

  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  audioEl: HTMLAudioElement | null = null;
  private fileSource: MediaElementAudioSourceNode | null = null;
  private objectUrl: string | null = null;

  kind: SourceKind = "idle";
  private volume = 0.85;

  /** Lazily create the AudioContext + analyser chain (must happen after a user gesture). */
  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;

    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio is not supported in this browser.");

    const ctx = new Ctor({ latencyHint: "interactive" });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    analyser.minDecibels = -88;
    analyser.maxDecibels = -18;

    const outputGain = ctx.createGain();
    outputGain.gain.value = this.volume;
    outputGain.connect(ctx.destination);

    this.ctx = ctx;
    this.analyser = analyser;
    this.outputGain = outputGain;
    this.freqData = new Uint8Array(analyser.frequencyBinCount);
    return ctx;
  }

  async startMic(): Promise<void> {
    this.stop();
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ctx.createMediaStreamSource(stream);
    // Mic input feeds the analyser only — never the output, to avoid feedback.
    source.connect(this.analyser!);

    this.micStream = stream;
    this.micSource = source;
    this.kind = "mic";
  }

  async playFile(file: File): Promise<{ duration: number }> {
    this.stop();
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";

    const source = ctx.createMediaElementSource(audio);
    source.connect(this.analyser!);
    source.connect(this.outputGain!);

    await audio.play();

    this.audioEl = audio;
    this.fileSource = source;
    this.objectUrl = url;
    this.kind = "file";

    return new Promise((resolve) => {
      const onMeta = () => resolve({ duration: audio.duration || 0 });
      if (audio.readyState >= 1) onMeta();
      else audio.addEventListener("loadedmetadata", onMeta, { once: true });
    });
  }

  togglePlay(): void {
    if (!this.audioEl) return;
    if (this.audioEl.paused) void this.audioEl.play();
    else this.audioEl.pause();
  }

  seek(time: number): void {
    if (this.audioEl) this.audioEl.currentTime = time;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.outputGain) this.outputGain.gain.value = this.volume;
  }

  /** Pulls the current frequency data. Returns null if there's no active analyser. */
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqData) return null;
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  stop(): void {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micSource?.disconnect();
    this.micStream = null;
    this.micSource = null;

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = "";
    }
    this.fileSource?.disconnect();
    this.audioEl = null;
    this.fileSource = null;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;

    this.kind = "idle";
  }
}
