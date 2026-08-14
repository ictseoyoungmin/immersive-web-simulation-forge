# Evidence-driven hardening

Replace "looks okay" with a compact loop that produces inspectable evidence and targeted repairs.

## The hardening loop

For each consequential round:

1. **Capture** — deterministic state, target size, named view/scenario.
2. **Inspect** — open the capture and look at it. Compare what you actually see against the product thesis, spec, domain oracle, and previous evidence. A runtime self-report (`reportAssetEvidence`, `reportSpatialEvidence`, and similar hooks) records what the code believes about itself, not what the capture shows; treat its booleans and counts as an unverified claim until you have viewed the corresponding image yourself.
3. **Classify** — identify the defect category instead of jumping directly to code edits.
4. **Prioritize** — blockers before polish; upstream failures before downstream passes.
5. **Repair** — modify the correct layer: spec, implementation, data/model, representation, asset, placement, material, or performance path.
6. **Re-capture** — same view plus any new view required to disambiguate the result.
7. **Regression review** — verify that the repair did not break already locked passes or another ledger.

Flagship work should preserve compact before/after evidence in `.forge/`, not in the user package.

## Defect taxonomy

Use these categories:

- `SPEC` — requirements/specification are incomplete or internally wrong;
- `IMPLEMENTATION` — code does not implement the accepted spec;
- `DOMAIN` — model, units, solver, data, or claim evidence is invalid;
- `REPRESENTATION` — chosen renderer/geometry/asset representation cannot satisfy the requirement;
- `ASSET` — geometry/component/reference fidelity defect;
- `PLACEMENT` — scale, pose, support, collision, or spatial relation defect;
- `MATERIAL` — material identity, scale, response, or region assignment defect;
- `PERFORMANCE` — measured runtime budget defect;
- `INSUFFICIENT_EVIDENCE` — current views/tests cannot establish the cause or pass state.

Each defect should record category, severity, owner/action layer, evidence reference, and disposition.

## Repair routing

- `SPEC` → refine spec/plan;
- `IMPLEMENTATION` → repair code;
- `DOMAIN` → repair model/data or lower the claim;
- `REPRESENTATION` → change stack/representation/provider boundary;
- `ASSET` → rebuild/reconstruct/replace asset;
- `PLACEMENT` → rerun deterministic reconciliation;
- `MATERIAL` → repair material family/scale/lighting robustness;
- `PERFORMANCE` → profile the measured bottleneck before lowering quality;
- `INSUFFICIENT_EVIDENCE` → capture another consequential view or test.

## Pass locking

Use applicable passes rather than one universal checklist:

`structure → spatial → domain → interaction → appearance → performance → delivery`

A pass may be `pass`, `fail`, or `not-applicable`. Do not mark downstream work final while an upstream applicable pass is failed. Experimental work is allowed; certification is not.

## Multi-angle evidence

For 3D or spatial flagship work, choose consequential evidence rather than always capturing the same seven views. Candidate views/states:

- hero/default;
- alternate angle;
- side/rear when silhouette or attachment matters;
- close-up for contact/material/component evidence;
- interaction/transformed state;
- failure/recovery state;
- stress/performance state.

Record critical subjects and which view proves each one. Review at target CSS size and 100% browser zoom.

## Browser hooks

Projects may expose optional hooks:

```js
window.__FORGE__ = {
  prepareVerification(scenario) {},
  verifyWorkflow(scenario) {},
  verifyDomain(scenario) {},
  prepareEvidenceView(view, scenario) {},
  reportScene() {},
  reportSpatialEvidence() {},
  reportFidelity() {}
};
```

Hooks return structured evidence. They should not secretly alter the product solely to satisfy an audit.

**Self-report is not evidence of quality.** A hook can only report what the code already believes — a material-region count, a `primitiveOnly` flag, a `silhouetteReviewed` boolean — and code can be honestly wrong about its own visual result (a flipped triangle winding, a tiling material, a technically-non-primitive mesh that still reads as a blockout). Never transcribe a hook's fields directly into `VALIDATION.json` or `asset_fidelity_validation` without first opening the capture the hook describes and confirming it by eye. If the capture and the self-report disagree, the capture wins; file the defect against `ASSET`, `MATERIAL`, or `REPRESENTATION` and repair it before recording `pass`.

## Evidence state matrix

For a scenario suite, record the product state, camera/view, interaction state, expected invariant, and captured result. Keep capture and performance runs separate.
