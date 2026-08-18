# Changelog

## 0.8.1 — Technique Conformance Hardening

v0.8.1 is a review-driven hardening pass on v0.8.0's canonical-technique disclosure mechanism, found before the planned three-slice dogfood run. The `canonical_technique`/`authoritative_model` string comparison introduced in v0.7.1 was structurally unsound in both directions: an honest, detailed `authoritative_model` almost never matches a short technique label verbatim (false positive — every conformant implementation got flagged as deviating), while copying the label verbatim into `authoritative_model` made the check pass with nothing useful recorded (false negative). Worse, leaving `canonical_technique` empty skipped the whole check — the exact silent-substitution escape hatch v0.7.1 was written to close.

### Changed

- `domain.technique_conformance` (`conformant` / `approximation` / `alternative` / `not-applicable`) replaces string-diffing as the disclosure mechanism. It is a declared judgment, required for every product unconditionally — the same way `claim_level` already was — so it can no longer be silently skipped by leaving fields blank.
- `domain.implemented_technique` is new: a short technique-identity label parallel to `canonical_technique`, so the two are structurally comparable. `domain.authoritative_model` keeps its original role as the full prose description and is no longer compared character-for-character against anything.
- `domain.technique_deviation_reason` is now required whenever `technique_conformance` is not `conformant`, including `not-applicable` (which also requires `canonical_technique` to stay empty — naming a canonical technique while claiming none applies is a contradiction, not an exemption).
- `VALIDATION.json`'s `domain_validation` mirrors all four fields; `forge.py`'s runtime check now branches on `technique_conformance` instead of a recomputed string diff.
- `references/physics-simulation.md`'s canonical technique floor section rewritten to describe the new field shape.
- `SKILL.md`, `skill.yaml`, `.claude-plugin/marketplace.json`, and `.codex-plugin/plugin.json` no longer assert a specific version number in their own description text — that stale-self-description problem is exactly what prompted this fix in the first place, so the description text should not need touching at every release again.
- `references/wave-and-fluid-surfaces.md`: the spectral cascade description claimed coverage down to "capillary-scale detail" while only stating the pure-gravity dispersion relation `ω²=g·k·tanh(k·h)`, which does not hold below roughly 1.7 cm. Added the gravity-capillary dispersion relation for cascades that genuinely need that band, and reworded the default claim to "short-gravity-wave detail" for cascades that do not.
- `references/fire-smoke-and-reactive-flow.md`: "both ledgers must pass their own evidence" reworded to "domain validity and perceptual/rendering evidence must each pass on their own terms" — Forge has exactly three ledgers (Product Outcome / Domain Validity / Runtime Engineering); the old phrasing read as inventing a fourth.

### Dogfooding fixes

- `forge.py migrate` no longer no-ops for a project already at `PLAN_VERSION`/`VALIDATION_VERSION`. It now back-fills any template keys missing from an existing plan (such as `implemented_technique`/`technique_conformance`, added within v6 rather than at a version bump) and writes a versioned backup, so an existing v0.8.0 project does not start failing audit with no automated upgrade path.
- That backfill originally defaulted `technique_conformance` straight from the template (`not-applicable`) regardless of the plan's existing content, which self-contradicted a project that had already disclosed a `canonical_technique` — exactly the v0.7.1 disclosure case. It now lands on `approximation` instead when `canonical_technique` is already populated, which fails audit with an actionable prompt (fill in `implemented_technique`/`technique_deviation_reason`) rather than a confusing self-contradiction. Verified empirically end to end: a realistic, previously-passing v0.8.0-shaped project — including one that had already disclosed a canonical technique — fails audit cold under v0.8.1 and passes again after `migrate`.
- The same-version backfill only upgraded `VALIDATION.json` when its version already equaled `VALIDATION_VERSION`, so a plan already at v6 paired with a stale (e.g. v5) `VALIDATION.json` fell into a gap neither migration branch covered. It now upgrades any validation file at or below the current version.
- The plan-side and runtime-side technique-conformance checks were two hand-duplicated four-way branches that had already drifted: the runtime `not-applicable` branch checked only that `technique_deviation_reason` was set, not that `canonical_technique` stayed empty, so a runtime report could contradict its own `not-applicable` declaration and still pass. Both now call one shared `technique_conformance_check()` so this class of drift can't recur silently.
- `domain_validation.technique_conformance` itself was never checked against the plan's declared `technique_conformance` — only used implicitly to pick a branch — the same way `claim_level` already is (`claim_match`). A bogus or mismatched runtime value went undetected; added a `runtime technique conformance matches plan` check.
- `technique_conformance_check()`'s `not-applicable` branch did not require `implemented_technique`, letting a product ship with no record of what was actually built whenever it claimed no canonical counterpart exists — inconsistent with `physics-simulation.md`'s "declare this every time" framing for the field. `not-applicable` now requires it too.
- `forge.py`'s own user-facing strings (`plan schema`/`validation schema` check messages, the CLI `--help` banner) still hardcoded "v0.7" — the exact stale-self-description problem this release's `SKILL.md`/manifest fix was supposed to close, just missed in the tool itself.
- `references/physics-simulation.md`'s canonical technique floor section stated the `not-applicable`-requires-a-rationale rule twice in two different vocabularies (old `canonical_technique`-centric phrasing beside the new `technique_conformance`-centric paragraph); removed the redundant restatement.

