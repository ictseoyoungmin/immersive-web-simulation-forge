# Flagship asset fidelity gates

Use this contract for flagship spatial products **when object/asset presentation materially contributes to product identity**, and for any showcase that explicitly promises reference-driven, premium, production-like, or high-fidelity object presentation. It strengthens Product Outcome evidence; it does not create a fourth ledger.

## Applicability

`spatial.applicable=true` and `asset_fidelity.applicable=true` are independent decisions.

Enable asset fidelity when hero/repeated objects materially define identity or interaction. A field/volume/astronomical/SDF/procedural environment may be a flagship spatial product without conventional object assets; in that case record a concrete non-object identity rationale instead of inventing a hero mesh.

Choose style mode (`realistic`, `reference-driven`, `stylized`, `low-poly`, `abstract`, `technical`, `mixed`) and scope (`single-subject`, `multi-object`, `world-scale`, `non-object`) when this contract applies.

## Reality-grounded ≠ reference-sensitive

`realistic` means believable real-world form/scale/material response. It does not automatically mean matching a specific real object.

`reference-driven` means a supplied/named reference identity is part of the promise and therefore requires reference-critical ObjectSpec/evidence.

Do not require reference reconstruction merely because an invented city, vehicle class, or industrial scene is realistic.

## Identity-critical coverage

Object-centric flagship scope requires at least one identity-critical class and runtime hero asset. World-scale work requires representative family evidence **only when repeated families materially define the scene** (`repeated_families_expected=true`).

Mark representative identity instances, not every repeated member, as identity-critical.

## Near / Mid / Far floors

Near requires target-size silhouette/form, appropriate material regions/response, support/contact/collision when applicable, deliberate shadows, and controlled variant policy for repetition.

Mid requires coherent simplified representation and controlled variation where repetition is visible. Far prioritizes silhouette, macro material, atmosphere, and transition stability.

## Primitive placeholder policy

Identity-critical objects may not remain accidental primitive placeholders. Deliberate low-poly/abstract primitive style is valid when explicitly intended and visually finished.

`near_placeholder_ratio_max` is a planning/default diagnostic, not a universal truth. Raw object-count ratios treat a tiny bolt and a hero building equally, so ratio exceedance should normally trigger review rather than certify/fail quality by itself. Identity-critical placeholders or visible hero-view blockout geometry remain hard defects regardless of the numeric ratio.

## Support/contact evidence

For near support-relevant objects, a boolean `contactValidated:true` is not sufficient evidence. Link to a passing spatial/support audit or expose raw support evidence that can be recomputed. Ground contact is not required for intentionally airborne/suspended/buoyant objects; their support semantics must instead be explicit and valid.

## Evidence minimum

Choose consequential views rather than a ritual fixed count. A hero asset will often need hero/default, three-quarter, side/rear structural, close material, and support/contact views when those claims matter. Global evidence should still provide enough views to disambiguate 3D form at target size.

Runtime reports are claims about code state. Open the actual capture and visually judge silhouette, proportion, material identity, support, and finishedness before recording pass.

## Completion blockers

Block completion for missing applicable asset contract, uncovered identity-critical classes, accidental primitive hero assets, absent required material/support evidence, insufficient target-size/multi-view evidence, a failing asset audit, or unresolved ASSET/MATERIAL/REPRESENTATION blockers.

Do not block a genuinely non-object flagship merely because it has no hero mesh, and do not lower ambition labels solely to bypass an applicable gate.
