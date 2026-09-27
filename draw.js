import { colorForEnergy } from "./themes.js";

export function drawVisualizer(frame) {
  const { ctx, width, height, theme } = frame;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  if (frame.mode === "spire") drawSpire(frame);
  else if (frame.mode === "orbit") drawOrbit(frame);
  else if (frame.mode === "halo") drawHalo(frame);
}

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

function drawOrbit(frame) {
  const { ctx, width, height, bars, theme } = frame;
  const n = bars.length;
  const cx = width / 2;
  const cy = height / 2;
  const innerRadius = Math.min(width, height) * 0.18;
  const maxExtra = Math.min(width, height) * 0.28;

  for (let i = 0; i < n; i++) {
    const value = bars[i] || 0;
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const barLength = innerRadius + value * maxExtra;
    const x1 = cx + Math.cos(angle) * innerRadius;
    const y1 = cy + Math.sin(angle) * innerRadius;
    const x2 = cx + Math.cos(angle) * barLength;
    const y2 = cy + Math.sin(angle) * barLength;
    ctx.strokeStyle = colorForEnergy(theme, value);
    ctx.lineWidth = Math.max(2, (Math.PI * 2 * innerRadius) / n - 2);
    ctx.lineCap = "round";
    ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
    ctx.shadowBlur = 6 + value * 14;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  const avg = average(bars);
  ctx.fillStyle = colorForEnergy(theme, avg);
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawHalo(frame) {
  const { ctx, width, height, bars, theme } = frame;
  const n = bars.length;
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.26;
  const maxExtra = Math.min(width, height) * 0.22;

  const points = [];
  for (let i = 0; i <= n; i++) {
    const value = bars[i % n] || 0;
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = baseRadius + value * maxExtra;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }

  ctx.beginPath();
  ctx.moveTo((points[0].x + points[points.length - 2].x) / 2, (points[0].y + points[points.length - 2].y) / 2);
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }
  ctx.closePath();

  const avg = average(bars);
  ctx.fillStyle = colorForEnergy(theme, avg * 0.6);
  ctx.strokeStyle = colorForEnergy(theme, avg);
  ctx.lineWidth = 2;
  ctx.shadowColor = `rgb(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]})`;
  ctx.shadowBlur = 20 + avg * 30;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function average(values) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] || 0;
  return values.length ? sum / values.length : 0;
}
