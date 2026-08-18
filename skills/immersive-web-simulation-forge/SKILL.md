---
name: immersive-web-simulation-forge
description: >-
  Design, implement, embed, validate, harden, and lean-package sophisticated
  interactive browser products including open worlds, agentic or procedural 3D
  spatial experiences, physics and scientific simulation labs, parametric
  CAD-like or graphical design studios, 2D/3D configurators, data instruments,
  operations panels, game arenas, dashboards, and ambient systems. Use when
  motion, spatial depth, causal or numerical simulation, procedural or hybrid
  generative/reconstructed authoring, high-end WebGL/Three.js graphics,
  persistent authoring workflows, engineering visualization, truthful
  quantitative claims, multi-view visual hardening, or flagship browser quality
  is central.
---

# Immersive Web Simulation Forge v0.7

Build a concentrated interactive browser product, prove the level of truth it claims, and package only the runtime a user needs. v0.7 adds structured spatial authoring and enforceable flagship asset-fidelity gates so a correct world or simulation cannot be certified while its hero region remains a primitive blockout.

Use renderer, compute, document, authoring, and provider architectures that fit the product. SVG, Canvas 2D, WebGL, Three.js, WebGPU, DOM hybrids, Workers, WASM, server jobs, authored assets, procedural assets, reconstruction, retrieval, and generative systems are valid when they match the perceptual and domain problem.

## 1. Keep three ledgers independent

Maintain three non-substitutable ledgers.

### Product outcome

- recognizable identity and clear default composition;
- a legible first useful action and next step;
- a complete profile-appropriate workflow;
- coherent hierarchy, interaction feedback, completion, and recovery;
- one dominant value-producing system rather than equal-weight feature sprawl.

### Domain validity

- declared claim level and validity envelope;
- authoritative units, coordinates, state, assumptions, and constraints;
- solver, geometry, or data behavior appropriate to the claim;
- benchmarks, invariants, tolerances, round trips, or suitable oracles;
- visible limitations and no promotion from plausible appearance to unsupported truth.

### Runtime engineering

- deterministic or replayable state where required;
- correct input, history, persistence, lifecycle, resize, cancellation, and recovery;
- measured fidelity, wall-clock performance, and bounded resources;
- maintainable architecture and lean packaging.

Do not compute an aggregate score or add world/asset quality as substitute ledgers. World, asset, spatial, and visual evidence prove Product Outcome; they do not replace domain or runtime evidence.

## 2. Apply four construction principles

1. **Explicit authoritative state** — keep consequential world, document, simulation, dataset, and operation state inspectable and versionable.
2. **Global → local decomposition** — establish shared spatial constraints before expensive local detail.
3. **Generative upstream, deterministic downstream** — treat generated output as a proposal until geometry, domain, and runtime contracts reconcile it.
4. **Evidence → diagnosis → repair** — capture consequential evidence, classify the defect, repair the correct layer, and re-check regressions.

Never treat an image, mesh, layout, or LLM-produced coordinate as canonical state merely because it was generated.

## 3. Select independent contracts

### Product profile

- `full-window-world` — traversable or cinematic spatial world;
- `simulation-lab` — physics, scientific, engineering, or educational experiment;
- `design-studio` — persistent parametric, CAD-like, graphical, or configurator workflow;
- `data-instrument` — exploratory analytical visualization and comparison tool;
- `operations-panel` — live state, consequential actions, confirmation, and recovery;
- `dashboard-panel` — bounded embedded interactive panel;
- `game-arena` — deterministic playable rules and presentation;
- `ambient-system` — low-attention state-driven scene.

Read `references/profiles.md` after choosing a profile.

### Interaction mode

Choose `game`, `sandbox`, `instrument`, `authoring`, or `ambient` independently from the profile. Record the matching complete loop in section 5.

### Claim level

- `visual-concept` — appearance and interaction only;
- `educational` — qualitative behavior with declared simplifications;
- `decision-support` — calibrated evidence required for user decisions;
- `engineering` — quantitative validation, tolerances, and domain review required.

Claim level controls assertion and oracle burden, not whether the underlying model may be arbitrary. Even visual-concept or educational simulations should use real governing state and relationships such as buoyancy, drag, diffusion, or rate laws when those phenomena are claimed. Read `references/physics-simulation.md` for the validation ladder.

### Representation

- use SVG/DOM for symbolic topology, constraints, labels, and low-count mechanisms;
- use Canvas 2D for image-space fields, plots, painterly layers, and dense 2D simulation;
- use WebGL/Three.js for true depth, materials, instancing, inspection, and graphical editors;
- use WebGPU/raw WebGL when established compute or rendering capital justifies it;
- use hybrids for native-resolution product chrome around visual or simulation surfaces.

