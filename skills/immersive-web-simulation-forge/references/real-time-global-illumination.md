# Real-time global illumination

Use this contract when indirect illumination materially affects the hero experience or the product claims global illumination, dynamic lighting, realistic bounce light, or equivalent behavior. It extends `lighting-and-radiance.md` without requiring one universal GI algorithm.

## Definition

Global illumination means that radiance reaching the camera includes consequential indirect transport, not only direct lights plus an arbitrary ambient term. The implementation may be baked, probe-based, screen-space, ray traced, cached, or hybrid, but the technique must match scene dynamism and the claim.

## Technique selection by scene contract

### Mostly static geometry and lighting

Baked lightmaps, irradiance volumes, or precomputed transfer are legitimate and often preferred when geometry/light changes are outside the product promise. Declare bake assumptions and invalidation boundaries.

### Static geometry, dynamic lighting

Probe grids, irradiance fields, radiance caches, relighting bases, or selected precomputed/hybrid methods are appropriate when the environment changes but topology does not.

### Dynamic geometry and dynamic lighting

Use a dynamic representation such as ray-traced irradiance fields/DDGI, radiance caches, hardware/software ray tracing, or another technique capable of updating visibility and indirect transport at the required latency. Screen-space contributions may supplement but should not be the sole authoritative GI for off-screen-dependent hero behavior unless the limitation is acceptable.

### Path-traced or near-path-traced runtime

Use `reference-light-transport-and-path-tracing.md`; temporal/spatial reuse and denoising may be required to reach interactive budgets.

## Canonical technique floor

There is no single canonical real-time GI algorithm for every product. The canonical requirement is **transport coverage matched to dynamism**:

- indirect irradiance/radiance representation;
- visibility/occlusion handling;
- update/invalidation policy;
- enough spatial/angular support to avoid dominant leaks and missing bounce structure;
- temporal stability policy;
- declared treatment of diffuse and glossy transport.

For large dynamic scenes, probe-based dynamic diffuse GI (DDGI family) is a strong baseline architecture. For ray-traced high-end paths, reservoir/path resampling approaches such as ReSTIR GI are established options when the stack supports them.

## Silent-substitution defects

Treat these as defects when GI is claimed:

- a constant hemispheric/ambient term labeled `GI`;
- SSAO used as a substitute for indirect illumination;
- baked light surviving geometry/light changes that the product claims are dynamic;
- screen-space GI presented as complete world-space transport without declaring off-screen loss;
- reflection probes or SSR presented as diffuse GI;
- temporal accumulation that ghosts badly under the primary interaction and is hidden only in still screenshots.

## Coupling

Indirect lighting must consume the same scene state as direct lighting:

- geometry and transforms;
- material scattering parameters;
- emissive sources;
- sun/sky/environment state;
- participating-media policy where supported.

If a wall is removed, a door opens, the sun moves, or a fire becomes emissive, the relevant GI representation must update within its declared latency or the limitation must be visible in the product contract.

## Compute placement

Dynamic GI is often a large GPU workload. Prefer GPU execution with explicit budgets for rays, probes, cache entries, update regions, denoising/history, and memory. WebGPU may be required for custom compute/ray-query emulation strategies; WebGL solutions may rely on probes, rasterized captures, screen-space methods, or precomputation.

Do not silently reduce the technique to ambient lighting to preserve universal browser support. Declare the fallback in `compute.fallback`.

## Validation

Use canonical scenes that expose indirect transport:

- colored-wall bounce / Cornell-box-like configuration;
- occluded corner with indirect-only visibility;
- moving blocker or door to reveal invalidation latency;
- moving light/sun test;
- thin-wall/light-leak stress case;
- glossy-vs-diffuse material response as applicable;
- temporal camera-motion review for ghosting, probe popping, disocclusion, and shimmer.

For flagship hardening, compare selected views against a path-traced reference from `reference-light-transport-and-path-tracing.md` using identical camera, geometry, materials, and lights.
