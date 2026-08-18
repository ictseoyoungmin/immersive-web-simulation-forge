# Flagship asset fidelity gates

Use this contract for **flagship spatial products** and for any showcase that explicitly promises realistic, reference-driven, premium, production-like, or high-fidelity object/world presentation. It strengthens the existing Asset Router and ObjectSpec discipline; it does not create a fourth quality ledger.

## Contents

- Applicability and identity-critical coverage
- Near/Mid/Far authoring floors
- Primitive placeholder policy
- Runtime and multi-view evidence
- Completion blockers

## Why this exists

A spatial product can have excellent simulation state, world topology, and deterministic placement while still looking like a blockout. In a flagship, that is a product failure rather than a cosmetic defect. `box building × 100` does not become a finished city because its collisions, IDs, and metrics are correct.

The common failure is declaration escape: the plan says `hybrid`, `near=explicit`, or `reference_critical_objects=not-applicable`, while the rendered hero region is still primitive-only. v0.7 therefore requires runtime evidence that the declared asset strategy reached the screen.

## Applicability

For `ambition=flagship` and `spatial.applicable=true`, set `asset_fidelity.applicable=true`.

`not-applicable` is allowed only when the spatial product is genuinely `scope_mode=non-object` (for example an abstract field visualization) and records a concrete `non_object_identity_rationale`. A full-window world or game arena cannot use `non-object` to bypass asset quality.

Choose:

- `style_mode`: `realistic`, `reference-driven`, `stylized`, `low-poly`, `abstract`, `technical`, or `mixed`;
- `scope_mode`: `single-subject`, `multi-object`, `world-scale`, or `non-object`.

Deliberate low-poly is valid. Unfinished primitive substitution is not.

## Identity-critical coverage

A flagship object/world scope requires:

- at least one **identity-critical class**;
- at least one runtime **hero asset**;
- for `world-scale`, at least one **representative asset family** in addition to the hero;
- a provenance/authoring route for each identity-critical class.

Reality-derived scenes such as cities, vehicles, aircraft, machinery, architecture, ships, industrial equipment, interiors, vegetation, or recognizable infrastructure are reference-sensitive by default. Do not mark all such subjects `not-applicable` merely because exact photogrammetric matching was not requested.

`identityCritical` marks one representative instance per identity-critical class, not every repeated instance of that class — each `identityCritical` object owes its own multi-view evidence (see Evidence minimum below), so marking every rock stack, buoy, or house in a repeated set `identityCritical:true` multiplies that evidence requirement per instance instead of once per class. Repeated members of the same class belong in `families[]` instead, which the runtime and audit only require aggregate `memberCount`/`variantCount` and one representative evidence set for, not per-member multi-view review. A hero building has one `identityCritical` runtime record; the 40 background houses around it are a `families[]` entry, not 40 more `identityCritical` records.

## Near / Mid / Far authoring floors

Record authoring budgets, not only LOD distances.

### Near

Near is the inspection and interaction band. Require:

- explicit or intentionally authored representation;
- silhouette/form sufficient for target-size close viewing;
- material regions rather than one undifferentiated color when the subject requires them;
- surface response appropriate to the visual thesis (roughness, normal/detail, weathering, wetness, decals, etc. as applicable);
- support/contact and collision evidence;
- an explicit shadow policy;
- deterministic variant policy for repeated objects.

### Mid

Require representative families, controlled variation, simplified but coherent materials, and intentional instancing/LOD. Repetition without family variation is a defect when it creates visible tiling/cloning.

### Far

Prioritize silhouette, macro material, atmospheric integration, skyline/landform rhythm, and transition stability. Do not spend near-band geometry budget on invisible details.

## Primitive placeholder policy

For realistic, reference-driven, technical, mixed, or ordinary stylized flagships:

