# AETHERRA — The Breathing Expanse

A living, first-person open world built for the browser. The 2.4 km crater-island is one coupled system: a deterministic wind field drives grass, pollen, cloud drift, water, field ribbons, audio, lighting, telemetry, and the behavior of ancient mechanisms.

## Launch

Open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. Everything required by the world is bundled locally; there are no runtime downloads.

If a browser restricts pointer lock from a local file, dragging on the world uses the same look direction and sensitivity. You can also serve the folder locally:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

| Input | Action |
| --- | --- |
| Mouse / drag | Look |
| `W A S D` | Move |
| `Shift` | Sprint |
| `Space` | Jump / rise while swimming |
| `C` or `Ctrl` | Crouch / descend while gliding |
| `E` | Examine a nearby echo |
| `H` | Toggle observation glide |
| `1` | Release or recall the tide |
| `2` | Call or release the Crown Eclipse |
| `P` | Cinematic interface |
| `J` | Field journal |

## World systems

- Grounded walking with acceleration, stamina, slope checks, jumping, wading, swimming, structure collision, and terrain contact.
- Optional observation glide; walking is the default traversal mode.
- `Tidebreak` lowers the basin, raises an engraved causeway, reconfigures navigation, changes shoreline motion, and exposes a persistent wet scar.
- `Crown Eclipse` moves the fractured moon across the sun, pivots the wind, opens luminous organisms, activates path marks, changes materials, atmosphere, and procedural sound.
- Seven discoverable echoes with close inspection, hidden mechanisms, causal field data, and a native-resolution field journal.
- Presentation, balanced, and performance fidelity presets with adaptive hysteresis; representative capture locks the world at native resolution.
- Authored 24-grid SVG interface icons, minimap, compass, field oscilloscope, inversion settings, reduced motion, procedural audio, and touch controls.

## Rendering notes

The world uses a bundled Three.js/WebGL renderer. Native DOM/SVG/canvas instrumentation stays at output resolution while the expensive scene pass can adapt from 0.75 to 1.0 effective scale. The presentation preset disables adaptation and renders near native resolution.
