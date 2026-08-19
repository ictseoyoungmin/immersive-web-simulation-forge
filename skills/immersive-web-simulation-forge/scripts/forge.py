#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import py_compile
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from typing import Any, Iterable

SKILL_ROOT = Path(__file__).resolve().parents[1]
PLAN_LOCATIONS = (Path('.forge/FORGE_PLAN.json'), Path('FORGE_PLAN.json'))
VALIDATION_LOCATIONS = (Path('.forge/VALIDATION.json'), Path('VALIDATION.json'))
KNOWN_FORGE_TOOLS = {
    'score_guard.py', 'visual_diff.py', 'audit_project.py', 'build_inline.py',
    'browser_verify.py', 'static_check.py', 'make_validation_report.py', 'fidelity_audit.mjs', 'asset_fidelity_audit.mjs', 'spatial_audit.mjs', 'input_audit.mjs'
}
EXCLUDED_PARTS = {'.git', '.forge', 'evidence', 'coverage', 'node_modules', '__pycache__', '.pytest_cache', '.playwright'}
COMMON_RUNTIME_FILES = {
    'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
    'vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'tsconfig.json'
}
PROFILES = {
    'full-window-world', 'simulation-lab', 'design-studio', 'data-instrument',
    'operations-panel', 'dashboard-panel', 'game-arena', 'ambient-system'
}
EXPERIENCE_MODES = {'game', 'sandbox', 'instrument', 'authoring', 'ambient'}
PROFILE_MODES = {
    'full-window-world': 'sandbox',
    'simulation-lab': 'instrument',
    'design-studio': 'authoring',
    'data-instrument': 'instrument',
    'operations-panel': 'instrument',
    'dashboard-panel': 'instrument',
    'game-arena': 'game',
    'ambient-system': 'ambient'
}
DOMAIN_PROFILES = {'simulation-lab', 'design-studio', 'data-instrument', 'operations-panel'}
CLAIM_LEVELS = {'visual-concept', 'educational', 'decision-support', 'engineering'}
TECHNIQUE_CONFORMANCE_STATES = {'conformant', 'approximation', 'alternative', 'not-applicable'}
WORKLOADS = {'interactive', 'batch', 'streaming', 'long-running'}
AUTHORING_STRATEGIES = {'authored', 'procedural', 'reconstructed', 'generative', 'retrieved', 'hybrid'}
ASSET_STYLE_MODES = {'realistic','reference-driven','stylized','low-poly','abstract','technical','mixed'}
ASSET_SCOPE_MODES = {'single-subject','multi-object','world-scale','non-object'}
PLAN_VERSION = 6
VALIDATION_VERSION = 6


def read_first(root: Path, locations: Iterable[Path]) -> tuple[dict[str, Any], Path | None]:
    for rel in locations:
        path = root / rel
        if path.exists():
            return json.loads(path.read_text(encoding='utf-8')), path
    return {}, None


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def check(name: str, ok: bool, detail: str, severity: str = 'error') -> dict[str, str]:
    status = 'pass' if ok else ('warn' if severity == 'warning' else 'fail')
    return {'name': name, 'status': status, 'detail': detail}


def nonempty(value: Any) -> bool:
    return bool(str(value).strip()) if value is not None else False


def technique_conformance_check(conformance: str, canonical: str, implemented: str, reason: Any) -> tuple[str, bool, str]:
    """Shared by the plan-side and runtime-side technique-conformance checks so the two cannot
    silently drift apart the way the hand-duplicated branches did between v0.8.0 and v0.8.1."""
    canonical = canonical.strip(); implemented = implemented.strip()
    reason_ok = nonempty(reason)
    if conformance == 'not-applicable':
        name = 'technique not-applicable rationale'
        ok = reason_ok and not canonical and nonempty(implemented)
        detail = f"canonical_technique should stay empty when not-applicable (got {canonical!r}); implemented={implemented or 'missing'}; reason={'yes' if reason_ok else 'no'}"
    elif conformance in {'approximation', 'alternative'}:
        name = 'technique deviation disclosed'
        ok = nonempty(canonical) and nonempty(implemented) and reason_ok
        detail = f"canonical={canonical or 'missing'}; implemented={implemented or 'missing'}; reason={'yes' if reason_ok else 'no'}"
    else:
        name = 'technique conformance evidence'
        ok = nonempty(canonical) and nonempty(implemented)
        detail = f"canonical={canonical or 'missing'}; implemented={implemented or 'missing'}"
    return name, ok, detail


def finite_number(value: Any) -> float | None:
    try:
        number = float(value)
        return number if number == number and abs(number) != float('inf') else None
    except (TypeError, ValueError):
        return None


def iter_files(root: Path, include_excluded: bool = False) -> Iterable[Path]:
    for path in root.rglob('*'):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if not include_excluded and any(part in EXCLUDED_PARTS for part in rel.parts):
            continue
        yield path


def size_of(root: Path) -> int:
    return sum(path.stat().st_size for path in root.rglob('*') if path.is_file()) if root.exists() else 0


def implementation_bytes(root: Path) -> int:
    total = 0
    for path in iter_files(root):
        rel = path.relative_to(root)
        if rel.name in {'README.md', 'VALIDATION.json', 'FORGE_PLAN.json'}:
            continue
        if rel.suffix.lower() in {'.md'}:
            continue
        total += path.stat().st_size
    return total


def suspicious_tooling(root: Path) -> list[str]:
    found = []
    for path in root.rglob('*'):
        if path.is_file() and path.name in KNOWN_FORGE_TOOLS:
            found.append(path.relative_to(root).as_posix())
    return sorted(found)


def source_text(root: Path) -> str:
    chunks: list[str] = []
    for path in iter_files(root):
        if path.suffix.lower() not in {'.js', '.mjs', '.ts', '.tsx', '.jsx', '.html', '.css'}:
            continue
        try:
            chunks.append(path.read_text(encoding='utf-8', errors='ignore'))
        except OSError:
            pass
    return '\n'.join(chunks)



def run_fidelity_audit(root: Path, flagship: bool) -> dict[str, Any] | None:
    candidates = [root / 'index.html', *sorted(root.glob('*.html'))]
    entry = next((path for path in candidates if path.exists() and path.is_file()), None)
    if not entry:
        return None
    command = ['node', str(SKILL_ROOT / 'scripts/fidelity_audit.mjs'), str(entry)]
    if flagship:
        command.append('--flagship')
    proc = subprocess.run(command, capture_output=True, text=True)
    try:
        return json.loads(proc.stdout)
    except Exception:
        return {'status':'fail', 'findings':[{'id':'audit-execution','severity':'error','detail':(proc.stderr or proc.stdout or 'unknown fidelity audit failure').strip()}]}


