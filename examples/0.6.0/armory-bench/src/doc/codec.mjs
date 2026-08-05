/**
 * Versioned document I/O.
 *
 * .json — lossless. Round-trips byte-identically through canonicalise().
 * .csv  — LOSSY spec sheet. Human/spreadsheet readable, not re-importable.
 *
 * Schema history
 *   v1  slots were stored under `parts`; no `finish` field.
 *   v2  `parts` -> `slots`, `finish` added (default 'phosphate').
 */

import { createProjectCodec } from '../kits/project-codec.mjs';
import {
  DOCUMENT_SCHEMA, DOCUMENT_VERSION, validateDocument, canonicalise, createDocument
} from './document.mjs';
import { SLOTS, getModule, getSlot, MOUNT_LABELS, WEAPON_BASE } from '../data/catalog.mjs';

export const codec = createProjectCodec({
  schema: DOCUMENT_SCHEMA,
  currentVersion: DOCUMENT_VERSION,
  migrations: {
    1: data => {
      const next = { ...data, slots: { ...(data.parts || {}) }, finish: data.finish || 'phosphate' };
      delete next.parts;
      next.variants = Array.isArray(next.variants) ? next.variants : [];
      next.notes = typeof next.notes === 'string' ? next.notes : '';
      for (const slot of SLOTS) {
        if (!Object.hasOwn(next.slots, slot.id)) next.slots[slot.id] = null;
      }
      return next;
    }
  },
  validate: validateDocument
});

export function encodeDocument(document) {
  return codec.encode(canonicalise(document));
}

export function decodeDocument(text) {
  const { data, version } = codec.decode(text);
  return { document: createDocument(data), migratedFrom: version === DOCUMENT_VERSION ? null : version };
}

/** Exact round trip on the canonical form. Used by verifyDomain. */
export function roundTripDocument(document) {
  const canonical = canonicalise(document);
  const encoded = codec.encode(canonical);
  const decoded = codec.decode(encoded).data;
  return {
    ok: JSON.stringify(decoded) === JSON.stringify(canonical),
    bytes: encoded.length,
    decoded
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Spec-sheet CSV. Explicitly lossy: it carries the measured result, not the
 * document, and cannot be re-imported.
 */
export function encodeSpecSheetCSV(document, evaluation) {
  const m = evaluation.measurements;
  const rows = [
    ['# ARMORY BENCH 제원표 (사양 요약 — 문서 재가져오기 불가 / lossy export)'],
    ['# 생성', new Date().toISOString()],
    ['# 본체', WEAPON_BASE.name, WEAPON_BASE.designation],
    ['# 구성명', document.name],
    ['# 마감', document.finish],
    ['# 상태', evaluation.status],
    [],
    ['구분', '항목', '값', '단위', '산출 근거'],
    ['측정', '총 질량', m.mass_g.toFixed(1), 'g', 'Σ 부품 질량'],
    ['측정', '전장', m.length_mm.toFixed(1), 'mm', '조립 AABB X 범위'],
    ['측정', '전고', m.height_mm.toFixed(1), 'mm', '조립 AABB Y 범위'],
    ['측정', '전폭', m.width_mm.toFixed(1), 'mm', '조립 AABB Z 범위'],
    ['측정', '밸런스 포인트', m.balance_point_mm.toFixed(2), 'mm (datum 기준)', 'Σmx / Σm'],
    ['측정', '조준 관성 (요)', m.inertia_yaw_kgm2.toFixed(5), 'kg·m²', '평행축 정리, 견착점 기준 Y축'],
    ['측정', '조준 관성 (피치)', m.inertia_pitch_kgm2.toFixed(5), 'kg·m²', '평행축 정리, 견착점 기준 Z축'],
    ['측정', '회전 반경', m.gyradius_mm.toFixed(1), 'mm', 'k = √(I_yaw / m)'],
    ['측정', '스윙 주기', m.swing_period_ms.toFixed(1), 'ms', 'T = 2π√(I / m g d)'],
    ['측정', '버스 부하', evaluation.bus.draw_a.toFixed(2), 'A', 'Σ 모듈 소모 전류'],
    ['측정', '버스 여유', evaluation.bus.headroom_a.toFixed(2), 'A', `용량 ${evaluation.bus.capacity_a.toFixed(1)} A − 부하`],
    []
  ];

  rows.push(['슬롯', '모듈', '질량(g)', '전류(A)', '체결 규격']);
  for (const slot of SLOTS) {
    const module = getModule(evaluation.loadout[slot.id]);
    rows.push([
      slot.name,
      module ? module.name : '— 비어 있음',
      module ? module.mass_g : '',
      module ? (module.power_a || 0).toFixed(2) : '',
      module ? (MOUNT_LABELS[module.mount] || module.mount) : (MOUNT_LABELS[getSlot(slot.id).accepts[0]] || '')
    ]);
  }

  if (evaluation.issues.length) {
    rows.push([]);
    rows.push(['진단', '등급', '규칙', '내용']);
    for (const issue of evaluation.issues) {
      rows.push([issue.title, issue.severity, issue.rule, issue.detail]);
    }
  }

  return rows.map(row => row.map(csvCell).join(',')).join('\n');
}

/** Trigger a browser download without leaking object URLs. */
export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { filename, bytes: blob.size };
}
