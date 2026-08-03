---
name: immersive-web-simulation-forge
description: >-
  Design, implement, embed, validate, harden, and lean-package sophisticated
  interactive browser products including open worlds, physics and scientific
  simulation labs, parametric CAD-like or graphical design studios, 2D/3D
  configurators, data instruments, operations panels, game arenas, dashboards,
  and ambient systems. Use when motion, spatial depth, causal or numerical
  simulation, procedural rendering, high-end WebGL/Three.js graphics, persistent
  authoring workflows, engineering visualization, truthful quantitative claims,
  or flagship browser quality is central.
---

# Immersive Web Simulation Forge v0.6

Build a concentrated interactive product, prove the level of truth it claims, and package only the runtime a user needs. Apply the same quality system to worlds, laboratories, editors, instruments, and operational surfaces without forcing them into a game-shaped workflow.

Use renderer, compute, and document architectures that fit the product. SVG, Canvas 2D, WebGL, Three.js, WebGPU, DOM hybrids, Workers, WASM, server jobs, authored assets, procedural assets, and reconstruction are valid when they match the perceptual and domain problem.

## 1. Keep three ledgers independent

Maintain three non-substitutable ledgers.

### Product outcome

- recognizable identity and clear default composition;
- a legible first useful action and next step;
- a complete profile-appropriate workflow;
- coherent visual hierarchy, interaction feedback, and recovery;
- one dominant value-producing system rather than equal-weight feature sprawl.

### Domain validity

- declared claim level and validity envelope;
- authoritative units, coordinates, state, assumptions, and constraints;
- solver, geometry, or data behavior appropriate to the claim;
- benchmarks, invariants, tolerances, round trips, or other suitable oracles;
- visible limitations and no promotion from plausible appearance to unsupported truth.

### Runtime engineering

- deterministic/replayable state where required;
- correct input, history, persistence, lifecycle, resize, cancellation, and recovery;
- measured fidelity, wall-clock performance, and bounded resource use;
- maintainable architecture and lean packaging.

Do not compute an aggregate self-score. A beautiful result cannot certify physical validity; a correct solver cannot certify usable product design; engineering gates cannot certify flagship art.

## 2. Select independent contracts

### Product profile

- `full-window-world`: traversable or cinematic spatial world;
- `simulation-lab`: physics, scientific, engineering, or educational experiment;
- `design-studio`: persistent parametric, CAD-like, graphical, or configurator workflow;
- `data-instrument`: exploratory analytical visualization and comparison tool;
- `operations-panel`: live state, consequential actions, confirmation, and recovery;
- `dashboard-panel`: bounded embedded interactive panel;
- `game-arena`: deterministic playable rules and presentation;
- `ambient-system`: low-attention state-driven scene.

Read `references/profiles.md` after choosing a profile.

### Interaction mode

- `game`: enter, pursue, resolve, reward;
- `sandbox`: discover, manipulate, transform, return;
- `instrument`: question, configure, run/manipulate, inspect, compare, export/reset;
- `authoring`: select/create, modify, validate, compare, save/export;
- `ambient`: state arrival, legible evolution, trace/recovery.

### Claim level

- `visual-concept`: appearance and interaction only;
- `educational`: qualitative behavior with declared simplifications;
- `decision-support`: calibrated evidence required for user decisions;
- `engineering`: quantitative validation, tolerances, and domain review required.

### Representation

- SVG/DOM for symbolic topology, constraints, labels, and low-count mechanisms;
- Canvas 2D for image-space fields, plots, painterly layers, and dense 2D simulation;
- WebGL/Three.js for true depth, materials, instancing, inspection, and graphical editors;
- WebGPU/raw WebGL for established custom render or compute capital;
- hybrids for native-resolution product chrome around a visual or simulation surface.

### Compute boundary

Choose main thread, Worker, WASM, WebGPU compute, or server job independently from the renderer. Record latency, memory, cancellation, progress, replay, persistence, and fallback contracts.

### Delivery

Default to a lean runnable product. Keep spikes, captures, logs, audits, browser caches, and comparison work under `.forge/` and exclude them from the user package.

## 3. Preserve the request and every claim

