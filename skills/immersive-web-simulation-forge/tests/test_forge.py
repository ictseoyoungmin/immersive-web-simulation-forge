from __future__ import annotations

import importlib.util
import json
import subprocess
import tempfile
import unittest
import zipfile
from copy import deepcopy
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts' / 'forge.py'
SKILL_ROOT = MODULE_PATH.parents[1]
spec = importlib.util.spec_from_file_location('forge_module', MODULE_PATH)
forge = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(forge)


def valid_plan(stack='three.js'):
    plan = {
        'version': 4,
        'profile': 'full-window-world',
        'ambition': 'flagship',
        'experience_mode': 'game',
        'delivery_mode': 'lean',
        'user_request': {
            'summary': 'A concentrated flagship exploration game',
            'target_sizes': ['1440x900'],
            'goals': ['clear identity', 'complete short loop'],
            'requested_constraints': []
        },
        'derived_constraints': [],
        'experience': {
            'core_promise': 'Wake the island by turning one living weather system.',
            'first_use': {
                'identity': 'A wind-cut island with one crown mechanism',
                'starting_state': 'The crown is visible from spawn',
                'meaningful_action': 'Touch the first wind relay',
                'visible_consequence': 'A route opens and the grass field pivots',
                'next_step': 'Follow the redirected wind to the next relay'
            },
            'workflow': {
                'kind': 'game',
                'job_to_be_done': 'Wake the island and reach the crown chamber',
                'entry_or_input': 'Arrive at the first relay',
                'manipulate_or_run': 'Follow wind and wake three stations',
                'inspect_or_interpret': 'Read the changed terrain and wind field',
                'compare_or_validate': 'Confirm all three routes converge on the crown',
                'complete_or_export': 'Enter the crown chamber and unlock observation flight',
                'recover_or_resume': 'Resume from the latest awakened relay'
            },
            'feature_budget': {
                'hero_system': 'living wind field',
                'hero_motif': 'split crown silhouette',
                'supporting_systems': ['terrain routes', 'reactive ecology', 'procedural audio'],
                'deferred': ['crafting', 'combat'],
                'expansion_rationale': ''
            },
            'scale_density': {
                'world_bounds_m': [-200, -200, 200, 200],
                'area_basis': 'bounding-box',
                'computed_area_km2': 0.16,
                'walking_speed_mps': 5.2,
                'landmark_count': 5,
                'typical_spacing_m': 65,
                'first_action_seconds': 9,
                'first_reward_seconds': 75,
                'density_rationale': 'Compact enough to show a landmark every minute while preserving island scale.'
            },
            'claims': [{
                'label': 'explorable boundary area',
                'displayed_value': 0.16,
                'unit': 'km2',
                'basis': 'bounding box from world bounds',
                'source': 'WORLD_BOUNDS',
                'verified': True,
                'display_policy': 'displayed'
            }]
        },
        'concepts': {
            'considered': ['crown island', 'vertical storm tower', 'tidal glass flats'],
            'selected': 'crown island',
            'spikes_built': 1,
            'selection_rationale': 'The runnable slice concentrated identity, action, and resolution.'
        },
        'representation': {
            'stack': stack,
            'required_capabilities': ['occlusion'],
            'ceiling_rationale': 'A runnable spike proved the fit.',
            'renderer_capital': ['depth', 'materials', 'input'],
            'runtime_footprint_rationale': 'One local bundle; no runtime downloads.'
        },
        'system': {
            'source_of_truth': 'wind field',
            'consumers': [
                {'name': 'grass', 'consequence': 'changes route readability'},
                {'name': 'audio', 'consequence': 'points toward active relay'},
                {'name': 'crown', 'consequence': 'opens navigation topology'}
            ],
            'update_rates': {'simulation': '60 Hz fixed', 'field': '15 Hz'}
        },
        'domain': {
            'claim_level': 'visual-concept',
            'authoritative_model': 'deterministic world state',
            'canonical_technique': '',
            'implemented_technique': 'authored deterministic world/wind state machine',
            'technique_conformance': 'not-applicable',
            'technique_deviation_reason': 'World state and wind response are artistic/authored; no established physical canonical technique applies to this hero mechanism.',
            'units': {'system': 'SI', 'coordinate_system': 'right-handed Y-up', 'quantities': ['position:m', 'speed:m/s']},
            'inputs': ['player actions'], 'outputs': ['world state'],
            'assumptions': [], 'limitations': ['Wind response is artistic, not physical'],
            'solver': {
                'applicable': False, 'method': '', 'time_step_policy': '',
                'initial_conditions': [], 'boundary_conditions': [],
                'stability_or_convergence': '', 'invariants': [], 'failure_states': []
            },
            'validation': {
                'oracle': '', 'known_cases': [], 'tolerances': [], 'uncertainty': '',
                'external_reference': '', 'review_status': 'not-applicable'
            }
        },
        'authoring': {
            'applicable': False, 'document_model': '', 'schema_version': '', 'stable_ids': False,
            'parameter_graph': '', 'constraints': [], 'selection_model': '',
            'transform_controls': [], 'snapping': '', 'measurements': [], 'undo_redo': False,
            'autosave_or_explicit_save': '', 'variant_comparison': '', 'import_formats': [],
            'export_formats': [], 'round_trip_validation': ''
        },
        'compute': {
            'execution': 'main-thread', 'workload': 'interactive',
            'workload_rationale': 'Small bounded world updates stay inside the frame budget.', 'latency_budget_ms': 8,
            'memory_budget_mb': 256, 'cancellable': False, 'progress_reporting': 'not-applicable',
            'deterministic_replay': True, 'stale_result_policy': 'latest frame state wins',
            'persistence': 'local checkpoint', 'fallback': 'lower visual fidelity'
        },
        'data_contract': {
            'applicable': False, 'schema_version': '', 'sources': [], 'provenance': '',
            'freshness': '', 'transformations': [], 'missing_error_policy': '',
            'action_confirmation': '', 'recovery': ''
        },
        'visual': {
            'default_view': 'Spawn shelf frames the split crown above the valley.',
            'art_direction_rules': ['one cold-green family', 'gold only marks agency', 'UI never covers the crown'],
            'composition_roles': ['contact meadow', 'active relay valley', 'crown horizon'],
            'material_or_mark_families': ['rough stone', 'translucent relay glass', 'wet grass'],
            'hero_state_changes': [{
                'name': 'Crown turn',
                'grammar': 'topology and wind redirection',
                'channels': ['geometry', 'navigation', 'motion', 'audio', 'lighting']
            }],
            'inspection_reveals': ['hidden mechanism', 'causal field data'],
            'ui_density_budget': 'One objective card, compass, and context prompt; no live debug telemetry.'
        },
        'fidelity': {
            'clarity_intent': 'clean atmospheric depth',
            'intentional_softness': False,
            'softness_rationale': '',
            'default_effective_pixel_ratio': 0.9,
            'presentation_effective_pixel_ratio': 1.0,
            'adaptive_min_ratio': 0.72,
            'adaptive_max_ratio': 1.0,
            'reconstruction': {'enabled': False, 'method': 'none', 'reviewed_at_target_size': False},
            'capture_mode': {
                'locks_quality': True, 'preset': 'presentation', 'records_internal_size': True,
                'separates_visual_from_performance_capture': True
            },
            'native_output_space': ['ui', 'text', 'icons'],
            'frequency_partition': {'scene_space': ['lighting'], 'native_output_space': ['grain', 'ui']}
        },
        'interface': {
            'visible_icon_count': 3, 'icon_system': 'inline-svg', 'icon_grid': 24,
            'optical_sizes': [16, 20, 24], 'unicode_placeholder_count': 0,
            'stroke_consistency': True, 'native_resolution': True
        },
        'input': {
            'pointer_look': True, 'horizontal_default': 'standard', 'vertical_default': 'standard',
            'direction_reviewed': True, 'drag_pointerlock_parity': True,
            'invert_x_configurable': True, 'invert_y_configurable': True
        },
        'measurement': {
            'wall_clock_source': 'external-requestAnimationFrame', 'warmup_ms': 1500,
            'measure_ms': 3000, 'samples': 3,
            'performance_scenarios': ['default', 'crown-transformed'],
            'frame_time_percentiles': ['p50', 'p95'],
            'job_scenarios': [], 'job_latency_percentiles': ['p50', 'p95'],
            'application_telemetry_cross_checked': True
        },
        'review': {
            'hardening_rounds': 2,
            'product_outcome': {
                'default_route_reviewed': True, 'first_use_clear': True,
                'primary_workflow_complete': True, 'art_direction_coherent': True,
                'ui_density_acceptable': True, 'unresolved_blockers': []
            },
            'domain_validity': {
                'status': 'not-applicable', 'claim_level_matches_evidence': True,
                'assumptions_visible': True, 'oracle_or_round_trip_run': True,
                'tolerances_met': None, 'limitations_disclosed': True, 'unresolved_blockers': []
            },
            'runtime_engineering': {
                'lifecycle_reviewed': True, 'history_persistence_reviewed': True,
                'cancellation_recovery_reviewed': True, 'performance_reviewed_or_blocked': True,
                'unresolved_blockers': []
            },
            'review_status': 'creator-reviewed / provisional'
        },
        'package': {'runtime_roots': ['index.html', 'src', 'assets'], 'include_preview': False, 'preview_path': ''}
    }
    plan['version'] = 6
    plan['authoring_strategy'] = {
        'mode': 'authored', 'authority_policy': 'generated-content-is-proposal',
        'provider_capabilities': [], 'providers': [], 'asset_classes': [],
        'reuse_policy': 'unique hero + reusable terrain families',
        'generation_budget': 'generation only when it improves local diversity',
        'fallback_policy': 'procedural/authored fallback'
    }
    plan['spatial'] = {
        'applicable': True, 'specification': 'WorldSpec',
        'coordinate_system': 'right-handed Y-up',
        'world_spec': {
            'scale': {'unit': 'm', 'authored_extent': [-200,-200,200,200], 'explorable_extent': [-190,-190,190,190]},
            'regions': [
                {'id':'spawn-meadow','role':'entry'}, {'id':'relay-valley','role':'pursuit'}, {'id':'crown-ridge','role':'resolution'}
            ],
            'relations': [
                {'from':'spawn-meadow','to':'relay-valley','relation':'connects'},
                {'from':'relay-valley','to':'crown-ridge','relation':'reachable'}
            ],
            'landmarks': [{'id':'split-crown','region':'crown-ridge'}],
            'asset_families': ['relay-stones','wind-grass','ridge-rocks'],
            'material_families': ['wet-grass','weathered-stone','relay-glass'],
            'interaction_zones': ['relay-approach','crown-chamber']
        },
        'semantic_fields': [{'name':'wind-region-field','channels':['routeAffinity','wetness','grassResponse']}],
        'terrain': {'authority':'height-field','region_conditioned':True,'boundary_blending':True,'operators':['ridge','basin'],'water_or_non_heightfield_exceptions':[]},
        'traversal': {'authority':'region graph + collision','primary_routes':['spawn→relay','relay→crown'],'required_clearances':['relay approach 2m'],'recovery_routes':['return to last awakened relay']},
        'regional_refinement': {'strategy':'global→regional','representative_region':'relay-valley','terrain_conditioned':True},
        'placement': {'authority':'terrain ray + support/collision checks','camera_grounded':True,'support_policy':'bottom probes','collision_policy':'reject protected overlap','navigation_clearance_policy':'preserve 2m routes'},
        'scale_bands': {
            'near': {'representation':'explicit','interaction':'full'},
            'mid': {'representation':'instanced-family','interaction':'limited'},
            'far': {'representation':'silhouette-proxy','interaction':'none'}
        }
    }
    plan['asset_fidelity'] = {
        'applicable': True, 'style_mode': 'stylized', 'scope_mode': 'world-scale',
        'visual_target': 'Premium authored island world with readable hero silhouettes and materially distinct near assets.',
        'identity_critical_classes': ['split-crown', 'wind-relay'],
        'hero_assets': ['split-crown'],
        'representative_families': ['relay-stones', 'ridge-rocks'],
        'non_object_identity_rationale': '',
        'band_budgets': {
            'near': {'representation':'explicit authored meshes','geometry':'hero silhouette + component form','materials':'multi-region authored materials','contact':'support probes + collision','shadows':'cast+receive','variation':'unique hero + family variants'},
            'mid': {'representation':'instanced authored families','geometry':'simplified family meshes','materials':'shared family materials','contact':'shared proxies','shadows':'selective cast+receive','variation':'seeded family variants'},
            'far': {'representation':'silhouette proxies','geometry':'macro silhouette','materials':'macro material family','contact':'not-applicable proxy policy','shadows':'receive or baked proxy','variation':'skyline rhythm variants'}
        },
        'primitive_policy': {
            'intentional_primitive_style': False, 'near_placeholder_ratio_max': 0.15, 'exceptions': [],
            'replacement_trigger': 'replace primitive-only identity-critical and repeated near placeholders before flagship completion'
        },
        'material_contract': {
            'families': ['rough stone','relay glass','wet grass'],
            'weathering_or_variation': 'seeded moss and edge variation',
            'roughness_response': 'stone rough, glass smooth, wetness lowers roughness',
            'normal_or_surface_detail': 'stone normal breakup and grass normals',
            'wetness_or_environment_response': 'rain darkens stone and increases relay reflections'
        },
        'evidence_requirements': {
            'hero_views':['hero','three-quarter','side-or-rear','close-material','contact'],
            'family_views':['representative-near','representative-mid'],
            'target_size_review':True, 'runtime_asset_report':True
        }
    }
    plan['construction_evidence'] = {
        'critical_subjects': ['split crown','relay contact','valley route'],
        'required_views': ['hero','alternate','interaction'],
        'reference_critical_objects': [],
        'pass_plan': ['structure','spatial','interaction','appearance','performance','delivery'],
        'provenance': [],
        'vertical_slice': {'global_skeleton':True,'representative_region':'relay-valley','hero_asset':'split crown','placement_contact_path':True,'runtime_interaction':True}
    }
    return plan



