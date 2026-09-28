import { colorForEnergy } from "./themes.js";

export function drawVisualizer(frame) {
  const { ctx, width, height, theme } = frame;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  if (frame.mode === "spire") drawSpire(frame);
  else if (frame.mode === "wave") drawWave(frame);
  else if (frame.mode === "rings") drawRings(frame);
  else if (frame.mode === "pulse") drawPulse(frame);
}

/* ===================== SPIRE ===================== */
function drawSpire(frame) {
  const { ctx, width, height, bars, peaks, theme } = frame;
  const n = bars.length;
  const gap = 3;
  const barWidth = Math.max(2, width / n - gap);
  const baseline = height * 0.82;
  const maxHeight = height * 0.62;

  for (let i = 0; i < n; i++) {
    const value = bars[i] || 0;
    const peak = peaks[i] || 0;
    const x = i * (barWidth + gap);
    const barHeight = value * maxHeight;
    ctx.fillStyle = colorForEnergy(theme, value);
    ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
    ctx.shadowBlur = 8 + value * 18;
    ctx.fillRect(x, baseline - barHeight, barWidth, barHeight);
    const peakY = baseline - peak * maxHeight;
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${theme.high[0]}, ${theme.high[1]}, ${theme.high[2]}, 0.85)`;
    ctx.fillRect(x, peakY - 2, barWidth, 2);
  }
  ctx.shadowBlur = 0;
}

/* ===================== WAVE =====================
   Mirrored smooth ribbon from the center.
================================================== */
function drawWave(frame) {
  const { ctx, width, height, bars, theme } = frame;
  const n = bars.length;
  const cx = width / 2;
  const cy = height / 2;
  const maxAmp = height * 0.32;

  const smooth = new Float32Array(n);
  const window = 3;
  for (let i = 0; i < n; i++) {
    let sum = 0, count = 0;
    for (let k = -window; k <= window; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < n) { sum += bars[idx] || 0; count++; }
    }
    smooth[i] = sum / Math.max(1, count);
  }

  const step = width / (n - 1);
  const topPts = [];
  for (let i = 0; i < n; i++) {
    topPts.push({ x: i * step, y: cy - smooth[i] * maxAmp });
  }
  const botPts = topPts.map((p) => ({ x: p.x, y: cy + (cy - p.y) })).reverse();
  const all = topPts.concat(botPts);

  ctx.beginPath();
  ctx.moveTo(all[0].x, all[0].y);
  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1];
    const curr = all[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  ctx.lineTo(all[all.length - 1].x, all[all.length - 1].y);

  const avg = average(smooth);
  const grad = ctx.createLinearGradient(0, cy - maxAmp, 0, cy + maxAmp);
  grad.addColorStop(0, colorForEnergy(theme, avg * 0.4));
  grad.addColorStop(0.5, colorForEnergy(theme, avg));
  grad.addColorStop(1, colorForEnergy(theme, avg * 0.4));
  ctx.fillStyle = grad;
  ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
  ctx.shadowBlur = 24 + avg * 40;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(topPts[0].x, topPts[0].y);
  for (let i = 1; i < topPts.length; i++) {
    const prev = topPts[i - 1];
    const curr = topPts[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  ctx.strokeStyle = colorForEnergy(theme, avg);
  ctx.lineWidth = 2;
  ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
  ctx.shadowBlur = 12 + avg * 20;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/* ===================== RINGS =====================
   Concentric rings expanding outward from the center.
   Inner rings react to bass, outer rings to treble.
================================================== */
function drawRings(frame) {
  const { ctx, width, height, bars, theme } = frame;
  const n = bars.length;
  const cx = width / 2;
  const cy = height / 2;
  const minR = Math.min(width, height) * 0.12;
  const maxR = Math.min(width, height) * 0.46;
  const ringCount = Math.min(n, 48);

  const avg = average(bars);

  // Center core glow
  ctx.beginPath();
  ctx.arc(cx, cy, minR * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = colorForEnergy(theme, avg * 0.8);
  ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
  ctx.shadowBlur = 40 + avg * 60;
  ctx.fill();
  ctx.shadowBlur = 0;

  for (let i = 0; i < ringCount; i++) {
    const t = i / ringCount;
    // Lower bars (bass) → inner rings. Higher bars (treble) → outer rings.
    const barIdx = Math.floor(t * (bars.length - 1));
    const value = bars[barIdx] || 0;

    const baseR = minR + (maxR - minR) * t;
    const r = baseR + value * Math.min(width, height) * 0.09;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = colorForEnergy(theme, value);
    ctx.lineWidth = Math.max(1, 3 - t * 2);
    ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
    ctx.shadowBlur = 8 + value * 22;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Pulsing core
  ctx.beginPath();
  ctx.arc(cx, cy, minR * 0.35 * (1 + avg * 1.5), 0, Math.PI * 2);
  ctx.fillStyle = colorForEnergy(theme, Math.min(1, avg * 1.6));
  ctx.fill();
}

/* ===================== PULSE =====================
   One big circle that breathes with the bass.
   Keeps a small history of past radii to draw a fading
   "ghost trail" behind the current circle.
================================================== */
const pulseHistory = [];

function drawPulse(frame) {
  const { ctx, width, height, bars, theme } = frame;
  const cx = width / 2;
  const cy = height / 2;

  // Bass = average of the lowest ~25% of bars
  const bassEnd = Math.max(1, Math.floor(bars.length * 0.25));
  let bass = 0;
  for (let i = 0; i < bassEnd; i++) bass += bars[i] || 0;
  bass /= bassEnd;

  const minR = Math.min(width, height) * 0.12;
  const maxR = Math.min(width, height) * 0.42;
  const r = minR + bass * (maxR - minR);

  // Push current radius into history (capped length)
  pulseHistory.push({ r, life: 1 });
  if (pulseHistory.length > 12) pulseHistory.shift();

  // Draw ghost trail oldest → newest
  for (let i = 0; i < pulseHistory.length; i++) {
    const h = pulseHistory[i];
    const age = i / pulseHistory.length;
    h.life -= 0.02;
    if (h.life <= 0) continue;

    const alpha = age * h.life;
    ctx.beginPath();
    ctx.arc(cx, cy, h.r, 0, Math.PI * 2);
    ctx.strokeStyle = colorForEnergy(theme, bass * alpha);
    ctx.lineWidth = 2 + alpha * 4;
    ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
    ctx.shadowBlur = 12 + alpha * 30;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Filled core that breathes with bass
  const coreR = r * 0.85;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  grad.addColorStop(0, colorForEnergy(theme, Math.min(1, bass * 1.4)));
  grad.addColorStop(1, colorForEnergy(theme, bass * 0.25));
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
  ctx.shadowBlur = 30 + bass * 60;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function average(values) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] || 0;
  return values.length ? sum / values.length : 0;
      }
