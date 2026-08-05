/**
 * Compatibility rules and the single evaluation entry point.
 *
 * Four independent rule families, each with a reachable failure:
 *   1. mount        — the module's mount interface must be accepted by the slot
 *   2. prerequisite — a module may require a capability provided by another part
 *   3. clearance    — installed modules may not physically occupy the same volume
 *   4. power bus    — total continuous draw may not exceed the receiver bus capacity
 *   plus: required slots must be filled
 *
 * `evaluate()` is the only place a configuration turns into geometry-independent
 * truth. The renderer, the panels, the readout, the variant comparison and the
 * exporters all read the same object.
 */

import {
  BUS_CAPACITY_A, CLEARANCE_INSET_MM, WEAPON_BASE, SLOTS,
  getModule, getSlot, MOUNT_LABELS, CAPABILITY_LABELS
} from '../data/catalog.mjs';
import { placePart, measureAssembly } from './massprops.mjs';

const ZERO = { x: 0, y: 0, z: 0 };

/** Shrink an interval pair by `inset` on both ends. */
function inset(range, amount) {
  const mid = (range[0] + range[1]) / 2;
  const half = Math.max(0, (range[1] - range[0]) / 2 - amount);
  return [mid - half, mid + half];
}

/** Axis-aligned overlap of two boxes, or null. Boxes are {x:[..],y:[..],z:[..]} in mm. */
export function boxOverlap(a, b, amount = 0) {
  const result = {};
  for (const axis of ['x', 'y', 'z']) {
    const ra = inset(a[axis], amount);
    const rb = inset(b[axis], amount);
    const low = Math.max(ra[0], rb[0]);
    const high = Math.min(ra[1], rb[1]);
    if (high <= low) return null;
    result[axis] = [low, high];
  }
  return result;
}

/** Translate a module-local clearance volume into weapon coordinates. */
function worldClearance(volume, anchor) {
  return {
    x: [anchor.x + volume.x[0], anchor.x + volume.x[1]],
    y: [anchor.y + volume.y[0], anchor.y + volume.y[1]],
    z: [anchor.z + volume.z[0], anchor.z + volume.z[1]]
  };
}

/**
 * Evaluate a loadout.
 * @param {Record<string,string|null>} loadout slotId -> moduleId (or null)
 * @returns {object} placed parts, measurements, issues, capabilities
 */