def valid_validation(
    profile='full-window-world', claim_level='visual-concept',
    technique_conformance='not-applicable', canonical_technique='', implemented_technique='authored deterministic world/wind state machine',
    technique_deviation_reason='World state and wind response are artistic/authored; no established physical canonical technique applies to this hero mechanism.'
):
    # Defaults match valid_plan()'s domain.technique_conformance ('not-applicable', which requires
    # canonical_technique to stay empty). Callers paired with a plan that declares a different
    # technique_conformance (e.g. valid_simulation_plan()'s 'conformant') must pass matching values
    # here, since 'not-applicable' and the other three states require opposite field emptiness.
    domain_applicable = profile in forge.DOMAIN_PROFILES
    return {
        'version': 6,
        'implemented': True,
        'browser': {'executed': True, 'intended_route': True},
        'workflow_review': {
            'default_route': 'pass', 'first_use': 'pass', 'complete_loop': 'pass',
            'comparison_or_validation': 'pass', 'completion_or_export': 'pass',
            'failure_recovery': 'pass',
            'claim_audit': {'status': 'pass', 'claims': ['explorable boundary area']}
        },
        'domain_validation': {
            'status': 'pass' if domain_applicable else 'not-applicable',
            'claim_level': claim_level, 'canonical_technique': canonical_technique, 'implemented_technique': implemented_technique,
            'technique_conformance': technique_conformance,
            'technique_deviation_reason': technique_deviation_reason,
            'oracle': 'reference fixture',
            'known_cases': ['reference case'], 'tolerances_met': True,
            'invariants_or_geometry_checks': ['finite state'],
            'round_trip': 'pass' if profile == 'design-studio' else 'not-applicable',
            'limitations_disclosed': True, 'external_review': 'reference-reviewed',
            'unresolved_defects': []
        },
        'runtime_engineering': {
            'status': 'pass', 'lifecycle': 'pass',
            'history_persistence': 'pass' if profile == 'design-studio' else 'not-applicable',
            'cancellation_recovery': 'pass', 'stale_result_rejection': 'pass',
            'unresolved_defects': []
        },
        'construction_validation': {'status':'pass','authoring_strategy':'pass','proposal_boundary':'not-applicable','provider_provenance':'not-applicable','reference_critical_objects':'not-applicable','pass_locking':'pass','unresolved_defects':[]},
        'asset_fidelity_validation': {
            'status':'pass','style_mode':'stylized','identity_critical_coverage':'pass','hero_asset_evidence':'pass',
            'representative_family_evidence':'pass','near_band_quality':'pass','material_validation':'pass',
            'contact_validation':'pass','placeholder_audit':'pass','multi_view_coverage':'pass','target_size_review':'pass',
            'runtime_asset_report':'pass','near_placeholder_ratio':0.05,'identity_critical_count':2,'hero_asset_count':1,
            'representative_family_count':2,'evidence_views':['hero','three-quarter','contact'],'unresolved_defects':[]
        },
        'spatial_validation': {'status':'pass' if profile == 'full-window-world' else 'not-applicable','region_continuity':'pass' if profile == 'full-window-world' else 'not-applicable','placement':'pass' if profile == 'full-window-world' else 'not-applicable','contact':'pass' if profile == 'full-window-world' else 'not-applicable','collision':'pass' if profile == 'full-window-world' else 'not-applicable','navigation_clearance':'pass' if profile == 'full-window-world' else 'not-applicable','lod_assignment':'pass' if profile == 'full-window-world' else 'not-applicable','unresolved_defects':[]},
        'evidence_review': {'status':'pass','scenario_matrix':['default','transformed'],'before_after_pairs':['hero-before→hero-after'],'blockers_have_evidence':True,'regression_reviewed':True,'unresolved_defects':[]},
        'visual_review': {'status': 'creator-reviewed / provisional', 'evidence_views':['hero','alternate'] if profile == 'full-window-world' else ['hero'], 'critical_subjects':['hero system'], 'locked_passes':['structure','interaction','appearance'], 'defect_queue':[], 'hardening_rounds': 2, 'regression_reviewed':True, 'unresolved_defects': []},
        'performance': {
            'measured': True, 'measurement_block': '',
            'source': 'external-requestAnimationFrame-wall-clock', 'warmup_ms': 1500,
            'sample_count': 3, 'scenarios': ['default', 'crown-transformed'],
            'frame_time': {'median_ms': 14.2, 'p95_ms': 22.4}, 'average_fps': 66.8,
            'job_latency': {'scenarios': ['reference', 'stress'], 'median_ms': 82, 'p95_ms': 140, 'cancellation_ms': 12},
            'application_telemetry_cross_checked': True,
            'renderer': 'target GPU', 'software_renderer': False
        },
        'fidelity': {
            'capture_preset': 'presentation', 'css_size': [1440, 900], 'internal_size': [1440, 900],
            'effective_pixel_ratio': 1.0, 'adaptive_locked': True, 'reconstruction': 'none',
            'ui_native_resolution': True, 'icon_review': 'pass'
        },
        'input': {
            'pointer_direction_review': 'pass', 'drag_pointerlock_parity': 'pass',
            'selection_transform_review': 'pass' if profile == 'design-studio' else 'not-applicable',
            'keyboard_path_review': 'pass'
        }
    }


