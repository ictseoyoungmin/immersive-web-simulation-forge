# Spatial reconciliation

Use deterministic geometry and domain constraints to reconcile authored, generated, reconstructed, or retrieved content with canonical scene state.

## Principle

`generated appearance ≠ authoritative placement`

The authoritative transform should come from explicit geometry, camera evidence, support surfaces, constraints, or a documented manual decision.

## Camera-grounded placement

When a 2D composition or reference image determines where an object should appear:

1. preserve the source camera intrinsics/extrinsics or an equivalent projection model;
2. record crop/resize transforms applied before reconstruction;
3. map the object reference pixel back into the source view;
4. cast a ray into the authoritative terrain/scene;
5. choose a valid positive intersection or support surface;
6. reconcile scale using projection/depth or a known dimension — see image-space scale calibration below when only a reference footprint is known;
7. reconcile orientation using camera relation, semantic pose, and surface normal;
8. run contact, collision, and clearance checks;
9. commit the transform only after the placement passes or is explicitly reviewed.

## Image-space scale calibration

Single-view or reference-driven reconstruction commonly gets scale wrong before any terrain contact is considered. When a reference image or footprint (bounding-box coverage, known silhouette width, a measured dimension) is available, calibrate scale before placement rather than after:

1. project the reconstructed object at a candidate scale and measure its footprint ratio (e.g. projected bounding-box area over image/view area);
2. compare against the reference footprint ratio;
3. adjust the candidate scale and repeat until the deviation is within tolerance.

Use an **asymmetric tolerance**: penalize an oversized projection more than a slightly undersized one. Single-view reconstruction more often overshoots true scale than undershoots it, and an oversized identity-critical asset is more visually damaging than a marginally small one. `kits/spatial/placement-solver.mjs#calibrateScaleByFootprint` implements this as a bracket-and-bisect search with independently configurable `toleranceOver`/`toleranceUnder`. Run this calibration first, then feed the resulting scale into placement/contact reconciliation rather than treating scale as a free parameter during contact search.

## Surface anchoring

A support solver should consider:

- ray/segment intersection;
- ground/surface normal;
- maximum permitted slope;
- object up axis;
- support footprint or bottom samples;
- vertical offset and embedding allowance;
- category-specific rules (tree, building, vehicle, prop, character).

## Contact validation

Detect at minimum:

- floating distance;
- excessive penetration;
- support ratio across the footprint;
- unstable slope;
- collision overlap with protected geometry;
- navigation clearance violations.

A small prop may use a few support samples; a building or machine should use a meaningful support polygon or multiple bottom probes.

## Local co-repair

When contact cannot be solved by object transform alone, a local terrain/support repair may be valid if the product allows it. Restrict edits to the support region and preserve global terrain semantics. Record whether the repair changed the object, support surface, or both.

## Bounds and finite-state checks

Before visual review, reject or quarantine:

- NaN/Infinity transforms;
- zero or near-zero scales;
- inverted/non-finite bounds;
- duplicate stable IDs;
- objects outside declared world bounds without an exception;
- missing LOD/representation assignment where required;
- camera near/far clipping that erases a critical subject.

## Navigation and interaction clearance

Placement quality includes runtime usability. Validate required clearance around doors, paths, manipulators, vehicles, spawn points, measurement probes, and interaction hotspots.
