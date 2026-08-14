function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;} function len(v){return Math.hypot(v.x,v.y,v.z);} function norm(v){const l=len(v)||1;return{x:v.x/l,y:v.y/l,z:v.z/l};}
export function surfaceSlopeDegrees(normal, up = {x:0,y:1,z:0}) { const d=Math.max(-1,Math.min(1,dot(norm(normal),norm(up)))); return Math.acos(d)*180/Math.PI; }

export function anchorOnSurface({ origin, direction, intersect, up = {x:0,y:1,z:0}, slopeLimitDeg = 90, offset = 0, alignToNormal = false } = {}) {
  if (typeof intersect !== 'function') throw new TypeError('intersect(origin,direction) is required');
  const hit = intersect(origin, direction);
  if (!hit || !hit.point || !hit.normal) return { ok:false, reason:'no-surface-intersection' };
  const slope = surfaceSlopeDegrees(hit.normal, up);
  if (slope > slopeLimitDeg) return { ok:false, reason:'slope-limit', slopeDeg:slope, hit };
  const n = norm(hit.normal);
  const point = { x:hit.point.x+n.x*offset, y:hit.point.y+n.y*offset, z:hit.point.z+n.z*offset };
  return { ok:true, point, normal:n, slopeDeg:slope, rotationHint: alignToNormal ? { up:n } : null, hit };
}
