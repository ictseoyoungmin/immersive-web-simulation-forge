# Reference light transport and path tracing

Use this contract when a high-quality light-transport oracle is needed, when the shipping renderer itself uses path tracing, or when Monte Carlo transport is part of the product claim. It is primarily an oracle/reference contract for ordinary real-time products, not a requirement that every Forge experience path trace at runtime.

## Rendering equation and estimator

Path tracing numerically estimates the rendering/light-transport equation by sampling paths through scene geometry, materials, emitters, and participating media. Monte Carlo integration is appropriate because rendering integrals are high-dimensional and may contain visibility discontinuities.

For an estimator, record:

- sampled quantity and probability density;
- sample count / samples per pixel or work unit;
- random/sobol sequence and seed policy;
- termination policy;
- direct-light sampling policy;
- BSDF/phase-function sampling policy;
- accumulation/convergence criteria.

## Monte Carlo, importance sampling, and MIS

Do not make `monte-carlo-integration.md` a separate required reference in the first revision; keep the sampling theory here so the reference set remains product-oriented.

The key implementation rules are:

- samples must be weighted by the estimator and PDF that generated them;
- importance sampling should place work where the integrand contributes most;
- next-event estimation/light sampling should be used when it materially reduces variance;
- multiple importance sampling (MIS) should combine competing strategies such as light and BSDF sampling when neither dominates across the domain;
- delta/specular events require special handling rather than naïve evaluation with a continuous PDF.

## Path construction

A practical reference integrator should support, as needed:

- camera rays and intersection acceleration;
- surface BSDF sampling/evaluation;
- direct-light / next-event estimation;
- emissive surfaces and environment lighting;
- multiple bounces;
- Russian roulette after an appropriate minimum depth;
- participating media when the comparison scene uses them;
- spectral or RGB transport with a declared color pipeline.

## Variance reduction and real-time extensions

Denoising, temporal accumulation, spatial reuse, reservoir resampling, radiance caching, and adaptive sampling may accelerate convergence. They do not change the requirement to identify what quantity is being estimated and what bias/variance tradeoff they introduce.

For real-time ray-traced GI, ReSTIR-family resampling is an established high-end option. When a denoiser or temporal reuse is load-bearing, validate moving-camera and disocclusion states rather than only converged stills.

## Reference-render use

For a raster/probe shipping renderer, create reproducible reference views:

1. freeze camera, geometry, materials, lights, environment, and exposure;
2. render a sufficiently converged path-traced image or other trusted reference;
3. compare the shipping approximation at the same output transform;
4. classify errors as transport, material, visibility, volumetric, temporal, or tone-mapping defects;
5. repair the correct layer instead of grading away the discrepancy.

The reference does not need to match pixel-for-pixel if the runtime intentionally approximates transport. It should reveal whether the missing behavior is acceptable and declared.

## Compute placement

A custom browser path tracer belongs on WebGPU compute or another GPU path when interactive. CPU reference rendering may run in Worker/WASM or offline tooling. Record accumulation memory, sample budget, cancellation, progress, deterministic seed, and convergence state.

## Validation

Use:

- estimator sanity checks on analytically simple scenes;
- sample-count convergence and variance tracking;
- seed/replay controls;
- energy/material test scenes from `surface-scattering-and-pbr-materials.md`;
- direct-vs-indirect decomposition where useful;
- reference scene regression images;
- motion/disocclusion tests for denoised or temporally reused runtime tracing.

Do not label a noisy one-sample image `physically correct` merely because the underlying estimator is unbiased; usable fidelity also depends on variance and reconstruction.