Create `.forge/FORGE_PLAN.json` from `templates/FORGE_PLAN.json`. Use its exact v4 field names for implementation, planning-only, and handoff work.

Open the template immediately before writing a plan and copy its keys; do not recreate the schema from memory. These repeated object shapes are exact:

- derived constraint: `{ "name", "reason", "benefit", "cost", "rejected_alternative" }`;
- canonical-state consumer: `{ "name", "consequence" }`;
- hero state change: `{ "name", "grammar", "channels" }`, where `channels` is an array;
- public claim: `{ "label", "displayed_value", "unit", "basis", "source", "verified", "display_policy" }`.

Use `display_policy: "hidden-until-verified"` for a planned claim whose `verified` value is false. The planning audit warns but permits that hidden state. An implemented or packaged product must either verify the claim or remove it; it may never display the unverified value. Verified claims may use `displayed` or `eligible`.

Record separately:

- explicit goals, target sizes, users, and requested constraints;
- reversible assumptions;
- implementation-derived constraints with benefit, cost, and rejected alternative;
- public claims with value, unit, basis, source, and verification state;
- whether a result is illustrative, educational, decision-support, or engineering-grade.

Never silently add `offline`, `no assets`, `no dependencies`, `single file`, `procedural-only`, low-resolution defaults, or similar ceiling-lowering constraints.

Treat every displayed number as testable. Derive dimensions, area, counts, cycle time, resolution, FPS, units, tolerances, and solver results from implementation or compact evidence. Prefer no claim to an invented one.

Run `python scripts/forge.py audit <project>` before implementation expansion and before packaging.

## 4. Use the profile's complete product loop

Record one primary workflow in the v4 plan.

- world/sandbox: `explore → discover → transform → return`;
- simulation lab: `question → configure → run → inspect → compare → export/reset`;
- design studio: `select/create → modify → validate → compare → save/export`;
- data instrument: `question → filter/manipulate → interpret → compare → export`;
- operations panel: `detect → inspect → act → confirm → recover`;
- game arena: `entry → pursuit → resolution → reward`;
- ambient system: `state arrival → evolution → event → persistent trace/recovery`.

A workflow is complete only when the result, comparison/validation step, completion/export, and failure/recovery path exist. A hero canvas surrounded by disconnected controls is not a complete product.

Read `references/experience-concentration.md` for first-use and feature-budget guidance.

## 5. Work through eight compact phases

### Phase A — Define the product thesis

Specify:

- primary user, job to be done, and one-sentence promise;
- default-view focus and first useful action;
- full workflow and recoverable end state;
- one hero system, up to four supporting systems, and explicit deferrals;
- smallest spatial, model, data, or document scope that preserves the promise;
- target sizes, expected latency/cadence, and intended visual clarity.

For flagship work, consider at least three concepts that differ in interaction grammar, representation, compute/domain approach, and product workflow. Select by value concentration and capability fit, not feature count.

### Phase B — Establish domain truth

Declare the claim level before building the hero visualization.

For physics or numerical work read `references/physics-simulation.md` and record units, coordinates, model, assumptions, initial/boundary conditions, solver policy, stability or convergence evidence, validation oracle, tolerances, and limitations.

For parametric or CAD-like work read `references/parametric-design.md` and record document schema, parameter graph, constraints, geometry checks, units/axes, measurements, import/export behavior, and round-trip evidence.

For data or operational work read `references/compute-data-pipeline.md` and record provenance, freshness, transforms, job/action states, confirmation, idempotency, and recovery.

Do not call creator-authored fixtures independent validation. Decision-support and engineering claims require an appropriate external reference or explicit validation block.

### Phase C — Select architecture and compute boundary

Ask:

1. What is the authoritative state: world, simulation, document, dataset, or operation?
2. Which state is saved, derived, transient, or render-only?
3. Does the product require true geometry/occlusion or image-space treatment?
4. Can computation block input, exceed memory, or outlive the page interaction?
5. What renderer, solver, geometry, asset, and interaction capital already exists?
6. Which import/export and migration contracts must survive future versions?

