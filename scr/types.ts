export type VizMode = "spire" | "orbit" | "halo";
export type SourceKind = "idle" | "mic" | "file";

export type RGB = readonly [number, number, number];

export type Theme = {
  id: string;
  name: string;
  low: RGB;   // color at low energy
  mid: RGB;   // color at mid energy
  high: RGB;  // color at peak energy
  glow: RGB;  // used for blur/glow accents
  background: string;
};

export const BAR_COUNT = 96;