def valid_simulation_plan():
    plan = deepcopy(valid_plan())
    plan['profile'] = 'simulation-lab'
    plan['spatial'] = deepcopy(json.loads((SKILL_ROOT / 'templates/FORGE_PLAN.json').read_text()))['spatial']
    plan['experience_mode'] = 'instrument'
    plan['user_request']['summary'] = 'A browser laboratory for a damped spring-mass system'
    plan['experience']['core_promise'] = 'Configure a spring, see its motion and energy, and compare reproducible runs.'
    plan['experience']['first_use'] = {
        'identity': 'A spring-mass laboratory with live motion and energy plots',
        'starting_state': 'A stable underdamped preset is loaded',
        'meaningful_action': 'Change damping and run the case',
        'visible_consequence': 'Motion, phase plot, and energy curve update together',
        'next_step': 'Save the run and compare it with the baseline'
    }
    plan['experience']['workflow'] = {
        'kind': 'instrument', 'job_to_be_done': 'Compare damping regimes',
        'entry_or_input': 'Load a valid SI-unit preset',
        'manipulate_or_run': 'Configure mass, stiffness, damping, and run',
        'inspect_or_interpret': 'Inspect motion, energy, and phase-space plots',
        'compare_or_validate': 'Overlay the analytical reference and prior run',
        'complete_or_export': 'Export configuration and CSV samples',
        'recover_or_resume': 'Cancel safely or reopen the last valid run'
    }
    plan['experience']['claims'] = [{
        'label': 'integration step', 'displayed_value': 0.001, 'unit': 's',
        'basis': 'fixed solver timestep', 'source': 'SOLVER_DT', 'verified': True,
        'display_policy': 'displayed'
    }]
    plan['domain'] = {
        'claim_level': 'decision-support',
        'authoritative_model': 'linear damped oscillator m*x2+c*x1+k*x=0',
        'canonical_technique': 'velocity Verlet integration of a linear damped harmonic oscillator',
        'implemented_technique': 'velocity Verlet integration of a linear damped harmonic oscillator',
        'technique_conformance': 'conformant',
        'technique_deviation_reason': '',
        'units': {'system': 'SI', 'coordinate_system': 'positive displacement right', 'quantities': ['mass:kg', 'stiffness:N/m', 'damping:N*s/m', 'time:s']},
        'inputs': ['mass', 'stiffness', 'damping', 'initial displacement'],
        'outputs': ['position', 'velocity', 'energy'],
        'assumptions': ['linear spring', 'constant coefficients'],
        'limitations': ['No nonlinear stiffness or contact'],
        'solver': {
            'applicable': True, 'method': 'velocity Verlet with damping split',
            'time_step_policy': 'fixed 0.001 s; reject unstable parameter combinations',
            'initial_conditions': ['x(0)=user value', 'v(0)=0'],
            'boundary_conditions': ['not spatially bounded'],
            'stability_or_convergence': 'halve dt and require peak displacement delta below 0.1%',
            'invariants': ['energy non-increasing for c>=0'],
            'failure_states': ['non-finite state', 'non-convergence', 'cancelled']
        },
        'validation': {
            'oracle': 'closed-form damped oscillator solution',
            'known_cases': ['undamped period', 'critical damping', 'overdamped monotonic return'],
            'tolerances': ['position max error <=0.2%', 'energy never increases above 1e-6'],
            'uncertainty': 'numerical discretization only',
            'external_reference': 'published closed-form equation fixture',
            'review_status': 'reference-reviewed'
        }
    }
    plan['compute'] = {
        'execution': 'worker', 'workload': 'batch',
        'workload_rationale': 'A complete numerical run can exceed the interaction budget.', 'latency_budget_ms': 500,
        'memory_budget_mb': 64, 'cancellable': True, 'progress_reporting': 'completed steps / total steps',
        'deterministic_replay': True, 'stale_result_policy': 'ignore superseded job IDs',
        'persistence': 'versioned run configurations', 'fallback': 'shorter duration with disclosed limit'
    }
    plan['measurement']['job_scenarios'] = ['reference run', 'long-duration stress run']
    plan['visual'].update({
        'default_view': 'Spring motion dominates left; energy and phase plots align at right.',
        'composition_roles': ['parameter rail', 'hero motion viewport', 'comparison plots'],
        'material_or_mark_families': ['solid mechanism geometry', 'measured cyan trace', 'analytical amber reference'],
        'hero_state_changes': [{
            'name': 'Damping regime change', 'grammar': 'motion and analytical comparison',
            'channels': ['mechanism motion', 'phase plot', 'energy plot', 'diagnostics']
        }]
    })
    plan['input']['pointer_look'] = False
    plan['review']['domain_validity'].update({
        'status': 'pass', 'claim_level_matches_evidence': True, 'assumptions_visible': True,
        'oracle_or_round_trip_run': True, 'tolerances_met': True,
        'limitations_disclosed': True, 'unresolved_blockers': []
    })
    return plan


