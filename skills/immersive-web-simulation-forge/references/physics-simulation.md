# Physics and numerical simulation contract

Read this reference for simulation laboratories, scientific visualizations, engineering calculators, particle/field systems, and products that expose physical or numerical claims.

## Separate appearance from validity

Classify the product before implementation:

- `visual-concept`: motion is illustrative and may not support physical claims;
- `educational`: qualitative behavior is intended, with declared simplifications;
- `decision-support`: outputs may affect a user decision and require calibrated evidence;
- `engineering`: quantitative outputs require domain review, tolerances, and benchmark evidence.

Never promote a visually plausible animation into a physical claim. Display the claim level and important limitations near results when misunderstanding is plausible.

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