### Authoring strategy

Choose `authored`, `procedural`, `reconstructed`, `generative`, `retrieved`, or `hybrid` independently from renderer and profile. Route asset classes by salience, uniqueness, repetition, interaction importance, editability, reference fidelity, authoring cost, and runtime cost. Record why each consequential route was selected and its fallback. Read `references/asset-authoring.md`.

### Spatial contract

Set `spatial.applicable=true` only when spatial structure is consequential; a 3D viewport alone does not require a WorldSpec. A flagship `full-window-world` must record world scale and extents, stable regions and relations, semantic fields, terrain and traversal authority, landmarks, placement/contact authority, and Near/Mid/Far policies. Read `references/world-authoring.md` and `references/spatial-reconciliation.md`.

### Flagship asset fidelity

For `ambition=flagship` with `spatial.applicable=true`, require `asset_fidelity.applicable=true`. Record style/scope, visual target, identity-critical classes, hero assets, world-scale representative families, Near/Mid/Far authoring floors, primitive policy, material response, and runtime evidence.

Realistic or reference-driven flagships must name at least one reference-sensitive ObjectSpec path. Deliberate low-poly or abstract primitives are valid only as an explicit final style; unfinished primitive substitution is not. Read `references/asset-fidelity-gates.md`.

### Compute, provider, and delivery boundaries

Choose main thread, Worker, WASM, WebGPU compute, or server job independently from renderer and authoring provider. Record latency, memory, cancellation, progress, replay, persistence, and fallback contracts. Choose capabilities before vendors; no specific DCC, reconstruction, generation, or asset provider is mandatory.

Default to a lean runnable product. Keep spikes, captures, audits, browser caches, and comparison work under `.forge/` and out of the user package.

## 4. Preserve the request and every claim

Create `.forge/FORGE_PLAN.json` from `templates/FORGE_PLAN.json`. Open the template immediately before planning and use its exact v6 keys; do not recreate the schema from memory.

Repeated shapes are exact:

- derived constraint: `{ "name", "reason", "benefit", "cost", "rejected_alternative" }`;
- canonical-state consumer: `{ "name", "consequence" }`;
- hero state change: `{ "name", "grammar", "channels" }`, with an array of channels;
- public claim: `{ "label", "displayed_value", "unit", "basis", "source", "verified", "display_policy" }`.

The plan records request/constraints, authoritative state and consumers, workflow, domain/compute/data contracts, authoring strategy, optional spatial construction, construction evidence, asset fidelity, visual/fidelity/interface/input budgets, review, and package roots.

Use `display_policy: "hidden-until-verified"` for an unverified planned claim. Implemented or packaged products must verify or remove it. Treat every displayed dimension, area, count, cycle time, resolution, FPS, unit, tolerance, and solver result as testable.

Never silently add `offline`, `no assets`, `no dependencies`, `single file`, `procedural-only`, low-resolution defaults, a specific vendor, or similar ceiling-lowering constraints.

Migrate public v0.6/v4 or compatible pre-release v5 projects with `python scripts/forge.py migrate <project>`. Migration preserves a versioned backup and supplies schema defaults but never fabricates evidence. Run `python scripts/forge.py audit <project>` before expansion and packaging.

## 5. Complete the profile loop

Record one primary workflow:

- world/sandbox: `explore → discover → transform → return`;
- simulation lab: `question → configure → run → inspect → compare → export/reset`;
- design studio: `select/create → modify → validate → compare → save/export`;
- data instrument: `question → filter/manipulate → interpret → compare → export`;
- operations panel: `detect → inspect → act → confirm → recover`;
- game arena: `entry → pursuit → resolution → reward`;
- ambient system: `state arrival → evolution → event → persistent trace/recovery`.

A workflow is complete only when result inspection, comparison/validation, completion/export, and failure/recovery exist. Read `references/experience-concentration.md` for first-use and feature-budget guidance.

## 6. Work through eight phases

### Phase A — Define the product thesis

Specify the primary user, job, one-sentence promise, default-view focus, first useful action, complete loop, recoverable end state, one hero system, up to four supporting systems, explicit deferrals, target sizes, latency/cadence, and smallest scope that preserves the promise.

For flagship work, compare at least three concepts that differ in interaction, representation, compute/domain approach, authoring strategy, and workflow. Select by value concentration and capability fit.

### Phase B — Establish domain truth

Declare claim level before the hero visualization. Record authoritative units/state, assumptions, initial/boundary conditions, solver or geometry policy, validity envelope, oracle, tolerances, failure states, and limitations.

