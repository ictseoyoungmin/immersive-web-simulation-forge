# World authoring: global structure before local detail

Use this reference when a product contains a freely navigable or consequential 3D spatial world. Do not apply it to non-spatial products merely because they use WebGL.

## WorldSpec is a spatial contract, not a scene dump

Record world scale/extents, stable regions/relations, terrain authority, traversal routes/gates, landmark hierarchy, asset/material families when present, interaction/system regions, and near/mid/far policies. Coordinates alone are insufficient when relations such as adjacent/contains/connects/upstream/downhill/reachable affect construction.

## Global → regional → object

Construct in this order unless the project has a documented reason not to:

1. world thesis;
2. WorldSpec;
3. global skeleton;
4. semantic regions;
5. terrain/routes;
6. landmarks;
7. representative regional composition;
8. object population when the world uses object assets;
9. spatial reconciliation;
10. runtime coupling.

Do not build every region to final detail before one representative slice is proven.

## Semantic spatial fields

Represent consequential region membership as inspectable weights/IDs where useful. Terrain, placement, ecology, shading, sound, routes, events, and representation policy should consume shared semantics rather than re-encoding the same phenomenon independently.

## Terrain hierarchy and authority

Record terrain authority, units, operator ranges, boundary blending, water/non-height-field exceptions, and deterministic seed/replay policy where required.

**Support-relevant visible terrain must share authority with placement/collision queries.** If the GPU adds displacement that changes apparent ground height, expose equivalent support sampling or validate a bounded discrepancy; do not certify objects against a stale CPU height field while rendering another surface.

## Terrain-aware scattering

Repeated terrain assets should sample semantic affinity, elevation/slope/normal, density, separation, route/interaction clearance, silhouette budget, and distance policy. Functional or identity-critical objects should usually use explicit/regional placement.

Scattering produces candidate x/z positions, not automatic support validity. Resolve each accepted object's support mode and vertical/orientation placement against the authoritative surface before commit.

## Regional/generative proposals

Generated appearance remains a proposal:

`canonical 3D state → evidence view → proposal → reconstruction/procedural build → spatial reconciliation → canonical update`

Preserve camera parameters when a 2D proposal must be reprojected into 3D.

## Landmark and traversal continuity

Validate route continuity, landmark visibility, progression/recovery reachability, collision/nav clearance, required open space, and authored/explorable extent claims.

## Authoring fidelity bands

- **Near** — explicit geometry where needed, full material response, accurate support/contact/collision, interaction, unique detail when justified.
- **Mid** — coherent families or structures, simplified geometry/materials, instancing/proxies, reduced updates.
- **Far** — silhouette/macro material/atmosphere; no irrelevant interaction.

A singular world does not need to invent a repeated family. Repeated-family evidence is required when repeated families materially define the experience.

## Representative world slice

Before expansion prove the minimum global skeleton, one representative region, one hero/identity subject **when the world is object-centric**, a representative repeated family **when one is materially used**, one placement/contact path for support-relevant content, one runtime interaction, multi-view evidence, and a deterministic spatial check.

## Common failure modes

Reject/repair disconnected dioramas, object-count-as-richness, eyeballed generated placement, identical vocabulary at every distance, landmarks with no traversal role, semantic/material drift, floating/penetrating/slope-incompatible objects, support queries that disagree with rendered ground, accidental airborne classification, and nominal world-area claims not backed by actual bounds.
