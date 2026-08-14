function normalize(v){const l=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/l,y:v.y/l,z:v.z/l};}
function add(a,b,s=1){return{x:a.x+b.x*s,y:a.y+b.y*s,z:a.z+b.z*s};}

export function rayFromPixel({ pixel, viewport, cameraOrigin, unproject }) {
  if (typeof unproject !== 'function') throw new TypeError('unproject(ndc) required');
  const ndc = { x: (pixel.x / viewport.width) * 2 - 1, y: 1 - (pixel.y / viewport.height) * 2 };
  const world = unproject(ndc); return { origin:{...cameraOrigin}, direction:normalize({x:world.x-cameraOrigin.x,y:world.y-cameraOrigin.y,z:world.z-cameraOrigin.z}), ndc };
}

export function projectedScale({ targetDepth, sourceDepth, sourceFocal, targetFocal }) {
  const values=[targetDepth,sourceDepth,sourceFocal,targetFocal].map(Number);
  if (values.some(v=>!Number.isFinite(v)||Math.abs(v)<1e-9)) throw new RangeError('finite non-zero depths/focals required');
  return (values[0]/values[1])*(values[2]/values[3]);
}

export function solvePlacement({ targetRay, intersectTerrain, sourceAnchor = {x:0,y:0,z:0}, scale = 1, rotation = null, depthOffset = 0 } = {}) {
  if (typeof intersectTerrain !== 'function') throw new TypeError('intersectTerrain(ray) required');
  const hit=intersectTerrain(targetRay); if(!hit?.point) return {ok:false,reason:'no-terrain-hit'};
  const anchor=add(hit.point,targetRay.direction,depthOffset);
  const translated={x:anchor.x-sourceAnchor.x*scale,y:anchor.y-sourceAnchor.y*scale,z:anchor.z-sourceAnchor.z*scale};
  return {ok:true,anchor,scale,rotation,translation:translated,terrainHit:hit};
}

export function searchContact({ candidates = [], evaluate } = {}) {
  if (typeof evaluate !== 'function') throw new TypeError('evaluate(candidate) required');
  let best=null;
  for (const candidate of candidates) {
    const result=evaluate(candidate) || {}; const score=Number(result.score ?? result.supportRatio ?? 0);
    if (result.ok) return {ok:true,candidate,result};
    if (!best || score > best.score) best={score,candidate,result};
  }
  return {ok:false,best};
}

// Iteratively adjusts scale so a reconstructed object's projected footprint matches a reference
// footprint ratio (e.g. bounding-box area / image area from the source reference). Tolerance is
// asymmetric: an oversized projection is treated as worse than a slightly undersized one, since
// single-view reconstruction more often overshoots scale than undershoots it.
export function calibrateScaleByFootprint({
  measureRatio, targetRatio, initialScale = 1,
  toleranceOver = 0.03, toleranceUnder = 0.08,
  maxIterations = 12, minScale = 1e-6
} = {}) {
  if (typeof measureRatio !== 'function') throw new TypeError('measureRatio(scale) required');
  if (!Number.isFinite(targetRatio) || targetRatio <= 0) throw new RangeError('targetRatio must be a positive finite number');
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
