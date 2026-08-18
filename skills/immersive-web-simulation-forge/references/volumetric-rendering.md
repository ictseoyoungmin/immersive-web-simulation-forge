# Volumetric rendering and participating media

Use this contract for fog, smoke, clouds, fire, dust, underwater turbidity, light shafts, or any hero effect where radiance changes while traveling through space. It governs appearance of participating media; state evolution may come from `fire-smoke-and-reactive-flow.md`, weather systems, authored fields, or other domain models.

## Authoritative optical state

Represent, as applicable:

- extinction coefficient `σ_t`;
- absorption `σ_a`;
- scattering `σ_s`;
- emission;
- density or heterogeneous coefficient fields;
- phase function and anisotropy parameter(s);
- world-to-volume mapping and units;
- light/environment state;
- temporal history used for reconstruction.

Maintain physically consistent relationships such as `σ_t = σ_a + σ_s` when using those coefficients directly.

## Governing relationship

The radiative transfer equation describes radiance change through participating media due to extinction, emission, and in-scattering. Along a segment, transmittance should follow Beer-Lambert-style exponential attenuation for homogeneous coefficients and its path integral for heterogeneous media.

A phase function controls angular scattering; Henyey-Greenstein is a common compact model for anisotropic scattering when its assumptions are adequate.

## Canonical real-time technique

For a hero real-time volume, the canonical representation is a 3D density/optical field sampled by ray marching or an equivalent volumetric integration method, with light attenuation and scattering coupled to the same field. The exact implementation may use:

- froxel/voxel volumes;
- analytic density primitives;
- sparse volumes;
- clipmaps;
- shadow/transmittance volumes;
- temporal reprojection and blue-noise/jittered sampling.

These are accelerations/representations, not permission to replace optical coupling with unrelated alpha noise.

## Legitimate approximations

Depth fog, height fog, layered sprites, or billboard smoke are legitimate for background/stylized effects when the medium is not a hero physical claim. They become silent substitution when the product claims volumetric simulation/light transport, when the camera can inspect the volume, or when light-medium interaction is central.

A low-step ray march may be valid if reconstruction is stable and the internal resolution/step budget is declared. Do not use heavy blur to conceal under-sampling that destroys the defining volume structure.

## Fire and smoke coupling

When driven by `fire-smoke-and-reactive-flow.md`:

- soot/smoke/product density should influence extinction/scattering;
- temperature/reaction state should influence emission through a declared color/emission model;
- the velocity field should advect the same density used for rendering;
- embers and heat distortion should be secondary consumers rather than unrelated overlays.

When fire illuminates nearby surfaces, route that emissive state into the lighting/GI system according to the selected approximation.

## Clouds and atmosphere

Clouds may use procedural density authoring, weather maps, or simulation-driven fields. If the product claims atmospheric/cloud physics, that domain state requires its own model; this reference only governs optical transport through the resulting medium.

For broad atmospheric scattering, a specialized sky/atmosphere model may be more efficient than generic ray marching. Declare whether the product uses a physical atmosphere model, precomputed LUTs, or an artistic sky.

## Compute placement

Dense volumetric integration is GPU-heavy. Prefer WebGPU/WebGL fragment or compute paths according to representation. Separate simulation cadence from volumetric integration cadence. Record:

- volume dimensions/world extent;
- step count or adaptive step policy;
- shadow/transmittance sample budget;
- temporal reconstruction policy;
- history invalidation on camera/state changes;
- internal render resolution;
- fallback.

## Validation

Use:

- homogeneous-medium transmittance test against the analytic exponential;
- vacuum/zero-density limiting case;
- multiplicative transmittance over concatenated segments;
- phase-function directional sanity checks;
- light-shaft/occluder canonical scene;
- moving-camera temporal review for ghosting and boiling;
- density change test proving extinction/scattering causality;
- fire/smoke coupling case when applicable;
- path-traced volumetric reference for at least one flagship view when feasible.

A fog-colored fullscreen overlay is not evidence of volumetric transport.
