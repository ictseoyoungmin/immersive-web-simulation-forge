# Changelog

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