- physics/numerical: read `references/physics-simulation.md`;
- water, wave, or other fluid-surface hero visualization (any profile, not only simulation-lab): also read `references/wave-and-fluid-surfaces.md`;
- consequential wind/weather coupling across systems: read `references/wind-and-atmospheric-flow.md`;
- fire, smoke, or other reactive-flow hero: read `references/fire-smoke-and-reactive-flow.md`;
- physically based lighting, material, global illumination, or volumetric claims: read `references/lighting-and-radiance.md` and the specialized references it routes to;
- parametric/CAD-like: read `references/parametric-design.md`;
- data/operations: read `references/compute-data-pipeline.md`.

Do not call creator-authored fixtures independent validation. Decision-support and engineering claims require an appropriate external reference or explicit validation block.

### Phase C — Freeze architecture and authority

Identify authoritative, saved, derived, transient, render-only, and proposal-only state. Select representation, compute boundary, authoring routes, provider capabilities, component hierarchy, placement/contact authority, persistence/migration, and import/export contracts.

For flagship spatial work, identify identity-critical Near/Mid/Far classes, permitted temporary placeholders, their completion-blocking replacement trigger, and what makes each class visibly finished. Extend strong existing renderer, solver, geometry, asset, and interaction capital. Read `references/stack-selection.md`, `references/systemic-rendering.md`, and the applicable authoring/data references.

### Phase D — Prove one vertical slice

Build the smallest runnable slice with an honest default composition, one complete profile loop, one authoritative state affecting at least three consequential consumers, a valid starting case, result inspection and comparison/validation, failure/cancel/recovery, target-size clarity, and representative runtime cost.

A spatial slice also needs the minimum global skeleton, one semantic region, one finished hero/identity asset, one representative repeated family for world-scale work, one placement/contact path, one runtime interaction, multi-view target-size evidence, and a deterministic spatial check.

Reject disconnected controls, unsupported simulations, scene-only editor mutations, untested exports, hidden low resolution, eye-balled consequential placement, or a hero region that still reads as a blockout. Do not expand until the slice is safe and worth expanding.

### Phase E — Build causal or authoring depth

Represent each phenomenon or document intent once and propagate it to consequential consumers. Keep document, derived, interaction, view, and history state separate; commit one undo entry per meaningful gesture and restore pre-gesture state on cancellation. Read `references/editor-interaction.md` for persistent editors.

For worlds, build global structure before regional detail. Let shared semantic fields drive terrain, placement, ecology, shading, sound, routes, events, and representation policy. Reconcile generated regional proposals before committing them.

### Phase F — Establish fidelity and measurement contracts

Track CSS, output, expensive scene-pass, and native micro-interface sizes. Separate deterministic capture from performance measurement. Keep text, icons, plots, reticles, and fine overlays native or deliberately reconstructed.

For consequential 3D work verify that the declared Asset Router reached runtime; review placeholder ratios, family variation, multi-view silhouette/proportion, hierarchy, materials, contact/penetration, collision/clearance, LOD assignment, and temporal stability.

Measure raw wall-frame intervals after warmup across default, representative, and stress states. Report p50/p95 and sample count; never derive FPS from clamped simulation delta. Software rendering proves correctness/stress behavior, not representative GPU performance. Read `references/measurement-integrity.md` and `references/perceptual-fidelity.md`.

Validate domain claims independently: known cases/invariants/convergence for simulation, constraints/history/persistence/export round trips for design, and provenance/freshness/transforms/action recovery for data and operations.

### Phase G — Integrate and harden

For embedded work expose mount, update/load, resize, suspend, resume, and destroy. Scope styles/input, suspend hidden views, dispose resources, handle context loss, and prove repeatable mount/destroy.

Expose `window.__FORGE__.prepareVerification`, `verifyWorkflow`, and `verifyDomain` when applicable. Spatial work may add `prepareEvidenceView`, `reportScene`, and `reportSpatialEvidence`; flagship object/world work adds `reportAssetEvidence`.

Runtime hooks report what code believes, not visual proof. Before recording any visual, spatial, or asset-fidelity pass, open every referenced capture at target size and independently confirm the visible claim. The capture outranks a self-reported boolean or count.

Run `Capture → Inspect → Classify → Prioritize → Repair → Re-capture → Regression review`. Classify defects as `SPEC`, `IMPLEMENTATION`, `DOMAIN`, `REPRESENTATION`, `ASSET`, `PLACEMENT`, `MATERIAL`, `PERFORMANCE`, or `INSUFFICIENT_EVIDENCE`; repair the owning layer. Read `references/evidence-driven-hardening.md`.

Lock applicable passes in order: `structure → spatial → domain → interaction → appearance → performance → delivery`. Expensive jobs require IDs, cancellation, progress/indeterminate state, stale-result rejection, bounded resources, and recovery. Documents require dirty state, undo/redo, save confirmation, migration, invalid-import recovery, and deterministic serialization.

