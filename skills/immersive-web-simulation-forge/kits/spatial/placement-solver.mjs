function normalize(v){const l=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/l,y:v.y/l,z:v.z/l};}
function add(a,b,s=1){return{x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s};}
function finiteVec(v){return v && ['x','y','z'].every(k=>Number.isFinite(Number(v[k])));}

export function rayFromPixel({ pixel, viewport, cameraOrigin, unproject }) {
  if (typeof unproject !== 'function') throw new TypeError('unproject(ndc) required');
  if (!viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) throw new TypeError('finite positive viewport required');
  const ndc = { x: (pixel.x / viewport.width) * 2 - 1, y: 1 - (pixel.y / viewport.height) * 2 };
  const world = unproject(ndc);
  return { origin:{...cameraOrigin}, direction:normalize({x:world.x-cameraOrigin.x,y:world.y-cameraOrigin.y,z:world.z-cameraOrigin.z}), ndc };
}

export function projectedScale({ targetDepth, sourceDepth, sourceFocal, targetFocal }) {
  const values=[targetDepth,sourceDepth,sourceFocal,targetFocal].map(Number);
  if (values.some(v=>!Number.isFinite(v)||Math.abs(v)<1e-9)) throw new RangeError('finite non-zero depths/focals required');
  return (values[0]/values[1])*(values[2]/values[3]);
}

export function supportAnchorFromBounds(bounds, upAxis='y') {
  if (!bounds) return null;
  const minKey = `min${upAxis.toUpperCase()}`;
  const value = Number(bounds[minKey]);
  if (!Number.isFinite(value)) return null;
  const center = key => (Number(bounds[`min${key}`]) + Number(bounds[`max${key}`])) / 2;
  const anchor = {x:center('X'), y:center('Y'), z:center('Z')};
  anchor[upAxis] = value;
  return finiteVec(anchor) ? anchor : null;
}

export function solvePlacement({ targetRay, intersectTerrain, sourceAnchor, scale = 1, rotation = null, depthOffset = 0 } = {}) {
  if (typeof intersectTerrain !== 'function') throw new TypeError('intersectTerrain(ray) required');
  if (!finiteVec(sourceAnchor)) return {ok:false,reason:'missing-source-anchor'};
  if (!Number.isFinite(Number(scale)) || Math.abs(Number(scale)) < 1e-12) return {ok:false,reason:'invalid-scale'};
  const hit=intersectTerrain(targetRay);
  if(!hit?.point || !finiteVec(hit.point)) return {ok:false,reason:'no-terrain-hit'};
  const anchor=add(hit.point,targetRay.direction,depthOffset);
  const translated={x:anchor.x-sourceAnchor.x*scale,y:anchor.y-sourceAnchor.y*scale,z:anchor.z-sourceAnchor.z*scale};
  return {ok:true,anchor,scale,rotation,translation:translated,terrainHit:hit};
}

export function searchContact({ candidates = [], evaluate } = {}) {
  if (typeof evaluate !== 'function') throw new TypeError('evaluate(candidate) required');
  let best=null;
  for (const candidate of candidates) {
    const result=evaluate(candidate) || {};
    const score=Number(result.score ?? result.supportRatio ?? 0);
    if (result.ok) return {ok:true,candidate,result};
    if (!best || score > best.score) best={score,candidate,result};
  }
  return {ok:false,best};
}

// Projected-footprint calibration. Symmetric tolerance is the default because reconstruction
// error direction is project-dependent. Set toleranceOver/toleranceUnder differently only when
// the product has evidence or a concrete reason to weight one direction more heavily.
export function calibrateScaleByFootprint({
  measureRatio, targetRatio, initialScale = 1,
  toleranceOver = 0.05, toleranceUnder = 0.05,
  maxIterations = 12, minScale = 1e-6
} = {}) {
  if (typeof measureRatio !== 'function') throw new TypeError('measureRatio(scale) required');
  if (!Number.isFinite(targetRatio) || targetRatio <= 0) throw new RangeError('targetRatio must be a positive finite number');
  if (![toleranceOver,toleranceUnder].every(v=>Number.isFinite(v)&&v>=0)) throw new RangeError('tolerances must be finite and non-negative');
  let scale = Math.max(minScale, Number(initialScale) || 1);
  let low = null, high = null, ratio = null;
  for (let iterations = 0; iterations < maxIterations; iterations++) {
    ratio = Number(measureRatio(scale));
    if (!Number.isFinite(ratio) || ratio < 0) return { ok:false, reason:'non-finite-ratio', scale, ratio, iterations };
    const delta = ratio - targetRatio;
    if (delta <= toleranceOver && delta >= -toleranceUnder) return { ok:true, scale, ratio, delta, iterations };
    if (delta > toleranceOver) { high = scale; scale = Math.max(minScale, low != null ? (low + scale) / 2 : scale * 0.5); }
    else { low = scale; scale = high != null ? (low + high) / 2 : scale * 2; }
  }
  return { ok:false, reason:'max-iterations', scale, ratio, iterations: maxIterations };
}
