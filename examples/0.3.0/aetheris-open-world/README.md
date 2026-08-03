# AETHERIS — The Living Sky

A zero-dependency WebGL2 open-world simulation built as a full-window flagship experience.

## Run

Unzip the package and open `index.html` in a modern browser with WebGL2 enabled. No build step or network connection is required.

## Controls

- **F** — switch between autopilot and manual flight
- **WASD / Arrow keys** — fly
- **Q / E** — descend / ascend
- **Shift** — boost
- **Mouse drag** — look around in manual flight
- **Mouse wheel** — adjust cruise speed
- **Click an island / I** — enter deep scan
- **1** — trigger Tempest Bloom
- **2** — trigger Solar Bridges
- **M** — toggle the procedural soundscape
- **Esc** — leave deep scan

Touch layouts include a left movement stick and a right-side look surface.

## What is systemic

A deterministic 64×64 aether field carries wind, charge, and humidity. The same field drives cloud drift, glider steering, vegetation sway, crystal emission, storm topology, camera feedback, event propagation, and telemetry.

## Browser notes

The simulation uses WebGL2 and adaptive internal resolution. Hardware renderers run the full-quality path; software renderers automatically reduce internal resolution. Audio starts only after a user gesture, as required by browsers.
