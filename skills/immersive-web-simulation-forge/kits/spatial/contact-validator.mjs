export function validateContact({ samples = [], terrainHeight, maxFloat = 0.03, maxPenetration = 0.08, requiredSupportRatio = 0.6 } = {}) {
  if (!Array.isArray(samples) || !samples.length) return { ok:false, reason:'no-support-samples', supportRatio:0, floating:[], penetrating:[] };
  if (typeof terrainHeight !== 'function') throw new TypeError('terrainHeight(x,z) required');
  const floating=[], penetrating=[], supported=[];
  for (const sample of samples) {
    const ground = Number(terrainHeight(sample.x, sample.z));
    const delta = Number(sample.y) - ground;
    const item = { ...sample, groundY:ground, delta };
    if (delta > maxFloat) floating.push(item); else if (delta < -maxPenetration) penetrating.push(item); else supported.push(item);
  }
  const supportRatio = supported.length / samples.length;
  return { ok: !floating.length && !penetrating.length && supportRatio >= requiredSupportRatio, supportRatio, floating, penetrating, supported, maxFloat, maxPenetration };
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