- identity-critical objects may not remain primitive-only placeholders;
- near-field placeholder ratio should normally be `<= 0.15`;
- repeated primitive boxes/cylinders that visually define the hero view are blockers even if the numeric ratio passes;
- exceptions must name the object/class and explain why the primitive is the intended final representation.

`low-poly` and `abstract` may opt into `intentional_primitive_style=true`. This is a style contract, not an excuse: silhouette, proportion, material grouping, contact, composition, and multi-view evidence still apply.

## Evidence minimum

A flagship hero asset should normally have evidence for:

1. hero/default view;
2. three-quarter view;
3. side or rear structural view;
4. close material/surface view;
5. ground/support/contact view when spatial contact matters.

The global asset evidence set must include at least three prepared views and target-size review. World-scale scenes also need representative near and mid family evidence.

The browser may expose:

```js
window.__FORGE__.reportAssetEvidence = () => ({
  styleMode: 'realistic',
  scopeMode: 'world-scale',
  intentionalPrimitiveStyle: false,
  targetSizeReviewed: true,
  evidenceViews: ['hero', 'harbor-close', 'residential-mid', 'contact'],
  objects: [
    {
      id: 'harbor-crane-hero', class: 'harbor-crane', band: 'near',
      identityCritical: true, hero: true,
      representation: 'retrieved+authored', primitiveOnly: false, placeholder: false,
      materialRegions: 4, contactValidated: true, shadowPolicy: 'cast+receive',
      silhouetteReviewed: true,
      evidenceViews: ['hero', 'three-quarter', 'rear', 'close-material', 'contact']
    }
  ],
  families: [
    { id: 'residential-houses', memberCount: 42, variantCount: 7, evidenceViews: ['representative-mid'] }
  ]
});
```

Run the browser evidence suite, then run `asset_fidelity_audit.mjs` over the browser report or a raw asset-evidence JSON document. Preserve the audit result as `.forge/asset-fidelity-audit.json`. When a `FORGE_PLAN.json` sits next to the evidence file (the standard `.forge/` layout), the audit auto-discovers it and cross-checks that every declared `identity_critical_classes` entry has at least one matching runtime `identityCritical` object of that `class` — a declared class with zero runtime coverage fails the audit even if the aggregate identity-critical count is nonzero. Point elsewhere with `--plan <path>` or override the class list directly with `--identity-classes a,b,c`.

`asset_fidelity_audit.mjs` and the `forge.py` gates it feeds only check that the `reportAssetEvidence()` payload is internally consistent and complete (fields present, ratios within ceiling, view counts met). They cannot see the render. `primitiveOnly:false`, `silhouetteReviewed:true`, and `materialRegions:6` are claims the runtime code makes about itself — a mesh assembled from twenty boxes is honestly "not primitive-only" by that flag and can still look unconvincing. Before recording any of these fields as the basis for a `pass`, the authoring agent must open the actual capture named in `evidenceViews` and judge it by eye: does the silhouette read as intended at target size, does the material look like the stated substance, would a human call this a finished asset rather than a dressed-up blockout? A passing structural audit is necessary but not sufficient for flagship completion; it is not a substitute for having looked at the picture.

## Completion rule

For a flagship spatial product, completion is blocked when any of these is true:

- asset-fidelity contract is missing or marked not-applicable without a valid non-object scope;
- no identity-critical asset/hero exists for an object-based scene;
- world-scale asset families are missing;
- a realistic/reference-driven identity-critical asset is primitive-only;
- near placeholder ratio exceeds the declared ceiling;
- near material/contact/shadow evidence is absent;
- multi-view/target-size evidence is absent;
- runtime asset-fidelity audit is missing or failing;
- unresolved `ASSET`, `MATERIAL`, or `REPRESENTATION` blocker remains;
- a `pass` was recorded from `reportAssetEvidence()` fields without the authoring agent having opened and visually judged the corresponding capture.

Do not lower ambition labels to make a failed flagship pass unless the user explicitly accepts the lower bar.
