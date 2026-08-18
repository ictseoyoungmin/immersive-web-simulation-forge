# Fire, smoke, and reactive-flow fidelity

Use this contract when fire or smoke is a hero system, a causal simulation, or a material input to lighting/visibility rather than a decorative particle effect. It extends `physics-simulation.md`; rendering of the resulting medium is governed separately by `volumetric-rendering.md`.

## Separate state evolution from appearance

Fire/smoke simulation produces physical or reduced-order fields such as velocity, pressure, temperature, fuel, oxidizer/product proxies, soot/smoke density, and heat release. Rendering consumes those fields.

Do not treat `orange emissive noise + alpha smoke sprites` as a simulation merely because it resembles flame. Conversely, a valid fluid solve does not guarantee convincing radiance; both ledgers must pass their own evidence.

## Canonical interactive model

For flagship visual simulation, the canonical floor is an Eulerian incompressible flow with pressure projection and advected scalar fields, augmented by combustion/reaction source terms and buoyancy. A practical authoritative state may include:

- `u(x,t)` velocity;
- pressure or the projected velocity constraint;
- temperature;
- fuel/reactant fraction;
- smoke/soot/product density;
- obstacle/boundary state;
- external wind/forcing.

Semi-Lagrangian advection is legitimate for interactive work; MacCormack/BFECC or other higher-order corrections may be used when bounded and stable. Vorticity confinement may restore visually important rotational detail lost to numerical diffusion, but it must be identified as a modeling/visual correction rather than a new physical law.

## Combustion coupling

The reaction model may be simplified, but it must connect the state causally:

`fuel + reaction conditions → heat release + products/soot → temperature/buoyancy → flow → advection`

A flame color animation that ignores temperature and fuel state is a representation shortcut, not a coupled combustion model.

For visual-concept work, a reduced reaction model is acceptable. For quantitative combustion claims, use domain-appropriate chemistry/turbulence models and external validation; this reference is not an engineering combustion certification.

## Wind and obstacles

Read `wind-and-atmospheric-flow.md` when weather drives the effect. Wind should enter as authoritative forcing or boundary state, not as an unrelated shader drift. Obstacles must affect velocity/pressure and therefore downstream flame/smoke transport when the user can observe the interaction.

## Secondary phenomena

Embers, sparks, ash, and heat haze are secondary consumers. Their emission rate, launch region, advection, lifetime, and visibility should derive from combustion/flow state or a declared event model. Do not use dense particles to hide a weak primary flame field.

Heat distortion is a rendering approximation and should be spatially tied to hot regions. Smoke extinction and flame emission belong to `volumetric-rendering.md`.

## Compute placement

3D grids are expensive parallel kernels. WebGPU compute is the preferred browser path for flagship volumes; lower-dimensional or sparse variants may run in Worker/WASM. Record:

- grid/voxel dimensions and world scale;
- solver cadence and render interpolation;
- advection and projection method;
- pressure iteration budget/convergence policy;
- boundary conditions;
- fallback and failure states.

Do not silently lower a 3D fire claim to layered 2D noise solely to fit WebGL if WebGPU is an acceptable declared requirement.

## Validation

Use:

- divergence/projection diagnostics;
- scalar boundedness and NaN/Inf checks;
- deterministic replay or recorded seeds;
- simple buoyant plume and cross-flow cases;
- obstacle interaction cases;
- mass/energy trend checks appropriate to the reduced model;
- a wind-change scenario proving shared-field coupling;
- target-size temporal inspection of billowing, attachment, repetition, and boundary artifacts.

For decision-support or engineering claims, add external benchmark cases and tolerances. Never infer combustion accuracy from visual resemblance alone.
