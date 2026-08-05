/**
 * Domain oracle.
 *
 * The mass-property code is checked against closed-form results that do not go
 * through it: textbook uniform-body inertia, the parallel-axis identity, the
 * mass-weighted centroid computed by hand, and the compound-pendulum period.
 * The clearance detector is checked against a constructed overlap and a
 * constructed near-miss so a detector that always fires — or never fires —
 * cannot pass.
 *
 * External reference for every formula used here:
 *   Meriam & Kraige, Engineering Mechanics: Dynamics, Appendix B
 *   (uniform-body moments of inertia; parallel-axis theorem; compound pendulum)
 *
 * These are analytic identities, not measurements, so the tolerances are
 * floating-point tolerances rather than physical uncertainties.
 */

import {
  placePart, primitiveInertia, totalMass, centreOfMass, inertiaAbout,
  pendulumPeriod, measureAssembly
} from './massprops.mjs';
import { evaluate, boxOverlap } from './constraints.mjs';
import { DEFAULT_LOADOUT, GRAVITY_MS2, CLEARANCE_INSET_MM } from '../data/catalog.mjs';
import { roundTripDocument } from '../doc/codec.mjs';
import { createDocument, legacyV1Fixture, canonicalise } from '../doc/document.mjs';
import { codec } from '../doc/codec.mjs';

export const TOLERANCES = [
  { name: 'analytic-identity', relative: 1e-9, note: '해석해와의 상대 오차 (부동소수점 한계)' },
  { name: 'closed-form-inertia', relative: 1e-9, note: '균일 강체 관성 폐형해와의 상대 오차' },
  { name: 'round-trip', relative: 0, note: '문서 직렬화는 바이트 단위로 동일해야 한다' }
];

const relativeError = (actual, expected) =>
  Math.abs(expected) < 1e-12 ? Math.abs(actual - expected) : Math.abs(actual - expected) / Math.abs(expected);

function synthetic(id, { mass_g, extents, com, inertia }) {
  return { id, name: id, mass_g, extents, com, inertia };
}

/**
 * Run every known case. Returns structured evidence — never mutates app state.
 */
