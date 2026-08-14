export const STYLE_MODES = Object.freeze(['realistic','reference-driven','stylized','low-poly','abstract','technical','mixed']);
export const SCOPE_MODES = Object.freeze(['single-subject','multi-object','world-scale','non-object']);

export function createAssetFidelityPolicy({
  styleMode = 'technical', scopeMode = 'multi-object', nearPlaceholderRatioMax = 0.15,
  intentionalPrimitiveStyle = false
} = {}) {
  if (!STYLE_MODES.includes(styleMode)) throw new Error(`unsupported styleMode: ${styleMode}`);
  if (!SCOPE_MODES.includes(scopeMode)) throw new Error(`unsupported scopeMode: ${scopeMode}`);
  if (!(nearPlaceholderRatioMax >= 0 && nearPlaceholderRatioMax <= 1)) throw new Error('nearPlaceholderRatioMax must be within [0,1]');
  const primitiveExempt = intentionalPrimitiveStyle && ['low-poly','abstract'].includes(styleMode);
  return Object.freeze({ styleMode, scopeMode, nearPlaceholderRatioMax, intentionalPrimitiveStyle, primitiveExempt });
}

export function summarizeAssetEvidence(objects = [], families = [], policy = createAssetFidelityPolicy()) {
  const rows = Array.isArray(objects) ? objects : [];
  const near = rows.filter(o => o?.band === 'near');
  const nearPlaceholders = near.filter(o => o?.placeholder || o?.representation === 'primitive-placeholder');
  const ratio = near.length ? nearPlaceholders.length / near.length : 0;
  return {
    styleMode: policy.styleMode,
    scopeMode: policy.scopeMode,
    intentionalPrimitiveStyle: policy.intentionalPrimitiveStyle,
    objects: rows,
    families: Array.isArray(families) ? families : [],
    metrics: {
      objectCount: rows.length,
      identityCriticalCount: rows.filter(o => o?.identityCritical).length,
      heroAssetCount: rows.filter(o => o?.hero).length,
      nearCount: near.length,
      nearPlaceholderCount: nearPlaceholders.length,
      nearPlaceholderRatio: ratio
    }
  };
}
