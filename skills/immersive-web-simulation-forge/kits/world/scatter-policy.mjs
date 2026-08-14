function rng(seed = 1) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function distance2(a, b) { const dx = a.x-b.x, dz = a.z-b.z; return dx*dx+dz*dz; }

export function scatterWithPolicy({ bounds, count = 100, seed = 1, evaluate, minSeparation = 0, maxAttempts = count * 30 } = {}) {
  if (!bounds || !Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.minZ) || !Number.isFinite(bounds.maxZ)) throw new TypeError('finite bounds required');
  const random = rng(seed), accepted = [], attempts = [];
  const sep2 = Math.max(0, minSeparation) ** 2;
  for (let i = 0; i < maxAttempts && accepted.length < count; i++) {
    const candidate = { x: bounds.minX + random() * (bounds.maxX - bounds.minX), z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ), random: random() };
    const policy = typeof evaluate === 'function' ? evaluate(candidate, accepted) : { accept: true, score: 1 };
    const separated = !sep2 || accepted.every(item => distance2(item, candidate) >= sep2);
    const probability = Math.max(0, Math.min(1, Number(policy?.score ?? 1)));
    const accept = policy?.accept !== false && separated && random() <= probability;
    attempts.push({ ...candidate, accept, reason: policy?.reason || (separated ? '' : 'minimum-separation') });
    if (accept) accepted.push({ x: candidate.x, z: candidate.z, metadata: policy?.metadata || {} });
  }
  return { accepted, attempts, complete: accepted.length >= count, seed };
}

export function combineScatterPolicies(...policies) {
  return (candidate, accepted) => {
    let score = 1; const metadata = {}; const reasons = [];
    for (const policy of policies.filter(Boolean)) {
      const result = policy(candidate, accepted) || {};
      if (result.accept === false) return { accept: false, score: 0, reason: result.reason || 'policy-rejected', metadata: { ...metadata, ...result.metadata } };
      score *= Math.max(0, Math.min(1, Number(result.score ?? 1)));
      Object.assign(metadata, result.metadata || {}); if (result.reason) reasons.push(result.reason);
    }
    return { accept: true, score, reason: reasons.join('; '), metadata };
  };
}
