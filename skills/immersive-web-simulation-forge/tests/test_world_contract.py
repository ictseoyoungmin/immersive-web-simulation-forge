from __future__ import annotations

import importlib.util
import json
import subprocess
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORGE_SPEC = importlib.util.spec_from_file_location('forge_v08_world', ROOT / 'scripts/forge.py')
forge = importlib.util.module_from_spec(FORGE_SPEC); assert FORGE_SPEC.loader; FORGE_SPEC.loader.exec_module(forge)
HELPER_SPEC = importlib.util.spec_from_file_location('forge_test_helpers', ROOT / 'tests/test_forge.py')
helpers = importlib.util.module_from_spec(HELPER_SPEC); assert HELPER_SPEC.loader; HELPER_SPEC.loader.exec_module(helpers)

class WorldContractTests(unittest.TestCase):
    def test_world_v6_contract_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); helpers.make_project(root, helpers.valid_plan(), validation=helpers.valid_validation())
            self.assertEqual(forge.audit_project(root)['status'],'pass')

    def test_non_flagship_asset_audit_report_cannot_certify_flagship(self):
        # Regression: a asset-fidelity-audit.json produced WITHOUT --flagship uses lenient
        # (warning-severity) thresholds and can read status=pass while real defects remain.
        # The v0.7 gate must reject such a report for a flagship project, not just check status.
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); helpers.make_project(root, helpers.valid_plan(), validation=helpers.valid_validation())
            audit_path = root/'.forge/asset-fidelity-audit.json'
            report = json.loads(audit_path.read_text()); report['flagship'] = False
            audit_path.write_text(json.dumps(report))
            failed={item['name'] for item in forge.audit_project(root)['checks'] if item['status']=='fail'}
            self.assertIn('runtime asset fidelity audit evidence',failed)

    def test_flagship_software_renderer_measurement_blocks_certification(self):
        # Regression: software-renderer-only performance evidence must block flagship
        # certification, not merely warn, since flagship is a certification-level claim.
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); validation=helpers.valid_validation(); validation['performance']['software_renderer']=True
            helpers.make_project(root, helpers.valid_plan(), validation=validation)
            failed={item['name'] for item in forge.audit_project(root)['checks'] if item['status']=='fail'}
            self.assertIn('representative performance renderer',failed)

    def test_world_missing_semantic_field_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); plan=helpers.valid_plan(); plan['spatial']['semantic_fields']=[]
            helpers.make_project(root,plan,validation=helpers.valid_validation())
            failed={item['name'] for item in forge.audit_project(root)['checks'] if item['status']=='fail'}
            self.assertIn('semantic spatial fields',failed)

    def test_hybrid_generative_route_requires_proposal_capability_and_fallback(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); plan=helpers.valid_plan()
            plan['authoring_strategy'].update({
                'mode':'hybrid',
                'provider_capabilities':['3d-generation','procedural-geometry'],
                'asset_classes':[
                    {'class':'hero-crown','strategy':'authored','reason':'explicit identity'},
                    {'class':'village-props','strategy':'generative','reason':'local diversity'}
                ],
                'fallback_policy':'procedural fallback family'
            })
            validation=helpers.valid_validation(); validation['construction_validation'].update({'status':'pass','proposal_boundary':'pass','provider_provenance':'pass'})
            helpers.make_project(root,plan,validation=validation)
            self.assertEqual(forge.audit_project(root)['status'],'pass')
            plan['authoring_strategy']['provider_capabilities']=[]
            (root/'.forge/FORGE_PLAN.json').write_text(json.dumps(plan))
            failed={item['name'] for item in forge.audit_project(root)['checks'] if item['status']=='fail'}
            self.assertIn('generative proposal boundary',failed)

    def test_reference_critical_object_requires_objectspec_and_multiview(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'world'; root.mkdir(); plan=helpers.valid_plan()
            plan['construction_evidence']['reference_critical_objects']=[{'id':'hero','object_spec':'ObjectSpec:hero','critical_views':['hero','rear'],'structure_reviewed':True}]
            validation=helpers.valid_validation(); validation['construction_validation'].update({'status':'pass','reference_critical_objects':'pass'})
            helpers.make_project(root,plan,validation=validation)
            self.assertEqual(forge.audit_project(root)['status'],'pass')
            plan['construction_evidence']['reference_critical_objects'][0]['critical_views']=[]
            (root/'.forge/FORGE_PLAN.json').write_text(json.dumps(plan))
            failed={item['name'] for item in forge.audit_project(root)['checks'] if item['status']=='fail'}
            self.assertIn('reference-critical object contract',failed)

    def test_semantic_region_graph_and_representation_kits(self):
        field=(ROOT/'kits/world/semantic-region-field.mjs').as_uri(); graph=(ROOT/'kits/world/region-graph.mjs').as_uri(); lod=(ROOT/'kits/three/lod-bands.mjs').as_uri()
        script=f'''import {{SemanticRegionField,softCircleWeight}} from {json.dumps(field)};
        import {{RegionGraph}} from {json.dumps(graph)}; import {{LodBands}} from {json.dumps(lod)};
        const f=new SemanticRegionField({{regions:[{{id:'a',weight:softCircleWeight({{radius:10}}),channels:{{wet:1}}}},{{id:'b',weight:()=>.5,channels:{{wet:0}}}}]}});
        const sample=f.sample(0,0); const g=new RegionGraph(); g.addRegion('a').addRegion('b'); g.connect('a','b','connects');
        const bands=new LodBands([{{name:'near',near:0,far:10,representation:'explicit',interactionPolicy:'full'}},{{name:'far',near:10,far:100,representation:'proxy'}}]);
        console.log(JSON.stringify({{sum:Object.values(sample.weights).reduce((a,b)=>a+b,0),reachable:g.reachable('a','b'),policy:bands.policyFor(0)}}));'''
        proc=subprocess.run(['node','--input-type=module','-e',script],capture_output=True,text=True)
        self.assertEqual(proc.returncode,0,proc.stderr); result=json.loads(proc.stdout)
        self.assertAlmostEqual(result['sum'],1); self.assertTrue(result['reachable']); self.assertEqual(result['policy']['representation'],'explicit')

    def test_pointer_look_semantic_yaw_agrees_with_locomotion_basis_end_to_end(self):
        # Regression: two hand-written example worlds in this repo defined "yaw" with
        # opposite signs relative to their own forward-vector formula, so one turned the
        # camera left on a rightward mouse drag while looking identical in source review.
        # pointer-look.mjs keeps yaw semantic (positive = right) and pushes the Three.js
        # sign quirk into threeJsEulerFromSemanticLook; this test chains that adapter's
        # output through the actual Three.js rotation.y formula (independently
        # implemented here, not imported from three.js) into locomotion.mjs's own
        # cross-product basis, so a rightward mouse move is proven to end up moving
        # toward the same "right" locomotion.mjs would compute — not just that the two
        # files independently look plausible.
        look=(ROOT/'kits/input/pointer-look.mjs').as_uri(); loco=(ROOT/'kits/input/locomotion.mjs').as_uri()
        script=f'''import {{createPointerLook,threeJsEulerFromSemanticLook}} from {json.dumps(look)};
        import {{planarBasisFromForward}} from {json.dumps(loco)};
        globalThis.window={{addEventListener(){{}},removeEventListener(){{}}}};
        globalThis.document={{pointerLockElement:null}};
        const element={{addEventListener(){{}},removeEventListener(){{}}}};
        const pl=createPointerLook({{element}});
        // Three.js Matrix4.makeRotationY, pitch=0: forward=(0,0,-1) rotates to
        // (-sin(rotY), 0, -cos(rotY)). Implemented directly, not via three.js.
        const forwardFromRotationY = rotY => ({{x:-Math.sin(rotY), y:0, z:-Math.cos(rotY)}});
        const b0 = planarBasisFromForward(forwardFromRotationY(threeJsEulerFromSemanticLook({{yaw:0}}).y));
        pl.applyDelta(90,0); // rightward mouse move
        const euler = threeJsEulerFromSemanticLook({{yaw:pl.state.yaw,pitch:pl.state.pitch}});
        const forwardAfter = forwardFromRotationY(euler.y);
        console.log(JSON.stringify({{semanticYaw:pl.state.yaw,rotationY:euler.y,b0,forwardAfter}}));'''
        proc=subprocess.run(['node','--input-type=module','-e',script],capture_output=True,text=True)
        self.assertEqual(proc.returncode,0,proc.stderr); result=json.loads(proc.stdout)
        # A rightward drag must increase the semantic yaw (pointer-look.mjs's own contract).
        self.assertGreater(result['semanticYaw'],0)
        self.assertTrue(result['b0']['ok'])
        self.assertAlmostEqual(result['b0']['right']['x'],1,places=9); self.assertAlmostEqual(result['b0']['right']['z'],0,places=6)
        # The resulting forward vector must have swept toward locomotion.mjs's own "right" (+X),
        # not away from it — the exact failure mode found in the wild.
        self.assertGreater(result['forwardAfter']['x'],0)

    def test_spatial_audit_detects_floating_and_duplicate_ids(self):
        with tempfile.TemporaryDirectory() as td:
            report=Path(td)/'scene.json'; report.write_text(json.dumps({'objects':[
                {'id':'tree','position':{'x':0,'y':1,'z':0},'scale':{'x':1,'y':1,'z':1},'supportMode':'ground','supportSamples':[{'y':1,'surfaceY':0}]},
                {'id':'tree','position':{'x':1,'y':0,'z':0},'scale':{'x':1,'y':1,'z':1}}
            ]}))
            proc=subprocess.run(['node',str(ROOT/'scripts/spatial_audit.mjs'),str(report)],capture_output=True,text=True)
            self.assertEqual(proc.returncode,1); result=json.loads(proc.stdout)
            ids={item['id'] for item in result['findings']}
            self.assertIn('floating-object',ids); self.assertIn('duplicate-stable-id',ids)

if __name__=='__main__': unittest.main()
