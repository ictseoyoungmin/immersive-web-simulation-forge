# Profile-specific guidance

## Full-window world

Prioritize traversal composition, horizon identity, near/mid/far representation, camera feel, world events, content cadence, and adaptive quality. Record actual bounds, movement speed, first action/reward, and a resolution or return state. Body ownership and pointer lock may be valid.

For showcase/flagship worlds use `world-authoring.md`, `spatial-reconciliation.md`, and `evidence-driven-hardening.md`. Validate support/contact for ground-bound content and input semantics for traversable worlds.

A full-window world is not automatically object-centric. A field/volume/astronomical/procedural environment can legitimately have `asset_fidelity.applicable=false` or `scope_mode=non-object` when object assets do not define product identity; record the rationale. If object families do define identity, enable asset fidelity normally.

## Simulation laboratory

Start from a valid preset and a concrete question. Keep units adjacent to parameters, render cadence independent from solver cadence, and non-convergence visible. Complete configure → run → inspect → compare → export/reset. Read `physics-simulation.md` and `compute-data-pipeline.md`.

A 3D lab needs spatial reconciliation only when placement, support, collision, assembly, or spatial inspection is consequential; it does not need a WorldSpec merely because it has a 3D viewport.

## Design studio

Prioritize the document model before the scene graph. Complete select/create → modify → validate → compare → save/export. Require transactional undo/redo, shared selection, measurements, persistence, and tested round trips. Read `parametric-design.md` and `editor-interaction.md`.

## Data instrument

Prioritize question formation, provenance, filtering, direct manipulation, linked views, comparison, and machine-readable export. Record missing-value, freshness, transformation, and reproducibility contracts.

## Operations panel

Prioritize state freshness, anomaly/attention hierarchy, scope inspection, safe action, confirmation, in-flight state, idempotency, and recovery. Preserve the last known good state and make stale data unmistakable.

## Dashboard panel

Prioritize host-safe lifecycle, bounded input, readable overlays, target-size composition, compact recomposition, and suspension. A panel may be spatial, analytical, operational, or cinematic; choose the corresponding workflow rather than assuming a dashboard is passive.

## Game arena

Separate deterministic game state from presentation. Complete entry → pursuit → resolution → reward. Preserve input fairness and validate actual movement/look semantics rather than numeric yaw sign.

## Ambient system

Keep interaction optional, motion low-attention, update rates modest, and state causality legible. Reduced motion, hidden-view suspension, persistent trace, and recovery are central.

## Spatial specialization

Spatial contracts are conditional. `spatial.applicable=true` means placement/scale/support/traversal structure matters; it does not automatically mean a world must contain conventional object assets.

For object-centric flagship spatial work, enable `asset_fidelity` and prove identity-critical assets. For genuinely non-object spatial identity, document that rationale rather than inventing a hero mesh to satisfy a gate.

World-scale representative families are required when repeated families materially define the world. A deliberately singular world (one megastructure, cave, field, or procedural volume) should not manufacture a repeated family solely for certification.

Reality-grounded and reference-sensitive are different:

- `realistic`/reality-grounded means believable real-world scale/material/form laws;
- `reference-driven` means a specific supplied or named reference identity must be preserved.

Only the second inherently requires reference-critical ObjectSpec evidence.
