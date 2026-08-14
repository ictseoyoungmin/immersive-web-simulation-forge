export const AUTHORING_STRATEGIES = Object.freeze(['authored','procedural','reconstructed','generative','retrieved','hybrid']);

export function createAssetRouter({ rules = [], fallback = 'authored' } = {}) {
  if (!AUTHORING_STRATEGIES.includes(fallback) || fallback === 'hybrid') throw new Error('fallback must be a concrete authoring strategy');
  const normalized = rules.map((rule, index) => {
    if (typeof rule?.when !== 'function') throw new TypeError(`asset rule ${index} requires when(asset, context)`);
    if (!AUTHORING_STRATEGIES.includes(rule.strategy) || rule.strategy === 'hybrid') throw new Error(`asset rule ${index} has invalid concrete strategy`);
    return { priority: Number(rule.priority ?? 0), reason: rule.reason || '', ...rule };
  }).sort((a, b) => b.priority - a.priority);

  function route(asset, context = {}) {
    for (const rule of normalized) {
      if (rule.when(asset, context)) return { strategy: rule.strategy, reason: rule.reason, providerCapability: rule.providerCapability || null, rule: rule.name || null };
    }
    return { strategy: fallback, reason: 'fallback', providerCapability: null, rule: null };
  }
  return { route, rules: normalized.map(({ when, ...rest }) => rest), fallback };
}

export function salienceRouter({ nearDistance = 25, uniqueThreshold = 0.8 } = {}) {
  return createAssetRouter({ fallback: 'procedural', rules: [
    { name: 'reference-critical', priority: 100, strategy: 'reconstructed', providerCapability: 'reference-driven-3d', reason: 'reference fidelity is consequential', when: asset => Boolean(asset.referenceCritical) },
    { name: 'hero-explicit', priority: 90, strategy: 'authored', reason: 'hero identity or runtime structure requires explicit control', when: asset => Boolean(asset.hero || asset.explicitHierarchy) },
    { name: 'near-unique', priority: 70, strategy: 'generative', providerCapability: '3d-generation', reason: 'near unique content benefits from generative diversity', when: asset => Number(asset.distance ?? Infinity) <= nearDistance && Number(asset.uniqueness ?? 0) >= uniqueThreshold },
    { name: 'library', priority: 50, strategy: 'retrieved', providerCapability: 'asset-retrieval', reason: 'known reusable asset is available', when: asset => Boolean(asset.libraryMatch) }
  ]});
}
