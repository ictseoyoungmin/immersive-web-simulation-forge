# World authoring: global structure before local detail

Use this reference when a product contains a freely navigable or consequential 3D spatial world. Do **not** apply it to non-spatial products merely because they use WebGL.

## Contents

- WorldSpec and global-to-local construction
- Semantic fields, terrain, and scattering
- Regional proposals, landmarks, and traversal
- Authoring bands and representative slices
- Failure modes and flagship visual floor

## WorldSpec is a spatial contract, not a scene dump

A `WorldSpec` records the minimum global structure that must remain coherent while local detail changes. It should contain:

- world scale and authored/explorable extents;
- stable regions and semantic relationships;
- terrain authority and regional landform requirements;
- traversal graph, routes, gates, and navigation exclusions;
- landmark hierarchy and orientation cues;
- asset and material families with reuse policy;
- interaction zones and systemic regions;
- near/mid/far authoring policies.

Coordinates alone are insufficient. Record relations such as `adjacent`, `contains`, `connects`, `overlooks`, `upstream`, `downhill`, and `reachable` when they affect construction or traversal.

## Global → regional → object

Construct in this order unless the project has a documented reason not to:

1. **World thesis** — what spatial experience must the world produce?
2. **WorldSpec** — regions, relations, scale, traversal, terrain authority.
3. **Global skeleton** — world bounds, major terrain masses, water, routes, horizon landmarks.
4. **Semantic regions** — soft region weights rather than isolated object clusters.
5. **Terrain and routes** — region-aware landform operators plus traversable continuity.
6. **Landmarks** — orientation, destination, and progression anchors.
7. **Regional composition** — develop only regions that need additional detail.
8. **Object population** — route each asset class through the appropriate authoring strategy.
9. **Spatial reconciliation** — support, collision, scale, slope, and clearance checks.
10. **Runtime coupling** — interaction, ecology, audio, simulation, and LOD consume the same state.

Do not build every region to final detail before a representative regional slice is proven.

## Semantic spatial fields

Represent region membership as soft weights where possible. A semantic field may expose channels such as biome, wetness, hazard, walkability, settlement affinity, vegetation density, or interaction intensity. Consequential consumers should sample the same field instead of re-encoding the same phenomenon independently.

A useful field has:

- stable region IDs;
- normalized or inspectable weights;
- boundary blending;
- deterministic sampling;
- explicit consumer mapping;
- serialization or regeneration policy.

## Terrain hierarchy

For height-field terrain, a robust regional model is conceptually:

`height = blended(base elevation + multi-frequency noise + geomorphic operators)`

Operators may include ridge, basin, terrace, dune, erosion approximation, river incision, cliff, or plateau. The exact implementation is provider-neutral. What matters is that regional semantics, material assignment, scattering, and terrain shape share the same spatial partition.

Record:

- terrain authority (`height-field`, explicit mesh, SDF, tiled mesh, external source);
- world scale and unit system;
- base elevations and operator ranges;
- boundary blending width;
- water and non-height-field exceptions;
- deterministic seed/replay policy where required.

## Terrain-aware scattering

Repeated terrain assets should be sampled from policy rather than uniform randomness. Typical factors:

- semantic affinity;
- elevation and slope;
- surface normal;
- density field;
- minimum separation;
- route and interaction clearance;
- visibility/silhouette budget;
- near/mid/far representation policy.

Functional or identity-critical objects should usually be deferred to regional planning or explicit placement.

## Regional composition and generative proposals

When a generative model is useful, condition it on the existing canonical world state. A terrain render, camera, region specification, or document state may be used to propose local composition. The generated output remains **evidence/proposal**, not authoritative geometry or placement.

Use the pattern:

`canonical 3D state → evidence view → generative proposal → reconstruction/procedural build → spatial reconciliation → canonical state update`

Render the existing canonical terrain from the intended camera **before** invoking the generative step, and pass that render — not just a text description — as the primary conditioning image, together with the regional specification and any optional concept reference. Conditioning on the actual terrain render rather than the region spec alone is what keeps local topography, material continuity, and viewpoint consistent with the already-established world; a generator prompted from text/spec alone tends to invent ground that does not match what is already there.

Preserve camera parameters whenever a 2D proposal must be reprojected into 3D.

## Landmark and traversal continuity

A world is not coherent because every region looks attractive. Validate:

- major route continuity across region boundaries;
- landmark visibility from intended approach paths;
- reachable progression and recovery routes;
- collision/nav clearance around populated regions;
- no generated content closing required open space;
- authored/explorable extent claims against actual bounds.

## Authoring fidelity bands

Treat near/mid/far as authoring budgets as well as render LOD.

- **Near** — explicit geometry, full materials, accurate contact/collision, interaction, unique assets where justified.
- **Mid** — asset families, simplified geometry/materials, shared collisions, instancing, reduced update rates.
- **Far** — silhouette and macro material, impostors or low-detail representation, atmospheric integration, no irrelevant interaction.

Fidelity should depend on both region importance and view scale.

## Representative world slice

Before large expansion, prove one slice containing:

- the global skeleton needed to understand the world;
- one representative semantic region;
- one hero or identity-critical asset;
- one terrain/object placement and contact path;
- one runtime interaction that propagates through multiple consumers;
- one multi-view evidence set and spatial audit.

## Common failure modes

Reject or repair:

- disconnected local dioramas instead of one global terrain structure;
- object-count density used as a substitute for semantic richness;
- generated 2D composition written directly into world coordinates by eye;
- identical asset vocabulary at every distance;
- landmarks with no traversal or orientation role;
- terrain materials that ignore the semantic region map;
- floating, penetrating, or slope-incompatible placements;
- world-area claims based on a nominal size rather than verified authored/explorable bounds.

## v0.7 flagship visual floor

For a world-scale flagship, Near/Mid/Far are enforceable authoring floors as well as LOD policies. The representative slice must prove one finished hero asset and one repeated family; primitive-only Near identity, visible clone tiling, missing material regions, or absent target-size multi-view evidence blocks expansion/completion. See `asset-fidelity-gates.md`.