def audit_project(root: Path, for_package: bool = False) -> dict[str, Any]:
    plan, plan_path = read_first(root, PLAN_LOCATIONS)
    validation, validation_path = read_first(root, VALIDATION_LOCATIONS)
    implemented = for_package or bool(validation.get('implemented', False) if validation_path else False)
    checks: list[dict[str, str]] = []

    checks.append(check('forge plan', bool(plan_path), str(plan_path or 'missing')))
    if not plan:
        return {'status': 'fail', 'project': str(root), 'checks': checks, 'metrics': {}}

    version = int(plan.get('version', 0) or 0)
    profile = str(plan.get('profile', '')).strip()
    ambition = str(plan.get('ambition', '')).strip()
    experience_mode = str(plan.get('experience_mode', '')).strip()
    delivery = str(plan.get('delivery_mode', 'lean')).strip()
    checks.append(check('plan schema', version >= PLAN_VERSION, f'version {version}; this release requires plan version {PLAN_VERSION}; run `forge.py migrate <project>` for older plans'))
    checks.append(check('profile', profile in PROFILES, profile or 'missing'))
    checks.append(check('ambition', ambition in {'prototype','production','showcase','flagship'}, ambition or 'missing'))
    checks.append(check('experience mode', experience_mode in EXPERIENCE_MODES, experience_mode or 'missing'))
    expected_mode = PROFILE_MODES.get(profile)
    if profile in {'simulation-lab', 'design-studio', 'data-instrument', 'operations-panel'}:
        checks.append(check('profile workflow mode', experience_mode == expected_mode, f'expected {expected_mode}; got {experience_mode or "missing"}'))

    request = plan.get('user_request', {})
    checks.append(check('request summary', bool(str(request.get('summary', '')).strip()), 'present' if request.get('summary') else 'missing'))
    derived = plan.get('derived_constraints', [])
    bad_constraints = []
    for item in derived if isinstance(derived, list) else []:
        required = ('name', 'reason', 'benefit', 'cost', 'rejected_alternative')
        if not isinstance(item, dict) or any(not str(item.get(key, '')).strip() for key in required):
            bad_constraints.append(item)
    checks.append(check('derived constraint fidelity', not bad_constraints, 'all additions justified' if not bad_constraints else f'{len(bad_constraints)} unjustified addition(s)'))

    experience_raw = plan.get('experience', {}) if isinstance(plan, dict) else {}
    experience = experience_raw if isinstance(experience_raw, dict) else {}
    first = experience.get('first_use', {}) if isinstance(experience, dict) else {}
    workflow = experience.get('workflow', {}) if isinstance(experience, dict) else {}
    budget = experience.get('feature_budget', {}) if isinstance(experience, dict) else {}
    scale = experience.get('scale_density', {}) if isinstance(experience, dict) else {}
    claims = experience.get('claims', []) if isinstance(experience, dict) else []
    if ambition in {'showcase', 'flagship'}:
        checks.append(check('core experience promise', nonempty(experience.get('core_promise')), str(experience.get('core_promise', '')).strip() or 'missing'))
        first_fields = ('identity', 'starting_state', 'meaningful_action', 'visible_consequence', 'next_step')
        first_missing = [key for key in first_fields if not nonempty(first.get(key))]
        checks.append(check('first use', not first_missing, 'complete' if not first_missing else f'missing {first_missing}'))
        workflow_fields = (
            'kind', 'job_to_be_done', 'entry_or_input', 'manipulate_or_run',
            'inspect_or_interpret', 'compare_or_validate', 'complete_or_export', 'recover_or_resume'
        )
        workflow_missing = [key for key in workflow_fields if not nonempty(workflow.get(key))]
        checks.append(check('complete product workflow', not workflow_missing, 'complete' if not workflow_missing else f'missing {workflow_missing}'))
        checks.append(check('workflow mode match', str(workflow.get('kind', '')).strip() == experience_mode, f"workflow={workflow.get('kind') or 'missing'}; experience={experience_mode or 'missing'}"))
        supporting = budget.get('supporting_systems', []) if isinstance(budget, dict) else []
        expansion = str(budget.get('expansion_rationale', '')).strip() if isinstance(budget, dict) else ''
        budget_ok = nonempty(budget.get('hero_system')) and nonempty(budget.get('hero_motif')) and (len(supporting) <= 4 or bool(expansion))
        checks.append(check('feature concentration budget', budget_ok, f"hero={budget.get('hero_system') or 'missing'}; supporting={len(supporting)}; expansion rationale={'yes' if expansion else 'no'}"))

    bounds = scale.get('world_bounds_m', []) if isinstance(scale, dict) else []
    computed_bounds_area = None
    if isinstance(bounds, list) and len(bounds) == 4 and all(finite_number(value) is not None for value in bounds):
        min_x, min_z, max_x, max_z = (float(value) for value in bounds)
        if max_x > min_x and max_z > min_z:
            computed_bounds_area = (max_x - min_x) * (max_z - min_z) / 1_000_000
    if profile == 'full-window-world':
        recorded_area = finite_number(scale.get('computed_area_km2')) if isinstance(scale, dict) else None
        area_matches = computed_bounds_area is not None and recorded_area is not None and abs(recorded_area - computed_bounds_area) <= max(0.0001, computed_bounds_area * 0.05)
        checks.append(check('world bounds and area', area_matches, f'bounds={bounds}; recorded={recorded_area}; computed={computed_bounds_area}'))
        checks.append(check('world density rationale', nonempty(scale.get('density_rationale')), str(scale.get('density_rationale', '')).strip() or 'missing'))
        first_action = finite_number(scale.get('first_action_seconds'))
        checks.append(check('first meaningful action cadence', first_action is not None and 0 < first_action <= 30, f'{first_action} seconds'))

    bad_claims = []
    hidden_unverified_claims = []
    for item in claims if isinstance(claims, list) else []:
        required = ('label', 'displayed_value', 'unit', 'basis', 'source', 'verified', 'display_policy')
        if not isinstance(item, dict) or any(key not in item for key in required) or not nonempty(item.get('label')) or not nonempty(item.get('unit')) or not nonempty(item.get('basis')) or not nonempty(item.get('source')):
            bad_claims.append(item)
            continue
        policy = str(item.get('display_policy', '')).strip().lower()
        verified = item.get('verified') is True
        if policy not in {'displayed', 'eligible', 'hidden-until-verified'}:
            bad_claims.append(item)
            continue
        if not verified:
            if policy != 'hidden-until-verified' or implemented:
                bad_claims.append(item)
            else:
                hidden_unverified_claims.append(item)
            continue
        unit = str(item.get('unit', '')).lower().replace('²', '2')
        basis = str(item.get('basis', '')).lower()
        value = finite_number(item.get('displayed_value'))
        if unit in {'km2', 'km^2'} and 'bound' in basis and computed_bounds_area is not None:
            if value is None or abs(value - computed_bounds_area) > max(0.0001, computed_bounds_area * 0.05):
                bad_claims.append(item)
    verified_count = len(claims) - len(hidden_unverified_claims) if isinstance(claims, list) else 0
    checks.append(check('public claim integrity', not bad_claims, f'{verified_count} verified; {len(hidden_unverified_claims)} hidden pending verification' if not bad_claims else f'{len(bad_claims)} unsupported, visible-unverified, or inconsistent claim(s)'))
    if hidden_unverified_claims:
        checks.append(check('planned claims remain hidden', False, f'{len(hidden_unverified_claims)} claim(s) must stay hidden until verified', severity='warning'))

    concepts = plan.get('concepts', {})
    if ambition == 'flagship':
        considered = concepts.get('considered', []) if isinstance(concepts, dict) else []
        spikes = int(concepts.get('spikes_built', 0) or 0) if isinstance(concepts, dict) else 0
        checks.append(check('concept divergence', len(considered) >= 3, f'{len(considered)} concept(s)'))
        checks.append(check('capability spike', spikes >= 1, f'{spikes} spike(s)'))

    representation = plan.get('representation', {})
    stack = str(representation.get('stack', '')).lower()
    required_caps = {str(x).lower() for x in representation.get('required_capabilities', [])}
    checks.append(check('representation selected', bool(stack), stack or 'missing'))
    spatial_caps = {'true-depth','true_depth','occlusion','volumetric','spatial-inspection','spatial_inspection','material-lighting','material_lighting'}
    if ('canvas' in stack or 'svg' in stack) and required_caps & spatial_caps:
        rationale = str(representation.get('ceiling_rationale', '')).lower()
        equivalent = bool(representation.get('capability_equivalent_proven', False))
        ok = equivalent and 'spike' in rationale
        checks.append(check('representation ceiling fit', ok, 'equivalent proven by spike' if ok else f'{stack} selected for {sorted(required_caps & spatial_caps)} without proven equivalent'))

    authoring_strategy = plan.get('authoring_strategy', {}) if isinstance(plan, dict) else {}
    authoring_mode = str(authoring_strategy.get('mode', '')).strip().lower()
    checks.append(check('authoring strategy', authoring_mode in AUTHORING_STRATEGIES, authoring_mode or 'missing'))
    authority_policy = str(authoring_strategy.get('authority_policy', '')).strip().lower()
    checks.append(check('authoring authority boundary', bool(authority_policy), authority_policy or 'missing'))
    asset_classes = authoring_strategy.get('asset_classes', []) if isinstance(authoring_strategy, dict) else []
    bad_asset_routes = []
    for item in asset_classes if isinstance(asset_classes, list) else []:
        if not isinstance(item, dict):
            bad_asset_routes.append(item); continue
        strategy = str(item.get('strategy', '')).strip().lower()
        if not nonempty(item.get('class')) or strategy not in (AUTHORING_STRATEGIES - {'hybrid'}) or not nonempty(item.get('reason')):
            bad_asset_routes.append(item)
    if authoring_mode == 'hybrid':
        checks.append(check('hybrid asset routing', bool(asset_classes) and not bad_asset_routes, f'routes={len(asset_classes)}; invalid={len(bad_asset_routes)}'))
    elif bad_asset_routes:
        checks.append(check('asset routing shape', False, f'{len(bad_asset_routes)} invalid asset route(s)'))

    generative_strategies = {'generative', 'reconstructed'}
    uses_generative_pipeline = authoring_mode in generative_strategies or any(
        isinstance(item, dict) and str(item.get('strategy', '')).strip().lower() in generative_strategies
        for item in asset_classes if isinstance(asset_classes, list)
    )
    if authoring_mode == 'hybrid':
        uses_generative_pipeline = uses_generative_pipeline or any(
            isinstance(item, dict) and str(item.get('strategy', '')).strip().lower() in generative_strategies
            for item in asset_classes
        )
    if uses_generative_pipeline:
        provider_caps = authoring_strategy.get('provider_capabilities', []) if isinstance(authoring_strategy, dict) else []
        proposal_ok = 'proposal' in authority_policy and bool(provider_caps) and nonempty(authoring_strategy.get('fallback_policy'))
        checks.append(check('generative proposal boundary', proposal_ok, f'proposal-policy={"yes" if "proposal" in authority_policy else "no"}; capabilities={len(provider_caps)}; fallback={"yes" if nonempty(authoring_strategy.get("fallback_policy")) else "no"}'))

    domain = plan.get('domain', {}) if isinstance(plan, dict) else {}
    claim_level = str(domain.get('claim_level', '')).strip()
    domain_validation_contract = domain.get('validation', {}) if isinstance(domain, dict) else {}
    checks.append(check('domain claim level', claim_level in CLAIM_LEVELS, claim_level or 'missing'))
    canonical_technique = str(domain.get('canonical_technique', '')).strip()
    implemented_technique = str(domain.get('implemented_technique', '')).strip()
    technique_conformance = str(domain.get('technique_conformance', '')).strip().lower()
    technique_reason = domain.get('technique_deviation_reason')
    # technique_conformance is required for every product, unconditionally — like claim_level — so
    # leaving canonical_technique blank can no longer silently skip disclosure the way it used to.
    # It is a declared judgment, not a string diff: comparing a short technique label against a
    # detailed authoritative_model description by exact text is unreliable in both directions (an
    # honest, detailed description almost never matches the label verbatim; a lazy copy-paste does).
    checks.append(check('technique conformance declared', technique_conformance in TECHNIQUE_CONFORMANCE_STATES, technique_conformance or 'missing'))
    if technique_conformance in TECHNIQUE_CONFORMANCE_STATES:
        name, ok, detail = technique_conformance_check(technique_conformance, canonical_technique, implemented_technique, technique_reason)
        checks.append(check(name, ok, detail))
    if profile in DOMAIN_PROFILES:
        units = domain.get('units', {}) if isinstance(domain, dict) else {}
        checks.append(check('authoritative domain model', nonempty(domain.get('authoritative_model')), str(domain.get('authoritative_model', '')).strip() or 'missing'))
        unit_ok = nonempty(units.get('system')) and nonempty(units.get('coordinate_system')) and bool(units.get('quantities'))
        checks.append(check('units and coordinates', unit_ok, f"system={units.get('system') or 'missing'}; coordinates={units.get('coordinate_system') or 'missing'}; quantities={len(units.get('quantities', []))}"))
        checks.append(check('domain limitations', bool(domain.get('limitations')), f"{len(domain.get('limitations', []))} limitation(s)"))
        if claim_level in {'decision-support', 'engineering'}:
            evidence_ok = bool(domain_validation_contract.get('known_cases')) and bool(domain_validation_contract.get('tolerances')) and nonempty(domain_validation_contract.get('oracle')) and nonempty(domain_validation_contract.get('external_reference'))
            checks.append(check('quantitative validation evidence', evidence_ok, f"known cases={len(domain_validation_contract.get('known_cases', []))}; tolerances={len(domain_validation_contract.get('tolerances', []))}; oracle={'yes' if nonempty(domain_validation_contract.get('oracle')) else 'no'}; external reference={'yes' if nonempty(domain_validation_contract.get('external_reference')) else 'no'}"))
            review_status = str(domain_validation_contract.get('review_status', '')).strip().lower()
            checks.append(check('domain review status', review_status not in {'', 'not-run', 'self-reviewed', 'creator-reviewed', 'provisional'}, review_status or 'missing'))

    if profile == 'simulation-lab':
        solver = domain.get('solver', {}) if isinstance(domain, dict) else {}
        if bool(solver.get('applicable', False)):
            solver_ok = (
                nonempty(solver.get('method')) and nonempty(solver.get('time_step_policy'))
                and nonempty(solver.get('stability_or_convergence')) and bool(solver.get('failure_states'))
            )
            checks.append(check('solver contract', solver_ok, f"method={solver.get('method') or 'missing'}; stability={solver.get('stability_or_convergence') or 'missing'}; failure states={len(solver.get('failure_states', []))}"))
        else:
            checks.append(check('direct-model declaration', nonempty(domain.get('authoritative_model')), 'solver not applicable; direct model recorded' if nonempty(domain.get('authoritative_model')) else 'missing direct model'))
        checks.append(check('simulation assumptions', bool(domain.get('assumptions')), f"{len(domain.get('assumptions', []))} assumption(s)"))
        checks.append(check('simulation validation oracle', nonempty(domain_validation_contract.get('oracle')), str(domain_validation_contract.get('oracle', '')).strip() or 'missing'))

    authoring = plan.get('authoring', {}) if isinstance(plan, dict) else {}
    if profile == 'design-studio':
        checks.append(check('authoritative document model', bool(authoring.get('applicable')) and nonempty(authoring.get('document_model')) and nonempty(authoring.get('schema_version')) and bool(authoring.get('stable_ids')), f"model={authoring.get('document_model') or 'missing'}; schema={authoring.get('schema_version') or 'missing'}; stable ids={bool(authoring.get('stable_ids'))}"))
        checks.append(check('parameter and constraint graph', nonempty(authoring.get('parameter_graph')) and bool(authoring.get('constraints')), f"graph={'yes' if nonempty(authoring.get('parameter_graph')) else 'no'}; constraints={len(authoring.get('constraints', []))}"))
        interaction_ok = nonempty(authoring.get('selection_model')) and bool(authoring.get('transform_controls')) and nonempty(authoring.get('snapping')) and bool(authoring.get('measurements'))
        checks.append(check('authoring interaction contract', interaction_ok, f"selection={'yes' if nonempty(authoring.get('selection_model')) else 'no'}; transforms={len(authoring.get('transform_controls', []))}; measurements={len(authoring.get('measurements', []))}"))
        history_ok = bool(authoring.get('undo_redo')) and nonempty(authoring.get('autosave_or_explicit_save')) and nonempty(authoring.get('variant_comparison'))
        checks.append(check('history persistence and variants', history_ok, f"undo={bool(authoring.get('undo_redo'))}; save={'yes' if nonempty(authoring.get('autosave_or_explicit_save')) else 'no'}; variants={'yes' if nonempty(authoring.get('variant_comparison')) else 'no'}"))
        export_ok = bool(authoring.get('export_formats')) and nonempty(authoring.get('round_trip_validation'))
        checks.append(check('design export round trip', export_ok, f"formats={authoring.get('export_formats', [])}; round trip={authoring.get('round_trip_validation') or 'missing'}"))

    data_contract = plan.get('data_contract', {}) if isinstance(plan, dict) else {}
    if profile in {'data-instrument', 'operations-panel'}:
        data_ok = bool(data_contract.get('applicable')) and nonempty(data_contract.get('schema_version')) and bool(data_contract.get('sources')) and nonempty(data_contract.get('provenance')) and bool(data_contract.get('transformations')) and nonempty(data_contract.get('missing_error_policy'))
        checks.append(check('data provenance contract', data_ok, f"sources={len(data_contract.get('sources', []))}; provenance={'yes' if nonempty(data_contract.get('provenance')) else 'no'}; transforms={len(data_contract.get('transformations', []))}"))
    if profile == 'operations-panel':
        operation_ok = nonempty(data_contract.get('freshness')) and nonempty(data_contract.get('action_confirmation')) and nonempty(data_contract.get('recovery'))
        checks.append(check('operational action recovery', operation_ok, f"freshness={'yes' if nonempty(data_contract.get('freshness')) else 'no'}; confirmation={'yes' if nonempty(data_contract.get('action_confirmation')) else 'no'}; recovery={'yes' if nonempty(data_contract.get('recovery')) else 'no'}"))

    compute = plan.get('compute', {}) if isinstance(plan, dict) else {}
    execution = str(compute.get('execution', '')).strip().lower()
    workload = str(compute.get('workload', '')).strip().lower()
    checks.append(check('compute boundary', execution in {'main-thread', 'worker', 'wasm', 'webgpu', 'server'}, execution or 'missing'))
    checks.append(check('compute workload', workload in WORKLOADS and nonempty(compute.get('workload_rationale')), f'workload={workload or "missing"}; rationale={"yes" if nonempty(compute.get("workload_rationale")) else "missing"}'))
    heavy_compute = execution in {'worker', 'wasm', 'webgpu', 'server'} or workload in {'batch', 'long-running', 'streaming'}
    if heavy_compute:
        async_ok = bool(compute.get('cancellable')) and str(compute.get('progress_reporting', '')).lower() not in {'', 'not-applicable'} and nonempty(compute.get('stale_result_policy'))
        checks.append(check('cancellable compute protocol', async_ok, f"cancellable={bool(compute.get('cancellable'))}; progress={compute.get('progress_reporting') or 'missing'}; stale policy={'yes' if nonempty(compute.get('stale_result_policy')) else 'no'}"))
        measurement_contract = plan.get('measurement', {}) if isinstance(plan, dict) else {}
        job_scenarios = measurement_contract.get('job_scenarios', []) if isinstance(measurement_contract, dict) else []
        job_percentiles = {str(value).lower() for value in measurement_contract.get('job_latency_percentiles', [])} if isinstance(measurement_contract, dict) else set()
        checks.append(check('compute latency measurement plan', len(job_scenarios) >= 2 and {'p50', 'p95'} <= job_percentiles, f'scenarios={len(job_scenarios)}; percentiles={sorted(job_percentiles)}'))
    if profile == 'simulation-lab' and ambition in {'showcase', 'flagship'}:
        checks.append(check('simulation replay contract', bool(compute.get('deterministic_replay')), 'deterministic/replayable' if compute.get('deterministic_replay') else 'not recorded'))

    system = plan.get('system', {})
    consumers = system.get('consumers', []) if isinstance(system, dict) else []
    consequential_consumers = [item for item in consumers if isinstance(item, dict) and nonempty(item.get('name')) and nonempty(item.get('consequence'))]
    min_consumers = 2
    checks.append(check('consequential canonical-state consumers', len(consequential_consumers) >= min_consumers, f'{len(consequential_consumers)} consequential consumer(s), need {min_consumers}; add more only when systemic coupling is part of the promise'))

    spatial = plan.get('spatial', {}) if isinstance(plan, dict) else {}
    spatial_applicable = bool(spatial.get('applicable', False)) if isinstance(spatial, dict) else False
    if profile != 'full-window-world' and spatial_applicable:
        checks.append(check('optional spatial contract', True, 'enabled explicitly for a non-world spatial product', severity='warning'))
    if profile == 'full-window-world' and ambition in {'showcase', 'flagship'}:
        checks.append(check('world spatial contract enabled', spatial_applicable, 'enabled' if spatial_applicable else 'full-window-world showcase/flagship requires spatial.applicable=true'))
    if spatial_applicable:
        specification = str(spatial.get('specification', '')).strip()
        coordinate = str(spatial.get('coordinate_system', '')).strip()
        world_spec = spatial.get('world_spec', {}) if isinstance(spatial, dict) else {}
        regions = world_spec.get('regions', []) if isinstance(world_spec, dict) else []
        relations = world_spec.get('relations', []) if isinstance(world_spec, dict) else []
        semantic_fields = spatial.get('semantic_fields', []) if isinstance(spatial, dict) else []
        terrain = spatial.get('terrain', {}) if isinstance(spatial, dict) else {}
        traversal = spatial.get('traversal', {}) if isinstance(spatial, dict) else {}
        refinement = spatial.get('regional_refinement', {}) if isinstance(spatial, dict) else {}
        placement = spatial.get('placement', {}) if isinstance(spatial, dict) else {}
        scale_bands = spatial.get('scale_bands', {}) if isinstance(spatial, dict) else {}
        checks.append(check('spatial specification', specification == 'WorldSpec' or profile != 'full-window-world', specification or 'missing'))
        domain_coordinate = str(plan.get('domain', {}).get('units', {}).get('coordinate_system', '')).strip() if isinstance(plan.get('domain', {}), dict) else ''
        coordinate_ok = bool(coordinate) and (not domain_coordinate or coordinate.lower() == domain_coordinate.lower())
        checks.append(check('spatial coordinate authority', coordinate_ok, f'spatial={coordinate or "missing"}; domain={domain_coordinate or "not-recorded"}'))
        if profile == 'full-window-world' and ambition in {'showcase', 'flagship'}:
            region_ids = [item.get('id') for item in regions if isinstance(item, dict) and nonempty(item.get('id'))]
            relation_ok = bool(relations) and all(isinstance(item, dict) and nonempty(item.get('from')) and nonempty(item.get('to')) and nonempty(item.get('relation')) for item in relations)
            checks.append(check('WorldSpec regions', len(region_ids) >= 2 and len(set(region_ids)) == len(region_ids), f'regions={len(region_ids)}; unique={len(set(region_ids))}'))
            checks.append(check('WorldSpec relations', relation_ok, f'relations={len(relations)}'))
            checks.append(check('semantic spatial fields', bool(semantic_fields), f'{len(semantic_fields)} field(s)'))
            terrain_ok = nonempty(terrain.get('authority')) and bool(terrain.get('region_conditioned')) and bool(terrain.get('boundary_blending'))
            checks.append(check('terrain authority', terrain_ok, f'authority={terrain.get("authority") or "missing"}; regional={bool(terrain.get("region_conditioned"))}; blend={bool(terrain.get("boundary_blending"))}'))
            traversal_ok = nonempty(traversal.get('authority')) and bool(traversal.get('primary_routes')) and bool(traversal.get('recovery_routes'))
            checks.append(check('traversal continuity contract', traversal_ok, f'authority={traversal.get("authority") or "missing"}; routes={len(traversal.get("primary_routes", []))}; recovery={len(traversal.get("recovery_routes", []))}'))
            refinement_ok = nonempty(refinement.get('strategy')) and nonempty(refinement.get('representative_region'))
            checks.append(check('regional refinement contract', refinement_ok, f'strategy={refinement.get("strategy") or "missing"}; representative={refinement.get("representative_region") or "missing"}'))
            placement_ok = nonempty(placement.get('authority')) and nonempty(placement.get('support_policy')) and nonempty(placement.get('collision_policy')) and nonempty(placement.get('navigation_clearance_policy'))
            checks.append(check('spatial placement authority', placement_ok, f'authority={placement.get("authority") or "missing"}; support={"yes" if nonempty(placement.get("support_policy")) else "no"}; collision={"yes" if nonempty(placement.get("collision_policy")) else "no"}'))
            band_ok = isinstance(scale_bands, dict) and all(isinstance(scale_bands.get(name), dict) and bool(scale_bands.get(name)) for name in ('near','mid','far'))
            checks.append(check('authoring fidelity bands', band_ok, 'near/mid/far defined' if band_ok else 'near/mid/far representation policies incomplete'))

    construction_evidence = plan.get('construction_evidence', {}) if isinstance(plan, dict) else {}
    critical_subjects = construction_evidence.get('critical_subjects', []) if isinstance(construction_evidence, dict) else []
    required_views = construction_evidence.get('required_views', []) if isinstance(construction_evidence, dict) else []
    reference_objects = construction_evidence.get('reference_critical_objects', []) if isinstance(construction_evidence, dict) else []
    if spatial_applicable and ambition == 'flagship':
        checks.append(check('multi-angle evidence plan', bool(critical_subjects) and len(required_views) >= 2, f'subjects={len(critical_subjects)}; views={len(required_views)}'))
        vertical = construction_evidence.get('vertical_slice', {}) if isinstance(construction_evidence, dict) else {}
        hero_subject = vertical.get('hero_asset') or vertical.get('hero_subject')
        vertical_ok = bool(vertical.get('global_skeleton')) and nonempty(vertical.get('representative_region')) and nonempty(hero_subject) and bool(vertical.get('placement_contact_path')) and bool(vertical.get('runtime_interaction'))
        checks.append(check('world vertical slice contract', vertical_ok, f'global={bool(vertical.get("global_skeleton"))}; region={vertical.get("representative_region") or "missing"}; hero-subject={hero_subject or "missing"}; contact={bool(vertical.get("placement_contact_path"))}; interaction={bool(vertical.get("runtime_interaction"))}'))
    bad_reference_objects = []
    for item in reference_objects if isinstance(reference_objects, list) else []:
        if not isinstance(item, dict) or not nonempty(item.get('id')) or not nonempty(item.get('object_spec')) or not bool(item.get('critical_views')):
            bad_reference_objects.append(item)
        elif implemented and item.get('structure_reviewed') is not True:
            bad_reference_objects.append(item)
    if reference_objects:
        checks.append(check('reference-critical object contract', not bad_reference_objects, f'objects={len(reference_objects)}; invalid={len(bad_reference_objects)}'))

    asset_fidelity = plan.get('asset_fidelity', {}) if isinstance(plan, dict) else {}
    asset_applicable = bool(asset_fidelity.get('applicable', False))
    non_object_rationale = str(asset_fidelity.get('non_object_identity_rationale', '')).strip()
    if ambition == 'flagship' and spatial_applicable and not asset_applicable:
        checks.append(check('flagship asset fidelity applicability', bool(non_object_rationale), non_object_rationale or 'object fidelity disabled without a non-object spatial-identity rationale'))
    flagship_asset_gate = ambition == 'flagship' and spatial_applicable and asset_applicable
    if flagship_asset_gate:
        style_mode = str(asset_fidelity.get('style_mode', '')).strip().lower()
        scope_mode = str(asset_fidelity.get('scope_mode', '')).strip().lower()
        checks.append(check('asset style contract', style_mode in ASSET_STYLE_MODES and nonempty(asset_fidelity.get('visual_target')), f'style={style_mode or "missing"}; target={"yes" if nonempty(asset_fidelity.get("visual_target")) else "missing"}'))
        checks.append(check('asset scope contract', scope_mode in ASSET_SCOPE_MODES, scope_mode or 'missing'))
        if profile == 'full-window-world' and scope_mode != 'non-object':
            checks.append(check('world-scale asset scope', scope_mode == 'world-scale', f'object-centric full-window-world flagship requires world-scale; got {scope_mode or "missing"}'))
        non_object_allowed = scope_mode == 'non-object' and nonempty(asset_fidelity.get('non_object_identity_rationale'))
        object_based = scope_mode != 'non-object'
        if scope_mode == 'non-object':
            checks.append(check('non-object asset rationale', non_object_allowed, str(asset_fidelity.get('non_object_identity_rationale', '')).strip() or 'missing/invalid non-object exemption'))
        if object_based:
            identity_classes = asset_fidelity.get('identity_critical_classes', []) if isinstance(asset_fidelity, dict) else []
            hero_assets = asset_fidelity.get('hero_assets', []) if isinstance(asset_fidelity, dict) else []
            representative_families = asset_fidelity.get('representative_families', []) if isinstance(asset_fidelity, dict) else []
            checks.append(check('identity-critical asset coverage', bool(identity_classes) and bool(hero_assets), f'classes={len(identity_classes)}; heroes={len(hero_assets)}'))
            repeated_families_expected = bool(asset_fidelity.get('repeated_families_expected', False))
            if scope_mode == 'world-scale' and repeated_families_expected:
                checks.append(check('representative asset families', bool(representative_families), f'families={len(representative_families)}; repeated families expected'))
            band_budgets = asset_fidelity.get('band_budgets', {}) if isinstance(asset_fidelity, dict) else {}
            required_bands = ('near','mid','far') if scope_mode == 'world-scale' else ('near',)
            required_band_fields = ('representation','geometry','materials','contact','shadows','variation')
            bad_bands = []
            for band in required_bands:
                budget = band_budgets.get(band, {}) if isinstance(band_budgets, dict) else {}
                if not isinstance(budget, dict) or any(not nonempty(budget.get(field)) for field in required_band_fields):
                    bad_bands.append(band)
            checks.append(check('asset authoring band budgets', not bad_bands, 'complete' if not bad_bands else f'incomplete bands={bad_bands}'))
            primitive = asset_fidelity.get('primitive_policy', {}) if isinstance(asset_fidelity, dict) else {}
            intentional_primitive = bool(primitive.get('intentional_primitive_style'))
            primitive_style_ok = not intentional_primitive or style_mode in {'low-poly','abstract'}
            max_placeholder = finite_number(primitive.get('near_placeholder_ratio_max'))
            ratio_policy_ok = max_placeholder is not None and 0 <= max_placeholder <= 1.0
            checks.append(check('primitive placeholder policy', primitive_style_ok and ratio_policy_ok and nonempty(primitive.get('replacement_trigger')), f'intentional={intentional_primitive}; style={style_mode}; max={max_placeholder}; replacement={"yes" if nonempty(primitive.get("replacement_trigger")) else "missing"}'))
            material_contract = asset_fidelity.get('material_contract', {}) if isinstance(asset_fidelity, dict) else {}
            material_ok = bool(material_contract.get('families')) and nonempty(material_contract.get('roughness_response'))
            if style_mode in {'realistic','reference-driven','mixed'}:
                material_ok = material_ok and nonempty(material_contract.get('normal_or_surface_detail')) and (nonempty(material_contract.get('weathering_or_variation')) or nonempty(material_contract.get('wetness_or_environment_response')))
            checks.append(check('asset material contract', material_ok, f'families={len(material_contract.get("families", []))}; roughness={"yes" if nonempty(material_contract.get("roughness_response")) else "missing"}'))
            evidence_req = asset_fidelity.get('evidence_requirements', {}) if isinstance(asset_fidelity, dict) else {}
            hero_views = evidence_req.get('hero_views', []) if isinstance(evidence_req, dict) else []
            evidence_contract_ok = len(hero_views) >= 3 and bool(evidence_req.get('target_size_review')) and bool(evidence_req.get('runtime_asset_report'))
            if scope_mode == 'world-scale' and bool(asset_fidelity.get('repeated_families_expected', False)):
                evidence_contract_ok = evidence_contract_ok and bool(evidence_req.get('family_views'))
            checks.append(check('asset evidence contract', evidence_contract_ok, f'hero views={len(hero_views)}; family views={len(evidence_req.get("family_views", []))}; target-size={bool(evidence_req.get("target_size_review"))}; runtime-report={bool(evidence_req.get("runtime_asset_report"))}'))
            if style_mode == 'reference-driven':
                checks.append(check('reference-sensitive object coverage', bool(reference_objects), f'reference-critical objects={len(reference_objects)}; reference-driven flagship requires specific reference evidence'))

    visual_raw = plan.get('visual', {})
    visual = visual_raw if isinstance(visual_raw, dict) else {}
    composition_roles = visual.get('composition_roles', []) if isinstance(visual, dict) else []
    materials = visual.get('material_or_mark_families', []) if isinstance(visual, dict) else []
    transforms = visual.get('hero_state_changes', []) if isinstance(visual, dict) else []
    inspection = visual.get('inspection_reveals', []) if isinstance(visual, dict) else []
    if ambition == 'flagship':
        art_rules = visual.get('art_direction_rules', []) if isinstance(visual, dict) else []
        checks.append(check('default view defined', nonempty(visual.get('default_view')), str(visual.get('default_view', '')).strip() or 'missing'))
        checks.append(check('art direction rules', len(art_rules) >= 3, f'{len(art_rules)} rule(s)'))
        checks.append(check('UI density budget', nonempty(visual.get('ui_density_budget')), str(visual.get('ui_density_budget', '')).strip() or 'missing'))
        checks.append(check('composition roles', len(composition_roles) >= 3, f'{len(composition_roles)} role(s)'))
        checks.append(check('material or mark families', len(materials) >= 3, f'{len(materials)} family/families'))
        if inspection:
            checks.append(check('inspection revelation', len(inspection) >= 2, f'{len(inspection)} revelation type(s)'))
        checks.append(check('hero state change', len(transforms) >= 1, f'{len(transforms)} state change(s)'))
        grammars = []
        for transform in transforms[:2]:
            channels = transform.get('channels', []) if isinstance(transform, dict) else []
            grammar = str(transform.get('grammar', '')).strip().lower() if isinstance(transform, dict) else ''
            checks.append(check(f"state-change channels: {transform.get('name','?') if isinstance(transform,dict) else '?'}", len(channels) >= 3, f'{len(channels)} channel(s)'))
            grammars.append(grammar)
        if len(grammars) >= 2:
            checks.append(check('state-change grammar separation', all(grammars) and len(set(grammars)) == len(grammars), str(grammars)))

    fidelity = plan.get('fidelity', {}) if isinstance(plan, dict) else {}
    interface = plan.get('interface', {}) if isinstance(plan, dict) else {}
    input_contract = plan.get('input', {}) if isinstance(plan, dict) else {}
    if ambition in {'showcase', 'flagship'}:
        default_ratio = float(fidelity.get('default_effective_pixel_ratio', 0) or 0)
        presentation_ratio = float(fidelity.get('presentation_effective_pixel_ratio', 0) or 0)
        adaptive_max = float(fidelity.get('adaptive_max_ratio', 0) or 0)
        reconstruction = fidelity.get('reconstruction', {}) if isinstance(fidelity, dict) else {}
        reconstruction_ok = bool(reconstruction.get('enabled', False)) and str(reconstruction.get('method', 'none')).lower() not in {'', 'none'} and bool(reconstruction.get('reviewed_at_target_size', False))
        capture = fidelity.get('capture_mode', {}) if isinstance(fidelity, dict) else {}
        softness = bool(fidelity.get('intentional_softness', False))
        softness_reason = str(fidelity.get('softness_rationale', '')).strip()
        min_default = 0.85 if ambition == 'flagship' else 0.75
        min_presentation = 0.95 if ambition == 'flagship' else 0.85
        checks.append(check('default scene clarity', default_ratio >= min_default or reconstruction_ok, f'ratio {default_ratio:.2f}; reconstruction {reconstruction_ok}'))
        checks.append(check('presentation scene clarity', presentation_ratio >= min_presentation or reconstruction_ok, f'ratio {presentation_ratio:.2f}; reconstruction {reconstruction_ok}'))
        checks.append(check('adaptive quality ceiling', adaptive_max >= min_presentation or reconstruction_ok, f'max ratio {adaptive_max:.2f}'))
        checks.append(check('visual capture quality lock', bool(capture.get('locks_quality', False)) and bool(capture.get('separates_visual_from_performance_capture', False)), 'locked and separated' if capture.get('locks_quality') and capture.get('separates_visual_from_performance_capture') else 'missing'))
        checks.append(check('intentional softness rationale', not softness or bool(softness_reason), softness_reason or ('not intentionally soft' if not softness else 'missing rationale')))

        icon_count = int(interface.get('visible_icon_count', 0) or 0) if isinstance(interface, dict) else 0
        unicode_count = int(interface.get('unicode_placeholder_count', 0) or 0) if isinstance(interface, dict) else 0
        icon_system = str(interface.get('icon_system', 'none')).strip().lower() if isinstance(interface, dict) else 'none'
        if icon_count > 0:
            checks.append(check('authored icon system', icon_system not in {'none','unicode','emoji','text-symbols'}, icon_system))
            checks.append(check('no placeholder glyph icons', unicode_count == 0, f'{unicode_count} placeholder(s)'))
            checks.append(check('native-resolution interface', bool(interface.get('native_resolution', False)), 'native' if interface.get('native_resolution') else 'not recorded'))
            checks.append(check('icon optical system', bool(interface.get('optical_sizes')) or int(interface.get('icon_grid', 0) or 0) >= 16, f"grid {interface.get('icon_grid')}; sizes {interface.get('optical_sizes')}"))

        if bool(input_contract.get('pointer_look', False)):
            horizontal = str(input_contract.get('horizontal_default', '')).lower()
            vertical = str(input_contract.get('vertical_default', '')).lower()
            checks.append(check('pointer direction reviewed', bool(input_contract.get('direction_reviewed', False)), 'reviewed semantically' if input_contract.get('direction_reviewed') else 'not reviewed'))
            checks.append(check('pointer look convention', horizontal in {'standard','inverted'} and vertical in {'standard','inverted'}, f'x={horizontal}, y={vertical}'))
            checks.append(check('drag/pointer-lock parity', bool(input_contract.get('drag_pointerlock_parity', False)), 'matched' if input_contract.get('drag_pointerlock_parity') else 'not verified'))
        if bool(input_contract.get('locomotion', False)):
            frame = str(input_contract.get('movement_frame', '')).lower()
            keys = [input_contract.get(k) for k in ('forward_key','backward_key','left_key','right_key')]
            locomotion_ok = frame in {'camera-planar','world'} and all(nonempty(k) for k in keys) and bool(input_contract.get('movement_direction_reviewed', False))
            checks.append(check('locomotion direction contract', locomotion_ok, f'frame={frame or "missing"}; keys={keys}; reviewed={bool(input_contract.get("movement_direction_reviewed"))}'))
            checks.append(check('diagonal movement policy', bool(input_contract.get('diagonal_speed_normalized', False)), 'normalized' if input_contract.get('diagonal_speed_normalized') else 'not normalized/reviewed'))

    static_fidelity = run_fidelity_audit(root, ambition == 'flagship')
    if static_fidelity:
        static_ok = static_fidelity.get('status') == 'pass'
        details = '; '.join(item.get('id','?') for item in static_fidelity.get('findings', []) if item.get('severity') == 'error') or 'no blocking source-pattern findings'
        checks.append(check('static fidelity audit', static_ok, details, severity='error' if ambition == 'flagship' else 'warning'))

    review = plan.get('review', {})
    rounds = int(review.get('hardening_rounds', 0) or 0) if isinstance(review, dict) else 0
    product_outcome = review.get('product_outcome', {}) if isinstance(review, dict) else {}
    domain_review = review.get('domain_validity', {}) if isinstance(review, dict) else {}
    runtime_review = review.get('runtime_engineering', {}) if isinstance(review, dict) else {}
    product_blockers = product_outcome.get('unresolved_blockers', []) if isinstance(product_outcome, dict) else []
    domain_blockers = domain_review.get('unresolved_blockers', []) if isinstance(domain_review, dict) else []
    runtime_blockers = runtime_review.get('unresolved_blockers', []) if isinstance(runtime_review, dict) else []
    if ambition in {'showcase', 'flagship'}:
        checks.append(check('implementation hardening', rounds >= 1, f'{rounds} evidence/repair round(s); continue while blockers remain'))
        product_fields = ('default_route_reviewed', 'first_use_clear', 'primary_workflow_complete', 'art_direction_coherent', 'ui_density_acceptable')
        incomplete_product = [key for key in product_fields if product_outcome.get(key) is not True]
        checks.append(check('product outcome ledger', not incomplete_product and not product_blockers, 'complete' if not incomplete_product and not product_blockers else f'incomplete={incomplete_product}; blockers={len(product_blockers)}'))
        if profile in DOMAIN_PROFILES:
            domain_fields = ('claim_level_matches_evidence', 'assumptions_visible', 'oracle_or_round_trip_run', 'limitations_disclosed')
            incomplete_domain = [key for key in domain_fields if domain_review.get(key) is not True]
            tolerance_ok = claim_level not in {'decision-support', 'engineering'} or domain_review.get('tolerances_met') is True
            domain_status = str(domain_review.get('status', '')).lower()
            checks.append(check('domain validity ledger', domain_status == 'pass' and not incomplete_domain and tolerance_ok and not domain_blockers, f'status={domain_status or "missing"}; incomplete={incomplete_domain}; tolerances={domain_review.get("tolerances_met")}; blockers={len(domain_blockers)}'))
        else:
            checks.append(check('domain validity ledger', str(domain_review.get('status', '')).lower() in {'not-applicable', 'pass'} and not domain_blockers, str(domain_review.get('status', 'missing'))))
        runtime_fields = ('lifecycle_reviewed', 'performance_reviewed_or_blocked')
        incomplete_runtime = [key for key in runtime_fields if runtime_review.get(key) is not True]
        if profile == 'design-studio' and runtime_review.get('history_persistence_reviewed') is not True:
            incomplete_runtime.append('history_persistence_reviewed')
        if heavy_compute and runtime_review.get('cancellation_recovery_reviewed') is not True:
            incomplete_runtime.append('cancellation_recovery_reviewed')
        checks.append(check('runtime engineering ledger', not incomplete_runtime and not runtime_blockers, 'complete' if not incomplete_runtime and not runtime_blockers else f'incomplete={incomplete_runtime}; blockers={len(runtime_blockers)}'))
        checks.append(check('non-aggregate review status', 'internal_score' not in review and 'quality_target' not in plan, str(review.get('review_status', 'creator-reviewed / provisional'))))

    if profile in {'dashboard-panel', 'operations-panel'}:
        text = source_text(root)
        required_tokens = ['mount', 'update', 'resize', 'suspend', 'resume', 'destroy']
        missing = [token for token in required_tokens if token not in text]
        checks.append(check('panel lifecycle surface', not missing, 'complete' if not missing else f'missing {missing}'))
        checks.append(check('panel resize integration', 'ResizeObserver' in text or '.resize(' in text, 'found' if ('ResizeObserver' in text or '.resize(' in text) else 'missing'))

    tools = suspicious_tooling(root)
    checks.append(check('no copied forge tooling', not tools, 'none' if not tools else ', '.join(tools)))

    evidence_dirs = [root / '.forge', root / 'evidence', root / 'previews']
    evidence = sum(size_of(path) for path in evidence_dirs if path.exists())
    implementation = implementation_bytes(root)
    ratio = evidence / max(1, implementation)
    duplicate_bundle = list(root.rglob('inline-browser-bundle.html'))
    checks.append(check('duplicate browser bundle', not duplicate_bundle, 'none' if not duplicate_bundle else f'{len(duplicate_bundle)} found', severity='warning'))
    if delivery == 'lean':
        checks.append(check('workbench evidence isolated', not (root / 'evidence').exists(), 'isolated under .forge or absent' if not (root/'evidence').exists() else 'root evidence/ will be excluded', severity='warning'))

    if validation_path:
        browser = validation.get('browser', {})
        checks.append(check('validation schema', int(validation.get('version', 0) or 0) >= VALIDATION_VERSION, f"version {validation.get('version', 0)}; this release requires {VALIDATION_VERSION}"))
        workflow_review = validation.get('workflow_review', {}) if isinstance(validation, dict) else {}
        domain_validation = validation.get('domain_validation', {}) if isinstance(validation, dict) else {}
        runtime_validation = validation.get('runtime_engineering', {}) if isinstance(validation, dict) else {}
        construction_validation = validation.get('construction_validation', {}) if isinstance(validation, dict) else {}
        asset_fidelity_validation = validation.get('asset_fidelity_validation', {}) if isinstance(validation, dict) else {}
        spatial_validation = validation.get('spatial_validation', {}) if isinstance(validation, dict) else {}
        evidence_review = validation.get('evidence_review', {}) if isinstance(validation, dict) else {}
        visual_validation = validation.get('visual_review', {}) if isinstance(validation, dict) else {}
        validation_fidelity = validation.get('fidelity', {}) if isinstance(validation, dict) else {}
        validation_input = validation.get('input', {}) if isinstance(validation, dict) else {}
        performance = validation.get('performance', {}) if isinstance(validation, dict) else {}
        if ambition == 'flagship':
            checks.append(check('browser execution', bool(browser.get('executed', False)), 'executed' if browser.get('executed') else 'not executed', severity='warning'))
            default_review = str(workflow_review.get('default_route', '')).lower()
            first_review = str(workflow_review.get('first_use', '')).lower()
            loop_review = str(workflow_review.get('complete_loop', '')).lower()
            compare_review = str(workflow_review.get('comparison_or_validation', '')).lower()
            completion_review = str(workflow_review.get('completion_or_export', '')).lower()
            recovery_review = str(workflow_review.get('failure_recovery', '')).lower()
            claim_review = workflow_review.get('claim_audit', {}) if isinstance(workflow_review, dict) else {}
            checks.append(check('default-route runtime review', default_review == 'pass', default_review or 'not-run'))
            checks.append(check('first-use runtime review', first_review == 'pass', first_review or 'not-run'))
            checks.append(check('complete-loop runtime review', loop_review == 'pass', loop_review or 'not-run'))
            checks.append(check('comparison/validation runtime review', compare_review == 'pass', compare_review or 'not-run'))
            checks.append(check('completion/export runtime review', completion_review == 'pass', completion_review or 'not-run'))
            checks.append(check('failure/recovery runtime review', recovery_review == 'pass', recovery_review or 'not-run'))
            checks.append(check('runtime public-claim audit', str(claim_review.get('status', '')).lower() == 'pass', str(claim_review.get('status', 'not-run'))))
            runtime_technique_conformance = str(domain_validation.get('technique_conformance', '')).strip().lower()
            checks.append(check(
                'runtime technique conformance matches plan',
                runtime_technique_conformance == technique_conformance,
                f"plan={technique_conformance or 'missing'}; validation={runtime_technique_conformance or 'missing'}"
            ))
            if technique_conformance in TECHNIQUE_CONFORMANCE_STATES:
                name, ok, detail = technique_conformance_check(
                    technique_conformance,
                    str(domain_validation.get('canonical_technique', '')),
                    str(domain_validation.get('implemented_technique', '')),
                    domain_validation.get('technique_deviation_reason')
                )
                checks.append(check(f'runtime {name}', ok, detail))
            if profile in DOMAIN_PROFILES:
                validation_status = str(domain_validation.get('status', '')).lower()
                unresolved_domain = domain_validation.get('unresolved_defects', []) if isinstance(domain_validation, dict) else []
                claim_match = str(domain_validation.get('claim_level', '')).lower() == claim_level
                base_domain_ok = validation_status == 'pass' and claim_match and bool(domain_validation.get('limitations_disclosed')) and not unresolved_domain
                checks.append(check('runtime domain validation', base_domain_ok, f'status={validation_status or "missing"}; claim={domain_validation.get("claim_level")}; limitations={bool(domain_validation.get("limitations_disclosed"))}; defects={len(unresolved_domain)}'))
                if profile == 'simulation-lab' and claim_level in {'decision-support', 'engineering'}:
                    case_ok = bool(domain_validation.get('known_cases')) and domain_validation.get('tolerances_met') is True
                    checks.append(check('runtime quantitative tolerance', case_ok, f"known cases={len(domain_validation.get('known_cases', []))}; tolerances met={domain_validation.get('tolerances_met')}"))
                if profile == 'design-studio':
                    checks.append(check('runtime design round trip', str(domain_validation.get('round_trip', '')).lower() == 'pass', str(domain_validation.get('round_trip', 'not-run'))))
            runtime_status = str(runtime_validation.get('status', '')).lower()
            runtime_defects = runtime_validation.get('unresolved_defects', []) if isinstance(runtime_validation, dict) else []
            runtime_ok = runtime_status == 'pass' and str(runtime_validation.get('lifecycle', '')).lower() == 'pass' and not runtime_defects
            checks.append(check('runtime engineering validation', runtime_ok, f'status={runtime_status or "missing"}; lifecycle={runtime_validation.get("lifecycle")}; defects={len(runtime_defects)}'))
            if profile == 'design-studio':
                checks.append(check('runtime history/persistence validation', str(runtime_validation.get('history_persistence', '')).lower() == 'pass', str(runtime_validation.get('history_persistence', 'not-run'))))
                checks.append(check('selection/transform runtime review', str(validation_input.get('selection_transform_review', '')).lower() == 'pass', str(validation_input.get('selection_transform_review', 'not-run'))))
            if spatial_applicable:
                spatial_status = str(spatial_validation.get('status', '')).lower()
                spatial_defects = spatial_validation.get('unresolved_defects', []) if isinstance(spatial_validation, dict) else []
                spatial_checks = ('region_continuity','placement','contact','collision','navigation_clearance','lod_assignment','support_semantics','support_surface_consistency')
                spatial_ok = spatial_status == 'pass' and all(str(spatial_validation.get(key, '')).lower() in {'pass','not-applicable'} for key in spatial_checks) and not spatial_defects
                checks.append(check('runtime spatial validation', spatial_ok, f'status={spatial_status or "missing"}; defects={len(spatial_defects)}'))
                spatial_audit_path = root / '.forge' / 'spatial-audit.json'
                spatial_audit = {}
                if spatial_audit_path.exists():
                    try: spatial_audit = json.loads(spatial_audit_path.read_text(encoding='utf-8'))
                    except Exception: spatial_audit = {}
                spatial_audit_ok = bool(spatial_audit) and str(spatial_audit.get('status','')).lower() == 'pass' and bool(spatial_audit.get('strictSupport', False))
                spatial_audit_detail = f'{spatial_audit_path}; strictSupport={spatial_audit.get("strictSupport")}' if spatial_audit else 'missing .forge/spatial-audit.json'
                checks.append(check('runtime spatial audit evidence', spatial_audit_ok, spatial_audit_detail))
            if uses_generative_pipeline or reference_objects:
                construction_status = str(construction_validation.get('status', '')).lower()
                construction_defects = construction_validation.get('unresolved_defects', []) if isinstance(construction_validation, dict) else []
                proposal_ok = not uses_generative_pipeline or str(construction_validation.get('proposal_boundary', '')).lower() == 'pass'
                reference_ok = not reference_objects or str(construction_validation.get('reference_critical_objects', '')).lower() == 'pass'
                checks.append(check('runtime construction validation', construction_status == 'pass' and proposal_ok and reference_ok and not construction_defects, f'status={construction_status or "missing"}; proposal={construction_validation.get("proposal_boundary")}; reference={construction_validation.get("reference_critical_objects")}; defects={len(construction_defects)}'))
            if flagship_asset_gate:
                asset_status = str(asset_fidelity_validation.get('status', '')).lower()
                asset_defects = asset_fidelity_validation.get('unresolved_defects', []) if isinstance(asset_fidelity_validation, dict) else []
                scope_mode = str(asset_fidelity.get('scope_mode', '')).strip().lower() if isinstance(asset_fidelity, dict) else ''
                if scope_mode == 'non-object':
                    asset_checks = ('multi_view_coverage','target_size_review','runtime_asset_report')
                else:
                    asset_checks = ('identity_critical_coverage','hero_asset_evidence','near_band_quality','material_validation','contact_validation','placeholder_audit','multi_view_coverage','target_size_review','runtime_asset_report')
                runtime_asset_ok = asset_status == 'pass' and all(str(asset_fidelity_validation.get(key, '')).lower() == 'pass' for key in asset_checks) and not asset_defects
                if scope_mode == 'world-scale' and bool(asset_fidelity.get('repeated_families_expected', False)):
                    runtime_asset_ok = runtime_asset_ok and str(asset_fidelity_validation.get('representative_family_evidence', '')).lower() == 'pass'
                max_placeholder = finite_number(asset_fidelity.get('primitive_policy', {}).get('near_placeholder_ratio_max')) if isinstance(asset_fidelity, dict) else None
                measured_ratio = finite_number(asset_fidelity_validation.get('near_placeholder_ratio'))
                intentional = bool(asset_fidelity.get('primitive_policy', {}).get('intentional_primitive_style')) if isinstance(asset_fidelity, dict) else False
                if scope_mode != 'non-object' and not intentional and measured_ratio is not None and max_placeholder is not None and measured_ratio > max_placeholder + 1e-9:
                    checks.append(check('near placeholder ratio review', False, f'ratio={measured_ratio}; advisory max={max_placeholder}; inspect salience/identity impact', severity='warning'))
                checks.append(check('runtime asset fidelity validation', runtime_asset_ok, f'status={asset_status or "missing"}; ratio={measured_ratio}; advisory max={max_placeholder}; defects={len(asset_defects)}'))
                audit_path = root / '.forge' / 'asset-fidelity-audit.json'
                audit_report = {}
                if audit_path.exists():
                    try: audit_report = json.loads(audit_path.read_text(encoding='utf-8'))
                    except Exception: audit_report = {}
                audit_report_ok = bool(audit_report) and str(audit_report.get('status', '')).lower() == 'pass' and bool(audit_report.get('flagship', False))
                checks.append(check('runtime asset fidelity audit evidence', audit_report_ok, (f'{audit_path}; flagship={audit_report.get("flagship")}' if audit_report else 'missing .forge/asset-fidelity-audit.json')))
            evidence_status = str(evidence_review.get('status', '')).lower()
            evidence_ok = evidence_status == 'pass' and bool(evidence_review.get('blockers_have_evidence')) and bool(evidence_review.get('regression_reviewed')) and not evidence_review.get('unresolved_defects', [])
            checks.append(check('evidence-driven regression review', evidence_ok, f'status={evidence_status or "missing"}; blockers-evidenced={bool(evidence_review.get("blockers_have_evidence"))}; regression={bool(evidence_review.get("regression_reviewed"))}'))
            visual_defects = visual_validation.get('unresolved_defects', []) if isinstance(visual_validation, dict) else []
            visual_ok = len(visual_validation.get('evidence_views', [])) >= (2 if spatial_applicable else 1) and bool(visual_validation.get('regression_reviewed')) and not visual_defects
            checks.append(check('visual evidence set', visual_ok, f'views={len(visual_validation.get("evidence_views", []))}; regression={bool(visual_validation.get("regression_reviewed"))}; defects={len(visual_defects)}'))
            if heavy_compute:
                cancel_ok = str(runtime_validation.get('cancellation_recovery', '')).lower() == 'pass' and str(runtime_validation.get('stale_result_rejection', '')).lower() == 'pass'
                checks.append(check('runtime compute cancellation/recovery', cancel_ok, f"cancel={runtime_validation.get('cancellation_recovery')}; stale={runtime_validation.get('stale_result_rejection')}"))
            capture_ratio = float(validation_fidelity.get('effective_pixel_ratio', 0) or 0)
            reconstruction = str(validation_fidelity.get('reconstruction', 'none')).lower()
            ratio_ok = capture_ratio >= 0.9 or reconstruction not in {'', 'none'}
            checks.append(check('representative capture density', ratio_ok, f'ratio {capture_ratio:.2f}; reconstruction {reconstruction}'))
            checks.append(check('capture adaptation disabled', bool(validation_fidelity.get('adaptive_locked', False)), 'locked' if validation_fidelity.get('adaptive_locked') else 'adaptive degradation could affect visual evidence'))
            if int(interface.get('visible_icon_count', 0) or 0) > 0:
                checks.append(check('icon fidelity review', str(validation_fidelity.get('icon_review', '')).lower() == 'pass', str(validation_fidelity.get('icon_review', 'not-run'))))
            if bool(input_contract.get('pointer_look', False)):
                checks.append(check('pointer direction runtime review', str(validation_input.get('pointer_direction_review', '')).lower() == 'pass', str(validation_input.get('pointer_direction_review', 'not-run'))))
                checks.append(check('pointer lock/drag runtime parity', str(validation_input.get('drag_pointerlock_parity', '')).lower() == 'pass', str(validation_input.get('drag_pointerlock_parity', 'not-run'))))
            if bool(input_contract.get('locomotion', False)):
                checks.append(check('WASD movement runtime review', str(validation_input.get('movement_direction_review', '')).lower() == 'pass', str(validation_input.get('movement_direction_review', 'not-run'))))
                if str(input_contract.get('movement_frame', '')).lower() == 'camera-planar':
                    checks.append(check('camera-relative movement runtime review', str(validation_input.get('camera_relative_movement_review', '')).lower() == 'pass', str(validation_input.get('camera_relative_movement_review', 'not-run'))))
                checks.append(check('diagonal speed runtime review', str(validation_input.get('diagonal_speed_review', '')).lower() == 'pass', str(validation_input.get('diagonal_speed_review', 'not-run'))))
                if bool(input_contract.get('player_grounded', False)):
                    checks.append(check('player grounding runtime review', str(validation_input.get('grounding_review', '')).lower() == 'pass', str(validation_input.get('grounding_review', 'not-run'))))

            measured = bool(performance.get('measured', False))
            measurement_block = str(performance.get('measurement_block', '')).strip()
            checks.append(check('performance evidence or explicit block', measured or bool(measurement_block), 'measured' if measured else measurement_block or 'missing'))
            if measured:
                source = str(performance.get('source', '')).lower()
                sample_count = int(performance.get('sample_count', 0) or 0)
                scenarios = performance.get('scenarios', []) if isinstance(performance, dict) else []
                frame_time = performance.get('frame_time', {}) if isinstance(performance, dict) else {}
                wall_source = 'wall' in source or 'requestanimationframe' in source or 'external' in source
                frame_percentiles = finite_number(frame_time.get('median_ms')) is not None and finite_number(frame_time.get('p95_ms')) is not None
                checks.append(check('wall-clock performance source', wall_source, source or 'missing'))
                checks.append(check('performance sample integrity', sample_count >= 2 and len(scenarios) >= 2 and frame_percentiles, f'samples={sample_count}; scenarios={len(scenarios)}; percentiles={frame_percentiles}'))
                checks.append(check('application telemetry cross-check', bool(performance.get('application_telemetry_cross_checked', False)), 'cross-checked' if performance.get('application_telemetry_cross_checked') else 'not cross-checked against external wall time'))
                if heavy_compute:
                    job_latency = performance.get('job_latency', {}) if isinstance(performance, dict) else {}
                    job_ok = len(job_latency.get('scenarios', [])) >= 2 and all(
                        finite_number(job_latency.get(key)) is not None for key in ('median_ms', 'p95_ms', 'cancellation_ms')
                    )
                    checks.append(check('compute job latency evidence', job_ok, f"scenarios={len(job_latency.get('scenarios', []))}; median={job_latency.get('median_ms')}; p95={job_latency.get('p95_ms')}; cancel={job_latency.get('cancellation_ms')}"))
            if measured and bool(performance.get('software_renderer', False)):
                # Flagship is a certification claim: software-renderer-only measurement cannot certify
                # target performance, so it blocks flagship completion instead of merely warning.
                renderer_severity = 'error' if ambition == 'flagship' else 'warning'
                checks.append(check('representative performance renderer', False, 'software renderer measurements are measurement-limited, not target performance; flagship requires representative-GPU evidence or an explicit lower ambition', severity=renderer_severity))

    if for_package:
        included = collect_runtime_files(root, plan)
        bad_included = [p.relative_to(root).as_posix() for p in included if any(part in EXCLUDED_PARTS for part in p.relative_to(root).parts) or p.name in KNOWN_FORGE_TOOLS]
        checks.append(check('lean package selection', not bad_included, 'clean' if not bad_included else ', '.join(bad_included)))

    failed = [item for item in checks if item['status'] == 'fail']
    return {
        'status': 'pass' if not failed else 'fail',
        'project': str(root),
        'profile': profile,
        'ambition': ambition,
        'experience_mode': experience_mode,
        'delivery_mode': delivery,
        'checks': checks,
        'metrics': {
            'implementation_bytes': implementation,
            'workbench_evidence_bytes': evidence,
            'evidence_to_implementation_ratio': round(ratio, 3)
        }
    }