export function verifyDomain() {
  const checks = [];
  const add = (name, ok, detail, extra = {}) => checks.push({ name, ok, detail, ...extra });

  /* ---- 1. mass additivity is exact ---------------------------------- */
  {
    const parts = [
      placePart(synthetic('a', { mass_g: 1234.5, extents: { x: [0, 100], y: [0, 20], z: [0, 20] }, com: { x: 50, y: 10, z: 10 }, inertia: { shape: 'box' } })),
      placePart(synthetic('b', { mass_g: 765.5, extents: { x: [0, 60], y: [0, 10], z: [0, 10] }, com: { x: 30, y: 5, z: 5 }, inertia: { shape: 'box' } }))
    ];
    const mass = totalMass(parts);
    const expected = 2.0;
    add('질량 가산성', relativeError(mass, expected) <= 1e-12,
      `Σm = ${mass.toFixed(12)} kg, 해석해 ${expected} kg`,
      { expected, actual: mass, tolerance: 1e-12 });
  }

  /* ---- 2. centre of mass against a hand-computed two-body case ------- */
  {
    // 3 kg at x = 100 mm, 1 kg at x = 500 mm  ->  x_cm = (3*100 + 1*500)/4 = 200 mm
    const parts = [
      placePart(synthetic('heavy', { mass_g: 3000, extents: { x: [90, 110], y: [-5, 5], z: [-5, 5] }, com: { x: 100, y: 0, z: 0 }, inertia: { shape: 'point' } })),
      placePart(synthetic('light', { mass_g: 1000, extents: { x: [490, 510], y: [-5, 5], z: [-5, 5] }, com: { x: 500, y: 0, z: 0 }, inertia: { shape: 'point' } }))
    ];
    const com = centreOfMass(parts);
    const expected = 200;
    add('무게중심 — 2체 해석해', relativeError(com.x, expected) <= 1e-9,
      `x_cm = ${com.x.toFixed(9)} mm, 해석해 ${expected} mm`,
      { expected, actual: com.x, tolerance: 1e-9 });
  }

  /* ---- 3. uniform rod: I_cm = m L² / 12 ----------------------------- */
  {
    const massKg = 2.4;
    const lengthM = 0.75;
    const rod = synthetic('rod', {
      mass_g: massKg * 1000,
      extents: { x: [0, lengthM * 1000], y: [0, 0], z: [0, 0] },
      com: { x: (lengthM * 1000) / 2, y: 0, z: 0 },
      inertia: { shape: 'rod' }
    });
    const inertia = primitiveInertia(rod);
    const expected = (massKg * lengthM * lengthM) / 12;
    add('균일 봉 관성 mL²/12', relativeError(inertia.z, expected) <= 1e-9,
      `I_cm = ${inertia.z.toExponential(9)} kg·m², 폐형해 ${expected.toExponential(9)} kg·m²`,
      { expected, actual: inertia.z, tolerance: 1e-9 });
  }

  /* ---- 4. uniform box: I_z = m(a²+b²)/12 ---------------------------- */
  {
    const massKg = 1.6;
    const a = 0.24; const b = 0.08; const c = 0.05;
    const box = synthetic('box', {
      mass_g: massKg * 1000,
      extents: { x: [0, a * 1000], y: [0, b * 1000], z: [0, c * 1000] },
      com: { x: (a * 1000) / 2, y: (b * 1000) / 2, z: (c * 1000) / 2 },
      inertia: { shape: 'box' }
    });
    const inertia = primitiveInertia(box);
    const expectedZ = (massKg * (a * a + b * b)) / 12;
    const expectedY = (massKg * (a * a + c * c)) / 12;
    const ok = relativeError(inertia.z, expectedZ) <= 1e-9 && relativeError(inertia.y, expectedY) <= 1e-9;
    add('균일 직육면체 관성 m(a²+b²)/12', ok,
      `I_z = ${inertia.z.toExponential(9)} (해 ${expectedZ.toExponential(9)}), I_y = ${inertia.y.toExponential(9)} (해 ${expectedY.toExponential(9)})`,
      { expected: expectedZ, actual: inertia.z, tolerance: 1e-9 });
  }

  /* ---- 5. hollow tube: I_transverse = m(3(ro²+ri²)+L²)/12 ----------- */
  {
    const massKg = 0.9;
    const ro = 0.022; const ri = 0.009; const L = 0.188;
    const tube = synthetic('tube', {
      mass_g: massKg * 1000,
      extents: { x: [0, L * 1000], y: [-ro * 1000, ro * 1000], z: [-ro * 1000, ro * 1000] },
      com: { x: (L * 1000) / 2, y: 0, z: 0 },
      inertia: { shape: 'tube', ro: ro * 1000, ri: ri * 1000 }
    });
    const inertia = primitiveInertia(tube);
    const expected = (massKg * (3 * (ro * ro + ri * ri) + L * L)) / 12;
    const expectedAxial = (massKg * (ro * ro + ri * ri)) / 2;
    const ok = relativeError(inertia.y, expected) <= 1e-9 && relativeError(inertia.x, expectedAxial) <= 1e-9;
    add('중공관 관성 폐형해', ok,
      `I_t = ${inertia.y.toExponential(9)} (해 ${expected.toExponential(9)}), I_axial = ${inertia.x.toExponential(9)} (해 ${expectedAxial.toExponential(9)})`,
      { expected, actual: inertia.y, tolerance: 1e-9 });
  }

  /* ---- 6. parallel-axis identity on the real default assembly -------- */
  {
    const result = evaluate(DEFAULT_LOADOUT);
    const parts = result.placed;
    const mass = totalMass(parts);
    const com = centreOfMass(parts);
    const datum = { x: 0, y: 0, z: 0 };
    const aboutCom = inertiaAbout(parts, com, 'z');
    const aboutDatum = inertiaAbout(parts, datum, 'z');
    const dx = (com.x - datum.x) / 1000;
    const dy = (com.y - datum.y) / 1000;
    const expected = aboutCom + mass * (dx * dx + dy * dy);
    add('평행축 정리 I_datum = I_cm + M·d²', relativeError(aboutDatum, expected) <= 1e-9,
      `I_datum = ${aboutDatum.toFixed(12)}, I_cm + Md² = ${expected.toFixed(12)} kg·m²`,
      { expected, actual: aboutDatum, tolerance: 1e-9 });
  }

  /* ---- 7. invariant: adding mass at the CoM does not move the CoM ---- */
  {
    const result = evaluate(DEFAULT_LOADOUT);
    const com = centreOfMass(result.placed);
    const ballast = placePart(synthetic('ballast', {
      mass_g: 900,
      extents: { x: [com.x - 1, com.x + 1], y: [com.y - 1, com.y + 1], z: [com.z - 1, com.z + 1] },
      com: { x: com.x, y: com.y, z: com.z },
      inertia: { shape: 'point' }
    }));
    const moved = centreOfMass([...result.placed, ballast]);
    const drift = Math.hypot(moved.x - com.x, moved.y - com.y, moved.z - com.z);
    add('불변량 — 무게중심에 질량 추가 시 무게중심 불변', drift <= 1e-9,
      `이동 ${drift.toExponential(3)} mm`,
      { expected: 0, actual: drift, tolerance: 1e-9 });
  }

  /* ---- 8. compound pendulum against the closed form ----------------- */
  {
    // A uniform rod pivoted at one end has T = 2π sqrt( (2L)/(3g) ).
    const massKg = 3.0;
    const L = 0.6;
    const rod = placePart(synthetic('pendulum-rod', {
      mass_g: massKg * 1000,
      extents: { x: [0, L * 1000], y: [0, 0], z: [0, 0] },
      com: { x: (L * 1000) / 2, y: 0, z: 0 },
      inertia: { shape: 'rod' }
    }));
    const period = pendulumPeriod([rod], { x: 0, y: 0, z: 0 });
    const expected = 2 * Math.PI * Math.sqrt((2 * L) / (3 * GRAVITY_MS2));
    add('복합진자 주기 — 한쪽 끝 지지 균일 봉', relativeError(period, expected) <= 1e-9,
      `T = ${period.toFixed(12)} s, 폐형해 2π√(2L/3g) = ${expected.toFixed(12)} s`,
      { expected, actual: period, tolerance: 1e-9 });
  }

  /* ---- 9. clearance detector: constructed overlap and near-miss ------ */
  {
    const a = { x: [0, 100], y: [0, 50], z: [-20, 20] };
    const overlapping = { x: [90, 200], y: [10, 40], z: [-10, 10] };   // 10 mm overlap, inset 2 -> 6 mm remains
    const nearMiss = { x: [104.1, 200], y: [10, 40], z: [-10, 10] };   // 4.1 mm gap -> inset cannot close it
    const hit = boxOverlap(a, overlapping, CLEARANCE_INSET_MM);
    const miss = boxOverlap(a, nearMiss, CLEARANCE_INSET_MM);
    const ok = Boolean(hit) && miss === null && Math.abs((hit.x[1] - hit.x[0]) - 6) < 1e-9;
    add('간섭 검출기 — 구성된 겹침/근접 통과', ok,
      `겹침 감지 ${hit ? `${(hit.x[1] - hit.x[0]).toFixed(2)} mm (기대 6.00)` : '없음'}, 근접 통과 ${miss ? '오검출' : '정상'}`,
      { expected: 6, actual: hit ? hit.x[1] - hit.x[0] : null, tolerance: 1e-9 });
  }

  /* ---- 10. clearance detector fires on the catalog's real conflict --- */
  {
    const conflict = evaluate({ ...DEFAULT_LOADOUT, muzzle: 'mz-reflex', handguard: 'hg-lr' });
    const clean = evaluate({ ...DEFAULT_LOADOUT, muzzle: 'mz-reflex', handguard: 'hg-std' });
    const fired = conflict.errors.some(issue => issue.rule === 'clearance');
    const quiet = !clean.errors.some(issue => issue.rule === 'clearance');
    add('카탈로그 간섭 사례 — 반사식 소음기 × LR 핸드가드', fired && quiet,
      `LR 조합 간섭 ${fired ? '검출' : '미검출'}, 표준 조합 ${quiet ? '정상' : '오검출'}`);
  }

  /* ---- 11. every rule family is reachable --------------------------- */
  {
    const cases = {
      prerequisite: evaluate({ ...DEFAULT_LOADOUT, handguard: 'hg-cq', underbarrel: 'ub-bipod' }),
      power: evaluate({ ...DEFAULT_LOADOUT, optic: 'opt-thermal', muzzle: 'mz-comp', underbarrel: 'ub-laser' }),
      required: evaluate({ ...DEFAULT_LOADOUT, stock: null }),
      clearance: evaluate({ ...DEFAULT_LOADOUT, muzzle: 'mz-reflex', handguard: 'hg-lr' })
    };
    const fired = Object.entries(cases)
      .filter(([rule, result]) => result.errors.some(issue => issue.rule === rule))
      .map(([rule]) => rule);
    add('제약 규칙 4종 모두 발화 가능', fired.length === 4,
      `발화: ${fired.join(', ') || '없음'}`);
  }

  /* ---- 12. default configuration is valid --------------------------- */
  {
    const result = evaluate(DEFAULT_LOADOUT);
    add('기본 구성 유효', result.status === 'valid',
      `상태 ${result.status}, 오류 ${result.errors.length}건`);
  }

  /* ---- 13. document round trip is byte-exact ------------------------ */
  {
    const document = createDocument({
      name: '왕복 시험',
      slots: { ...DEFAULT_LOADOUT, muzzle: 'mz-supp' },
      finish: 'anodized-gray',
      variants: [{
        id: 'var-test', name: '변형 A', finish: 'phosphate', slots: { ...DEFAULT_LOADOUT },
        createdAt: '2026-01-01T00:00:00.000Z', status: 'valid',
        mass_g: 1, length_mm: 2, balance_point_mm: 3,
        inertia_yaw_kgm2: 4, gyradius_mm: 5, swing_period_ms: 6
      }]
    });
    const trip = roundTripDocument(document);
    add('문서 JSON 왕복 — 바이트 동일', trip.ok,
      `${trip.bytes} 바이트, 왕복 후 ${trip.ok ? '동일' : '불일치'}`,
      { expected: 0, actual: trip.ok ? 0 : 1, tolerance: 0 });
  }

  /* ---- 14. schema migration v1 -> v2 -------------------------------- */
  {
    let ok = false;
    let detail = '';
    try {
      const legacy = JSON.stringify({ schema: 'armory-bench.loadout', version: 1, data: legacyV1Fixture() });
      const decoded = codec.decode(legacy);
      ok = decoded.version === 2
        && decoded.data.slots.optic === 'opt-iron'
        && decoded.data.finish === 'phosphate'
        && !('parts' in decoded.data);
      detail = `v${1} → v${decoded.version}, optic=${decoded.data.slots.optic}, finish=${decoded.data.finish}`;
    } catch (error) {
      detail = `마이그레이션 실패: ${error.message}`;
    }
    add('스키마 마이그레이션 v1 → v2', ok, detail);
  }

  /* ---- 15. malformed import is rejected, not absorbed --------------- */
  {
    const bad = [
      JSON.stringify({ schema: 'wrong.schema', version: 2, data: {} }),
      JSON.stringify({ schema: 'armory-bench.loadout', version: 99, data: {} }),
      JSON.stringify({ schema: 'armory-bench.loadout', version: 2, data: { ...canonicalise(createDocument()), slots: { optic: 'not-a-module' } } })
    ];
    const rejected = bad.filter(text => {
      try { codec.decode(text); return false; } catch { return true; }
    });
    add('손상된 가져오기 거부', rejected.length === bad.length,
      `${rejected.length}/${bad.length} 건 거부`);
  }

  /* ---- 16. measurements are finite and self-consistent -------------- */
  {
    const result = evaluate(DEFAULT_LOADOUT);
    const m = result.measurements;
    const finite = [m.mass_g, m.length_mm, m.balance_point_mm, m.inertia_yaw_kgm2, m.gyradius_mm, m.swing_period_ms]
      .every(Number.isFinite);
    const gyradiusCheck = Math.sqrt(m.inertia_yaw_kgm2 / m.mass_kg) * 1000;
    const inBounds = m.balance_point_mm >= m.bounds_mm.x[0] && m.balance_point_mm <= m.bounds_mm.x[1];
    const ok = finite && relativeError(gyradiusCheck, m.gyradius_mm) <= 1e-9 && inBounds;
    add('측정값 유한성 및 자기 일관성', ok,
      `유한 ${finite}, k 재계산 오차 ${relativeError(gyradiusCheck, m.gyradius_mm).toExponential(2)}, 밸런스 포인트 경계 내 ${inBounds}`,
      { expected: m.gyradius_mm, actual: gyradiusCheck, tolerance: 1e-9 });
  }

  const failed = checks.filter(check => !check.ok);
  return {
    status: failed.length ? 'fail' : 'pass',
    claim_level: 'educational',
    oracle: '폐형해 강체 역학 (Meriam & Kraige, Dynamics 부록 B) + 구성된 기하 검사 + 직렬화 왕복',
    known_cases: checks.map(check => check.name),
    tolerances: TOLERANCES,
    tolerances_met: failed.length === 0,
    checks,
    failed: failed.map(check => `${check.name}: ${check.detail}`),
    limitations: [
      '부품 질량은 가상 무기의 설계 데이터이며 실측값이 아니다.',
      '각 부품을 균일 밀도 프리미티브로 근사하므로 관성은 이 이상화 조립체의 값이다.',
      '스윙 주기는 미소각 근사이며 공기 저항과 사수 근력을 포함하지 않는다.',
      '탄도·반동·명중률은 모델링하지 않는다.'
    ]
  };
}

/** Convenience for the readout footer. */
export function domainSummary() {
  const result = verifyDomain();
  return { status: result.status, cases: result.known_cases.length, failed: result.failed };
}
