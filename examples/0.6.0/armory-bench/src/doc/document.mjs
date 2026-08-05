/**
 * The authoritative document.
 *
 * This — not the Three.js scene graph — is the source of truth. The scene, the
 * readout, the validator, the panels, the variants and every exporter are
 * derived from it. Nothing reads geometry back into the document.
 *
 * State layers are kept separate (see references/editor-interaction.md):
 *   document    — this module: slots, finish, name, variants  (undoable, saved)
 *   derived     — evaluate() output: placement, measurements, issues
 *   interaction — selection, hover, in-flight gesture         (never undoable)
 *   view        — camera, view mode, panel layout             (never undoable)
 *   history     — committed document transitions
 */

import { DEFAULT_LOADOUT, SLOTS, WEAPON_BASE, CATALOG_VERSION, getModule } from '../data/catalog.mjs';

export const DOCUMENT_SCHEMA = 'armory-bench.loadout';
export const DOCUMENT_VERSION = 2;

/** Finishes are a document parameter that drives the material system. */
export const FINISHES = [
  {
    id: 'phosphate',
    name: '파커라이징 흑린',
    note: '표준 인산염 피막. 무광 흑회색, 반사 억제.',
    steel: { color: 0x1c2023, roughness: 0.40, metalness: 0.92 },
    alu: { color: 0x1d2225, roughness: 0.36, metalness: 0.86 },
    polymer: { color: 0x16191c, roughness: 0.82, metalness: 0.03 }
  },
  {
    id: 'cerakote-fde',
    name: '세라코트 FDE',
    note: '세라믹 도장. 사막 계열 저대비 위장색.',
    steel: { color: 0x36301f, roughness: 0.46, metalness: 0.88 },
    alu: { color: 0x8a7551, roughness: 0.56, metalness: 0.24 },
    polymer: { color: 0x5f5137, roughness: 0.84, metalness: 0.03 }
  },
  {
    id: 'anodized-gray',
    name: '하드 아노다이즈 그레이',
    note: 'Type III 경질 양극산화. 미세 결정 광택.',
    steel: { color: 0x3a3f44, roughness: 0.28, metalness: 0.97 },
    alu: { color: 0x646b71, roughness: 0.22, metalness: 0.94 },
    polymer: { color: 0x1f2225, roughness: 0.78, metalness: 0.05 }
  }
];

export const FINISH_INDEX = new Map(FINISHES.map(finish => [finish.id, finish]));

export function getFinish(id) {
  return FINISH_INDEX.get(id) || FINISHES[0];
}

let variantCounter = 0;

/** Stable, collision-resistant variant id. */
export function nextVariantId() {
  variantCounter += 1;
  return `var-${Date.now().toString(36)}-${variantCounter.toString(36)}`;
}

export function createDocument(overrides = {}) {
  return {
    name: '기본 구성',
    base: WEAPON_BASE.id,
    catalog: CATALOG_VERSION,
    finish: 'phosphate',
    slots: { ...DEFAULT_LOADOUT },
    notes: '',
    variants: [],
    ...overrides,
    // slots and variants must never be shared by reference
    ...(overrides.slots ? { slots: { ...overrides.slots } } : {}),
    ...(overrides.variants ? { variants: overrides.variants.map(v => ({ ...v, slots: { ...v.slots } })) } : {})
  };
}

/**
 * Structural validation of a decoded document. Returns `true` or an error string
 * so the codec can reject a malformed import without corrupting the open document.
 */
export function validateDocument(document) {
  if (!document || typeof document !== 'object') return '문서가 객체가 아니다.';
  if (typeof document.name !== 'string') return 'name 필드가 없다.';
  if (document.base !== WEAPON_BASE.id) return `지원하지 않는 본체: ${document.base}`;
  if (!document.slots || typeof document.slots !== 'object') return 'slots 필드가 없다.';
  if (!FINISH_INDEX.has(document.finish)) return `알 수 없는 마감: ${document.finish}`;

  const slotIds = new Set(SLOTS.map(slot => slot.id));
  for (const [slotId, moduleId] of Object.entries(document.slots)) {
    if (!slotIds.has(slotId)) return `알 수 없는 슬롯: ${slotId}`;
    if (moduleId === null) continue;
    const module = getModule(moduleId);
    if (!module) return `알 수 없는 모듈: ${moduleId}`;
    if (module.slot !== slotId) return `모듈 ${moduleId}는 ${slotId} 슬롯용이 아니다.`;
  }
  for (const slot of SLOTS) {
    if (!Object.hasOwn(document.slots, slot.id)) return `슬롯 항목 누락: ${slot.id}`;
  }
  if (!Array.isArray(document.variants)) return 'variants 필드가 배열이 아니다.';
  for (const variant of document.variants) {
    if (!variant || typeof variant.id !== 'string' || !variant.slots) return '변형 항목이 손상되었다.';
  }
  return true;
}

/** Deterministic serialisation order, so byte-identical documents compare equal. */
export function canonicalise(document) {
  return {
    name: document.name,
    base: document.base,
    catalog: document.catalog,
    finish: document.finish,
    slots: Object.fromEntries(SLOTS.map(slot => [slot.id, document.slots[slot.id] ?? null])),
    notes: document.notes || '',
    variants: (document.variants || []).map(variant => ({
      id: variant.id,
      name: variant.name,
      finish: variant.finish,
      slots: Object.fromEntries(SLOTS.map(slot => [slot.id, variant.slots[slot.id] ?? null])),
      createdAt: variant.createdAt,
      status: variant.status,
      mass_g: variant.mass_g,
      length_mm: variant.length_mm,
      balance_point_mm: variant.balance_point_mm,
      inertia_yaw_kgm2: variant.inertia_yaw_kgm2,
      gyradius_mm: variant.gyradius_mm,
      swing_period_ms: variant.swing_period_ms
    }))
  };
}

/** A version-1 document, used to exercise the migration path. */
export function legacyV1Fixture() {
  return {
    name: '레거시 구성 v1',
    base: WEAPON_BASE.id,
    catalog: '1.0.0',
    parts: { ...DEFAULT_LOADOUT, optic: 'opt-iron' },
    notes: 'schema v1 문서',
    variants: []
  };
}
