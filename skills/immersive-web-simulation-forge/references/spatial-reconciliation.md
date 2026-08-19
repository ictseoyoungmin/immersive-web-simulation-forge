# Spatial reconciliation

Use deterministic geometry and domain constraints to reconcile authored, generated, reconstructed, or retrieved content with canonical scene state.

## Principle

`generated appearance ≠ authoritative placement`

The authoritative transform should come from explicit geometry, camera evidence, support surfaces, constraints, or a documented manual decision. A visible object is not spatially valid merely because its transform is finite or its authoring code reports `contactValidated: true`.

## Support semantics come before contact math

Do not assume every object belongs on the ground. Classify consequential objects by support mode before placement:

- `ground` — terrain/floor-supported objects such as trees, buildings, furniture, vehicles at rest;
- `surface` — objects resting on another surface such as a cup on a table or equipment on a platform;
- `parent/socket` — mechanically or semantically attached objects whose support is a parent transform/socket;
- `wall-mounted` / `ceiling-mounted` — fixtures constrained to a surface with an orientation relation;
- `suspended` — cable/rope/rig-supported objects;
- `buoyant` — water-supported objects whose vertical state follows a water/buoyancy model;
- `airborne` — intentionally unsupported flying objects such as aircraft, birds, or drones;
- `dynamic/free` — transient physics objects whose support state may change over time.

An airborne or suspended object is not a contact failure, but its exemption must be intentional and inspectable. Conversely, a ground object may not become `airborne` merely to silence a failed contact check.

## One authoritative support surface

Placement, contact, collision, traversal, and visible ground displacement must derive from the same authoritative surface or from representations with a declared bounded error relationship.

Prefer:

`authoritative surface → render geometry + placement queries + collision + support probes + navigation`

A common defect is CPU placement against one height function while the renderer applies additional GPU displacement. The object then passes the CPU check and visibly floats or penetrates. If render-only displacement changes support-relevant height, either expose the same displacement to support queries or declare and validate an error envelope that keeps contact within tolerance.

Record the support-surface authority and render-surface authority for spatial flagships. If they differ, record how their equivalence is maintained.

## Camera-grounded placement

When a 2D composition or reference image determines where an object should appear:

1. preserve the source camera intrinsics/extrinsics or an equivalent projection model;
2. record crop/resize transforms applied before reconstruction;
3. map the object reference pixel back into the source view;
4. cast a ray into the authoritative terrain/scene;
5. choose a valid positive intersection or support surface;
6. reconcile scale using projection/depth or a known dimension;
7. reconcile orientation using camera relation, semantic pose, and surface normal;
8. run contact, collision, stability, and clearance checks;
9. commit the transform only after the placement passes or is explicitly reviewed.

## Support anchors must come from geometry or semantics

Do not assume local `(0,0,0)` is the bottom/support point. Model origins are commonly centered, offset, inherited from DCC tools, or located at articulation pivots.

Resolve a support anchor in this order when applicable:

1. explicit support socket/anchor authored for the object;
2. support polygon or bottom probe set;
3. semantic contact geometry such as wheels/feet/base plate;
4. local bounds bottom only when that is a faithful support approximation;
5. otherwise fail with `missing-source-anchor` and require review.

An arbitrary origin fallback converts an unknown placement into a false sense of correctness and should not certify support-required objects.

## Image-space scale calibration

Single-view or reference-driven reconstruction often has uncertain absolute scale. When a reference footprint or known dimension is available, calibrate before contact reconciliation:

1. project the reconstructed object at a candidate scale and measure its footprint ratio;
2. compare against the reference footprint ratio;
3. adjust scale until the deviation is within a declared tolerance;
4. then feed that scale into placement/contact reconciliation.

Use symmetric tolerance by default. Asymmetric over/under tolerance is allowed only when the project has evidence or a domain reason that one error direction is materially more harmful. Do not encode a universal assumption that single-view reconstruction always overshoots scale.

## Surface anchoring

A support solver should consider:

- ray/segment intersection;
- ground/surface normal;
- maximum permitted slope;
- object up axis;
- support footprint or bottom samples;
- vertical offset and embedding allowance;
- category-specific rules;
- support target identity and transform revision.

## Contact validation

For `ground` and `surface` support, compute contact from support samples rather than accepting only a precomputed boolean. Detect at minimum:

- floating distance;
- excessive penetration;
- support ratio across the footprint;
- unstable slope;
- collision overlap with protected geometry;
- navigation clearance violations.

Evidence should expose enough raw probe data for the audit to recompute deltas, for example `{x,y,z,surfaceY}`. Missing support evidence is `unverified`, not zero floating distance.

A small prop may use a few support samples; a building, machine, or vehicle should use a meaningful support polygon or multiple bottom probes.

## Static stability when consequential

Contact alone does not imply plausible support. For large props, vehicles, furniture, machinery, or other stability-sensitive static objects, project the center of mass (or a documented proxy) onto the support plane and verify that it lies within the effective support polygon or an accepted stability region.

Do not require center-of-mass checks for every decorative pebble. Apply them when a visibly unstable placement would break the product thesis or when the object participates in physical interaction.

## Attachment and non-ground support

For `parent/socket`, wall/ceiling mounted, suspended, or buoyant objects, validate the relevant constraint instead of ground distance:

- support target exists and has a stable ID;
- attachment/socket transform is valid;
- expected orientation/offset relation is satisfied;
- no impossible collision or clearance failure is introduced;
- dynamic support is revalidated after the parent/support state changes.

## Temporal revalidation

Re-run applicable support checks after events that can invalidate contact:

- spawn/load;
- procedural/regenerative placement;
- terrain deformation or state change;
- parent/socket motion;
- user manipulation;
- physics settling;
- LOD/representation swaps that change collision/support geometry.

A placement that was valid only at initialization is not a durable spatial contract.

## Local co-repair

When contact cannot be solved by object transform alone, a local terrain/support repair may be valid if the product allows it. Restrict edits to the support region and preserve global terrain semantics. Record whether the repair changed the object, support surface, or both.

## Bounds and finite-state checks

Before visual review, reject or quarantine:

- NaN/Infinity transforms;
- zero or near-zero scales;
- inverted/non-finite bounds;
- duplicate stable IDs;
- objects outside declared world bounds without an exception;
- missing support semantics for contact-critical objects;
- missing LOD/representation assignment where required;
- camera near/far clipping that erases a critical subject.

## Navigation and interaction clearance

Placement quality includes runtime usability. Validate required clearance around doors, paths, manipulators, vehicles, spawn points, measurement probes, and interaction hotspots.

## Evidence hierarchy

A spatial hook records structured evidence; it does not get to certify itself. Prefer this hierarchy:

`raw support probes / constraint state → spatial audit → target-size capture → review`

If structured evidence and the image disagree, treat the placement as unresolved and repair the owning layer. Do not write `floatingDistance: 0` or `contactValidated: true` merely because the value is convenient for an audit.
