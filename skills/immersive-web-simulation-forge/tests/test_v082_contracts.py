from __future__ import annotations
import json, subprocess, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def node_eval(source:str):
    p=subprocess.run(['node','--input-type=module','-e',source],capture_output=True,text=True)
    if p.returncode!=0:
        raise AssertionError(p.stderr or p.stdout)
    return json.loads(p.stdout)

class V082Contracts(unittest.TestCase):
    def test_placement_requires_explicit_support_anchor(self):
        uri=(ROOT/'kits/spatial/placement-solver.mjs').as_uri()
        r=node_eval(f'''import {{solvePlacement}} from {json.dumps(uri)};
        const miss=solvePlacement({{targetRay:{{direction:{{x:0,y:-1,z:0}}}},intersectTerrain:()=>({{point:{{x:0,y:0,z:0}}}})}});
        const ok=solvePlacement({{targetRay:{{direction:{{x:0,y:-1,z:0}}}},sourceAnchor:{{x:0,y:-1,z:0}},intersectTerrain:()=>({{point:{{x:2,y:0,z:3}}}})}});
        console.log(JSON.stringify({{miss,ok}}));''')
        self.assertFalse(r['miss']['ok']); self.assertEqual(r['miss']['reason'],'missing-source-anchor')
        self.assertTrue(r['ok']['ok']); self.assertEqual(r['ok']['translation']['y'],1)

    def test_locomotion_basis_matches_wasd_semantics(self):
        uri=(ROOT/'kits/input/locomotion.mjs').as_uri()
        r=node_eval(f'''import {{planarBasisFromForward,movementIntent,movementVector}} from {json.dumps(uri)};
        const b=planarBasisFromForward({{x:0,y:0,z:-1}});
        const w=movementVector({{intent:movementIntent({{forward:1}}),forward:b.forward,right:b.right}});
        const d=movementVector({{intent:movementIntent({{right:1}}),forward:b.forward,right:b.right}});
        const wd=movementVector({{intent:movementIntent({{forward:1,right:1}}),forward:b.forward,right:b.right}});
        console.log(JSON.stringify({{b,w,d,wd,l:Math.hypot(wd.x,wd.z)}}));''')
        self.assertTrue(r['b']['ok']); self.assertLess(r['w']['z'],0); self.assertGreater(r['d']['x'],0); self.assertAlmostEqual(r['l'],1,places=6)

    def test_three_pointer_adapter_maps_semantic_right(self):
        uri=(ROOT/'kits/input/pointer-look.mjs').as_uri()
        r=node_eval(f'''import {{threeJsEulerFromSemanticLook}} from {json.dumps(uri)};console.log(JSON.stringify(threeJsEulerFromSemanticLook({{yaw:.4,pitch:.2}})));''')
        self.assertEqual(r['x'],.2); self.assertEqual(r['y'],-.4)

    def test_spatial_audit_missing_support_is_not_zero(self):
        script=ROOT/'scripts/spatial_audit.mjs'
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'e.json'; p.write_text(json.dumps({
                'supportSurfaceAuthority':'terrain-v1','renderSurfaceAuthority':'terrain-v1',
                'objects':[{'id':'tree','band':'near','position':{'x':0,'y':10,'z':0},'scale':{'x':1,'y':1,'z':1}}]
            }))
            proc=subprocess.run(['node',str(script),str(p),'--strict-support'],capture_output=True,text=True)
            report=json.loads(proc.stdout)
            self.assertNotEqual(proc.returncode,0); self.assertIn('support-mode-missing',{f['id'] for f in report['findings']})

    def test_spatial_audit_recomputes_float_from_probes(self):
        script=ROOT/'scripts/spatial_audit.mjs'
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'e.json'; p.write_text(json.dumps({
                'supportSurfaceAuthority':'terrain-v1','renderSurfaceAuthority':'terrain-v1',
                'objects':[{'id':'bench','band':'near','supportMode':'ground','supportSamples':[{'x':0,'y':1,'z':0,'surfaceY':0}]}]
            }))
            proc=subprocess.run(['node',str(script),str(p),'--strict-support'],capture_output=True,text=True)
            report=json.loads(proc.stdout)
            self.assertIn('floating-object',{f['id'] for f in report['findings']})

    def test_placeholder_ratio_is_advisory_but_identity_placeholder_blocks(self):
        script=ROOT/'scripts/asset_fidelity_audit.mjs'
        with tempfile.TemporaryDirectory() as td:
            base={'styleMode':'realistic','scopeMode':'multi-object','targetSizeReviewed':True,'evidenceViews':['a','b','c'],'objects':[]}
            for i in range(10):
                base['objects'].append({'id':f'o{i}','band':'near','placeholder':i<5,'primitiveOnly':False,'materialRegions':1,'contactRequired':False,'shadowPolicy':'cast+receive'})
            base['objects'][0].update({'identityCritical':True,'hero':True,'placeholder':False,'silhouetteReviewed':True,'evidenceViews':['a','b','c']})
            p=Path(td)/'a.json';p.write_text(json.dumps(base))
            proc=subprocess.run(['node',str(script),str(p),'--flagship'],capture_output=True,text=True);report=json.loads(proc.stdout)
            self.assertEqual(proc.returncode,0,proc.stdout); self.assertIn('near-placeholder-ratio-review',{f['id'] for f in report['findings']})
            base['objects'][0]['placeholder']=True;p.write_text(json.dumps(base));proc=subprocess.run(['node',str(script),str(p),'--flagship'],capture_output=True,text=True);report=json.loads(proc.stdout)
            self.assertNotEqual(proc.returncode,0); self.assertIn('identity-critical-placeholder',{f['id'] for f in report['findings']})

if __name__=='__main__': unittest.main()