## 0.8.0 — Physical Fields to Radiance Reference Expansion

v0.8 extends the canonical-technique-floor pattern introduced in v0.7.1 from water alone to the full causal chain a hero visualization can claim: physical fields (water, wind, fire/smoke) through to final radiance (PBR materials, real-time GI, path-traced reference, volumetric media). No new ledger, schema field, or profile gate is introduced — every new reference reuses the `domain.canonical_technique` / `domain.authoritative_model` / `domain.technique_deviation_reason` triad shipped in v0.7.1.

### Added

- `references/wave-and-fluid-surfaces.md` rewritten to cover three regimes — open-water wind waves, shallow-water flow, and local free-surface liquid — instead of open-water spectral synthesis alone.
- `references/wind-and-atmospheric-flow.md`: one authoritative wind state shared by ocean, vegetation, smoke, cloth, audio, and gameplay consumers, with fidelity tiers from procedural divergence-free fields to CFD-grade flow.
- `references/fire-smoke-and-reactive-flow.md`: Eulerian flow plus advected combustion scalars as the canonical interactive model; state evolution stays separate from `volumetric-rendering.md`'s appearance layer.
- `references/lighting-and-radiance.md`: routing contract from authoritative lighting state to the four light-transport references below.
- `references/surface-scattering-and-pbr-materials.md`: energy-aware microfacet BRDF floor and material parameterization discipline.
- `references/real-time-global-illumination.md`: transport-coverage-matched-to-dynamism as the canonical requirement, plus a named list of GI silent-substitution defects (ambient term labeled `GI`, SSAO as indirect light, baked light surviving a claimed-dynamic change, etc.).
- `references/reference-light-transport-and-path-tracing.md`: Monte Carlo/path-tracing oracle contract for hardening a shipping raster/hybrid renderer, not a requirement that every product path trace at runtime.
- `references/volumetric-rendering.md`: radiative-transfer-informed transmittance/scattering/emission floor for fog, smoke, fire, and other participating media.
- `SKILL.md` Phase B routing extended to wind, fire/smoke, and lighting/material/GI/volumetric claims.

### Guardrails

- Real-time global illumination explicitly has no single canonical algorithm — the floor is transport coverage matched to scene dynamism, not a mandated technique.
- `monte-carlo-integration.md` is deliberately not split out as its own reference; sampling/MIS theory stays inside `reference-light-transport-and-path-tracing.md` to keep the reference set product-oriented rather than a rendering textbook.
- This is a reference/documentation expansion only. The three-slice dogfood validation it calls for (water+wind, radiance core, reactive volume) has not been run yet; treat the new references as unverified against a real build until that happens.

## 0.7.1 — Canonical Technique Disclosure

v0.7.1 is a dogfooding fix. A full-window-world ocean showcase shipped a hand-tuned finite-sum wave approximation under a `visual-concept` claim level with no requirement to disclose that an established canonical technique (FFT/spectral ocean synthesis) exists and was not used, because the domain rigor gates only applied to `DOMAIN_PROFILES` (`simulation-lab`, `design-studio`, `data-instrument`, `operations-panel`).