Read `references/stack-selection.md`, `references/systemic-rendering.md`, and `references/compute-data-pipeline.md` as applicable. Extend strong capital instead of replacing it because another stack is more familiar.

### Phase D — Prove one vertical slice

Build the smallest runnable slice containing:

- the honest default composition;
- one complete profile-specific loop;
- one authoritative state affecting at least three consequential consumers;
- a valid starting preset/document/case;
- result inspection plus comparison or validation;
- failure/cancel/recovery behavior;
- target-size clarity and representative runtime cost.

Reject a slice when title chrome hides an anonymous result, controls do not produce legible consequences, a simulation has no validity contract, an editor mutates only scene objects, an export is untested, or a screenshot hides low internal resolution.

Do not expand scope until the slice is worth and safe to expand.

### Phase E — Build causal density or authoring depth

Represent one phenomenon or document intent once and propagate it.

- simulation state drives geometry, plots, diagnostics, comparison, and export;
- document parameters drive geometry, measurements, validation, variants, and serialization;
- data state drives visual marks, filters, annotations, provenance, and decisions;
- world state drives placement, collision, ecology, shading, sound, and routes.

For persistent editors read `references/editor-interaction.md`. Keep document, derived, interaction, view, and history state separate. Commit one undo entry per meaningful gesture, preserve stable IDs, and make cancellation restore the pre-gesture state.

Use capability packs under `kits/` as starting capital, not mandatory architecture.

### Phase F — Establish fidelity, correctness, and measurement contracts

Track CSS size, output size, expensive scene-pass size, and native micro-interface size. Separate deterministic capture from performance measurement. Keep text, icons, plots, reticles, measurements, and fine overlays native or deliberately reconstructed.

Measure wall-clock frame intervals after warmup across default, representative, and stress states. Report p50/p95 frame time and sample count. Never derive FPS from a clamped simulation delta. Treat software rendering as correctness/stress evidence only.

Validate domain claims independently from render performance:

- simulation: known case, invariant, convergence, tolerance, and failure state;
- design: parameter constraints, finite/valid geometry, history, persistence, and export round trip;
- data/operations: provenance, freshness, transformation, action confirmation, and recovery.

Read `references/measurement-integrity.md` and `references/perceptual-fidelity.md`.

### Phase G — Integrate and harden

For embedded work expose mount, update/load, resize, suspend, resume, and destroy. Require scoped styles/input, hidden-view suspension, disposal, context-loss handling, repeatable mount/destroy, and compact recomposition.

For deterministic browser evidence expose `window.__FORGE__.prepareVerification(scenario)`, `verifyWorkflow(scenario)`, and `verifyDomain(scenario)` when applicable. Return structured pass/fail evidence rather than changing the UI solely to satisfy a test.

For expensive tasks require job IDs, cancellation, progress or honest indeterminate state, stale-result rejection, bounded resources, and failure recovery. For documents require dirty state, undo/redo, save confirmation, migration, invalid-import recovery, and deterministic serialization.

Perform focused passes over:

1. default view, first action, and complete workflow;
2. visual hierarchy, materials/marks, feedback, and native UI;
3. domain oracle, tolerances, limitations, and false-claim risks;
4. input, history, persistence, lifecycle, cancellation, and recovery;
5. fidelity, wall-clock performance, data/geometry round trips, and footprint.

Flagship completion requires at least two revisions after the full slice, browser execution when available, no blocker in any ledger, and a declared review status.

### Phase H — Package lean

Default package:

```text
<project>/
  application entry
  src/ or built runtime
  assets/
  README.md
  VALIDATION.json
  preview.webp        # optional, at most one
```

Include required Workers, WASM, schemas, presets, migrations, and runtime data. Exclude `.forge/`, raw captures, copied audit tools, browser caches, discarded concepts, duplicate bundles, and repeated reports.

Use `python scripts/forge.py package <project> --out <project>.zip`. Read `references/lean-delivery.md`.

## 6. Profile quality rules

### Worlds and games

Protect identity, first action, density, movement/input, one causal transformation, and a resolution/return state. Record actual bounds and cadence. Do not equate generated bounds with authored or explorable area.

### Simulation laboratories

