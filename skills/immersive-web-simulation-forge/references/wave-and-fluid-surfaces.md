# Wave and fluid surface fidelity

Use this contract when the hero visualization is water or a free surface whose motion is meant to read as physically simulated. It extends `references/physics-simulation.md`; it does not create a new ledger.

## Applicability and regime selection

Do not treat all visible water as one problem. Classify the dominant regime before choosing the technique:

- **open-water wind waves** — ocean, sea, or a large wind-driven lake where surface statistics dominate;
- **shallow-water flow** — river, flood, harbor surge, coastal inundation, or terrain-coupled flow where depth and horizontal transport dominate;
- **local free-surface liquid** — breaking waves, splashes, pouring, containers, obstacle-heavy local liquid motion.

A product may combine regimes, but one must be authoritative in each spatial band. Do not apply a spectral ocean model to a river merely because both are water.

Record the selected regime's canonical technique in `domain.canonical_technique`, what was actually built in `domain.implemented_technique`, and declare `domain.technique_conformance` (`conformant`/`approximation`/`alternative`/`not-applicable`) plus a `domain.technique_deviation_reason` whenever it is not `conformant`. See `physics-simulation.md`'s canonical technique floor for the full contract.

## Governing relations

For linear surface gravity waves, use the dispersion relation

`ω² = g·k·tanh(k·h)`

with deep-water limit `ω² = g·k` when `k·h ≫ 1`. Finite-sum and spectral components should derive angular frequency from wavenumber through the same relation rather than choosing animation frequencies by eye.

This pure-gravity relation stops applying at short wavelengths: below roughly 1.7 cm, surface tension dominates and the correct relation is the gravity-capillary dispersion relation `ω² = (g·k + (σ/ρ)·k³)·tanh(k·h)`, where `σ` is surface tension and `ρ` is fluid density. A cascade band claiming to reach true capillary-scale ripples should use this form, not the pure-gravity relation, for its highest-wavenumber components; a cascade that stops at short gravity waves (well above the capillary cutoff) can keep using `ω² = g·k·tanh(k·h)` throughout.

For shallow-water flow, the authoritative model should be based on depth-averaged mass and momentum conservation (Saint-Venant / shallow-water equations) with declared bathymetry, forcing, friction, and boundary conditions.

For local incompressible free-surface liquid, use a velocity/pressure solve with an explicit free-surface representation such as particles plus grid transfer (FLIP/APIC), level set, VOF, or a declared equivalent. The exact solver may vary, but visible motion must be downstream of the same authoritative velocity and pressure state.

## Open-water canonical technique

For a flagship ocean or large open-water hero surface, the canonical real-time technique is spectral synthesis in the Tessendorf/Horvath family:

1. sample a directional wave spectrum over a 2D wavenumber grid;
2. assign seeded Gaussian random amplitudes;
3. evolve phase using the physical dispersion relation;
4. synthesize height, horizontal displacement, and slope fields with an inverse FFT;
5. use multiple cascades over disjoint spatial/wavenumber bands to cover swell through short-gravity-wave detail without obvious tiling, adding a gravity-capillary band (see the governing relations above) only when the product genuinely needs sub-centimeter ripple detail;
6. derive normals from the same slope field and foam from crest compression, curvature, or the displacement Jacobian.

Phillips, Pierson-Moskowitz, JONSWAP, TMA depth correction, or other established spectra are valid when their assumptions fit the scene. State the wind/depth assumptions and cascade bands.

## When a finite-sum approximation is legitimate

A fixed directional sum of Gerstner-style components is legitimate for decorative/background water, small viewports, deliberate low-poly/stylized work, or a bounded hero where the component count is high enough and the camera cannot expose repetition.

It becomes a silent-substitution defect when:

- the water is the hero subject of a flagship product;
- the product claims `realistic`, `physically simulated`, `spectral`, or equivalent language;
- a large persistent viewport makes the finite component count read as geometric repetition;
- unrelated fragment noise is used to disguise an impoverished displacement model.

Record component count, wavelength bands, direction bands, seed policy, and update cadence in `domain.authoritative_model` or adjacent plan notes.

## Foam, spray, and secondary detail

Foam must be causally linked to the visible wave state. Prefer crest curvature, breaking criteria, or the Jacobian/compression of the same displacement field. Spray and mist may be particle or volumetric consumers of breaking events, but they must not become independent decorative noise systems.

A gust or wind shift should propagate through the authoritative wind input into wave energy/direction, crest state, foam generation, spray, and downstream rendering at their appropriate response times.

## Rendering coupling

Water shading is a consumer of simulation state, not a replacement for it. At minimum couple:

- displacement/slope → geometric normal and micro-normal policy;
- Fresnel/IOR → reflection-transmission balance;
- depth/turbidity → absorption and color;
- wave/foam state → roughness, opacity, or whitecap material transitions;
- world lighting → reflected environment and direct highlights.

Read `surface-scattering-and-pbr-materials.md`, `real-time-global-illumination.md`, and `volumetric-rendering.md` when those effects are consequential.

## Compute placement

Large IFFT cascades are parallel numerical kernels. Prefer WebGPU compute for flagship browser implementations. A Worker/WASM FFT is a valid slower fallback. A WebGPU-only product is acceptable when `compute.fallback` explicitly declares the browser requirement instead of silently downgrading the entire ocean model.

Shallow-water and local free-surface solvers should likewise be placed according to grid/particle count and coupling cost; do not block the main interaction thread with a solver that can exceed the frame budget.

## Validation

Use the strongest available checks:

- dispersion relation and limiting cases;
- repeatability from a recorded seed;
- convergence under FFT/grid resolution where appropriate;
- mass conservation for shallow/free-surface solvers;
- known wave propagation or dam-break cases for shallow water;
- causal wind-shift/gust scenarios;
- target-size temporal review for tiling, popping, shimmer, foam detachment, and phase drift.

A beautiful still frame is not evidence of a valid water model.