def valid_design_plan():
    plan = deepcopy(valid_plan())
    plan['profile'] = 'design-studio'
    plan['spatial'] = deepcopy(json.loads((SKILL_ROOT / 'templates/FORGE_PLAN.json').read_text()))['spatial']
    plan['experience_mode'] = 'authoring'
    plan['user_request']['summary'] = 'A high-end parametric helicopter concept design studio'
    plan['experience']['core_promise'] = 'Shape, compare, validate, and export a coherent helicopter concept.'
    plan['experience']['first_use'] = {
        'identity': 'A parametric helicopter studio with one clean baseline craft',
        'starting_state': 'A valid medium-lift helicopter document is selected',
        'meaningful_action': 'Increase rotor diameter with a numeric control or gizmo',
        'visible_consequence': 'Rotor geometry, clearance measurement, and validation update together',
        'next_step': 'Save a named variant and compare silhouettes'
    }
    plan['experience']['workflow'] = {
        'kind': 'authoring', 'job_to_be_done': 'Create and compare a helicopter concept',
        'entry_or_input': 'Open a valid versioned baseline document',
        'manipulate_or_run': 'Select parts and edit constrained parameters',
        'inspect_or_interpret': 'Inspect dimensions, clearances, materials, and section views',
        'compare_or_validate': 'Run geometry checks and compare named variants',
        'complete_or_export': 'Save and export GLB, PNG, and project JSON',
        'recover_or_resume': 'Undo the edit or recover the last saved document'
    }
    plan['experience']['claims'] = []
    plan['domain'] = {
        'claim_level': 'visual-concept',
        'authoritative_model': 'versioned parametric helicopter assembly document',
        'canonical_technique': '',
        'implemented_technique': 'authored parametric CAD-style assembly document',
        'technique_conformance': 'not-applicable',
        'technique_deviation_reason': 'Authored parametric geometry has no established physical/numerical canonical technique to compare against; this is a document model, not a simulated phenomenon.',
        'units': {'system': 'SI', 'coordinate_system': 'right-handed Y-up, forward -Z', 'quantities': ['length:m', 'angle:deg']},
        'inputs': ['airframe and rotor parameters'], 'outputs': ['concept geometry and measurements'],
        'assumptions': ['visual concept only'],
        'limitations': ['No aerodynamic, structural, or manufacturability claim'],
        'solver': {'applicable': False, 'method': '', 'time_step_policy': '', 'initial_conditions': [], 'boundary_conditions': [], 'stability_or_convergence': '', 'invariants': [], 'failure_states': ['invalid parameter graph']},
        'validation': {'oracle': 'schema, constraints, geometry checks, and export round trip', 'known_cases': [], 'tolerances': [], 'uncertainty': '', 'external_reference': '', 'review_status': 'creator-reviewed'}
    }
    plan['authoring'] = {
        'applicable': True, 'document_model': 'HelicopterProject', 'schema_version': '1.0',
        'stable_ids': True, 'parameter_graph': 'rotor, fuselage, cabin, tail, and gear dependency DAG',
        'constraints': ['rotor clears tail', 'positive finite dimensions'],
        'selection_model': 'shared stable-ID selection across tree, viewport, and inspector',
        'transform_controls': ['axis gizmo', 'numeric entry', 'local/world modes'],
        'snapping': '0.01 m and 1 degree with visible override',
        'measurements': ['rotor clearance', 'overall length', 'cabin volume'],
        'undo_redo': True, 'autosave_or_explicit_save': 'explicit save plus local recovery snapshot',
        'variant_comparison': 'named variants with parameter diff and locked camera',
        'import_formats': ['project JSON'], 'export_formats': ['project JSON', 'GLB', 'PNG'],
        'round_trip_validation': 'project JSON reload preserves IDs, units, parameters, and constraints'
    }
    plan['visual'].update({
        'default_view': 'Three-quarter helicopter view with restrained tool rail and validation strip.',
        'composition_roles': ['authoring toolbar', 'hero 3D viewport', 'properties and validation inspector'],
        'material_or_mark_families': ['painted composite shell', 'machined rotor hardware', 'glass and section overlays'],
        'hero_state_changes': [{
            'name': 'Rotor architecture edit', 'grammar': 'parametric assembly update',
            'channels': ['geometry', 'measurements', 'validation', 'variant diff']
        }]
    })
    plan['input']['pointer_look'] = False
    plan['review']['domain_validity'].update({
        'status': 'pass', 'claim_level_matches_evidence': True, 'assumptions_visible': True,
        'oracle_or_round_trip_run': True, 'tolerances_met': None,
        'limitations_disclosed': True, 'unresolved_blockers': []
    })
    plan['review']['runtime_engineering']['history_persistence_reviewed'] = True
    return plan