### Added

- `domain.canonical_technique` and `domain.technique_deviation_reason` in `FORGE_PLAN.json`/`VALIDATION.json`. Schema stays v6; both fields are additive and backward-compatible.
- `references/wave-and-fluid-surfaces.md`: the dispersion relation, Tessendorf/Horvath spectral synthesis as the canonical ocean technique, when a finite-sum approximation is legitimate, Jacobian-driven foam, and WebGPU compute placement.

### Dogfooding fixes

- `forge.py` requires `technique_deviation_reason` whenever a declared `canonical_technique` differs from `authoritative_model`, checked independently of `profile` so `full-window-world`, `game-arena`, and `ambient-system` flagships can no longer bypass technique disclosure the way `DOMAIN_PROFILES`-gated checks allowed.
- `references/physics-simulation.md` names this failure mode explicitly as a canonical technique floor instead of relying on a general warning against replacing governing relationships with heuristics.

## 0.7.0 — Structured Spatial Authoring & Flagship Asset Fidelity

v0.7 preserves the Forge's three independent ledgers—Product Outcome, Domain Validity, and Runtime Engineering—and its eight-phase workflow while adding structured spatial construction, hybrid asset orchestration, deterministic reconciliation, and enforceable flagship asset-fidelity gates.

### Added

- `authoring_strategy` with authored, procedural, reconstructed, generative, retrieved, and hybrid routes.
- Conditional `WorldSpec`, semantic regions and fields, terrain/traversal authority, regional composition, and Near/Mid/Far authoring policies.
- Provider-neutral Asset Router and reference-critical `ObjectSpec` discipline.
- Deterministic surface anchoring, placement solving, image-space scale calibration, support/contact validation, collision checks, and spatial audit tooling.
- `FORGE_PLAN.json` and `VALIDATION.json` v6 contracts for construction, spatial, evidence-review, and asset-fidelity state.
- Flagship identity-critical classes, hero assets, world-scale representative families, primitive-placeholder ceilings, material/contact/shadow requirements, and target-size multi-view evidence.
- `window.__FORGE__` evidence hooks and `asset_fidelity_audit.mjs` runtime evidence auditing.
- World, spatial, and asset-authoring capability kits under `kits/world`, `kits/spatial`, and `kits/authoring`.
- v4/v5 to v6 migration with versioned backups and regression coverage.

### Changed

- `LodBands` now carries representation, geometry, material, shadow, interaction, density, and update policy while preserving v0.6 behavior.
- `WorldDirector` can target region graphs and semantic fields.
- Browser verification supports deterministic evidence suites and optional scene, spatial, and asset reports.
- Flagship spatial completion requires `asset_fidelity_validation=pass` and a passing audit produced with `--flagship`.
- Realistic/reference-driven flagships cannot declare every identity object non-reference-critical.
- World-scale flagships require both a hero asset and a representative repeated family.
- Claim level now controls certification burden rather than licensing arbitrary simulation heuristics; claimed phenomena still require governing state and relationships.
- Software-renderer measurements are correctness/stress evidence only and block representative flagship performance certification.
- `forge.py doctor` reports Playwright availability before browser/evidence verification is promised.
- SKILL instructions use progressive disclosure; detailed world, asset, spatial, fidelity, and hardening rules live in routed references.

### Dogfooding fixes

- Require `flagship=true` in `.forge/asset-fidelity-audit.json` before it can certify a flagship package.
- Clarify that runtime self-reports are claims: the authoring agent must open and judge referenced captures before recording visual or asset passes.
- Add asymmetric image-space footprint calibration before placement/contact reconciliation.
- Require canonical terrain rendering as the primary conditioning image for terrain-bound generative regional proposals.

### Guardrails

- Asset fidelity remains Product Outcome evidence rather than a fourth ledger.
- Low-poly and abstract styles may intentionally use primitives but still require silhouette, proportion, grouping, contact, composition, and multi-view evidence.
- Generated and reconstructed content remains proposal-only until deterministic reconciliation.
- Blender, a specific model/provider, and WorldSpec for non-world products remain optional.
- v0.7 does not promise one-prompt production worlds or automatic perceptual quality.
