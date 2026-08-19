const SUPPORT_MODES = new Set(['ground','surface','parent/socket','wall-mounted','ceiling-mounted','suspended','buoyant','airborne','dynamic/free']);
const finite = v => Number.isFinite(Number(v));

export function validateContact({ samples = [], terrainHeight, maxFloat = 0.03, maxPenetration = 0.08, requiredSupportRatio = 0.6 } = {}) {
  if (!Array.isArray(samples) || !samples.length) return { ok:false, reason:'no-support-samples', supportRatio:0, floating:[], penetrating:[], supported:[] };
  if (typeof terrainHeight !== 'function') throw new TypeError('terrainHeight(x,z) required');
  const floating=[], penetrating=[], supported=[], invalid=[];
  let maxFloatDistance=0, maxPenetrationDepth=0;
  for (const sample of samples) {
    const ground = Number(terrainHeight(sample.x, sample.z));
    const y = Number(sample.y);
    if (!finite(ground) || !finite(y)) { invalid.push({...sample,groundY:ground}); continue; }
    const delta = y - ground;
    const item = { ...sample, groundY:ground, delta };
    if (delta > maxFloat) { floating.push(item); maxFloatDistance=Math.max(maxFloatDistance,delta); }
    else if (delta < -maxPenetration) { penetrating.push(item); maxPenetrationDepth=Math.max(maxPenetrationDepth,-delta); }
    else supported.push(item);
  }
  const supportRatio = supported.length / samples.length;
  return {
    ok: !invalid.length && !floating.length && !penetrating.length && supportRatio >= requiredSupportRatio,
    supportRatio, floating, penetrating, supported, invalid, maxFloatDistance, maxPenetrationDepth,
    maxFloat, maxPenetration, requiredSupportRatio
  };
}

export function validateSupportEvidence({
  supportMode, supportRequired, samples = [], maxFloat = 0.03, maxPenetration = 0.08,
  requiredSupportRatio = 0.6, supportTarget = '', supportConstraintVerified = false,
  intentionalSupportExemption = ''
} = {}) {
  const mode=String(supportMode||'').toLowerCase();
  if (!SUPPORT_MODES.has(mode)) return {ok:false,reason:'missing-or-invalid-support-mode',supportMode:mode||null};
  const inferredRequired = ['ground','surface','parent/socket','wall-mounted','ceiling-mounted','suspended','buoyant'].includes(mode);
  const required = supportRequired == null ? inferredRequired : Boolean(supportRequired);
  if (['ground','surface'].includes(mode)) {
    if (!required) return {ok:false,reason:'contact-mode-marked-not-required',supportMode:mode};
    if (!samples.length) return {ok:false,reason:'no-support-samples',supportMode:mode};
    const normalized = samples.map(s=>{
      if (finite(s.surfaceY)) return {...s};
      if (finite(s.delta) && finite(s.y)) return {...s,surfaceY:Number(s.y)-Number(s.delta)};
      return {...s,surfaceY:NaN};
    });
    const result=validateContact({samples:normalized,terrainHeight:(x,z)=>{
      const found=normalized.find(s=>Number(s.x)===Number(x)&&Number(s.z)===Number(z));
      return found?.surfaceY;
    },maxFloat,maxPenetration,requiredSupportRatio});
    return {...result,supportMode:mode};
  }
  if (['parent/socket','wall-mounted','ceiling-mounted','suspended','buoyant'].includes(mode)) {
    const ok=Boolean(supportTarget)&&Boolean(supportConstraintVerified);
    return {ok,reason:ok?null:'support-constraint-unverified',supportMode:mode,supportTarget};
  }
  const reason=String(intentionalSupportExemption||'').trim();
  return {ok:!required && Boolean(reason),reason:!required&&reason?null:'support-exemption-undisclosed',supportMode:mode,intentionalSupportExemption:reason};
}

export function validateClearance({ bounds, obstacles = [], padding = 0 } = {}) {
  if (!bounds) return { ok:false, collisions:[], reason:'missing-bounds' };
  const expand = b => ({ minX:b.minX-padding,maxX:b.maxX+padding,minY:b.minY-padding,maxY:b.maxY+padding,minZ:b.minZ-padding,maxZ:b.maxZ+padding });
  const a=expand(bounds), collisions=[];
  for (const obstacle of obstacles) {
    const b=obstacle.bounds || obstacle; if (!b) continue;
    const overlap = a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
    if (overlap) collisions.push(obstacle.id ?? obstacle);
  }
  return { ok: collisions.length===0, collisions };
}

function pointInPolygonXZ(point, polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const xi=Number(polygon[i].x), zi=Number(polygon[i].z), xj=Number(polygon[j].x), zj=Number(polygon[j].z);
    const hit=((zi>point.z)!=(zj>point.z)) && (point.x < (xj-xi)*(point.z-zi)/((zj-zi)||1e-12)+xi);
    if(hit) inside=!inside;
  }
  return inside;
}

export function validateStaticStability({ centerOfMassProjection, supportPolygon = [] } = {}) {
  if (!centerOfMassProjection || !finite(centerOfMassProjection.x) || !finite(centerOfMassProjection.z)) return {ok:false,reason:'missing-center-of-mass-projection'};
  if (!Array.isArray(supportPolygon) || supportPolygon.length < 3) return {ok:false,reason:'support-polygon-too-small'};
  const polygon=supportPolygon.map(p=>({x:Number(p.x),z:Number(p.z)}));
  if (polygon.some(p=>!finite(p.x)||!finite(p.z))) return {ok:false,reason:'non-finite-support-polygon'};
  const point={x:Number(centerOfMassProjection.x),z:Number(centerOfMassProjection.z)};
  const inside=pointInPolygonXZ(point,polygon);
  return {ok:inside,reason:inside?null:'center-of-mass-outside-support',point,polygon};
}
