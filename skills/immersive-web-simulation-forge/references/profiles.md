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

## v0.7 spatial specialization

Spatial contracts are conditional. A product does not become a world because it contains a 3D viewport.

### Full-window world

For showcase/flagship work, establish this authoring sequence before large expansion:

`World thesis → WorldSpec → global skeleton → semantic regions → terrain/routes → landmarks → representative regional composition → object population → spatial reconciliation → runtime coupling`

Require:

- explicit authored and explorable extents;
- stable region IDs and semantic relations;
- terrain authority and boundary blending;
- traversal authority and recovery routes;
- landmark hierarchy;
- semantic fields consumed by multiple systems;
- near/mid/far authoring representation policies;
- one representative regional slice with contact/collision evidence.

Use `references/world-authoring.md`, `references/spatial-reconciliation.md`, and `references/evidence-driven-hardening.md`.

### 3D design or simulation products

A design studio or simulation lab may set `spatial.applicable=true` when placement, support, collision, assembly, or spatial inspection is consequential. It does **not** need a WorldSpec unless the product actually has world-level regions/terrain/traversal.

### Non-spatial products

`spatial.applicable=false` is a complete and valid state for data instruments, operations panels, dashboards, 2D laboratories, authoring tools, and other products where world construction is not part of the promise. Do not add semantic regions or world gates merely to satisfy v0.7.

## v0.7 flagship asset specialization

Whenever `ambition=flagship` and `spatial.applicable=true`, enable `asset_fidelity`. `full-window-world` uses `scope_mode=world-scale`; simulation/design products may use `single-subject` or `multi-object`. Only abstract/technical non-world spatial products may use `non-object`, and they must record why object fidelity is not part of identity.

Realistic/reference-driven flagships require at least one reference-sensitive identity object and runtime multi-view evidence. Low-poly/abstract work may deliberately use primitives, but must opt into the style contract and still prove silhouette, proportion, material grouping, contact, composition, and target-size legibility.