Flagship completion requires at least two revisions after the full slice, browser execution when available, no ledger blocker, and a declared review status. Spatial flagships additionally require `asset_fidelity_validation=pass` and a passing flagship `.forge/asset-fidelity-audit.json`; object-based hero regions cannot hide behind `not-applicable`. Do not lower ambition to make a failed gate pass without explicit user acceptance.

### Phase H — Package lean

Include only application entry/runtime source, required assets/workers/WASM/schemas/presets/migrations/data, a short README, compact `VALIDATION.json`, and optionally one preview. Exclude `.forge/`, raw captures, copied audit tools, browser caches, `__pycache__`, discarded concepts, and duplicate bundles.

Use `python scripts/forge.py package <project> --out <project>.zip`. Read `references/lean-delivery.md`.

## 7. Apply specialized rules conditionally

- Worlds/games: preserve identity, traversal, landmarks, density, causal transformation, and return/resolution; use WorldSpec and semantic routing for showcase/flagship worlds.
- Reference-critical assets: use ObjectSpec before geometry; preserve hierarchy, material regions, pivots/sockets/colliders, interaction surfaces, and consequential views.
- Generated/reconstructed assets: record provenance and fallback; reconcile scale, pose, contact, collision, support, and domain semantics deterministically.
- Simulation labs: provide a valid preset, adjacent units, run/cancel, explicit solver failure, reproducible comparison, and machine-readable export.
- Design studios: use a versioned document, constraints, stable IDs, shared selection, one history transaction per gesture, measurements, save state, and tested import/export.
- Data/operations: expose provenance, freshness, filters, transformations, scope preview, proportional confirmation, in-flight state, last-known-good state, and recovery.
- Interfaces: use one authored icon system, native-resolution micrographics, accessible labels, visible focus, and keyboard paths; avoid emoji/Unicode functional icons.
- Performance: separate transfer, main-thread, solver/job, geometry/draw, pixel/post, memory, and provider costs; optimize the measured bottleneck before reducing visible or numerical quality.

Read the profile and specialist references rather than expanding these rules in the core prompt.

## 8. Keep compact evidence

Store `.forge/VALIDATION.json` v6 with browser/static checks, workflow and recovery, the three ledgers, domain oracles, construction/asset/spatial validation, evidence review and defect queue, fidelity sizes, wall-clock performance environment/scenarios, limitations, and public-claim audit.

Flagship spatial work also keeps `.forge/asset-fidelity-audit.json`. Do not call source inspection browser verification, self-review independent review, visual plausibility physical validation, software-renderer timing target-GPU evidence, or a generated proposal authoritative placement.

## 9. Reuse bundled capital

- `kits/runtime`, `compute`, and `io` provide lifecycle, fixed-step/wall-time separation, adaptive resolution, cancellable jobs, and versioned project codecs.
- `kits/authoring` and `analysis` provide history, constrained parameters, asset routing/fidelity policy, measurements, plots, and CSV.
- `kits/world`, `spatial`, and `systems` provide regions, semantic fields, region-aware terrain/scatter, placement/contact validation, shared fields, and deterministic events.
- `kits/three`, `canvas`, and `webgl` provide bounded renderers, picking, LOD policy, shared-field bridges, post/resolve, and layered field rendering.
- `kits/input` and `ui` provide pointer-look and authored SVG icon foundations.

Use kits as starting capital, not mandatory architecture.

## 10. Run the tools

```bash
python scripts/forge.py doctor
python scripts/forge.py init <project> --profile <profile> --ambition <ambition>
python scripts/forge.py migrate <project>
python scripts/forge.py audit <project>
node scripts/browser_verify.mjs <project> --workflow-test --domain-test
node scripts/browser_verify.mjs <project> --evidence-suite --evidence-views hero,alternate,interaction
node scripts/asset_fidelity_audit.mjs <project>/.forge/evidence.json --flagship
python scripts/forge.py package <project> --out <project>.zip
```

Use `check_html.mjs`, `fidelity_audit.mjs`, and `spatial_audit.mjs` as applicable. `browser_verify.mjs` requires Playwright even though non-browser workflows do not; run `doctor` and inspect `playwright_available` before promising browser or asset-fidelity evidence.

Lead final responses with the runnable product and completed workflow. State claim level, strongest domain evidence, strongest spatial/visual evidence when applicable, the most important limitation, and only quantitative claims supported by compact evidence.

## 11. Preserve scope

Do not turn the Forge into a proprietary foundation model, a Blender or vendor-required workflow, a reproduction of one external system, a requirement that every asset be generated or every product carry a WorldSpec, or a one-prompt production-world guarantee.
