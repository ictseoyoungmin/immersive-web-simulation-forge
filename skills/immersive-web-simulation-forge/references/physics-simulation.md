# Physics and numerical simulation contract

Read this reference for simulation laboratories, scientific visualizations, engineering calculators, particle/field systems, and products that expose physical or numerical claims.

## Separate appearance from validity

Classify the product before implementation:

- `visual-concept`: motion is illustrative and may not support physical claims;
- `educational`: qualitative behavior is intended, with declared simplifications;
- `decision-support`: outputs may affect a user decision and require calibrated evidence;
- `engineering`: quantitative outputs require domain review, tolerances, and benchmark evidence.

Never promote a visually plausible animation into a physical claim. Display the claim level and important limitations near results when misunderstanding is plausible.

Claim level is a certification-burden axis, not a model-fidelity axis. A well-known counterexample is game physics: production games routinely integrate real force/drag/buoyancy relationships, real light attenuation, real population/rate dynamics, yet almost never publish tolerances or benchmark validation for them — that is `educational`, not `engineering`, and it is still genuinely quantitative. Lowering the claim level below `engineering` relaxes which rung of the validation ladder is required (rung 5, expert-reviewed qualitative check, becomes acceptable); it does not relax the "Domain contract" requirements below — authoritative state variables, units, a real solver/integrator, and conserved/monotonic quantities are expected regardless of claim level. If a simulation feels arbitrary or unconvincing, first check whether the claim level was misread as license to replace the governing relationship with a heuristic; that is an implementation defect, not a consequence of choosing `educational` correctly.

## Domain contract

Record:

- authoritative state variables and their units;
- coordinate frame, handedness, axis conventions, and reference origin;
- inputs, outputs, assumptions, initial conditions, and boundary conditions;
- solver or integrator, timestep policy, iteration limits, and stopping conditions;
- stability condition or reason the chosen step is safe;
- conserved or monotonic quantities that should be checked;
- expected uncertainty, discretization error, and validity envelope.

Use one unit system internally. Convert only at input/output boundaries. Reject dimensionally invalid combinations instead of silently coercing them.

## Canonical technique floor

Some domains already have an established standard numerical technique: spectral (FFT) synthesis for ocean/water surfaces, SPH or position-based dynamics for free-surface or granular fluids, mass-spring or FEM for cloth and soft bodies, Verlet/RK4 integrators for rigid-body motion. When one exists for the phenomenon being built, name it in `domain.canonical_technique` even if you do not implement it. Record what you actually built in `domain.authoritative_model`, and when the two differ, use `domain.technique_deviation_reason` to record the deviation and its visible or behavioral cost — for example, "8 fixed directional sine components instead of FFT-synthesized spectrum; visible cost: no organic chop at oblique angles, foam is a decorative noise field rather than slope-derived, and the pattern repeats past ~200m."

This is not a rung on the validation ladder and it is not gated by profile: a `full-window-world` ocean, weather system, or crowd sim that reads as physically simulated owes the same disclosure as a `simulation-lab`. A silent substitution — a small hand-tuned approximation shipped while the product's language, README, or UI implies spectral/FFT/physically-simulated quality — is the same defect the claim-level note above warns against, just surfacing at the technique level instead of the certification level. Leaving `canonical_technique` empty is correct when no established technique exists for the phenomenon; it is not a way to avoid naming one that does. Read `references/wave-and-fluid-surfaces.md` for the water/fluid-surface case in detail.

## Validation ladder

Use the strongest available oracle:

1. closed-form or manufactured solution;
2. published benchmark or trusted reference implementation;
3. convergence study under spatial/temporal refinement;
4. conservation, symmetry, invariance, or limiting-case checks;
5. expert-reviewed qualitative behavior only when stronger evidence is unavailable.

For decision-support or engineering claims, one attractive run is not evidence. Record at least one known case, tolerance, result, and limitation. State when validation is blocked.

## Runtime architecture

Keep render cadence independent from solver cadence. Use a Worker, WASM module, WebGPU compute path, or server job when computation can block interaction. Long-running work requires cancellation, progress, bounded resource use, deterministic inputs or a recorded seed, and a recoverable failure state.

Treat dropped simulation time, non-convergence, NaN/Inf, energy drift, and out-of-domain inputs as explicit states. Do not continue rendering a plausible result after the solver has failed.

## Product loop

Use:

`question → configure → run → inspect → compare → export/reset`

Provide presets or a valid starting case. Keep parameter units adjacent to controls. Show causality in both the hero visualization and native-resolution plots/tables. Preserve run configurations so comparisons are reproducible.
