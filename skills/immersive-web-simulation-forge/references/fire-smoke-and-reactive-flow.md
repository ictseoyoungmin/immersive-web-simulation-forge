# Fire, smoke, and reactive-flow fidelity

Use this contract when fire or smoke is a hero visual, a causal simulation, or a material input to lighting/visibility. It extends `physics-simulation.md`; rendering of the resulting medium is governed separately by `volumetric-rendering.md`.

## Choose the intent tier first

Do not force every prominent flame through the same CFD stack.

### Tier A — artistic / cinematic hero fire

Use authored, procedural, particle, SDF, or reduced field techniques when the product primarily promises a convincing visual and does not claim a fluid/combustion simulation. Keep major consumers causally coherent where the user can compare them: flame motion, smoke drift, embers, heat distortion, and lighting should not obviously contradict the same wind/event state.

Do not label this tier as physically simulated combustion unless the stronger model exists.

### Tier B — coupled visual fire/smoke simulation

When the product claims a real flow-driven fire/smoke simulation or obstacle/wind response is a hero behavior, a strong canonical baseline is an Eulerian incompressible velocity field with pressure projection, advected scalar fields, reaction/source terms, and buoyancy. Alternatives are allowed when disclosed and capable of preserving the claimed behavior.

A practical state may include velocity, pressure/projection state, temperature, fuel/reactant proxy, smoke/soot/product density, obstacle state, and external wind/forcing.

### Tier C — quantitative reactive flow

Decision-support/engineering combustion requires domain-appropriate chemistry/turbulence/transport models and external benchmark validation. The browser visual model in this reference is not an engineering combustion certification.

## Separate state evolution from appearance

Simulation/reduced-order state produces fields such as velocity, temperature, fuel, soot, and heat release. Rendering consumes those fields.

`orange emissive noise + unrelated alpha smoke` is not a coupled simulation merely because it resembles flame. Conversely, a valid flow solve does not guarantee convincing radiance: domain validity and perceptual/rendering evidence must each pass on their own terms.

## Combustion coupling for Tier B/C

The reaction model may be simplified, but it should connect state causally:

`fuel + reaction conditions → heat/products → temperature/buoyancy → flow → advection`

Vorticity confinement or higher-order advection corrections may be used as declared numerical/visual corrections; do not present them as new physical laws.

## Wind and obstacles

Read `wind-and-atmospheric-flow.md` when weather drives the effect. For Tier B/C, wind should enter as authoritative forcing/boundary state, and visible obstacles should affect downstream transport when that interaction is part of the promise.

Tier A may use cheaper collision/advection approximations, but should not claim obstacle-resolved flow if smoke simply passes through walls.

## Secondary phenomena

Embers, sparks, ash, and heat haze are secondary consumers. Derive their emission/launch/advection from the primary state or a declared event model when causal coupling is visible. Do not use dense particles to hide a weak primary effect.

Smoke extinction and flame emission belong to `volumetric-rendering.md`. Nearby surface illumination belongs to the selected lighting/GI contract.

## Compute placement

Tier A may stay in shaders or lightweight CPU logic. Tier B 3D grids are expensive and commonly belong in WebGPU compute or a Worker/WASM reduced path. Record grid/world dimensions, cadence, advection/projection policy, pressure budget, boundary conditions, and fallback.

Do not silently downgrade a claimed 3D flow simulation to layered 2D noise solely to preserve universal browser support; declare the fallback or requirement.

## Validation

Apply tests by tier.

Tier A:
- target-size temporal inspection for repetition, detached flame/smoke, and contradictory wind response;
- deterministic/replayable hero scenarios where regression matters.

Tier B:
- divergence/projection diagnostics;
- scalar boundedness and NaN/Inf checks;
- buoyant plume/cross-flow cases;
- obstacle interaction;
- wind-change coupling;
- appropriate mass/energy trend checks for the reduced model.

Tier C adds accepted external benchmarks and quantitative tolerances.
