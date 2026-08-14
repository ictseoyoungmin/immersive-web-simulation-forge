#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const positional = args.find(arg => !arg.startsWith('--'));
if (!positional) {
  console.error('Usage: spatial_audit.mjs <project-or-report.json> [--out report.json] [--float-tol 0.03] [--penetration-tol 0.08] [--executable path] [--browser-arg value]');
  process.exit(2);
}
function valueAfter(flag, fallback = null) { const i=args.indexOf(flag); return i>=0 ? args[i+1] : fallback; }
const target=path.resolve(positional);
const out=valueAfter('--out');
const floatTol=Number(valueAfter('--float-tol','0.03'));
const penetrationTol=Number(valueAfter('--penetration-tol','0.08'));
const executablePath=valueAfter('--executable',process.env.CHROME_PATH||null);
const browserArgs=args.flatMap((v,i)=>v==='--browser-arg'&&args[i+1]?[args[i+1]]:[]);

function finiteVector(value) { return value && ['x','y','z'].every(k=>Number.isFinite(Number(value[k]))); }
function validBounds(b) {
  if (!b) return false;
  const keys=['minX','minY','minZ','maxX','maxY','maxZ'];
  return keys.every(k=>Number.isFinite(Number(b[k]))) && b.maxX>=b.minX && b.maxY>=b.minY && b.maxZ>=b.minZ;
}
function normalizeObjects(raw) {
  if (Array.isArray(raw?.objects)) return raw.objects;
  if (Array.isArray(raw?.scene?.objects)) return raw.scene.objects;
  if (Array.isArray(raw?.spatial?.objects)) return raw.spatial.objects;
  return [];
}
function audit(raw, source='report') {
  if (!raw || raw.status === 'not-applicable') return {status:'not-applicable',source,reason:raw?.reason||'no spatial evidence',findings:[],metrics:{objects:0}};
  const objects=normalizeObjects(raw); const findings=[]; const ids=new Set();
  const add=(id,severity,detail,object=null)=>findings.push({id,severity,detail,...(object?{object}: {})});
  for (const object of objects) {
    const id=String(object.id??'').trim();
    if (!id) add('missing-stable-id','error','object has no stable id');
    else if (ids.has(id)) add('duplicate-stable-id','error',`duplicate stable id ${id}`,id); else ids.add(id);
    if (object.position && !finiteVector(object.position)) add('non-finite-position','error','position contains NaN/Infinity',id||null);
    if (object.scale) {
      if (!finiteVector(object.scale)) add('non-finite-scale','error','scale contains NaN/Infinity',id||null);
      else if (Math.min(Math.abs(object.scale.x),Math.abs(object.scale.y),Math.abs(object.scale.z)) < 1e-8) add('zero-scale','error','scale is zero or near zero',id||null);
    }
    if (object.bounds && !validBounds(object.bounds)) add('invalid-bounds','error','bounds are non-finite or inverted',id||null);
    if (Number(object.floatingDistance??0)>floatTol) add('floating-object','error',`floating ${Number(object.floatingDistance).toFixed(4)} > ${floatTol}`,id||null);
    if (Number(object.penetrationDepth??0)>penetrationTol) add('terrain-penetration','error',`penetration ${Number(object.penetrationDepth).toFixed(4)} > ${penetrationTol}`,id||null);
    if ((raw.lodRequired||object.lodRequired) && (object.lodBand===null||object.lodBand===undefined||object.lodBand==='')) add('missing-lod-assignment','error','LOD/representation band required but missing',id||null);
    const overlaps=object.collisionOverlaps||[]; if (overlaps.length && object.allowOverlap!==true) add('collision-overlap','error',`unexpected overlaps: ${overlaps.join(', ')}`,id||null);
    if (object.worldBoundsViolation===true) add('world-bounds-violation','error','object lies outside declared bounds without exception',id||null);
  }
  const camera=raw.camera||raw.scene?.camera||{};
  if (Number.isFinite(Number(camera.near)) && Number.isFinite(Number(camera.far)) && Number(camera.far)<=Number(camera.near)) add('invalid-camera-clip','error','camera far plane must exceed near plane');
  for (const critical of raw.criticalSubjects||[]) {
    const distance=Number(critical.distance); if (!Number.isFinite(distance)) continue;
    if (Number.isFinite(Number(camera.near)) && distance<Number(camera.near)) add('critical-camera-clipping','error',`${critical.id||'critical subject'} is before near plane`,critical.id||null);
    if (Number.isFinite(Number(camera.far)) && distance>Number(camera.far)) add('critical-camera-clipping','error',`${critical.id||'critical subject'} is beyond far plane`,critical.id||null);
  }
  const errors=findings.filter(f=>f.severity==='error');
  return {status:errors.length?'fail':'pass',source,thresholds:{floatTol,penetrationTol},metrics:{objects:objects.length,uniqueIds:ids.size,findings:findings.length},findings};
}

async function acquireFromBrowser(project) {
  const entry=fs.statSync(project).isDirectory()?path.join(project,'index.html'):project;
  const root=fs.statSync(project).isDirectory()?project:path.dirname(project);
  if (!fs.existsSync(entry)) return {status:'not-applicable',reason:'no index.html/entry found'};
  let playwright;
  try { playwright=await import('playwright'); }
  catch { try { playwright=createRequire(path.join(root,'package.json'))('playwright'); } catch { return {status:'not-applicable',reason:'playwright not installed; use --report JSON or install Playwright'}; } }
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm'};
  const server=http.createServer((req,res)=>{const pathname=decodeURIComponent((req.url||'/').split('?')[0]);let file=path.resolve(root,pathname==='/'?path.basename(entry):pathname.replace(/^\/+/,''));if(!file.startsWith(root+path.sep)&&file!==entry){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(file).pipe(res);});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  let browser;
  try {
    browser=await playwright.chromium.launch({headless:true,...(executablePath?{executablePath}:{}),...(browserArgs.length?{args:browserArgs}:{})});
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    await page.goto(`http://127.0.0.1:${server.address().port}/${encodeURI(path.basename(entry))}`,{waitUntil:'networkidle',timeout:30000});
    await page.evaluate(async()=>{if(window.__FORGE__?.prepareVerification) await window.__FORGE__.prepareVerification('spatial-audit');});
    return await page.evaluate(async()=>{
      const forge=window.__FORGE__;
      if (typeof forge?.reportSpatialEvidence==='function') return await forge.reportSpatialEvidence();
      if (typeof forge?.reportScene==='function') return await forge.reportScene();
      return {status:'not-applicable',reason:'window.__FORGE__.reportSpatialEvidence/reportScene hook is absent'};
    });
  } finally { await browser?.close(); server.close(); }
}

let raw, source;
try {
  if (target.toLowerCase().endsWith('.json') && fs.statSync(target).isFile()) { raw=JSON.parse(fs.readFileSync(target,'utf8')); source=target; }
  else { raw=await acquireFromBrowser(target); source=target; }
  const report=audit(raw,source);
  if(out){const op=path.resolve(out);fs.mkdirSync(path.dirname(op),{recursive:true});fs.writeFileSync(op,JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report,null,2));
  process.exit(report.status==='fail'?1:0);
} catch(error) {
  const report={status:'fail',source:target,fatal:String(error?.stack||error),findings:[]};
  if(out){const op=path.resolve(out);fs.mkdirSync(path.dirname(op),{recursive:true});fs.writeFileSync(op,JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report,null,2)); process.exit(1);
}
