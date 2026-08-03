# Runtime measurement integrity

Use this reference whenever performance, adaptive resolution, fidelity, scale, entity counts, or other quantitative claims appear in the product or final response.

## Contents

- Three clocks
- Wall-clock frame measurement
- Representative states
- Compute and workflow latency
- Adaptive quality input
- Renderer and hardware claims
- Footprint dimensions
- Claim audit

## Three clocks

Keep these separate:

1. **wall clock** — elapsed browser time between animation frames;
2. **simulation clock** — fixed or clamped time consumed by physics/state updates;
3. **presentation clock** — animation/interpolation time rendered to the user.

Simulation delta is often clamped to prevent instability. It therefore cannot substantiate FPS. At a real 1 FPS, a loop with `maxDelta = 0.1` may report an apparent minimum of 10 FPS when it inverts the clamped delta.

Feed raw wall-frame duration to performance telemetry and adaptive quality. Feed fixed/clamped delta to simulation.

## Wall-clock frame measurement

Measure from successive `requestAnimationFrame` timestamps or an external browser trace.

For each sample record:

- warmup duration;
- sample duration and frame count;
- CSS, output, and scene sizes;
- view/state/scenario label;
- median and p95 frame time;
- derived average FPS;
- renderer string and software-renderer classification;
- whether adaptation was enabled.

Use at least two samples for a material claim and three for showcase/flagship work when practical. Application telemetry is useful only after cross-checking it against an external wall-clock sample.

Do not measure while taking a screenshot, compiling shaders, loading assets, opening developer tools, or transitioning into capture mode unless that is the scenario under test.

## Representative states

Performance varies by view and world state. Test at least:

- the default view;
- a representative traversal/manipulation view;
- the visually or computationally heaviest transformation/state.

Record camera pose or a deterministic scenario name. Do not choose a sky-only or empty view as representative performance evidence.

## Compute and workflow latency

Frame rate does not describe solver, import, save, export, or server-job performance. Measure these separately with wall time and representative payloads:

- time to first usable result;
- complete job p50/p95 latency;
- cancellation acknowledgement latency;
- main-thread blocking or long-task duration;
- peak/steady memory when practical;
- payload size, transfer time, and serialization cost;
- save/export completion and round-trip time.

Record input size, solver/settings version, execution boundary, cache state, and whether the result was warm or cold. Do not hide a blocked interface behind a high render FPS.

## Adaptive quality input

Adaptive quality should use raw wall time and time-based hysteresis.

Prefer:

- lowering after sustained slow wall time for approximately 1–2 seconds;
- raising only after several stable seconds;
- bounded step changes;
- separate floors and ceilings per preset;
- capture mode that disables adaptation without changing simulation behavior.

Frame-count hysteresis responds too slowly when FPS is already extremely low. A rule that waits 75 slow frames can wait more than a minute at 1 FPS.

## Renderer and hardware claims

SwiftShader, llvmpipe, Mesa offscreen, and similar software renderers are useful for:

- correctness;
- failure detection;
- relative stress investigation under a declared environment;
- representative screenshot generation when time allows.

They cannot substantiate target-GPU FPS. If only software evidence exists, state that performance is measurement-limited. Do not translate it into a consumer-device claim.

## Footprint dimensions

Measure separately:

- compressed transfer/package bytes;
- uncompressed runtime bytes;
- JavaScript parse/compile cost;
- CPU update cost;
- GPU geometry/draw cost;
- pixel and post-processing cost;
- GPU/CPU memory.

A small raw-WebGL file can be pixel-bound through expensive full-screen shaders. A larger engine bundle can render faster through instancing, culling, and mature resource management. File size is not runtime performance.

## Claim audit

Represent each user-visible quantitative claim as:

```json
{
  "label": "explorable boundary area",
  "displayed_value": 0.16,
  "unit": "km2",
  "basis": "400 m × 400 m bounding box",
  "source": "WORLD_SIZE",
  "verified": true,
  "display_policy": "displayed"
}
```

For an unverified planning claim use `"display_policy": "hidden-until-verified"`; implemented and packaged products must verify or remove it. Distinguish bounding, land, authored, and traversable area. Derive cycle time, entity count, distances, and resolution from the same constants/state used by the runtime where possible. Flag a claim when its basis is absent, stale, or materially different from implementation.
