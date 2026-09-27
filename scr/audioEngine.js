export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.outputGain = null;
    this.freqData = null;
    this.micStream = null;
    this.micSource = null;
    this.audioEl = null;
    this.fileSource = null;
    this.objectUrl = null;
    this.kind = "idle";
    this.volume = 0.85;
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio not supported.");
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

  async startMic() {
    this.stop();
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ctx.createMediaStreamSource(stream);
    source.connect(this.analyser);
    this.micStream = stream;
    this.micSource = source;
    this.kind = "mic";
  }

  async playFile(file) {
    this.stop();
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    const source = ctx.createMediaElementSource(audio);
    source.connect(this.analyser);
    source.connect(this.outputGain);
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

  togglePlay() {
    if (!this.audioEl) return;
    if (this.audioEl.paused) this.audioEl.play();
    else this.audioEl.pause();
  }

  seek(time) {
    if (this.audioEl) this.audioEl.currentTime = time;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.outputGain) this.outputGain.gain.value = this.volume;
  }

  getFrequencyData() {
    if (!this.analyser || !this.freqData) return null;
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  stop() {
    if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());
    if (this.micSource) this.micSource.disconnect();
    this.micStream = null;
    this.micSource = null;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = "";
    }
    if (this.fileSource) this.fileSource.disconnect();
    this.audioEl = null;
    this.fileSource = null;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.kind = "idle";
  }
}