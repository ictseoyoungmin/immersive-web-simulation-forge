# Wind and atmospheric flow fidelity

Use this contract when wind is a consequential cause rather than a purely decorative animation. It extends `physics-simulation.md` and `systemic-rendering.md` by defining an authoritative wind-field floor and cross-system coupling rules.

## Core principle: one wind state, many consumers

Do not create independent `windAngle`, vegetation sway sine waves, smoke drift noise, ocean direction, cloth force, and audio gust parameters when the product claims a shared weather system. Represent wind once, then expose it to consumers at appropriate spatial and temporal scales.

Typical consumers include:

- ocean spectra and surface stress;
- vegetation deformation;
- smoke, fire, fog, dust, rain, snow, and embers;
- cloth, flags, debris, and particles;
- aerodynamic gameplay or engineering quantities;
- audio intensity and direction;
- telemetry, weather UI, and event logic.

Record velocity, units, coordinate frame, sampling domain, update cadence, and forcing in `domain.authoritative_model`.

## Fidelity tiers

### Tier A — procedural divergence-free ambient field

A curl-noise or otherwise divergence-free procedural velocity field is legitimate for ambient/stylized scenes where the user is not asked to infer aerodynamic truth. It should still be spatially coherent, seeded/replayable when needed, and shared across consumers.

### Tier B — obstacle-aware incompressible flow

For hero wind around structures, terrain, or dense vegetation, use an Eulerian velocity field with advection and pressure projection, plus declared obstacle/boundary handling. Semi-Lagrangian advection is acceptable for interactive visual fidelity when numerical diffusion is understood and compensated only in declared ways.

### Tier C — atmospheric / engineering flow

For products making quantitative atmospheric or aerodynamic claims, select an appropriate CFD or reduced-order model and validate it against domain benchmarks. Do not infer engineering validity from a visually plausible real-time smoke solver.

## Governing relationship

For an incompressible visual flow, velocity should evolve from a momentum model and satisfy a divergence constraint after pressure projection. External forces may include user-defined forcing, buoyancy, terrain/obstacle response, or weather inputs.

A procedural field may skip the full momentum solve only when the claim level permits it and the approximation is explicit.

## Gusts, shifts, and fronts

A gust is not a global scalar multiplied into every animation in the same frame. Model it as a state change with propagation, duration, and recovery. Consumers may respond with different transfer functions:

- foliage: fast bend, damped recovery;
- ocean spectrum: slower energy/directional evolution;
- smoke: immediate advection plus turbulent deformation;
- audio: near-immediate perceptual response;
- particles: drag-dependent response.

This lag structure is desirable because it makes the world read as causally connected instead of synchronized by one animation clock.

## Coupling and authority

Use the canonical field pattern from `systemic-rendering.md`. CPU and GPU consumers may use different representations or sample rates, but they must derive from the same authoritative wind state or a documented resampling thereof.

Do not let a renderer-owned shader uniform become the only source of truth if simulation, telemetry, and gameplay also depend on wind.

## Compute placement

Small procedural fields may live in shaders. Obstacle-aware grids typically belong in WebGPU compute or a Worker/WASM path when CPU-based. Record grid resolution, update rate, boundary policy, and fallback. Prefer decoupling solver cadence from render cadence and interpolate or extrapolate only within a declared stability envelope.

## Validation

At minimum test:

- uniform-flow limiting case;
- divergence or mass-balance diagnostic for incompressible fields;
- obstacle response in a simple canonical geometry;
- seeded repeatability;
- a gust/wind-shift scenario observed simultaneously in at least three consumers;
- temporal review for phase-locked vegetation, detached smoke, discontinuities, or consumer disagreement.

For engineering claims, add accepted CFD/atmospheric benchmark evidence and quantitative tolerances.
