from __future__ import annotations

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORGE_SPEC = importlib.util.spec_from_file_location('forge_v08_asset', ROOT / 'scripts/forge.py')
forge = importlib.util.module_from_spec(FORGE_SPEC); assert FORGE_SPEC.loader; FORGE_SPEC.loader.exec_module(forge)
HELPER_SPEC = importlib.util.spec_from_file_location('forge_helpers_asset', ROOT / 'tests/test_forge.py')
helpers = importlib.util.module_from_spec(HELPER_SPEC); assert HELPER_SPEC.loader; HELPER_SPEC.loader.exec_module(helpers)

class AssetFidelityTests(unittest.TestCase):
    def failed_names(self, report):
        return {item['name'] for item in report['checks'] if item['status'] == 'fail'}

    def test_flagship_spatial_cannot_disable_asset_fidelity(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); plan=helpers.valid_plan(); plan['asset_fidelity']['applicable']=False
            helpers.make_project(root,plan,validation=helpers.valid_validation())
            self.assertIn('flagship asset fidelity enabled', self.failed_names(forge.audit_project(root)))

    def test_realistic_flagship_requires_reference_sensitive_object(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); plan=helpers.valid_plan(); plan['asset_fidelity']['style_mode']='realistic'
            helpers.make_project(root,plan,validation=helpers.valid_validation())
            self.assertIn('reference-sensitive object coverage', self.failed_names(forge.audit_project(root)))

    def test_missing_runtime_asset_audit_blocks_flagship(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); helpers.make_project(root)
            (root/'.forge/asset-fidelity-audit.json').unlink()
            self.assertIn('runtime asset fidelity audit evidence', self.failed_names(forge.audit_project(root)))

    def test_runtime_placeholder_ratio_above_plan_blocks_flagship(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); validation=helpers.valid_validation(); validation['asset_fidelity_validation']['near_placeholder_ratio']=0.35
            helpers.make_project(root,validation=validation)
            self.assertIn('runtime asset fidelity validation', self.failed_names(forge.audit_project(root)))

    def test_asset_fidelity_audit_rejects_primitive_hero(self):
        with tempfile.TemporaryDirectory() as td:
            src=Path(td)/'asset.json'; src.write_text(json.dumps({
                'styleMode':'realistic','scopeMode':'world-scale','targetSizeReviewed':True,
                'evidenceViews':['hero','close','contact'],
                'objects':[{
                    'id':'hero-building','class':'building','band':'near','identityCritical':True,'hero':True,
                    'representation':'primitive-placeholder','primitiveOnly':True,'placeholder':True,
                    'materialRegions':1,'contactValidated':True,'shadowPolicy':'cast+receive',
                    'silhouetteReviewed':True,'evidenceViews':['hero','three-quarter','contact']
                }],
                'families':[{'id':'houses','memberCount':10,'variantCount':3,'evidenceViews':['representative-mid']}]
            }))
            proc=subprocess.run(['node',str(ROOT/'scripts/asset_fidelity_audit.mjs'),str(src),'--flagship'],capture_output=True,text=True)
            self.assertEqual(proc.returncode,1,proc.stdout+proc.stderr)
            ids={f['id'] for f in json.loads(proc.stdout)['findings']}
            self.assertIn('identity-critical-placeholder',ids); self.assertIn('near-placeholder-ratio',ids)

    def test_intentional_low_poly_can_use_primitives_but_still_needs_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            src=Path(td)/'asset.json'; src.write_text(json.dumps({
                'styleMode':'low-poly','scopeMode':'world-scale','intentionalPrimitiveStyle':True,'targetSizeReviewed':True,
                'evidenceViews':['hero','close','contact'],
                'objects':[{
                    'id':'hero-tower','class':'tower','band':'near','identityCritical':True,'hero':True,
                    'representation':'authored-primitive','primitiveOnly':True,'placeholder':False,'intentionalPrimitive':True,
                    'materialRegions':2,'contactValidated':True,'shadowPolicy':'cast+receive',
                    'silhouetteReviewed':True,'evidenceViews':['hero','three-quarter','contact']
                }],
                'families':[{'id':'lowpoly-houses','memberCount':12,'variantCount':4,'evidenceViews':['representative-mid']}]
            }))
            proc=subprocess.run(['node',str(ROOT/'scripts/asset_fidelity_audit.mjs'),str(src),'--flagship'],capture_output=True,text=True)
            self.assertEqual(proc.returncode,0,proc.stdout+proc.stderr)
            self.assertEqual(json.loads(proc.stdout)['status'],'pass')

if __name__=='__main__': unittest.main()
