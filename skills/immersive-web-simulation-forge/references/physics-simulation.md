# Physics and numerical simulation contract

Read this reference for simulation laboratories, scientific visualizations, engineering calculators, particle/field systems, and products that expose physical or numerical claims.

## Separate appearance from validity

Classify the product before implementation:

- `visual-concept` — appearance/interaction is primary; physically informed analytic, reduced-order, procedural, or authored models are allowed when their limits are clear;
- `educational` — qualitative causal behavior is intended and governing relationships should be explicit;
- `decision-support` — outputs may affect a decision and require calibrated evidence;
- `engineering` — quantitative outputs require domain review, tolerances, and benchmark evidence.

Never promote a visually plausible animation into a physical claim. Claim level controls certification burden, not permission to mislabel arbitrary animation as simulation.

A `visual-concept` does **not** automatically require a heavy numerical solver. It does require truthful language and coherent causal state when the product claims that one phenomenon drives another. A reduced analytic or procedural field can be the right model for an artistic wind field; it becomes a defect only when the product implies CFD-grade flow or another stronger claim.

## Domain contract

Record as applicable:

- authoritative state variables and units;
- coordinate frame, handedness, axis conventions, and reference origin;
- inputs, outputs, assumptions, initial/boundary conditions;
- solver/integrator or direct/reduced model;
- timestep/update policy and failure limits when numerical integration is used;
- conserved, monotonic, symmetry, or limiting-case quantities that should be checked;
- expected uncertainty/discretization/model error and validity envelope.

Use one unit system internally. Convert at boundaries. Reject dimensionally invalid combinations instead of silently coercing them.

## Canonical technique disclosure

Do not infer a universal canonical method from a broad phenomenon label such as `fluid`, `cloth`, `rigid body`, `fire`, or `GI`. Many domains have several accepted method families whose suitability depends on regime, scale, interaction, dimensionality, accuracy target, and runtime budget.

When a specialist Forge reference exists, **that specialist reference owns regime selection and any canonical-technique floor**. For example, `wave-and-fluid-surfaces.md` distinguishes open-water spectral waves, shallow-water flow, and local free-surface liquid rather than declaring one solver for all water.

Use:

- `domain.canonical_technique` — an established technique/family only when the product's narrow regime has a defensible canonical/reference floor;
- `domain.implemented_technique` — what was actually built, as a short identity label;
- `domain.technique_conformance` — `conformant`, `approximation`, `alternative`, or `not-applicable`;
- `domain.authoritative_model` — the detailed model/solver description;
- `domain.technique_deviation_reason` — required when conformance is not `conformant`.

`not-applicable` is correct when no single established canonical technique is defensible for the selected regime. It is not an escape hatch: still record the implemented technique and explain why method choice is product/regime dependent.

A silent substitution remains a defect. If the product says `spectral ocean`, `physically simulated smoke`, or equivalent, the implementation must either match that claim or disclose the approximation/alternative and its visible/behavioral cost.

## Validation ladder

Use the strongest available oracle appropriate to the claim:

1. closed-form or manufactured solution;
2. published benchmark or trusted independent reference implementation;
3. convergence/refinement study;
4. conservation, symmetry, invariance, monotonicity, or limiting-case checks;
5. expert-reviewed qualitative behavior when stronger evidence is unavailable and the claim permits it.

For decision-support or engineering claims, one attractive run is not evidence. Record known cases, tolerances, results, and limitations. State when validation is blocked.

## Runtime architecture

Keep render cadence independent from solver cadence. Use Worker/WASM/WebGPU/server execution when computation can block interaction. Long-running work requires cancellation, progress or an honest indeterminate state, bounded resources, replayable inputs/seed where relevant, stale-result rejection, and recovery.

Treat non-convergence, NaN/Inf, dropped simulation time beyond policy, energy drift outside tolerance, and out-of-domain inputs as explicit states. Do not keep displaying a plausible result after the model has failed.

## Product loop

For a simulation laboratory use:

`question → configure → run → inspect → compare → export/reset`

Provide a valid starting case, adjacent units, reproducible comparison, and machine-readable outputs when analysis is part of the promise.
