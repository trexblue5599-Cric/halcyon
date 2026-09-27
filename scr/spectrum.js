export function mapToBars(freq, barCount, sensitivity) {
  const out = new Float32Array(barCount);
  const len = freq.length;
  if (len < 2) return out;

  const logMin = Math.log(1);
  const logMax = Math.log(len - 1);

  for (let i = 0; i < barCount; i++) {
    const t0 = i / barCount;
    const t1 = (i + 1) / barCount;
    const startBin = Math.max(1, Math.floor(Math.exp(logMin + (logMax - logMin) * t0)));
    const endBinRaw = Math.floor(Math.exp(logMin + (logMax - logMin) * t1));
    const endBin = Math.min(len, Math.max(startBin + 1, endBinRaw));

    let sum = 0;
    for (let bin = startBin; bin < endBin; bin++) sum += freq[bin] || 0;
    const avg = sum / Math.max(1, endBin - startBin);

    const bassBoost = 0.85 + 0.3 * (1 - t0);
    out[i] = Math.min(1, (avg / 255) * sensitivity * bassBoost);
  }
  return out;
}

export function idleSpectrum(barCount, time) {
  const out = new Float32Array(barCount);
  for (let i = 0; i < barCount; i++) {
    const x = barCount === 1 ? 0 : i / (barCount - 1);
    const wave =
      0.2 * Math.sin(time * 0.55 + x * 5.4) +
      0.1 * Math.sin(time * 1.15 + x * 12.6) +
      0.07 * Math.sin(time * 0.32 + x * 2.1);
    const envelope =
      Math.exp(-((x - 0.16) * 2.5) ** 2) * 0.42 +
      Math.exp(-((x - 0.52) * 3.1) ** 2) * 0.22 +
      Math.exp(-((x - 0.84) * 4.2) ** 2) * 0.12 +
      0.1;
    out[i] = Math.max(0.03, envelope + wave * 0.14);
  }
  return out;
}

export function smoothToward(current, target, dt, rate) {
  const k = 1 - Math.exp(-dt * rate);
  for (let i = 0; i < current.length; i++) {
    const c = current[i] || 0;
    const t = target[i] || 0;
    current[i] = c + (t - c) * k;
  }
}

export function decayPeaks(peaks, values, dt, fallRate) {
  for (let i = 0; i < peaks.length; i++) {
    const v = values[i] || 0;
    const p = peaks[i] || 0;
    peaks[i] = v > p ? v : Math.max(0, p - fallRate * dt);
  }
}