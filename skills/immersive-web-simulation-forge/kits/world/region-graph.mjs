const DEFAULT_RELATIONS = new Set(['adjacent','contains','connects','overlooks','upstream','downhill','reachable']);

export class RegionGraph {
  constructor({ allowedRelations = DEFAULT_RELATIONS } = {}) {
    this.allowedRelations = new Set(allowedRelations);
    this.nodes = new Map();
    this.edges = [];
  }

  addRegion(id, data = {}) {
    if (!id || typeof id !== 'string') throw new TypeError('region id must be a stable string');
    if (this.nodes.has(id)) throw new Error(`duplicate region id: ${id}`);
    this.nodes.set(id, { id, ...data });
    return this;
  }

  connect(from, to, relation = 'adjacent', data = {}) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) throw new Error(`unknown region relation endpoint: ${from} -> ${to}`);
    if (!this.allowedRelations.has(relation)) throw new Error(`unsupported relation: ${relation}`);
    const edge = { from, to, relation, ...data };
    const key = `${from}|${relation}|${to}`;
    if (this.edges.some(item => `${item.from}|${item.relation}|${item.to}` === key)) throw new Error(`duplicate relation: ${key}`);
    this.edges.push(edge);
    return edge;
  }

  neighbors(id, relation = null) {
    return this.edges.filter(edge => (edge.from === id || edge.to === id) && (!relation || edge.relation === relation))
      .map(edge => ({ edge, region: this.nodes.get(edge.from === id ? edge.to : edge.from) }));
  }

  outgoing(id, relation = null) { return this.edges.filter(edge => edge.from === id && (!relation || edge.relation === relation)); }
  incoming(id, relation = null) { return this.edges.filter(edge => edge.to === id && (!relation || edge.relation === relation)); }

  reachable(from, to, { relations = ['adjacent','connects','reachable'], maxDepth = 128 } = {}) {
    if (from === to) return this.nodes.has(from);
    const allowed = new Set(relations), queue = [[from, 0]], seen = new Set([from]);
    while (queue.length) {
      const [current, depth] = queue.shift();
      if (depth >= maxDepth) continue;
      for (const { region, edge } of this.neighbors(current)) {
        if (!allowed.has(edge.relation) || !region || seen.has(region.id)) continue;
        if (region.id === to) return true;
        seen.add(region.id); queue.push([region.id, depth + 1]);
      }
    }
    return false;
  }

  validate() {
    const issues = [];
    for (const edge of this.edges) {
      if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) issues.push({ type: 'missing-endpoint', edge });
      if (!this.allowedRelations.has(edge.relation)) issues.push({ type: 'invalid-relation', edge });
    }
    return { ok: issues.length === 0, regionCount: this.nodes.size, edgeCount: this.edges.length, issues };
  }

  toJSON() { return { regions: [...this.nodes.values()], relations: this.edges.map(edge => ({ ...edge })) }; }
}
