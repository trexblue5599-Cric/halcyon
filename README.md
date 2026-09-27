# Halcyon — audio visualizer

A black-field music visualizer. Use your microphone or drop a track — animated
bars, orbits, and halos react to the sound in real time.

Author: Trex-blue (trexblueofficial@gmail.com)

## Running

```bash
npm install
npm run dev
```

Open the printed localhost URL (default http://localhost:5173).

## Controls

- Space — play/pause
- F — fullscreen
- 1 / 2 / 3 — switch visual mode (spire / orbit / halo)
- Esc — stop current source
- Drag and drop an audio file anywhere on the screen, or use the Upload button

## Project layout

- `src/types.ts` — shared types
- `src/themes.ts` — color palettes
- `src/spectrum.ts` — FFT → bar mapping, smoothing, peak decay, idle animation
- `src/audioEngine.ts` — Web Audio: mic input, file playback, analyser
- `src/draw.ts` — canvas renderers (spire / orbit / halo)
- `src/usePersistedPrefs.ts` — saves mode/theme/sensitivity/volume to localStorage
- `src/formatTime.ts` — mm:ss helper
- `src/Hud.tsx` — controls: transport, seek bar, mic/upload, selectors, sliders
- `src/VisualizerApp.tsx` — wires everything together (render loop, keyboard
  shortcuts, fullscreen, drag-and-drop)
- `src/main.tsx` / `index.html` — app entry point

## Notes

- Starting the mic or a file happens inside a button click, since browsers
  require a user gesture before granting audio access.
- Preferences persist across reloads; playback state does not (by design).
- No backend, no accounts, no external services — everything runs client-side.