Provide a valid preset, adjacent units, responsive run/cancel controls, explicit non-convergence/error states, reproducible comparisons, and machine-readable export. Never let a plausible animation conceal solver failure.

### Design studios

Use an authoritative versioned document, parameter constraints, shared selection, numeric entry, snapping where useful, one history transaction per gesture, variant comparison, measurements, save state, and tested import/export. Separate a visual concept tool from engineering CAD claims.

### Data instruments and operations

Make provenance, freshness, filters, selections, and transformations legible. Preserve the last known good state. Consequential actions need scope preview, confirmation proportional to risk, in-flight state, and recovery.

### Interface fidelity

Let the interface be the product when authoring or analysis is primary. Use one authored icon system, native-resolution text and micrographics, accessible labels, visible focus, keyboard paths, and deliberate optical sizes. Avoid arbitrary Unicode/emoji functional icons.

### Performance

Distinguish transfer size, main-thread work, Worker/server latency, CPU solver cost, GPU geometry, pixel/post cost, and memory. Optimize the measured bottleneck before lowering visible quality or numerical accuracy.

## 7. Evidence contract

Keep compact evidence in `.forge/VALIDATION.json`:

- static and intended-route browser checks;
- workflow completion and failure/recovery review;
- product, domain, and runtime ledgers;
- domain benchmark, tolerance, geometry, round-trip, or provenance evidence;
- target sizes, capture density, wall-clock frame data, renderer, and scenarios;
- console/page/request errors, limitations, and public-claim audit.

Do not call source inspection browser verification, self-review independent review, or visual plausibility physical validation.

## 8. Included capability packs

- `kits/runtime/lifecycle.mjs` — host-safe lifecycle/disposal;
- `kits/runtime/frame-loop.mjs` — fixed-step simulation plus raw wall-frame metadata;
- `kits/runtime/resolution-policy.mjs` — wall-clock adaptive/capture-locked resolution;
- `kits/compute/task-runner.mjs` — cancellable Worker or local task protocol;
- `kits/authoring/history-store.mjs` — bounded transactional undo/redo;
- `kits/authoring/parameter-store.mjs` — constrained parameters and derived values;
- `kits/three/picking-gizmo.mjs` — viewport picking and transform transactions;
- `kits/analysis/measurement-series.mjs` — run measurements, summaries, plots, and CSV;
- `kits/io/project-codec.mjs` — versioned import/export, migration, and round trips;
- `kits/systems/shared-field.mjs` — deterministic scalar/vector field;
- `kits/systems/world-director.mjs` — stateful event scheduling/recovery;
- `kits/three/panel-renderer.mjs` — bounded Three.js foundation;
- `kits/three/shared-field-texture.mjs` — CPU/GPU field bridge;
- `kits/three/lod-bands.mjs` and `kits/three/post-chain.mjs` — spatial scaling and post;
- `kits/canvas/field-renderer.mjs` — layered Canvas field foundation;
- `kits/webgl/resolve-pass.mjs` — scene FBO and native resolve;
- `kits/ui/icon-system.mjs` — authored SVG icon foundation;
- `kits/input/pointer-look.mjs` — standard-direction pointer input.

## 9. Tooling

```bash
python scripts/forge.py init <project> --profile simulation-lab --ambition flagship
python scripts/forge.py init <project> --profile design-studio --ambition flagship
python scripts/forge.py audit <project>
node scripts/check_html.mjs <entry.html>
node scripts/fidelity_audit.mjs <entry.html> --flagship --out <project>/.forge/fidelity.json
node scripts/browser_verify.mjs <project> --workflow-test --domain-test --scenario reference-case --out <project>/.forge/workflow.json
node scripts/browser_verify.mjs <project> --capture --viewport 1440x900 --min-ratio 0.9 --out <project>/.forge/capture.json
node scripts/browser_verify.mjs <project> --measure --viewport 1280x720 --samples 3 --out <project>/.forge/performance.json
python scripts/forge.py package <project> --out <project>.zip
python scripts/forge.py doctor
```

Lead final responses with the runnable product and completed workflow. State the claim level, strongest domain evidence, most important limitation, and only quantitative claims supported by compact evidence.
