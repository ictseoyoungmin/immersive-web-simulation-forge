function mulberry32(seed) {
  let state = seed >>> 0;
  return () => { state |= 0; state = state + 0x6D2B79F5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash2(x, z, seed = 1) {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return (n - Math.floor(n)) * 2 - 1;
}
export function valueNoise2D(x, z, { frequency = 1, amplitude = 1, seed = 1 } = {}) {
  return hash2(x * frequency, z * frequency, seed) * amplitude;
}

export function composeRegionHeight(region, x, z, context = {}) {
  const base = Number(region.baseHeight ?? 0);
  const noises = (region.noise || []).reduce((sum, layer) => sum + valueNoise2D(x, z, layer), 0);
  const operators = (region.operators || []).reduce((sum, operator) => {
    if (typeof operator === 'function') return sum + Number(operator(x, z, context) || 0);
    if (typeof operator?.sample === 'function') return sum + Number(operator.sample(x, z, context) || 0) * Number(operator.weight ?? 1);
    return sum;
  }, 0);
  return base + noises + operators;
}

export function createRegionHeightField({ regions = [], semanticField = null, fallbackHeight = 0 } = {}) {
  if (!regions.length) throw new Error('createRegionHeightField requires at least one region');
  const byId = new Map(regions.map(region => [region.id, region]));
  return {
    sample(x, z, context = {}) {
      const weights = semanticField?.weights?.(x, z, context) || Object.fromEntries(regions.map(region => [region.id, Number(region.weight?.(x, z, context) ?? 0)]));
      let height = 0, total = 0;
      for (const [id, weightRaw] of Object.entries(weights)) {
        const region = byId.get(id); if (!region) continue;
        const weight = Math.max(0, Number(weightRaw) || 0); if (!weight) continue;
        height += weight * composeRegionHeight(region, x, z, context); total += weight;
      }
      return total > 1e-12 ? height / total : Number(fallbackHeight);
    },
    regions: byId
  };
}

export function radialOperator({ cx = 0, cz = 0, radius = 1, height = 1, exponent = 2 } = {}) {
  return (x, z) => {
    const t = Math.max(0, 1 - Math.hypot(x - cx, z - cz) / Math.max(1e-6, radius));
    return height * Math.pow(t, exponent);
  };
}

export function terraceOperator({ step = 1, strength = 1 } = {}) {
  const s = Math.max(1e-6, Math.abs(step));
  return (_x, _z, context = {}) => {
    const h = Number(context.baseHeight ?? 0);
    return (Math.round(h / s) * s - h) * strength;
  };
}

export function seededJitter(seed = 1, amplitude = 1) {
  const random = mulberry32(seed);
  const offset = (random() * 2 - 1) * amplitude;
  return () => offset;
}