export function evaluate(loadout) {
  const installed = [];
  const placed = [];

  for (const part of WEAPON_BASE.parts) {
    placed.push(placePart(part, ZERO));
  }

  for (const slot of SLOTS) {
    const moduleId = loadout?.[slot.id] || null;
    if (!moduleId) continue;
    const module = getModule(moduleId);
    if (!module) continue;
    installed.push({ slot, module });
    placed.push(placePart(module, slot.anchor));
  }

  const capabilities = new Set(WEAPON_BASE.provides);
  for (const entry of installed) {
    for (const token of entry.module.provides || []) capabilities.add(token);
  }

  const issues = [];

  /* --- 1. mount interface ------------------------------------------------ */
  for (const { slot, module } of installed) {
    if (!slot.accepts.includes(module.mount)) {
      issues.push({
        id: `mount:${slot.id}`,
        rule: 'mount',
        severity: 'error',
        slots: [slot.id],
        modules: [module.id],
        title: '체결 규격 불일치',
        detail: `${module.name}의 마운트는 ${MOUNT_LABELS[module.mount] || module.mount}이며 ` +
                `${slot.name} 슬롯은 ${slot.accepts.map(m => MOUNT_LABELS[m] || m).join(' / ')}만 받는다.`
      });
    }
  }

  /* --- 2. prerequisites -------------------------------------------------- */
  for (const { slot, module } of installed) {
    for (const token of module.requires || []) {
      if (capabilities.has(token)) continue;
      issues.push({
        id: `requires:${module.id}:${token}`,
        rule: 'prerequisite',
        severity: 'error',
        slots: [slot.id],
        modules: [module.id],
        title: '선행 조건 미충족',
        detail: `${module.name}는 ${CAPABILITY_LABELS[token] || token}를 요구한다. 현재 구성은 이를 제공하지 않는다.`
      });
    }
  }

  /* --- 3. geometric clearance ------------------------------------------- */
  for (let i = 0; i < installed.length; i += 1) {
    for (let j = i + 1; j < installed.length; j += 1) {
      const a = installed[i];
      const b = installed[j];
      for (const volumeA of a.module.clearance || []) {
        for (const volumeB of b.module.clearance || []) {
          const overlap = boxOverlap(
            worldClearance(volumeA, a.slot.anchor),
            worldClearance(volumeB, b.slot.anchor),
            CLEARANCE_INSET_MM
          );
          if (!overlap) continue;
          const depth = overlap.x[1] - overlap.x[0];
          issues.push({
            id: `clearance:${a.module.id}:${b.module.id}`,
            rule: 'clearance',
            severity: 'error',
            slots: [a.slot.id, b.slot.id],
            modules: [a.module.id, b.module.id],
            title: '물리적 간섭',
            detail: `${a.module.name}와 ${b.module.name}의 점유 체적이 ` +
                    `X ${overlap.x[0].toFixed(0)}–${overlap.x[1].toFixed(0)} mm 구간에서 ` +
                    `${depth.toFixed(0)} mm 겹친다. 두 부품은 동시에 체결할 수 없다.`,
            overlap
          });
        }
      }
    }
  }

  /* --- 4. power bus ------------------------------------------------------ */
  const draw = installed.reduce((sum, entry) => sum + (entry.module.power_a || 0), 0);
  if (draw > BUS_CAPACITY_A + 1e-9) {
    issues.push({
      id: 'power:bus',
      rule: 'power',
      severity: 'error',
      slots: installed.filter(e => (e.module.power_a || 0) > 0).map(e => e.slot.id),
      modules: installed.filter(e => (e.module.power_a || 0) > 0).map(e => e.module.id),
      title: '전력 버스 초과',
      detail: `연속 소모 ${draw.toFixed(1)} A가 리시버 버스 용량 ${BUS_CAPACITY_A.toFixed(1)} A를 ` +
              `${(draw - BUS_CAPACITY_A).toFixed(1)} A 초과한다. 전자 부착물 하나를 내려야 한다.`
    });
  } else if (draw > BUS_CAPACITY_A * 0.85) {
    issues.push({
      id: 'power:margin',
      rule: 'power',
      severity: 'warning',
      slots: [],
      modules: [],
      title: '전력 여유 부족',
      detail: `연속 소모 ${draw.toFixed(1)} A — 버스 용량의 ${((draw / BUS_CAPACITY_A) * 100).toFixed(0)} %. 추가 전자 부착물 여유가 거의 없다.`
    });
  }

  /* --- 5. required slots -------------------------------------------------- */
  for (const slot of SLOTS) {
    if (!slot.required) continue;
    if (loadout?.[slot.id]) continue;
    issues.push({
      id: `required:${slot.id}`,
      rule: 'required',
      severity: 'error',
      slots: [slot.id],
      modules: [],
      title: '필수 슬롯 비어 있음',
      detail: `${slot.name} 슬롯은 비워 둘 수 없다. ${slot.note}`
    });
  }

  const measurements = measureAssembly(placed);
  const errors = issues.filter(issue => issue.severity === 'error');

  return {
    loadout: Object.fromEntries(SLOTS.map(slot => [slot.id, loadout?.[slot.id] || null])),
    installed,
    placed,
    capabilities: [...capabilities].sort(),
    issues,
    errors,
    warnings: issues.filter(issue => issue.severity === 'warning'),
    status: errors.length ? 'invalid' : issues.length ? 'warning' : 'valid',
    measurements,
    bus: { draw_a: draw, capacity_a: BUS_CAPACITY_A, headroom_a: BUS_CAPACITY_A - draw }
  };
}

/**
 * Would installing `moduleId` into `slotId` be legal?
 * Used by the module rack to badge every candidate before the user commits,
 * and by the rejection animation to explain the arrest.
 */
export function previewInstall(loadout, slotId, moduleId) {
  const slot = getSlot(slotId);
  const module = getModule(moduleId);
  if (!slot || !module) {
    return { ok: false, issues: [], reason: '알 수 없는 슬롯 또는 모듈이다.' };
  }
  const next = { ...loadout, [slotId]: moduleId };
  const result = evaluate(next);
  const relevant = result.errors.filter(issue => issue.modules.includes(moduleId) || issue.slots.includes(slotId));
  return {
    ok: relevant.length === 0,
    issues: relevant,
    result,
    reason: relevant.length ? relevant[0].detail : null
  };
}

/** Difference between two evaluations, for the delta panel and variant comparison. */
export function diffMeasurements(before, after) {
  const fields = [
    ['mass_g', '총 질량', 'g', 0],
    ['length_mm', '전장', 'mm', 0],
    ['balance_point_mm', '밸런스 포인트', 'mm', 1],
    ['inertia_yaw_kgm2', '조준 관성 (요)', 'kg·m²', 4],
    ['gyradius_mm', '회전 반경', 'mm', 0],
    ['swing_period_ms', '스윙 주기', 'ms', 0]
  ];
  return fields.map(([key, label, unit, digits]) => {
    const a = before?.[key];
    const b = after?.[key];
    const valid = Number.isFinite(a) && Number.isFinite(b);
    return {
      key, label, unit, digits,
      before: a, after: b,
      delta: valid ? b - a : null,
      changed: valid ? Math.abs(b - a) > Math.pow(10, -digits) / 2 : false
    };
  });
}