def is_excluded(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    if any(part in EXCLUDED_PARTS for part in rel.parts):
        return True
    if path.name in KNOWN_FORGE_TOOLS:
        return True
    if path.name in {'FORGE_PLAN.json', 'QUALITY_EVIDENCE.json', 'SIMULATION_BRIEF.md', 'CONCEPT_MATRIX.md', 'SYSTEM_MAP.md', 'ART_BIBLE.md', 'ASSET_PLAN.md', 'PERFORMANCE_BUDGET.json', 'SCENE_CONTRACT.json'}:
        return True
    return False


def collect_runtime_files(root: Path, plan: dict[str, Any]) -> list[Path]:
    package = plan.get('package', {}) if isinstance(plan, dict) else {}
    roots = package.get('runtime_roots', ['index.html', 'src', 'assets'])
    selected: set[Path] = set()
    for item in roots:
        path = root / str(item)
        if not path.exists():
            continue
        if path.is_file():
            if not is_excluded(path, root): selected.add(path)
        else:
            for child in path.rglob('*'):
                if child.is_file() and not is_excluded(child, root): selected.add(child)
    for name in COMMON_RUNTIME_FILES:
        path = root / name
        if path.exists() and path.is_file(): selected.add(path)
    readme = root / 'README.md'
    if readme.exists(): selected.add(readme)
    return sorted(selected)


def compact_validation(root: Path, audit: dict[str, Any]) -> dict[str, Any]:
    validation, _ = read_first(root, VALIDATION_LOCATIONS)
    browser = validation.get('browser', {}) if isinstance(validation, dict) else {}
    visual = validation.get('visual_review', {}) if isinstance(validation, dict) else {}
    performance = validation.get('performance', {}) if isinstance(validation, dict) else {}
    return {
        'version': VALIDATION_VERSION,
        'implemented': bool(validation.get('implemented', audit['status'] == 'pass')) if isinstance(validation, dict) else audit['status'] == 'pass',
        'audit_status': audit['status'],
        'static_checks': validation.get('static_checks', {'status':'not-recorded'}) if isinstance(validation, dict) else {'status':'not-recorded'},
        'browser': {
            'executed': bool(browser.get('executed', False)),
            'intended_route': bool(browser.get('intended_route', False)),
            'console_errors': browser.get('console_errors'),
            'page_errors': browser.get('page_errors'),
            'request_failures': browser.get('request_failures')
        },
        'visual_review': {
            'status': visual.get('status', 'creator-reviewed / provisional'),
            'evidence_views': visual.get('evidence_views', []),
            'critical_subjects': visual.get('critical_subjects', []),
            'locked_passes': visual.get('locked_passes', []),
            'defect_queue': visual.get('defect_queue', []),
            'hardening_rounds': visual.get('hardening_rounds', 0),
            'regression_reviewed': bool(visual.get('regression_reviewed', False)),
            'unresolved_defects': visual.get('unresolved_defects', [])
        },
        'workflow_review': validation.get('workflow_review', {}) if isinstance(validation, dict) else {},
        'domain_validation': validation.get('domain_validation', {}) if isinstance(validation, dict) else {},
        'runtime_engineering': validation.get('runtime_engineering', {}) if isinstance(validation, dict) else {},
        'construction_validation': validation.get('construction_validation', {}) if isinstance(validation, dict) else {},
        'asset_fidelity_validation': validation.get('asset_fidelity_validation', {}) if isinstance(validation, dict) else {},
        'spatial_validation': validation.get('spatial_validation', {}) if isinstance(validation, dict) else {},
        'evidence_review': validation.get('evidence_review', {}) if isinstance(validation, dict) else {},
        'performance': performance,
        'fidelity': validation.get('fidelity', {}) if isinstance(validation, dict) else {},
        'input': validation.get('input', {}) if isinstance(validation, dict) else {},
        'target_sizes_reviewed': validation.get('target_sizes_reviewed', []) if isinstance(validation, dict) else [],
        'limitations': validation.get('limitations', []) if isinstance(validation, dict) else [],
        'artifact': audit.get('metrics', {})
    }


def maybe_preview(root: Path, plan: dict[str, Any], temp: Path) -> Path | None:
    package = plan.get('package', {})
    if not package.get('include_preview'):
        return None
    source = root / str(package.get('preview_path', ''))
    if not source.exists() or not source.is_file():
        return None
    try:
        from PIL import Image
        target = temp / 'preview.webp'
        with Image.open(source) as image:
            image.thumbnail((1600, 1000))
            image.convert('RGB').save(target, 'WEBP', quality=82, method=6)
        return target
    except Exception:
        if source.stat().st_size <= 1_000_000:
            target = temp / f'preview{source.suffix.lower()}'
            shutil.copy2(source, target)
            return target
        return None


def package_project(root: Path, out: Path) -> dict[str, Any]:
    plan, plan_path = read_first(root, PLAN_LOCATIONS)
    if not plan_path:
        raise SystemExit('FORGE_PLAN.json is required before packaging')
    audit = audit_project(root, for_package=True)
    if audit['status'] != 'pass':
        print(json.dumps(audit, indent=2, ensure_ascii=False))
        raise SystemExit('project audit failed; package not created')

    files = collect_runtime_files(root, plan)
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        temp = Path(td)
        preview = maybe_preview(root, plan, temp)
        validation = compact_validation(root, audit)
        validation_path = temp / 'VALIDATION.json'
        write_json(validation_path, validation)
        with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            top = root.name
            for path in files:
                archive.write(path, f'{top}/{path.relative_to(root).as_posix()}')
            archive.write(validation_path, f'{top}/VALIDATION.json')
            if preview:
                archive.write(preview, f'{top}/{preview.name}')
    return {'status':'pass', 'zip':str(out), 'files':len(files) + 1 + int(bool(preview)), 'bytes':out.stat().st_size, 'audit':audit}



def merge_defaults(defaults: Any, value: Any) -> Any:
    if isinstance(defaults, dict) and isinstance(value, dict):
        merged = {key: merge_defaults(default, value.get(key)) if key in value else default for key, default in defaults.items()}
        for key, item in value.items():
            if key not in merged: merged[key] = item
        return merged
    return value if value is not None else defaults


def migrate_project(root: Path) -> dict[str, Any]:
    plan, plan_path = read_first(root, PLAN_LOCATIONS)
    if not plan_path:
        raise SystemExit('FORGE_PLAN.json is required for migration')
    current = int(plan.get('version', 0) or 0)
    if current > PLAN_VERSION:
        return {'status':'pass','project':str(root),'from':current,'to':current,'changed':False}
    if current == PLAN_VERSION:
        # Same schema version, but the template can still grow new keys within a version (e.g.
        # domain.technique_conformance added in v0.8.1) — back-fill those without a version bump,
        # instead of a project silently starting to fail audit with no automated upgrade path.
        template = json.loads((SKILL_ROOT / 'templates/FORGE_PLAN.json').read_text(encoding='utf-8'))
        migrated = merge_defaults(template, plan)
        migrated_domain = migrated.get('domain') if isinstance(migrated, dict) else None
        if isinstance(migrated_domain, dict) and nonempty(migrated_domain.get('canonical_technique')) and migrated_domain.get('technique_conformance') == 'not-applicable':
            # A blind template default of 'not-applicable' would contradict an already-declared
            # canonical_technique (which the check requires to stay empty under not-applicable).
            # Land on the most conservative non-conformant state instead of guessing 'conformant'
            # (an unearned pass) — this reliably fails audit with an actionable prompt to fill in
            # implemented_technique/technique_deviation_reason rather than a confusing self-contradiction.
            migrated_domain['technique_conformance'] = 'approximation'
        changed = migrated != plan
        if changed:
            backup = plan_path.with_name(plan_path.name + f'.v{current}.bak')
            if not backup.exists(): shutil.copy2(plan_path, backup)
            write_json(plan_path, migrated)
        validation, validation_path = read_first(root, VALIDATION_LOCATIONS)
        if validation_path and int(validation.get('version', 0) or 0) <= VALIDATION_VERSION:
            vcurrent = int(validation.get('version', 0) or 0)
            vtemplate = json.loads((SKILL_ROOT / 'templates/VALIDATION.json').read_text(encoding='utf-8'))
            vmigrated = merge_defaults(vtemplate, validation)
            vmigrated['version'] = VALIDATION_VERSION
            if vmigrated != validation:
                vbackup = validation_path.with_name(validation_path.name + f'.v{vcurrent}.bak')
                if not vbackup.exists(): shutil.copy2(validation_path, vbackup)
                write_json(validation_path, vmigrated)
                changed = True
        return {'status':'pass','project':str(root),'from':current,'to':current,'changed':changed}
    if current not in {4, 5}:
        raise SystemExit(f'unsupported plan migration: version {current}; this release migrates v4 or v5 only')
    template = json.loads((SKILL_ROOT / 'templates/FORGE_PLAN.json').read_text(encoding='utf-8'))
    migrated = merge_defaults(template, plan)
    migrated['version'] = PLAN_VERSION
    profile = str(migrated.get('profile', '')).strip()
    if profile == 'full-window-world':
        migrated['spatial']['applicable'] = True
        migrated['spatial']['specification'] = 'WorldSpec'
    if str(migrated.get('ambition', '')).strip() == 'flagship' and bool(migrated.get('spatial', {}).get('applicable', False)):
        migrated['asset_fidelity']['applicable'] = True
        if profile == 'full-window-world': migrated['asset_fidelity']['scope_mode'] = 'world-scale'
    backup = plan_path.with_name(plan_path.name + f'.v{current}.bak')
    if not backup.exists(): shutil.copy2(plan_path, backup)
    write_json(plan_path, migrated)
    validation, validation_path = read_first(root, VALIDATION_LOCATIONS)
    if validation_path and int(validation.get('version', 0) or 0) < VALIDATION_VERSION:
        vtemplate = json.loads((SKILL_ROOT / 'templates/VALIDATION.json').read_text(encoding='utf-8'))
        vmigrated = merge_defaults(vtemplate, validation)
        vmigrated['version'] = VALIDATION_VERSION
        vcurrent = int(validation.get('version', 0) or 0)
        vbackup = validation_path.with_name(validation_path.name + f'.v{vcurrent}.bak')
        if not vbackup.exists(): shutil.copy2(validation_path, vbackup)
        write_json(validation_path, vmigrated)
    return {'status':'pass','project':str(root),'from':current,'to':PLAN_VERSION,'changed':True,'backup':str(backup)}

def init_project(root: Path, profile: str, ambition: str) -> dict[str, Any]:
    root.mkdir(parents=True, exist_ok=True)
    forge = root / '.forge'
    forge.mkdir(exist_ok=True)
    plan = json.loads((SKILL_ROOT / 'templates/FORGE_PLAN.json').read_text(encoding='utf-8'))
    plan['profile'] = profile
    plan['ambition'] = ambition
    plan['experience_mode'] = PROFILE_MODES[profile]
    plan['experience']['workflow']['kind'] = PROFILE_MODES[profile]
    if profile == 'full-window-world':
        plan['spatial']['applicable'] = True
        plan['spatial']['specification'] = 'WorldSpec'
    if ambition == 'flagship' and bool(plan.get('spatial', {}).get('applicable', False)):
        plan['asset_fidelity']['applicable'] = True
        if profile == 'full-window-world': plan['asset_fidelity']['scope_mode'] = 'world-scale'
    if profile == 'design-studio':
        plan['authoring']['applicable'] = True
    if profile in {'data-instrument', 'operations-panel'}:
        plan['data_contract']['applicable'] = True
    write_json(forge / 'FORGE_PLAN.json', plan)
    shutil.copy2(SKILL_ROOT / 'templates/VALIDATION.json', forge / 'VALIDATION.json')
    (forge / 'work').mkdir(exist_ok=True)
    (root / 'src').mkdir(exist_ok=True)
    (root / 'assets').mkdir(exist_ok=True)
    if not (root / 'README.md').exists():
        (root / 'README.md').write_text(f'# {root.name}\n\nRun instructions and integration notes.\n', encoding='utf-8')
    return {'status':'pass','project':str(root),'plan':str(forge/'FORGE_PLAN.json')}


def doctor() -> dict[str, Any]:
    required = [
        'SKILL.md','skill.yaml','templates/FORGE_PLAN.json','templates/VALIDATION.json',
        'scripts/forge.py','scripts/check_html.mjs','scripts/browser_verify.mjs','scripts/fidelity_audit.mjs','scripts/spatial_audit.mjs',
        'kits/runtime/lifecycle.mjs','kits/runtime/frame-loop.mjs','kits/runtime/resolution-policy.mjs',
        'kits/systems/shared-field.mjs','kits/systems/world-director.mjs',
        'kits/three/panel-renderer.mjs','kits/three/shared-field-texture.mjs',
        'kits/three/lod-bands.mjs','kits/three/post-chain.mjs','kits/canvas/field-renderer.mjs',
        'kits/input/pointer-look.mjs','kits/input/locomotion.mjs','kits/ui/icon-system.mjs','kits/webgl/resolve-pass.mjs',
        'kits/compute/task-runner.mjs','kits/authoring/history-store.mjs',
        'kits/authoring/parameter-store.mjs','kits/three/picking-gizmo.mjs',
        'kits/analysis/measurement-series.mjs','kits/io/project-codec.mjs',
        'kits/world/semantic-region-field.mjs','kits/world/region-graph.mjs','kits/world/region-heightfield.mjs','kits/world/scatter-policy.mjs',
        'kits/spatial/surface-anchor.mjs','kits/spatial/placement-solver.mjs','kits/spatial/contact-validator.mjs','kits/authoring/asset-router.mjs','kits/authoring/asset-fidelity-policy.mjs',
        'scripts/asset_fidelity_audit.mjs','scripts/input_audit.mjs','references/asset-fidelity-gates.md',
        'references/perceptual-fidelity.md','references/interface-fidelity.md',
        'references/experience-concentration.md','references/measurement-integrity.md',
        'references/physics-simulation.md','references/parametric-design.md',
        'references/editor-interaction.md','references/compute-data-pipeline.md',
        'references/world-authoring.md','references/asset-authoring.md','references/spatial-reconciliation.md','references/evidence-driven-hardening.md',
        'references/lean-delivery.md','references/profiles.md','references/stack-selection.md','references/systemic-rendering.md',
        'references/wave-and-fluid-surfaces.md','references/wind-and-atmospheric-flow.md','references/fire-smoke-and-reactive-flow.md',
        'references/lighting-and-radiance.md','references/surface-scattering-and-pbr-materials.md','references/real-time-global-illumination.md',
        'references/reference-light-transport-and-path-tracing.md','references/volumetric-rendering.md'
    ]
    missing = [name for name in required if not (SKILL_ROOT / name).exists()]
    py_error = None
    try:
        py_compile.compile(str(SKILL_ROOT / 'scripts/forge.py'), doraise=True)
    except Exception as error:
        py_error = str(error)

    node_checks = []
    for path in list((SKILL_ROOT / 'kits').rglob('*.mjs')) + list((SKILL_ROOT / 'scripts').glob('*.mjs')):
        proc = subprocess.run(['node','--check',str(path)], capture_output=True, text=True)
        node_checks.append({'file':path.relative_to(SKILL_ROOT).as_posix(),'ok':proc.returncode==0,'error':(proc.stderr or proc.stdout).strip()})

    suite = unittest.defaultTestLoader.discover(str(SKILL_ROOT / 'tests'), pattern='test_*.py')
    runner = unittest.TextTestRunner(stream=open(os.devnull,'w'), verbosity=0)
    result = runner.run(suite)

    # playwright is listed as an optional dependency, but browser_verify.mjs hard-blocks
    # (exit 2) without it, and it is required infrastructure for any flagship browser/evidence
    # verification. doctor previously never checked this, so `doctor` could report pass while
    # flagship browser verification was actually unrunnable. Surface it as a warning rather than
    # a hard failure, since non-browser-verification workflows genuinely do not need it.
    playwright_probe = subprocess.run(['node', '-e', "require.resolve('playwright')"], capture_output=True, text=True, cwd=str(SKILL_ROOT))
    playwright_available = playwright_probe.returncode == 0
    warnings = [] if playwright_available else [
        'playwright is not resolvable from the skill root; scripts/browser_verify.mjs (including --evidence-suite) '
        'and any flagship browser-verification requirement will be blocked until it is installed (`npx playwright install`).'
    ]

    status = 'pass' if not missing and not py_error and all(item['ok'] for item in node_checks) and result.wasSuccessful() else 'fail'
    return {
        'status':status,
        'missing':missing,
        'python_error':py_error,
        'node_checks':node_checks,
        'tests':{'run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors)},
        'playwright_available':playwright_available,
        'warnings':warnings
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Immersive Web Simulation Forge')
    sub = parser.add_subparsers(dest='command', required=True)

    init_p = sub.add_parser('init')
    init_p.add_argument('project')
    init_p.add_argument('--profile', default='simulation-lab', choices=sorted(PROFILES))
    init_p.add_argument('--ambition', default='production', choices=['prototype','production','showcase','flagship'])

    migrate_p = sub.add_parser('migrate')
    migrate_p.add_argument('project')

    audit_p = sub.add_parser('audit')
    audit_p.add_argument('project')
    audit_p.add_argument('--out')
    audit_p.add_argument('--for-package', action='store_true')

    package_p = sub.add_parser('package')
    package_p.add_argument('project')
    package_p.add_argument('--out', required=True)

    sub.add_parser('doctor')
    args = parser.parse_args()

    if args.command == 'init':
        report = init_project(Path(args.project).resolve(), args.profile, args.ambition)
    elif args.command == 'migrate':
        report = migrate_project(Path(args.project).resolve())
    elif args.command == 'audit':
        report = audit_project(Path(args.project).resolve(), args.for_package)
        if args.out: write_json(Path(args.out), report)
    elif args.command == 'package':
        report = package_project(Path(args.project).resolve(), Path(args.out).resolve())
    else:
        report = doctor()

    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report.get('status') == 'pass' else 1


if __name__ == '__main__':
    raise SystemExit(main())
