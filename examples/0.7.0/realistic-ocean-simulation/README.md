# PELAGIC — A Living Ocean

PELAGIC is a full-window, browser-based ocean visual concept. It opens directly at sea level: long swell, wind sea, capillary response, whitecaps, current drift, spray, cloud front, reflected sun, camera heave, sparse life, and a working lighthouse all consume one deterministic `OceanState/v1`.

Generation record: **Immersive Web Simulation Forge v0.7 · GPT-5.6-SOL · XHIGH · Codex CLI 0.147.0**.

The repository exhibition build is available at [`dist/index.html`](dist/index.html).

## Run

Requirements: Node.js 20.19+ or 22.12+ and a browser with WebGL 2.0.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm test
npm run build
npm run preview
```

## Controls

- Drag over the sea to inspect the horizon; scroll to change the cinematic distance.
- Open **Conditions** for Calm Dawn, Trade Wind, Golden Swell, and Storm Front.
- Change wind speed/bearing, swell height, current, and presentation quality.
- Press `G` for a multi-system weather gust, `Space` to pause/resume, `C` for cinematic motion, `Home` to reset, and `Escape` to close the drawer.
- The app honors reduced-motion preference, suspends while hidden, and exposes explicit unsupported/context-loss recovery surfaces.

The complete ambient loop is:

`state arrival → evolution → weather/gust event → persistent foam/light trace → reset/recovery`

## Model and claim level

Claim level: **visual-concept**.

The ocean uses one compact directional spectral cascade. Its components use the deep-water dispersion relationship `ω = √(gk)` and are grouped into long swell, wind sea, and fine surface bands. Analytic derivatives drive normals, steepness, crest foam, and camera/buoy response. The current vector advects visible foam filaments and spray; gust state perturbs surface energy, clouds, glitter, camera response, and the beacon atmosphere, then leaves a decaying trace.

This is not an FFT spectrum, fluid-volume or breaking-wave solver, forecast, navigation aid, or engineering simulation. It has no bathymetry or wave-island interaction. Foam and spray are deterministic perceptual fields rather than transported water mass. The procedural sky is physically motivated but not calibrated radiative transfer.

## Architecture

- `src/ocean-state.ts` owns the serializable SI state, deterministic fixed-step evolution, presets, recovery, limiting cases, and CPU wave samples.
- `src/world.ts` owns the only Three.js renderer and only ocean surface path, plus the atmosphere, lighthouse island, rock/buoy/bird families, spray, camera, quality, lifecycle, and evidence reports.
- `src/shaders.ts` contains the water, sky, spray, and beacon shader programs.
- `src/main.ts` separates raw wall-clock telemetry from fixed simulation time and binds accessible controls, visibility/context handling, and `window.__FORGE__`.
- `tests/ocean-state.test.ts` covers deterministic evolution, bounds/finite values, presets/reset, round trip, zero-wind limit, and current-reversal invariance.

`window.__FORGE__` exposes deterministic preparation, workflow/domain checks, evidence views, scene/spatial/asset/fidelity reports, state round trip, suspend/resume/destroy, and reset recovery.

## Verification

```bash
npm run check
npm test
npm run build
npm run verify:static
npm run verify:browser -- --round=1
```

Browser verification uses a locally installed Playwright Chromium, captures target sizes into `.forge/evidence/`, and records software-renderer wall-frame measurements separately. Those timings are correctness/stress evidence only and never a target-device performance claim.

The compact handoff is in `VALIDATION.json`; workbench plans, audits, logs, and raw captures remain under `.forge/` and are not part of the lean runtime package.
