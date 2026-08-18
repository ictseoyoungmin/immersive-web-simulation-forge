# Lighting and radiance contract

Use this reference whenever lighting materially defines shape, material identity, atmosphere, or a physically based claim. It is the routing document for surface scattering, global illumination, reference light transport, and participating media.

## Purpose

Lighting is not merely a post effect. Treat radiance and the state that determines it as a consequential consumer of geometry, materials, emitters, environment, and participating media.

This contract does not require every real-time product to path trace. It requires the chosen approximation to preserve the light-transport relationships that matter to the product's claim and hero view.

## Authoritative lighting state

Record as applicable:

- light type, position/direction, angular extent, spectrum/color, and intensity units or declared normalized convention;
- environment map / sky / sun state;
- exposure and camera response policy;
- material scattering parameters and texture scale;
- participating-media coefficients and density fields;
- indirect-light representation and update policy;
- shadow/visibility representation;
- temporal history used by denoisers, GI, or reconstruction.

Do not let tone mapping, bloom, color grading, or arbitrary ambient terms become substitute sources of illumination.

## Routing

Read:

- `surface-scattering-and-pbr-materials.md` for BRDF/BSDF and physically based surface response;
- `real-time-global-illumination.md` when indirect illumination or dynamic light transport is consequential;
- `reference-light-transport-and-path-tracing.md` when an oracle/reference renderer or path-traced runtime is appropriate;
- `volumetric-rendering.md` for fog, smoke, clouds, fire, shafts, and other participating media.

## Surface light transport floor

At a minimum, physically based surface lighting should preserve:

- visibility/shadowing;
- distance/angular behavior appropriate to the light model;
- a declared BRDF/BSDF with Fresnel and energy accounting;
- environment/direct lighting consistent with the same material parameters;
- exposure/tone mapping applied after radiance estimation rather than used to invent missing illumination.

Rasterization, ray tracing, lightmaps, probes, screen-space methods, and hybrids are all valid representations when their limitations are explicit.

## Volumetric light transport floor

If the medium is consequential, couple density and optical coefficients to extinction, transmittance, scattering, and emission. A depth-color lerp is acceptable as artistic fog only when it is not described as volumetric light transport.

## Dynamic consistency

Lighting-dependent systems must respond to consequential world changes. Examples:

- remove a wall → visibility and affected indirect light update or the static limitation is disclosed;
- day → night → direct, environment, exposure policy, and dynamic/baked GI state remain coherent;
- fire intensifies → emissive volume and nearby illumination respond from the same fire state;
- fog density rises → transmittance and scattering change, not only scene saturation.

## Reference/oracle policy

A path-traced or otherwise high-quality reference does not need to be the shipping renderer. For flagship material or GI hardening, use a reference transport solution when feasible to reveal light leaks, energy errors, missing bounce color, roughness/Fresnel defects, or volumetric decoupling.

Store the reference scene/camera/light/material state so the comparison is reproducible.

## Validation

Review both numerical relationships and perception:

- inverse-square or declared light attenuation behavior where applicable;
- energy conservation / material plausibility checks;
- white-furnace or equivalent material tests for scattering models;
- shadow/visibility stability;
- reference comparison for selected canonical scenes;
- temporal response to moving lights, geometry, and environment changes;
- target-size review before and after tone mapping.

A pleasing grade cannot certify invalid lighting.
