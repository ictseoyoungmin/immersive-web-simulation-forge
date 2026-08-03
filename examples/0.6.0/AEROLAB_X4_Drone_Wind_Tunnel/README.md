# AEROLAB X4 — 3D Drone Physics Engine & Wind Tunnel

A self-contained WebGL2 scientific simulation built with the Immersive Web Simulation Forge architecture. It combines a fixed-step quadrotor solver, a canonical 3D wind field, pressure-coded flow visualization, authoring controls, payload picking, telemetry, history, adaptive LOD, and browser verification without external runtime dependencies.

## Run

```bash
node scripts/serve.mjs
# open http://127.0.0.1:4173
```

Windows users can double-click `run-local.bat`; macOS/Linux users can run `./run-local.sh`. Opening `index.html` directly with a `file://` URL is not supported because the application uses ES modules.

## Controls

- Drag in the viewport: orbit camera
- Mouse wheel: zoom
- Double-click: restore inspection camera
- Click an amber underside hardpoint: attach or remove a 0.15 kg payload
- `Space`: pause/resume
- `R`: reset rigid-body state
- `Z` / `Shift+Z`: undo / redo parameter changes
- `1`, `2`, `3`: Hover PID, Manual Thrust, Wind Reaction Test

## Simulation pipeline

```text
ParameterStore + HistoryStore
          │
          ├── WindField.sample(position, time)
          │       ├── rigid-body aerodynamics
          │       ├── pressure-coded particles/vector grid
          │       ├── tunnel lighting and local probe
          │       └── max-wind verification
          │
          └── ComputeTaskRunner @ 120 Hz
                  ├── motor first-order response
                  ├── Fi = kt · ωi² and Qi = kd · ωi²
                  ├── thrust/reaction/gyroscopic torques
                  ├── PID or open-loop mixer
                  ├── drag/lift/center-of-pressure torque
                  └── semi-implicit translation + quaternion rotation
                              │
                              ├── interpolated WebGL2 scene
                              ├── Canvas 2D flow and plots
                              └── 30 Hz scientific HUD telemetry
```

Primary modules:

- `kits/compute/`: rotor, PID, wind, aerodynamic, rigid-body, and task-runner modules
- `kits/three/`: raw WebGL2 scene, post chain, adaptive LOD, and payload picking
- `kits/canvas/`: flow-field and telemetry renderers
- `kits/authoring/`: validated parameter and undo/redo/snapshot stores
- `kits/analysis/`: bounded real-time measurement series
- `kits/runtime/`: fixed-step frame loop and host-safe lifecycle
- `references/physics-simulation.md`: equations, coordinate conventions, and model scope

## Verification

```bash
npm run verify
npm run verify:browser
```

`npm run verify` checks module syntax, required Forge structure, the explicit rotor laws, the 120 Hz contract, wind-vector geometry, deterministic turbulence, calm hover, payload inertia propagation, and an 8-second 30 m/s turbulent-wind case.

`browser_verify.mjs` launches Chromium through the Chrome DevTools Protocol without Playwright or other test packages. It checks initialization, console/page errors, parameter clamping, live solver status, the maximum-wind case, and warns when measured average FPS falls below 45. It attempts the normal GPU path first and marks software-renderer results as measurement-limited. Representative capture is locked to the Ultra visual tier after the adaptive performance sample.

## Model scope

This is an engineering-grade interactive approximation, not certified CFD, flight-control, or safety software. It implements per-rotor thrust and reaction torque, gyroscopic coupling, rigid-body integration, PID stabilization, aerodynamic drag/lift, deterministic 3D turbulence, payload inertia changes, fixed-step execution, and numerical safety guards. The aerodynamic model is lumped rather than Navier–Stokes.
