export const THEMES = [
  { id: "azure", name: "Azure", low: [10, 30, 55], mid: [80, 160, 255], high: [210, 235, 255], glow: [120, 190, 255], background: "#05060a" },
  { id: "ember", name: "Ember", low: [60, 16, 10], mid: [255, 96, 55], high: [255, 210, 180], glow: [255, 120, 70], background: "#0a0503" },
  { id: "verdant", name: "Verdant", low: [8, 36, 22], mid: [70, 200, 130], high: [210, 255, 225], glow: [100, 230, 160], background: "#040a06" },
  { id: "mono", name: "Mono", low: [30, 30, 34], mid: [190, 190, 198], high: [255, 255, 255], glow: [220, 220, 226], background: "#050505" },
];

export function lerpColor(a, b, t) {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * c);
  const g = Math.round(a[1] + (b[1] - a[1]) * c);
  const bl = Math.round(a[2] + (b[2] - a[2]) * c);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function colorForEnergy(theme, energy) {
  const e = Math.max(0, Math.min(1, energy));
  if (e < 0.5) return lerpColor(theme.low, theme.mid, e / 0.5);
  return lerpColor(theme.mid, theme.high, (e - 0.5) / 0.5);
}
