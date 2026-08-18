#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const inputArg = args.find(arg => !arg.startsWith('--'));
if (!inputArg) {
  console.error('Usage: node scripts/asset_fidelity_audit.mjs <asset-evidence-or-browser-report.json> [--flagship] [--max-near-placeholder-ratio 0.15] [--identity-classes a,b,c] [--plan FORGE_PLAN.json] [--out report.json]');
  process.exit(2);
}
const valueAfter = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flagship = args.includes('--flagship');
const maxRatio = Number(valueAfter('--max-near-placeholder-ratio', '0.15'));
const outPath = valueAfter('--out') ? path.resolve(valueAfter('--out')) : null;
const inputPath = path.resolve(inputArg);

// The declared identity-critical classes live in FORGE_PLAN.json, not in the runtime evidence
// payload being audited here — a class present in the plan but absent from every runtime object
// is a silent coverage gap the runtime's own self-report can't catch. `--identity-classes` overrides;
// `--plan <path>` points at a specific plan; otherwise search upward from the evidence file for
// FORGE_PLAN.json (it may sit next to it, as `.forge/FORGE_PLAN.json` + `.forge/evidence.json`, or
// one or two levels up, as when evidence is nested under `.forge/evidence/evidence.json`) and skip
// the check silently when none is found, matching every other optional contract in this script.
function findForgePlanUpward(startDir, maxLevels = 3) {
  let dir = startDir;
  for (let level = 0; level <= maxLevels; level++) {
    const candidate = path.join(dir, 'FORGE_PLAN.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
const explicitIdentityClasses = valueAfter('--identity-classes');
function loadDeclaredIdentityClasses() {
  if (explicitIdentityClasses !== null) {
    return explicitIdentityClasses.split(',').map(s => s.trim()).filter(Boolean);
  }
  const planPath = valueAfter('--plan')
    ? path.resolve(valueAfter('--plan'))
    : findForgePlanUpward(path.dirname(inputPath));
  if (!planPath || !fs.existsSync(planPath)) return null;
  try {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const classes = plan?.asset_fidelity?.identity_critical_classes;
    return Array.isArray(classes) ? classes.map(c => String(c).trim()).filter(Boolean) : null;
  } catch {
    return null;
  }
}
const declaredIdentityClasses = loadDeclaredIdentityClasses();
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const evidence = source?.evidence?.asset?.evidence || source?.evidence?.asset || source?.assetEvidence || source;
const objects = Array.isArray(evidence?.objects) ? evidence.objects : [];
const families = Array.isArray(evidence?.families) ? evidence.families : [];
const evidenceViews = Array.isArray(evidence?.evidenceViews) ? evidence.evidenceViews : [];
const styleMode = String(evidence?.styleMode || '').toLowerCase();
const scopeMode = String(evidence?.scopeMode || '').toLowerCase();
const intentionalPrimitiveStyle = Boolean(evidence?.intentionalPrimitiveStyle);
const nonObjectIdentity = Boolean(evidence?.nonObjectIdentity);
const nonObjectIdentityRationale = String(evidence?.nonObjectIdentityRationale || '').trim();
const findings = [];
const add = (id, severity, detail, objectId = null) => findings.push({ id, severity, detail, ...(objectId ? { objectId } : {}) });
const severity = flagship ? 'error' : 'warning';
const isPassLike = value => value === true || String(value || '').toLowerCase() === 'pass';
const normalizeBand = value => ['near','mid','far'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'unknown';
const unique = values => [...new Set(values.filter(Boolean))];

const ids = objects.map(o => String(o?.id || '').trim()).filter(Boolean);
const duplicateIds = unique(ids.filter((id, index) => ids.indexOf(id) !== index));
if (objects.some(o => !String(o?.id || '').trim())) add('missing-stable-asset-id', severity, 'one or more runtime asset records are missing stable IDs');
if (duplicateIds.length) add('duplicate-stable-asset-id', 'error', `duplicate runtime asset IDs: ${duplicateIds.join(', ')}`);

const identity = objects.filter(o => Boolean(o?.identityCritical));
const identityClassesCovered = unique(identity.map(o => String(o?.class || '').trim()));
const uncoveredIdentityClasses = declaredIdentityClasses
  ? declaredIdentityClasses.filter(cls => !identityClassesCovered.includes(cls))
  : [];
if (uncoveredIdentityClasses.length) {
  add('identity-critical-class-uncovered', severity, `declared identity-critical class(es) have no matching runtime identityCritical object: ${uncoveredIdentityClasses.join(', ')}`);
}
const heroes = objects.filter(o => Boolean(o?.hero));
const near = objects.filter(o => normalizeBand(o?.band) === 'near');
const mid = objects.filter(o => normalizeBand(o?.band) === 'mid');
const far = objects.filter(o => normalizeBand(o?.band) === 'far');
const nearPlaceholders = near.filter(o => Boolean(o?.placeholder) || String(o?.representation || '').toLowerCase() === 'primitive-placeholder');
const nearPlaceholderRatio = near.length ? nearPlaceholders.length / near.length : 0;

if (flagship && !styleMode) add('asset-style-mode-missing', 'error', 'flagship runtime asset evidence must declare styleMode');
if (flagship && !scopeMode) add('asset-scope-mode-missing', 'error', 'flagship runtime asset evidence must declare scopeMode');
if (flagship && scopeMode !== 'non-object' && identity.length === 0) add('identity-critical-assets-missing', 'error', 'flagship spatial asset evidence has no identity-critical runtime object');
if (flagship && scopeMode !== 'non-object' && heroes.length === 0) add('hero-asset-missing', 'error', 'flagship spatial asset evidence has no hero asset');
if (flagship && scopeMode === 'world-scale' && families.length === 0) add('representative-family-missing', 'error', 'world-scale flagship requires at least one representative asset family');
if (scopeMode === 'non-object' && (!nonObjectIdentity || !nonObjectIdentityRationale)) add('non-object-identity-unsubstantiated', flagship ? 'error' : 'warning', 'non-object asset scope requires an explicit runtime identity rationale');

const primitiveExempt = intentionalPrimitiveStyle && ['low-poly','abstract'].includes(styleMode);
if (!primitiveExempt && nearPlaceholderRatio > maxRatio) {
  add('near-placeholder-ratio', severity, `near-field placeholder ratio ${(nearPlaceholderRatio * 100).toFixed(1)}% exceeds ${(maxRatio * 100).toFixed(1)}% (${nearPlaceholders.length}/${near.length})`);
}
for (const obj of identity) {
  if ((obj.placeholder || obj.primitiveOnly) && !primitiveExempt) add('identity-critical-placeholder', severity, 'identity-critical asset is still primitive-only/placeholder', obj.id);
  if (!isPassLike(obj.silhouetteReviewed)) add('identity-silhouette-unreviewed', severity, 'identity-critical asset lacks silhouette review', obj.id);
  const views = Array.isArray(obj.evidenceViews) ? obj.evidenceViews : [];
  if (flagship && views.length < 3) add('identity-multiview-insufficient', 'error', `identity-critical asset has ${views.length} evidence view(s); at least 3 are required`, obj.id);
}
for (const obj of near) {
  if (!primitiveExempt && Boolean(obj.primitiveOnly) && !Boolean(obj.intentionalPrimitive)) add('near-primitive-only', severity, 'near-field object remains primitive-only without an intentional style exemption', obj.id);
  if (!Number.isFinite(Number(obj.materialRegions)) || Number(obj.materialRegions) < 1) add('near-material-regions-missing', severity, 'near-field object has no validated material regions', obj.id);
  if (!isPassLike(obj.contactValidated)) add('near-contact-unvalidated', severity, 'near-field object lacks support/contact validation', obj.id);
  if (!String(obj.shadowPolicy || '').trim()) add('near-shadow-policy-missing', flagship ? 'error' : 'warning', 'near-field object has no shadow policy', obj.id);
}

for (const family of families) {
  const familyId = String(family?.id || 'unnamed-family');
  const memberCount = Number(family?.memberCount || 0);
  const variantCount = Number(family?.variantCount || family?.variationCount || 0);
  const views = Array.isArray(family?.evidenceViews) ? family.evidenceViews : [];
  if (memberCount < 1) add('empty-asset-family', severity, `${familyId} has no members`);
  if (scopeMode === 'world-scale' && memberCount >= 4 && variantCount < 2) add('asset-family-variation-thin', severity, `${familyId} repeats ${memberCount} members with fewer than 2 validated variants`);
  if (flagship && views.length < 1) add('asset-family-evidence-missing', 'error', `${familyId} lacks representative family evidence`);
}

if (flagship && !isPassLike(evidence?.targetSizeReviewed)) add('asset-target-size-review-missing', 'error', 'flagship asset evidence was not reviewed at target presentation size');
if (flagship && evidenceViews.length < 3 && scopeMode !== 'non-object') add('asset-evidence-view-set-small', 'error', `runtime asset evidence exposes only ${evidenceViews.length} global evidence view(s); at least 3 are required`);

const errors = findings.filter(f => f.severity === 'error');
const report = {
  status: errors.length ? 'fail' : 'pass',
  source: inputPath,
  flagship,
  contract: 'asset-fidelity/v1',
  metrics: {
    style_mode: styleMode || null,
    scope_mode: scopeMode || null,
    object_count: objects.length,
    identity_critical_count: identity.length,
    identity_critical_classes_declared: declaredIdentityClasses,
    identity_critical_classes_uncovered: uncoveredIdentityClasses,
    hero_asset_count: heroes.length,
    family_count: families.length,
    near_count: near.length,
    mid_count: mid.length,
    far_count: far.length,
    near_placeholder_count: nearPlaceholders.length,
    near_placeholder_ratio: Number(nearPlaceholderRatio.toFixed(4)),
    max_near_placeholder_ratio: Number.isFinite(maxRatio) ? maxRatio : 0.15,
    target_size_reviewed: isPassLike(evidence?.targetSizeReviewed),
    evidence_view_count: evidenceViews.length,
    intentional_primitive_style: intentionalPrimitiveStyle,
    primitive_style_exempt: primitiveExempt
  },
  findings
};
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
process.exit(report.status === 'pass' ? 0 : 1);