def make_project(root: Path, plan=None, html=None, validation=None):
    (root / '.forge').mkdir(parents=True)
    (root / 'src').mkdir()
    (root / 'assets').mkdir()
    default_html = '<!doctype html><button aria-label="Audio"><svg viewBox="0 0 24 24"></svg></button><canvas></canvas><script type="module" src="./src/main.mjs"></script>'
    (root / 'index.html').write_text(html or default_html, encoding='utf-8')
    (root / 'src/main.mjs').write_text('export const world={destroy(){},dispose(){}}; addEventListener("webglcontextlost",()=>{});', encoding='utf-8')
    (root / 'README.md').write_text('# Demo\n', encoding='utf-8')
    (root / '.forge/FORGE_PLAN.json').write_text(json.dumps(plan or valid_plan()), encoding='utf-8')
    (root / '.forge/VALIDATION.json').write_text(json.dumps(validation or valid_validation()), encoding='utf-8')
    effective_plan = plan or valid_plan()
    if effective_plan.get('ambition') == 'flagship' and effective_plan.get('spatial', {}).get('applicable'):
        (root / '.forge/asset-fidelity-audit.json').write_text(json.dumps({
            'status':'pass','flagship':True,'contract':'asset-fidelity/v1',
            'metrics':{'near_placeholder_ratio':0.05,'identity_critical_count':2,'hero_asset_count':1,'family_count':2},
            'findings':[]
        }), encoding='utf-8')


