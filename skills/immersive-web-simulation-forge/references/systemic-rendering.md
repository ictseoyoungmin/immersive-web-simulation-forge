# Systemic rendering patterns

High visual density comes from coupling, not object count.

## Canonical field

Represent one phenomenon once, then expose it to every consumer. A shared field may contain velocity, temperature, pressure, occupancy, risk, influence, or semantic activity. Consumers can sample it at different rates and scales, but should not invent unrelated copies.

Typical consumers:

- geometry deformation;
- particles and smoke;
- material response;
- lighting and atmosphere;
- audio parameters;
- telemetry and alerts;
- camera feedback;
- navigation or interaction.

Use `kits/systems/shared-field.mjs` for CPU consumers and `kits/three/shared-field-texture.mjs` for GPU consumers.

## Canonical document, run, or data state

The shared source need not be a spatial field.

- a parametric document drives geometry, measurements, validation, variants, and export;
- a simulation run drives motion, plots, diagnostics, comparison, and CSV/JSON output;
- a selected data subset drives marks, details, annotations, and derived statistics;
- an operation state drives controls, progress, audit trace, and recovery affordances.

Keep render objects and formatted labels as consumers. Do not let them become competing sources of truth.

## Scale bands

Near, middle, and far layers have different jobs:

- near: contact, thickness, surface information, interaction;
- middle: active mechanism and causal motion;
- far: silhouette, context, atmosphere, destination.

Do not render the same object vocabulary at every distance. Change representation, density, and update rate.

## Pass architecture

Add passes only when they solve a measured visual or performance problem:

- depth prepass for high overdraw;
- shadow proxy for expensive distant geometry;
- reflection proxy for distorted/low-frequency reflections;
- field bake when many fragments repeatedly evaluate the same expensive function;
- post chain for a deliberate image-space thesis, not as a substitute for material quality.

## Event transformations

Events should perturb the existing system:

1. anticipation changes field gradients or system tension;
2. impact changes topology/silhouette or motion law;
3. propagation reaches multiple consumers at different delays;
4. recovery leaves a persistent state or scar.

This creates a world response instead of a canned effect.

## v0.7 — semantic world systemics

**High world complexity comes from shared spatial semantics, not independent object placement.** A semantic region field should be an authoritative spatial input that multiple consumers interpret: terrain morphology, materials, ecology, route affordance, sound, fog, event response, interaction, and LOD can all change from the same state.

### Global and regional consumers

Separate world-wide consumers from regional realization:

- global consumers preserve bounds, terrain continuity, horizon identity, macro routes, climate/state fields, and world events;
- regional consumers add density, functional layouts, hero objects, local interactions, and inspection detail without rewriting global structure.

### Authoring fidelity bands

Extend near/mid/far beyond visibility:

- `near`: explicit geometry, full material response, collision/contact, interaction, unique detail when justified;
- `mid`: asset families, instancing, simplified collision/material, reduced update rate;
- `far`: silhouette/macro geometry, low-frequency material, impostor/proxy, atmosphere, no irrelevant interaction.

Representation, update rate, density, shadow policy, and interaction policy may all change by band. Use `kits/three/lod-bands.mjs` as a starting point.

### Generated content is a proposal consumer

Generative image/3D systems may consume canonical state and propose appearance or composition. They do not become an authoritative consumer by default. Reconcile proposed content back through explicit geometry, placement, domain, and runtime contracts before committing it to canonical state.
