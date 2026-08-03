# AETHERWILD — The Living Meridian

A full-window procedural open-world experience rendered with raw WebGL 2. Fly across an infinite living landscape, inspect hidden resonance strata, and trigger transformations that alter the world's geometry, materials, atmosphere, movement, telemetry, particles, and sound.

## Run

The project has no build step and no network dependencies.

- Open `index.html` directly in a modern browser, or
- Serve the folder locally: `python -m http.server 8000`, then open `http://localhost:8000`.

WebGL 2 is required. Desktop Chrome, Edge, Firefox, or Safari is recommended.

## Controls

- `W A S D` — horizontal movement
- `Space` / `C` — ascend / descend
- `Shift` — accelerate
- Mouse — look; click the world to restore pointer lock
- `Q` — resonance scan
- `E` — symbiotic bloom transformation
- `R` — ion storm transformation
- `1` / `2` / `3` — performance / balanced / presentation rendering
- `M` — mute or restore procedural ambience

## Rendering contract

- Presentation mode: 1.0 effective CSS-pixel scene ratio
- Balanced mode: 0.90 default with hysteretic adaptation from 0.72 to 1.0
- Performance mode: 0.72 fixed ratio
- HUD, text, SVG icons, reticle, and particle overlay remain in native output space
- `?forgeCapture=1` selects a deterministic presentation state and disables adaptation

## Architecture

`src/app.js` contains the WebGL 2 renderer, deterministic procedural world, shared resonance state, input, adaptive resolution, procedural audio, and the `window.__FORGE__` capture/report API. `src/style.css` contains the native-resolution HUD and responsive layouts.
