# Profile-specific guidance

## Full-window world

Prioritize traversal composition, horizon identity, near/mid/far representation, camera feel, world events, content cadence, and adaptive quality. Record actual bounds, movement speed, first action/reward, and a resolution or return state. Body ownership and pointer lock may be valid.

## Simulation laboratory

Start from a valid preset and a concrete question. Keep units adjacent to parameters, render cadence independent from solver cadence, and non-convergence visible. Complete configure → run → inspect → compare → export/reset. Read `physics-simulation.md` and `compute-data-pipeline.md`.

## Design studio

Prioritize the document model before the scene graph. Complete select/create → modify → validate → compare → save/export. Require transactional undo/redo, shared selection, measurements, persistence, and tested round trips. Read `parametric-design.md` and `editor-interaction.md`.

## Data instrument

Prioritize question formation, provenance, filtering, direct manipulation, linked views, comparison, and machine-readable export. Record missing-value, freshness, transformation, and reproducibility contracts. Read `compute-data-pipeline.md`.

## Operations panel

Prioritize state freshness, anomaly/attention hierarchy, scope inspection, safe action, confirmation, in-flight state, idempotency, and recovery. Preserve the last known good state and make stale data unmistakable.

## Dashboard panel

Prioritize host-safe lifecycle, bounded input, readable overlays, target-size composition, compact recomposition, and suspension. A panel may be spatial, analytical, operational, or cinematic; choose the corresponding workflow rather than assuming a dashboard is passive.

## Game arena

Separate deterministic game state from presentation. Complete entry → pursuit → resolution → reward. Use anticipation, impact, recovery, and rule-legible effects. Preserve input fairness and avoid effects that hide state.

## Ambient system

Keep interaction optional, motion low-attention, update rates modest, and state causality legible. Reduced motion, hidden-view suspension, persistent trace, and recovery are central.
