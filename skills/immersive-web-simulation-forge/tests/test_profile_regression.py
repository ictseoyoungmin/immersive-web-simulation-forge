from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('forge_v08_profiles',ROOT/'scripts/forge.py'); forge=importlib.util.module_from_spec(SPEC); assert SPEC.loader; SPEC.loader.exec_module(forge)
HELPER_SPEC=importlib.util.spec_from_file_location('forge_helpers_profiles',ROOT/'tests/test_forge.py'); helpers=importlib.util.module_from_spec(HELPER_SPEC); assert HELPER_SPEC.loader; HELPER_SPEC.loader.exec_module(helpers)

class ProfileRegressionTests(unittest.TestCase):
    def test_only_world_profile_enables_world_contract_by_default(self):
        with tempfile.TemporaryDirectory() as td:
            for profile in sorted(forge.PROFILES):
                root=Path(td)/profile; forge.init_project(root,profile,'production')
                plan=json.loads((root/'.forge/FORGE_PLAN.json').read_text())
                self.assertEqual(plan['version'],6)
                self.assertEqual(plan['spatial']['applicable'], profile=='full-window-world', profile)
                if profile!='full-window-world': self.assertEqual(plan['spatial']['specification'],'')

    def test_non_world_simulation_does_not_require_worldspec(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'lab'; root.mkdir(); plan=helpers.valid_simulation_plan()
            self.assertFalse(plan['spatial']['applicable'])
            helpers.make_project(root,plan,validation=helpers.valid_validation('simulation-lab','decision-support'))
            report=forge.audit_project(root)
            self.assertEqual(report['status'],'pass',report)
            names={item['name'] for item in report['checks']}
            self.assertNotIn('WorldSpec regions',names)

    def test_v4_migration_preserves_old_fields_and_adds_v6_contracts(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'old'; root.mkdir(); forge.init_project(root,'simulation-lab','production')
            plan_path=root/'.forge/FORGE_PLAN.json'; plan=json.loads(plan_path.read_text()); plan['version']=4; plan.pop('authoring_strategy'); plan.pop('spatial'); plan.pop('construction_evidence'); plan['user_request']['summary']='legacy request'
            plan_path.write_text(json.dumps(plan)); val_path=root/'.forge/VALIDATION.json'; val=json.loads(val_path.read_text()); val['version']=4; [val.pop(k,None) for k in ('construction_validation','spatial_validation','evidence_review')]; val_path.write_text(json.dumps(val))
            result=forge.migrate_project(root); migrated=json.loads(plan_path.read_text()); migrated_val=json.loads(val_path.read_text())
            self.assertTrue(result['changed']); self.assertEqual(migrated['version'],6); self.assertEqual(migrated['user_request']['summary'],'legacy request')
            self.assertIn('authoring_strategy',migrated); self.assertFalse(migrated['spatial']['applicable']); self.assertIn('construction_evidence',migrated); self.assertIn('asset_fidelity',migrated)
            self.assertEqual(migrated_val['version'],6); self.assertIn('asset_fidelity_validation',migrated_val); self.assertTrue((root/'.forge/FORGE_PLAN.json.v4.bak').exists())

    def test_v5_migration_adds_asset_fidelity_contracts(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'old-v5'; root.mkdir(); forge.init_project(root,'full-window-world','flagship')
            plan_path=root/'.forge/FORGE_PLAN.json'; plan=json.loads(plan_path.read_text()); plan['version']=5; plan.pop('asset_fidelity',None); plan_path.write_text(json.dumps(plan))
            val_path=root/'.forge/VALIDATION.json'; val=json.loads(val_path.read_text()); val['version']=5; val.pop('asset_fidelity_validation',None); val_path.write_text(json.dumps(val))
            result=forge.migrate_project(root); migrated=json.loads(plan_path.read_text()); migrated_val=json.loads(val_path.read_text())
            self.assertTrue(result['changed']); self.assertEqual(migrated['version'],6); self.assertTrue(migrated['asset_fidelity']['applicable'])
            self.assertEqual(migrated['asset_fidelity']['scope_mode'],'world-scale'); self.assertIn('asset_fidelity_validation',migrated_val)
            self.assertTrue((root/'.forge/FORGE_PLAN.json.v5.bak').exists()); self.assertTrue((root/'.forge/VALIDATION.json.v5.bak').exists())

if __name__=='__main__': unittest.main()