class ForgeTests(unittest.TestCase):
    def test_valid_flagship_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); make_project(root)
            report = forge.audit_project(root)
            self.assertEqual(report['status'], 'pass', report)

    def test_missing_technique_conformance_fails_even_for_full_window_world(self):
        # A full-window-world flagship (e.g. an ocean/weather showcase) sits outside
        # DOMAIN_PROFILES, so this must fire independently of profile-gated domain checks.
        # Leaving technique_conformance unset must fail outright — it is no longer possible
        # to dodge the whole disclosure contract by simply not declaring canonical_technique.
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['canonical_technique'] = ''
            plan['domain']['implemented_technique'] = ''
            plan['domain']['technique_conformance'] = ''
            plan['domain']['technique_deviation_reason'] = ''
            make_project(root, plan)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('technique conformance declared', failed)
            self.assertEqual(report['status'], 'fail')

    def test_undisclosed_technique_approximation_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['canonical_technique'] = 'Tessendorf/Horvath spectral synthesis (inverse FFT)'
            plan['domain']['implemented_technique'] = 'finite 8-band analytic sum of sines'
            plan['domain']['technique_conformance'] = 'approximation'
            plan['domain']['technique_deviation_reason'] = ''
            validation = valid_validation()
            validation['domain_validation']['canonical_technique'] = plan['domain']['canonical_technique']
            validation['domain_validation']['implemented_technique'] = plan['domain']['implemented_technique']
            validation['domain_validation']['technique_conformance'] = 'approximation'
            validation['domain_validation']['technique_deviation_reason'] = ''
            make_project(root, plan, validation=validation)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('technique deviation disclosed', failed)
            self.assertIn('runtime technique deviation disclosed', failed)
            self.assertEqual(report['status'], 'fail')

    def test_disclosed_technique_approximation_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['canonical_technique'] = 'Tessendorf/Horvath spectral synthesis (inverse FFT)'
            plan['domain']['implemented_technique'] = 'finite 8-band analytic sum of sines'
            plan['domain']['technique_conformance'] = 'approximation'
            plan['domain']['technique_deviation_reason'] = (
                'Chose a fixed 8-band approximation over IFFT synthesis for a lean WebGL-only build; '
                'visible cost: waves repeat past ~200m and foam is a decorative noise field, not slope-derived.'
            )
            validation = valid_validation()
            validation['domain_validation']['canonical_technique'] = plan['domain']['canonical_technique']
            validation['domain_validation']['implemented_technique'] = plan['domain']['implemented_technique']
            validation['domain_validation']['technique_conformance'] = 'approximation'
            validation['domain_validation']['technique_deviation_reason'] = plan['domain']['technique_deviation_reason']
            make_project(root, plan, validation=validation)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertNotIn('technique deviation disclosed', failed)
            self.assertNotIn('runtime technique deviation disclosed', failed)
            self.assertEqual(report['status'], 'pass', report)

    def test_conformant_technique_with_differently_worded_authoritative_model_passes(self):
        # This is the exact false-positive the old string-diff check produced: an honest,
        # detailed authoritative_model will almost never match canonical_technique verbatim,
        # even when the implementation genuinely IS the canonical technique.
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['canonical_technique'] = 'Tessendorf/Horvath spectral synthesis (inverse FFT)'
            plan['domain']['implemented_technique'] = 'Tessendorf/Horvath spectral synthesis (inverse FFT)'
            plan['domain']['authoritative_model'] = (
                '3-cascade JONSWAP/TMA spectral ocean, seeded Gaussian amplitudes, '
                'Stockham IFFT, Jacobian-derived foam'
            )
            plan['domain']['technique_conformance'] = 'conformant'
            plan['domain']['technique_deviation_reason'] = ''
            validation = valid_validation()
            validation['domain_validation']['canonical_technique'] = plan['domain']['canonical_technique']
            validation['domain_validation']['implemented_technique'] = plan['domain']['implemented_technique']
            validation['domain_validation']['technique_conformance'] = 'conformant'
            make_project(root, plan, validation=validation)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertNotIn('technique deviation disclosed', failed)
            self.assertNotIn('technique conformance evidence', failed)
            self.assertEqual(report['status'], 'pass', report)

    def test_not_applicable_with_named_canonical_technique_fails(self):
        # Declaring not-applicable while still naming a canonical_technique is a contradiction —
        # it must not become a quiet way to skip disclosure for a phenomenon that does have one.
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['canonical_technique'] = 'Tessendorf/Horvath spectral synthesis (inverse FFT)'
            plan['domain']['technique_conformance'] = 'not-applicable'
            plan['domain']['technique_deviation_reason'] = 'no reason needed'
            make_project(root, plan)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('technique not-applicable rationale', failed)

    def test_runtime_not_applicable_with_named_canonical_technique_fails(self):
        # Same contradiction as above, but surfacing only in VALIDATION.json's domain_validation
        # mirror while the plan itself is clean — the runtime check must independently catch it
        # rather than only checking technique_deviation_reason is nonempty.
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['canonical_technique'] = ''
            plan['domain']['technique_conformance'] = 'not-applicable'
            plan['domain']['technique_deviation_reason'] = 'No established canonical technique applies here.'
            validation = valid_validation()
            validation['domain_validation']['technique_conformance'] = 'not-applicable'
            validation['domain_validation']['canonical_technique'] = 'Tessendorf/Horvath spectral synthesis (inverse FFT)'
            validation['domain_validation']['technique_deviation_reason'] = 'No established canonical technique applies here.'
            make_project(root, plan, validation=validation)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('runtime technique not-applicable rationale', failed)

    def test_runtime_technique_conformance_mismatched_with_plan_fails(self):
        # The mirrored domain_validation.technique_conformance field must itself be checked against
        # the plan's declaration, not just used implicitly to pick which branch to validate.
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()  # domain.technique_conformance = 'not-applicable'
            validation = valid_validation()
            validation['domain_validation']['technique_conformance'] = 'conformant'
            make_project(root, plan, validation=validation)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('runtime technique conformance matches plan', failed)

    def test_not_applicable_requires_implemented_technique_too(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir()
            plan = valid_plan()
            plan['domain']['implemented_technique'] = ''
            make_project(root, plan)
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('technique not-applicable rationale', failed)

    def test_new_profiles_initialize_with_expected_workflow(self):
        expected = {
            'simulation-lab': 'instrument', 'design-studio': 'authoring',
            'data-instrument': 'instrument', 'operations-panel': 'instrument'
        }
        with tempfile.TemporaryDirectory() as td:
            for profile, mode in expected.items():
                root = Path(td) / profile
                forge.init_project(root, profile, 'production')
                plan = json.loads((root / '.forge/FORGE_PLAN.json').read_text())
                self.assertEqual(plan['version'], 6)
                self.assertEqual(plan['experience_mode'], mode)
                self.assertEqual(plan['experience']['workflow']['kind'], mode)
            self.assertTrue(json.loads((Path(td) / 'design-studio/.forge/FORGE_PLAN.json').read_text())['authoring']['applicable'])

    def test_valid_simulation_lab_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'lab'; root.mkdir()
            make_project(root, valid_simulation_plan(), validation=valid_validation('simulation-lab', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            report = forge.audit_project(root)
            self.assertEqual(report['status'], 'pass', report)

    def test_simulation_requires_units_and_solver_contract(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'lab'; root.mkdir(); plan = valid_simulation_plan()
            plan['domain']['units']['quantities'] = []
            plan['domain']['solver']['stability_or_convergence'] = ''
            make_project(root, plan, validation=valid_validation('simulation-lab', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            report = forge.audit_project(root)
            failed = {item['name'] for item in report['checks'] if item['status'] == 'fail'}
            self.assertIn('units and coordinates', failed)
            self.assertIn('solver contract', failed)

    def test_decision_support_requires_reference_cases_and_tolerances(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'lab'; root.mkdir(); plan = valid_simulation_plan()
            plan['domain']['validation']['known_cases'] = []
            plan['domain']['validation']['tolerances'] = []
            make_project(root, plan, validation=valid_validation('simulation-lab', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_heavy_compute_requires_cancel_progress_and_stale_policy(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'lab'; root.mkdir(); plan = valid_simulation_plan()
            plan['compute']['cancellable'] = False
            plan['compute']['progress_reporting'] = 'not-applicable'
            plan['compute']['stale_result_policy'] = ''
            make_project(root, plan, validation=valid_validation('simulation-lab', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            report = forge.audit_project(root)
            self.assertIn('cancellable compute protocol', {item['name'] for item in report['checks'] if item['status'] == 'fail'})

    def test_valid_design_studio_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'studio'; root.mkdir()
            make_project(root, valid_design_plan(), validation=valid_validation('design-studio', 'visual-concept'))
            report = forge.audit_project(root)
            self.assertEqual(report['status'], 'pass', report)

    def test_data_instrument_requires_and_accepts_provenance_contract(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'instrument'; root.mkdir(); plan = valid_simulation_plan()
            plan['profile'] = 'data-instrument'
            plan['data_contract'] = {
                'applicable': True, 'schema_version': '1', 'sources': ['measured oscillator CSV'],
                'provenance': 'file hash, import timestamp, and column mapping',
                'freshness': 'snapshot', 'transformations': ['SI normalization', 'energy derivation'],
                'missing_error_policy': 'reject missing time and interpolate no values',
                'action_confirmation': 'not-applicable', 'recovery': 'restore last valid import'
            }
            make_project(root, plan, validation=valid_validation('data-instrument', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            self.assertEqual(forge.audit_project(root)['status'], 'pass')
            plan['data_contract']['provenance'] = ''
            (root / '.forge/FORGE_PLAN.json').write_text(json.dumps(plan))
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_operations_panel_requires_confirmation_and_recovery(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'ops'; root.mkdir(); plan = valid_simulation_plan()
            plan['profile'] = 'operations-panel'
            plan['data_contract'] = {
                'applicable': True, 'schema_version': '1', 'sources': ['live rotor telemetry'],
                'provenance': 'signed gateway stream and device ID', 'freshness': 'stale after 2 seconds',
                'transformations': ['unit normalization', 'limit evaluation'],
                'missing_error_policy': 'hold last known good and mark stale',
                'action_confirmation': 'preview device and command scope before dispatch',
                'recovery': 'idempotent retry and explicit rollback command'
            }
            make_project(root, plan, validation=valid_validation('operations-panel', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            (root / 'src/main.mjs').write_text('''
            export const panel={mount(){},update(){},resize(){},suspend(){},resume(){},destroy(){}};
            const observer = new ResizeObserver(()=>panel.resize());
            ''')
            self.assertEqual(forge.audit_project(root)['status'], 'pass')
            plan['data_contract']['action_confirmation'] = ''
            (root / '.forge/FORGE_PLAN.json').write_text(json.dumps(plan))
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_design_studio_requires_history_and_round_trip(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'studio'; root.mkdir(); plan = valid_design_plan()
            plan['authoring']['undo_redo'] = False
            plan['authoring']['round_trip_validation'] = ''
            make_project(root, plan, validation=valid_validation('design-studio', 'visual-concept'))
            failed = {item['name'] for item in forge.audit_project(root)['checks'] if item['status'] == 'fail'}
            self.assertIn('history persistence and variants', failed)
            self.assertIn('design export round trip', failed)

    def test_design_studio_cannot_upgrade_visual_concept_to_engineering_without_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'studio'; root.mkdir(); plan = valid_design_plan()
            plan['domain']['claim_level'] = 'engineering'
            plan['review']['domain_validity']['tolerances_met'] = True
            make_project(root, plan, validation=valid_validation('design-studio', 'engineering'))
            failed = {item['name'] for item in forge.audit_project(root)['checks'] if item['status'] == 'fail'}
            self.assertIn('quantitative validation evidence', failed)
            self.assertIn('domain review status', failed)

    def test_product_domain_and_runtime_ledgers_do_not_substitute(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'lab'; root.mkdir(); plan = valid_simulation_plan()
            plan['review']['domain_validity']['unresolved_blockers'] = ['reference mismatch']
            make_project(root, plan, validation=valid_validation('simulation-lab', 'decision-support', technique_conformance='conformant', canonical_technique='velocity Verlet integration of a linear damped harmonic oscillator', implemented_technique='velocity Verlet integration of a linear damped harmonic oscillator', technique_deviation_reason=''))
            failed = {item['name'] for item in forge.audit_project(root)['checks'] if item['status'] == 'fail'}
            self.assertIn('domain validity ledger', failed)
            self.assertNotIn('product outcome ledger', failed)

    def test_workflow_requires_recovery_and_completion(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'studio'; root.mkdir(); plan = valid_design_plan()
            plan['experience']['workflow']['recover_or_resume'] = ''
            plan['experience']['workflow']['complete_or_export'] = ''
            make_project(root, plan, validation=valid_validation('design-studio', 'visual-concept'))
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_unjustified_added_constraint_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan(); plan['derived_constraints'] = [{'name': 'offline'}]
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_exact_derived_constraint_shape_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['derived_constraints'] = [{
                'name': 'worker execution',
                'reason': 'The requested comparison run can exceed the input latency budget.',
                'benefit': 'Input remains responsive during computation.',
                'cost': 'Adds a message protocol and cancellation state.',
                'rejected_alternative': 'Blocking the main thread during a run.'
            }]
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'pass')

    def test_incomplete_first_use_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan(); plan['experience']['first_use']['meaningful_action'] = ''
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_feature_sprawl_requires_rationale(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['experience']['feature_budget']['supporting_systems'] = ['a', 'b', 'c', 'd', 'e']
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')
            plan['experience']['feature_budget']['expansion_rationale'] = 'All five are required by the primary loop.'
            (root / '.forge/FORGE_PLAN.json').write_text(json.dumps(plan))
            self.assertEqual(forge.audit_project(root)['status'], 'pass')

    def test_one_consequential_transformation_is_enough(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); make_project(root)
            self.assertEqual(forge.audit_project(root)['status'], 'pass')

    def test_second_transformation_must_use_distinct_grammar(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['visual']['hero_state_changes'].append({
                'name': 'Second crown turn', 'grammar': 'topology and wind redirection',
                'channels': ['geometry', 'navigation', 'motion', 'audio']
            })
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_world_area_must_match_bounds(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan(); plan['experience']['scale_density']['computed_area_km2'] = 7.2
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_public_area_claim_must_match_basis(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan(); plan['experience']['claims'][0]['displayed_value'] = 7.2
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_planned_unverified_claim_must_be_hidden_and_warns(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['experience']['claims'][0]['verified'] = False
            plan['experience']['claims'][0]['display_policy'] = 'hidden-until-verified'
            validation = valid_validation(); validation['implemented'] = False
            make_project(root, plan, validation=validation)
            report = forge.audit_project(root)
            self.assertEqual(report['status'], 'pass', report)
            self.assertIn('planned claims remain hidden', {item['name'] for item in report['checks'] if item['status'] == 'warn'})

    def test_implemented_product_rejects_unverified_claim_even_when_hidden(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['experience']['claims'][0]['verified'] = False
            plan['experience']['claims'][0]['display_policy'] = 'hidden-until-verified'
            make_project(root, plan, validation=valid_validation())
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_compute_workload_requires_enum_and_rationale(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['compute']['workload'] = 'sometimes-big'
            plan['compute']['workload_rationale'] = ''
            make_project(root, plan)
            failed = {item['name'] for item in forge.audit_project(root)['checks'] if item['status'] == 'fail'}
            self.assertIn('compute workload', failed)

    def test_canvas_is_allowed_for_non_spatial_thesis(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan('canvas2d')
            plan['representation']['required_capabilities'] = ['dense-2d-field', 'painterly-compositing']
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'pass')

    def test_canvas_spatial_claim_requires_proven_equivalent(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan('canvas2d')
            plan['representation']['ceiling_rationale'] = 'easy implementation'
            plan['representation']['capability_equivalent_proven'] = False
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_low_clarity_without_reconstruction_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['fidelity']['default_effective_pixel_ratio'] = 0.66
            plan['fidelity']['presentation_effective_pixel_ratio'] = 0.8
            plan['fidelity']['adaptive_max_ratio'] = 0.8
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_reviewed_reconstruction_can_support_lower_scene_ratio(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['fidelity']['default_effective_pixel_ratio'] = 0.7
            plan['fidelity']['presentation_effective_pixel_ratio'] = 0.82
            plan['fidelity']['adaptive_max_ratio'] = 0.82
            plan['fidelity']['reconstruction'] = {'enabled': True, 'method': 'temporal-upscale', 'reviewed_at_target_size': True}
            validation = valid_validation(); validation['fidelity']['effective_pixel_ratio'] = 0.82; validation['fidelity']['reconstruction'] = 'temporal-upscale'
            make_project(root, plan, validation=validation)
            self.assertEqual(forge.audit_project(root)['status'], 'pass')

    def test_unicode_icon_placeholders_fail_flagship(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan()
            plan['interface']['icon_system'] = 'unicode'; plan['interface']['unicode_placeholder_count'] = 3
            make_project(root, plan, '<!doctype html><button>◖</button><button>ϟ</button><button>◎</button>')
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_pointer_direction_must_be_reviewed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); plan = valid_plan(); plan['input']['direction_reviewed'] = False
            make_project(root, plan)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_performance_requires_external_wall_clock_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); validation = valid_validation()
            validation['performance']['source'] = 'application clamped dt'
            make_project(root, validation=validation)
            self.assertEqual(forge.audit_project(root)['status'], 'fail')

    def test_explicit_measurement_block_is_accepted(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); validation = valid_validation()
            validation['performance']['measured'] = False
            validation['performance']['measurement_block'] = 'Target GPU unavailable; software renderer evidence is correctness-only.'
            make_project(root, validation=validation)
            self.assertEqual(forge.audit_project(root)['status'], 'pass')

    def test_static_audit_flags_comparison_failures(self):
        with tempfile.TemporaryDirectory() as td:
            html = Path(td) / 'index.html'
            html.write_text('''<!doctype html><aside>영역 7.2 km²</aside><small>-- m</small><canvas></canvas><button>◖</button><script>
            const WORLD_SIZE=400, canvas=document.querySelector('canvas');
            const gl=canvas.getContext('webgl2',{antialias:false});
            const state={testMode:true,renderScale:testMode?.34:.66,quality:.88,yaw:0};
            if(state.fps>57&&state.renderScale<.80)state.renderScale=Math.min(.80,state.renderScale+.02);
            addEventListener('mousemove',e=>state.yaw-=e.movementX*.002);
            let fpsFrames=0,fpsAccum=0; function frame(now){const dt=Math.min(.05,now/1000);fpsFrames++;fpsAccum+=dt;const fps=fpsFrames/fpsAccum;requestAnimationFrame(frame)}
            requestAnimationFrame(frame);
            </script>''', encoding='utf-8')
            proc = subprocess.run(['node', str(SKILL_ROOT / 'scripts/fidelity_audit.mjs'), str(html), '--flagship'], capture_output=True, text=True)
            report = json.loads(proc.stdout)
            ids = {item['id'] for item in report['findings']}
            self.assertNotEqual(proc.returncode, 0)
            self.assertIn('unicode-icon-placeholders', ids)
            self.assertIn('low-adaptive-ceiling', ids)
            self.assertIn('possible-inverted-horizontal-look', ids)
            self.assertIn('displayed-world-area-mismatch', ids)
            self.assertIn('clamped-delta-performance-telemetry', ids)

    def test_static_audit_follows_local_linked_sources(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / 'assets').mkdir()
            (root / 'index.html').write_text(
                '<!doctype html><script src="assets/app.js"></script>', encoding='utf-8')
            (root / 'assets/app.js').write_text('''
            const gl=document.createElement('canvas').getContext('webgl2');
            let fpsFrames=0,fpsAccum=0;
            function frame(now){const dt=Math.min(.05,now/1000);fpsFrames++;fpsAccum+=dt;
            const fps=fpsFrames/fpsAccum;requestAnimationFrame(frame)} requestAnimationFrame(frame);
            ''', encoding='utf-8')
            proc = subprocess.run(
                ['node', str(SKILL_ROOT / 'scripts/fidelity_audit.mjs'), str(root / 'index.html')],
                capture_output=True, text=True)
            report = json.loads(proc.stdout)
            self.assertIn('assets/app.js', report['metrics']['source_files_scanned'])
            self.assertIn(
                'clamped-delta-performance-telemetry',
                {item['id'] for item in report['findings']})

    def test_frame_loop_exposes_raw_wall_delta(self):
        frame_loop = (SKILL_ROOT / 'kits/runtime/frame-loop.mjs').as_uri()
        script = f'''import {{createFrameLoop}} from {json.dumps(frame_loop)};
        const queue=[]; globalThis.requestAnimationFrame=cb=>(queue.push(cb),queue.length); globalThis.cancelAnimationFrame=()=>{{}};
        const frames=[]; const loop=createFrameLoop({{update(){{}},render(a,t,sim,meta){{frames.push({{sim,wall:meta.wallDelta}})}}}});
        loop.start(); queue.shift()(100); queue.shift()(600); loop.stop(); console.log(JSON.stringify(frames));'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        frames = json.loads(proc.stdout)
        self.assertAlmostEqual(frames[-1]['sim'], 0.1, places=6)
        self.assertAlmostEqual(frames[-1]['wall'], 0.5, places=6)

    def test_task_runner_supports_progress_and_results(self):
        uri = (SKILL_ROOT / 'kits/compute/task-runner.mjs').as_uri()
        script = f'''import {{createTaskRunner}} from {json.dumps(uri)};
        const progress=[]; const runner=createTaskRunner({{execute:async(type,payload,ctx)=>{{ctx.progress(.5,'half'); return payload.reduce((a,b)=>a+b,0)}}}});
        const task=runner.run('sum',[2,3,5],{{onProgress:(v,d)=>progress.push([v,d])}}); const activeBefore=runner.activeCount; const value=await task.promise;
        console.log(JSON.stringify({{value,progress,activeBefore,activeAfter:runner.activeCount}})); runner.dispose();'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertEqual(result['value'], 10)
        self.assertEqual(result['progress'], [[0.5, 'half']])
        self.assertEqual([result['activeBefore'], result['activeAfter']], [1, 0])

    def test_task_runner_cancellation_is_explicit(self):
        uri = (SKILL_ROOT / 'kits/compute/task-runner.mjs').as_uri()
        script = f'''import {{createTaskRunner}} from {json.dumps(uri)};
        const runner=createTaskRunner({{execute:async()=>new Promise(resolve=>setTimeout(()=>resolve(1),50))}});
        const task=runner.run('slow',null); task.cancel('superseded');
        try {{ await task.promise; }} catch(error) {{ console.log(JSON.stringify({{name:error.name,message:error.message}})); }} runner.dispose();'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertEqual(result['name'], 'AbortError')
        self.assertIn('superseded', result['message'])

    def test_history_store_groups_commits_and_redo(self):
        uri = (SKILL_ROOT / 'kits/authoring/history-store.mjs').as_uri()
        script = f'''import {{createHistoryStore}} from {json.dumps(uri)};
        const h=createHistoryStore({{initialState:{{x:0}}}}); h.transact(s=>{{s.x=2}},'Move');
        const after=h.value.x, undo=h.undo().x, redo=h.redo().x; console.log(JSON.stringify({{after,undo,redo,meta:h.snapshot()}}));'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertEqual([result['after'], result['undo'], result['redo']], [2, 0, 2])
        self.assertEqual(result['meta']['label'], 'Move')

    def test_parameter_store_constraints_and_derived_values(self):
        uri = (SKILL_ROOT / 'kits/authoring/parameter-store.mjs').as_uri()
        script = f'''import {{createParameterStore}} from {json.dumps(uri)};
        const p=createParameterStore({{schema:{{diameter:{{type:'number',default:10,min:2,max:20,step:.5}}}},derived:{{radius:v=>v.diameter/2}}}});
        const value=p.set('diameter',12.7); console.log(JSON.stringify({{value,revision:p.revision,serialized:p.serialize()}}));'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertEqual(result['value']['diameter'], 12.5)
        self.assertEqual(result['value']['radius'], 6.25)
        self.assertEqual(result['revision'], 1)

    def test_picking_coordinates_and_gizmo_transaction(self):
        uri = (SKILL_ROOT / 'kits/three/picking-gizmo.mjs').as_uri()
        script = f'''import {{pointerToNdc,createGizmoTransaction}} from {json.dumps(uri)};
        const element={{getBoundingClientRect:()=>({{left:10,top:20,width:200,height:100}})}};
        const ndc=pointerToNdc({{clientX:110,clientY:70}},element); let state={{x:0}},committed=null;
        const tx=createGizmoTransaction({{readState:()=>({{...state}}),applyState:v=>state={{...v}},history:{{commit:(v,label)=>(committed={{v,label}},true)}}}});
        tx.begin(); tx.preview({{x:4}}); tx.commit('Move rotor'); console.log(JSON.stringify({{ndc,state,committed}}));'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertAlmostEqual(result['ndc']['x'], 0)
        self.assertAlmostEqual(result['ndc']['y'], 0)
        self.assertEqual(result['committed']['v']['x'], 4)

    def test_measurement_series_and_project_codec(self):
        measurement_uri = (SKILL_ROOT / 'kits/analysis/measurement-series.mjs').as_uri()
        codec_uri = (SKILL_ROOT / 'kits/io/project-codec.mjs').as_uri()
        script = f'''import {{createMeasurementSeries}} from {json.dumps(measurement_uri)};
        import {{createProjectCodec}} from {json.dumps(codec_uri)};
        const m=createMeasurementSeries(); [1,2,3].forEach((value,index)=>m.record('run',{{t:index,value}}));
        const codec=createProjectCodec({{schema:'helicopter-project',currentVersion:2,migrations:{{1:data=>({{...data,units:'m'}})}}}});
        const migrated=codec.decode({{schema:'helicopter-project',version:1,data:{{diameter:12}}}});
        console.log(JSON.stringify({{summary:m.summarize('run','value'),plot:m.plot('run','t','value'),csv:m.toCSV('run'),migrated,round:codec.roundTrip({{diameter:12,units:'m'}})}}));'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertEqual(result['summary']['mean'], 2)
        self.assertEqual(len(result['plot']), 3)
        self.assertIn('value', result['csv'])
        self.assertEqual(result['migrated']['version'], 2)
        self.assertTrue(result['round']['ok'])

    def test_resolution_policy_uses_wall_time_and_time_hysteresis(self):
        policy_uri = (SKILL_ROOT / 'kits/runtime/resolution-policy.mjs').as_uri()
        script = f'''import {{createResolutionPolicy}} from {json.dumps(policy_uri)};
        const p=createResolutionPolicy({{initialPreset:'balanced'}}); const before=p.state.sceneScale;
        p.sampleFrame(.7); p.sampleFrame(.7); const report=p.report();
        console.log(JSON.stringify({{before,after:p.state.sceneScale,report}}));'''
        proc = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        result = json.loads(proc.stdout)
        self.assertLess(result['after'], result['before'])
        self.assertEqual(result['report']['telemetrySource'], 'raw-wall-frame-delta')
        self.assertLess(result['report']['fps'], 10)

    def test_lean_package_excludes_workbench(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / 'demo'; root.mkdir(); make_project(root)
            (root / '.forge/work').mkdir(); (root / '.forge/work/raw.png').write_bytes(b'x' * 10000)
            (root / 'evidence').mkdir(); (root / 'evidence/pass.png').write_bytes(b'x' * 10000)
            (root / 'tests').mkdir(); (root / 'tests/browser.log').write_text('log')
            out = Path(td) / 'demo.zip'
            report = forge.package_project(root, out)
            self.assertEqual(report['status'], 'pass')
            with zipfile.ZipFile(out) as archive:
                names = archive.namelist()
            self.assertFalse(any('/.forge/' in name or '/evidence/' in name or '/tests/' in name for name in names))
            self.assertTrue(any(name.endswith('/VALIDATION.json') for name in names))
            self.assertTrue(any(name.endswith('/src/main.mjs') for name in names))


if __name__ == '__main__':
    unittest.main()
