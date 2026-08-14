function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

export class SemanticRegionField {
  constructor({ regions = [], normalize = true } = {}) {
    this.normalize = Boolean(normalize);
    this.regions = new Map();
    this.consumers = new Map();
    for (const region of regions) this.addRegion(region);
  }

  addRegion({ id, weight, channels = {}, metadata = {} }) {
    if (!id || typeof id !== 'string') throw new TypeError('region.id must be a stable string');
    if (this.regions.has(id)) throw new Error(`duplicate region id: ${id}`);
    if (typeof weight !== 'function') throw new TypeError(`region ${id} requires weight(x,z,context)`);
    this.regions.set(id, { id, weight, channels: { ...channels }, metadata: { ...metadata } });
    return this;
  }

  removeRegion(id) { this.regions.delete(id); return this; }

  weights(x, z, context = {}) {
    const entries = [...this.regions.values()].map(region => [region.id, clamp01(region.weight(x, z, context))]);
    if (!this.normalize) return Object.fromEntries(entries);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (total <= 1e-12) return Object.fromEntries(entries.map(([id]) => [id, 0]));
    return Object.fromEntries(entries.map(([id, value]) => [id, value / total]));
  }

  sample(x, z, context = {}) {
    const weights = this.weights(x, z, context);
    let dominant = null, dominantWeight = -1;
    const channelNames = new Set();
    for (const region of this.regions.values()) Object.keys(region.channels).forEach(name => channelNames.add(name));
    const channels = {};
    for (const name of channelNames) {
      let value = 0;
      for (const region of this.regions.values()) {
        const source = region.channels[name];
        const channelValue = typeof source === 'function' ? source(x, z, context) : source;
        if (Number.isFinite(Number(channelValue))) value += (weights[region.id] || 0) * Number(channelValue);
      }
      channels[name] = value;
    }
    for (const [id, weight] of Object.entries(weights)) {
      if (weight > dominantWeight) { dominant = id; dominantWeight = weight; }
    }
    return { x, z, weights, dominant, dominantWeight: Math.max(0, dominantWeight), channels };
  }

  registerConsumer(name, consumer) {
    if (!name || typeof consumer !== 'function') throw new TypeError('consumer requires name and function');
    this.consumers.set(name, consumer);
    return () => this.consumers.delete(name);
  }

  propagate(x, z, context = {}) {
    const sample = this.sample(x, z, context);
    const outputs = {};
    for (const [name, consumer] of this.consumers) outputs[name] = consumer(sample, context);
    return { sample, outputs };
  }

  describe() {
    return {
      regions: [...this.regions.values()].map(region => ({ id: region.id, channels: Object.keys(region.channels), metadata: region.metadata })),
      consumers: [...this.consumers.keys()], normalize: this.normalize
    };
  }
}

export function softCircleWeight({ cx = 0, cz = 0, radius = 1, blend = radius * 0.15 } = {}) {
  const safeRadius = Math.max(1e-6, Number(radius));
  const safeBlend = Math.max(1e-6, Number(blend));
  return (x, z) => {
    const d = Math.hypot(x - cx, z - cz);
    return clamp01((safeRadius + safeBlend - d) / safeBlend);
  };
}
