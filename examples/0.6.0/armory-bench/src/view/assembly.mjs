/**
 * Document -> scene reconciliation, and the mechanical motion grammar.
 *
 * The scene never holds authority. sync() is handed an evaluation and makes the
 * scene match it; every visual state (seated, travelling, arrested, exploded,
 * sectioned, selected, faulted) is a function of that evaluation plus animation
 * clocks.
 *
 * MOTION GRAMMAR (planning §6 — mechanical reconfiguration, not transformation)
 *   APPROACH  the part travels in along its declared mount axis, slightly
 *             misaligned, decelerating
 *   ALIGN     misalignment is corrected at the seat standoff
 *   SEAT      the final few millimetres are covered firmly, with a hard stop
 *   LOCK      a fastening motion specific to the mount type:
 *               thread  rotation accumulated across the whole travel, then torque-down
 *               lever   clamp draw-down of 0.6 mm
 *               collar  cinch: a small counter-rotation and 1.5 mm axial pull-in
 *               catch   rock-back onto the catch
 *               pin     0.9 mm pull-back as the detent drops in
 *
 * REJECT is a fourth path: approach, hard arrest short of the seat, two damped
 * bounces, then withdrawal — the part is never committed to the document.
 */

import {
  Group, Mesh, Raycaster, Vector2, Vector3, Box3, BoxGeometry, RingGeometry,
  MeshBasicMaterial, MeshStandardMaterial, Plane, Color, EdgesGeometry,
  LineSegments, LineBasicMaterial, CylinderGeometry, DoubleSide
} from '../../vendor/three/three.module.min.js';
import { SLOTS, WEAPON_BASE, getModule } from '../data/catalog.mjs';
import { buildPart, countTriangles } from './geometry.mjs';

const MM = 0.001;

/* ------------------------------------------------------------------ *
 * Easing — deliberately mechanical: decelerating approach, firm stop.
 * ------------------------------------------------------------------ */

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOutCubic = t => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = t => { const c = 1.30; const u = clamp01(t) - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

/** Damped bounce used by the rejection arrest. */
function bounce(t) {
  const u = clamp01(t);
  return Math.exp(-6.2 * u) * Math.cos(u * Math.PI * 4.1) * (1 - u);
}

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

const INSTALL_STAGES = [
  { name: 'approach', at: 0.00, to: 0.46 },
  { name: 'align', at: 0.46, to: 0.60 },
  { name: 'seat', at: 0.60, to: 0.82 },
  { name: 'lock', at: 0.82, to: 1.00 }
];

const INSTALL_SECONDS = 0.95;
const REMOVE_SECONDS = 0.68;
const REJECT_SECONDS = 0.86;

function stageAt(t) {
  for (const stage of INSTALL_STAGES) {
    if (t < stage.to) return { ...stage, local: (t - stage.at) / (stage.to - stage.at) };
  }
  const last = INSTALL_STAGES[INSTALL_STAGES.length - 1];
  return { ...last, local: 1 };
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

export function createAssembly(context) {
  const { scene, stage, materials, camera } = context;

  const root = new Group();
  root.name = 'weapon';
  stage.add(root);

  const baseGroup = new Group();
  baseGroup.name = 'base';
  root.add(baseGroup);

  const slotNodes = new Map();
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const disposables = new Set();

  let materialSet = materials.build('phosphate');
  let currentFinish = 'phosphate';
  let triangleCount = 0;

  const state = {
    view: 'assembled',
    explode: 0,
    explodeTarget: 0,
    section: 0,
    sectionTarget: 0,
    selected: null,
    hover: null,
    faults: new Set(),
    events: []
  };

  const sectionPlane = new Plane(new Vector3(0, 0, -1), 0.0);

  /* ---------------- material plumbing ---------------- */

  function cloneSet() {
    const clone = {};
    for (const [key, material] of Object.entries(materialSet)) {
      clone[key] = material.clone();
      clone[key].clippingPlanes = [];
      disposables.add(clone[key]);
    }
    return clone;
  }

  function buildMeshes(part, owner) {
    const { buckets } = buildPart(part);
    const group = new Group();
    const set = cloneSet();
    group.userData.materials = set;
    group.userData.baseEmissive = new Map();

    for (const [key, geometry] of Object.entries(buckets)) {
      const material = key === 'emissive'
        ? materials.emissiveMaterial(part.features.find(f => f.k === 'led')?.color ?? 0x58e0ff).clone()
        : set[key] || set.steel;
      if (key === 'emissive') disposables.add(material);
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = key !== 'glass';
      mesh.receiveShadow = true;
      mesh.userData.slotId = owner.slotId;
      mesh.userData.partId = part.id;
      mesh.userData.materialKey = key;
      group.add(mesh);
      disposables.add(geometry);
      if (material.emissive) group.userData.baseEmissive.set(mesh, material.emissive.clone());
    }
    triangleCount += countTriangles(buckets);
    return group;
  }

  /* ---------------- base ---------------- */

  const baseParts = [];
  function buildBase() {
    for (const child of [...baseGroup.children]) baseGroup.remove(child);
    baseParts.length = 0;
    for (const part of WEAPON_BASE.parts) {
      const group = buildMeshes(part, { slotId: null });
      group.userData.partId = part.id;
      group.userData.explode = explodeVectorForBase(part.id);
      baseGroup.add(group);
      baseParts.push(group);
    }
  }

  function explodeVectorForBase(partId) {
    switch (partId) {
      case 'base-barrel': return new Vector3(0.16, 0.04, 0);
      case 'base-bcg': return new Vector3(-0.09, 0.11, 0);
      case 'base-grip': return new Vector3(-0.03, -0.13, 0);
      case 'base-trigger': return new Vector3(0, -0.08, 0.05);
      default: return new Vector3(0, 0, 0);
    }
  }

  /* ---------------- slot scaffolding ---------------- */

  const RING_GEOMETRY = new RingGeometry(0.011, 0.016, 22);

  function buildSlotNode(slot) {
    const node = new Group();
    node.name = `slot:${slot.id}`;
    node.position.set(slot.anchor.x * MM, slot.anchor.y * MM, slot.anchor.z * MM);
    root.add(node);

    // travelling container: animation offsets are applied here, never to geometry
    const carriage = new Group();
    node.add(carriage);

    const indicatorMaterial = new MeshBasicMaterial({
      color: 0x2f6d80, transparent: true, opacity: 0.0, depthWrite: false, side: DoubleSide
    });
    const indicator = new Mesh(RING_GEOMETRY, indicatorMaterial);
    indicator.rotation.x = slot.install.axis === 'y' ? -Math.PI / 2 : 0;
    indicator.rotation.y = slot.install.axis === 'x' ? Math.PI / 2 : 0;
    node.add(indicator);
    disposables.add(indicatorMaterial);

    const record = {
      slot, node, carriage, indicator, indicatorMaterial,
      moduleId: null,
      meshes: null,
      outgoing: null,
      phase: 'idle',
      clock: 0,
      duration: 0,
      pending: null,
      fault: false,
      explode: explodeVectorForSlot(slot)
    };
    slotNodes.set(slot.id, record);
    return record;
  }

  function explodeVectorForSlot(slot) {
    const axis = slot.install.axis;
    const sign = Math.sign(slot.install.approach) || 1;
    const distance = 0.135;
    if (axis === 'x') return new Vector3(sign * distance * 1.2, 0, 0);
    if (axis === 'y') return new Vector3(0, sign * distance, 0);
    return new Vector3(0, 0, sign * distance);
  }

  /* ---------------- motion ---------------- */

  /** Offset of a travelling part in metres + radians, given phase and progress. */
  function poseFor(record, phase, t) {
    const install = record.slot.install;
    const axis = install.axis;
    const approach = install.approach * MM;
    const seat = install.seat * MM;
    const offset = new Vector3();
    const rotation = new Vector3();
    let travel = 0;
    let misalign = 0;
    let spin = 0;

    if (phase === 'installing') {
      const s = stageAt(t);
      if (s.name === 'approach') {
        travel = approach + (seat - approach) * easeOutCubic(s.local);
        misalign = (1 - easeOutCubic(s.local)) * 0.055;
      } else if (s.name === 'align') {
        travel = seat;
        misalign = (1 - easeInOutCubic(s.local)) * 0.055;
      } else if (s.name === 'seat') {
        travel = seat * (1 - easeOutBack(s.local));
        misalign = 0;
      } else {
        travel = lockTravel(install.lock, s.local);
        misalign = 0;
      }
      const axialProgress = phase === 'installing' ? 1 - Math.abs(travel) / Math.max(1e-6, Math.abs(approach)) : 1;
      if (install.lock === 'thread') {
        spin = (1 - clamp01(axialProgress)) * install.lockDeg * (Math.PI / 180);
        if (s.name === 'lock') spin = Math.sin(s.local * Math.PI * 3) * 0.04;
      }
    } else if (phase === 'removing') {
      const u = clamp01(t);
      if (u < 0.18) {
        travel = -lockRelease(install.lock, u / 0.18);
      } else {
        const v = (u - 0.18) / 0.82;
        travel = seat * easeInOutCubic(Math.min(1, v * 2)) + (approach - seat) * easeInOutCubic(v);
        if (install.lock === 'thread') spin = -v * install.lockDeg * (Math.PI / 180);
      }
    } else if (phase === 'rejecting') {
      const arrest = 0.52;
      const stop = seat * 2.4;
      if (t < arrest) {
        travel = approach + (stop - approach) * easeOutCubic(t / arrest);
      } else if (t < 0.74) {
        travel = stop + Math.abs(approach) * 0.05 * bounce((t - arrest) / 0.22);
      } else {
        travel = stop + (approach - stop) * easeInOutCubic((t - 0.74) / 0.26);
      }
      misalign = 0.03;
    }

    if (axis === 'x') { offset.x = travel; rotation.y = misalign; rotation.x = spin; }
    else if (axis === 'y') { offset.y = travel; rotation.z = misalign; rotation.y = spin; }
    else { offset.z = travel; rotation.y = misalign; rotation.z = spin; }

    // lock-stage character motions, perpendicular to the mount axis
    if (phase === 'installing' && t >= 0.82) {
      const u = (t - 0.82) / 0.18;
      if (install.lock === 'catch') rotation.z += Math.sin(u * Math.PI) * 0.022;
      if (install.lock === 'collar') rotation.x += Math.sin(u * Math.PI) * (install.lockDeg * Math.PI / 180) * 0.10;
      if (install.lock === 'lever') rotation.z += Math.sin(u * Math.PI) * 0.012;
    }

    return { offset, rotation };
  }

  function lockTravel(kind, u) {
    const e = easeOutCubic(u);
    switch (kind) {
      case 'lever': return 0.0006 * (1 - e);
      case 'collar': return 0.0015 * (1 - e);
      case 'pin': return -0.0009 * Math.sin(u * Math.PI);
      case 'catch': return 0.0008 * (1 - e);
      default: return 0;
    }
  }

  function lockRelease(kind, u) {
    const e = easeOutCubic(u);
    switch (kind) {
      case 'lever': return 0.0012 * e;
      case 'collar': return 0.0018 * e;
      case 'pin': return 0.0014 * e;
      case 'catch': return 0.0010 * e;
      default: return 0.0006 * e;
    }
  }

  /* ---------------- balance marker ---------------- */

  const balanceGroup = new Group();
  balanceGroup.name = 'balance';
  root.add(balanceGroup);

  const knifeEdge = new Mesh(
    new CylinderGeometry(0.0001, 0.010, 0.026, 3),
    new MeshStandardMaterial({ color: 0x4fd6e8, emissive: 0x1c5866, emissiveIntensity: 1.4, roughness: 0.4, metalness: 0.3 })
  );
  knifeEdge.position.y = -0.052;
  balanceGroup.add(knifeEdge);
  disposables.add(knifeEdge.geometry);
  disposables.add(knifeEdge.material);

  const balanceStemGeometry = new BoxGeometry(0.0007, 0.075, 0.0007);
  const balanceStem = new Mesh(balanceStemGeometry, new MeshBasicMaterial({
    color: 0x4fd6e8, transparent: true, opacity: 0.42, depthWrite: false
  }));
  balanceStem.position.y = -0.0155;
  balanceGroup.add(balanceStem);
  disposables.add(balanceStemGeometry);
  disposables.add(balanceStem.material);

  /* ---------------- interference volume ---------------- */

  const interferenceGeometry = new BoxGeometry(1, 1, 1);
  const interferenceMaterial = new MeshBasicMaterial({
    color: 0xff4d4d, transparent: true, opacity: 0.18, depthWrite: false
  });
  const interference = new Mesh(interferenceGeometry, interferenceMaterial);
  const interferenceEdges = new LineSegments(
    new EdgesGeometry(interferenceGeometry),
    new LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.85 })
  );
  interference.add(interferenceEdges);
  interference.visible = false;
  interference.scale.setScalar(0.001);   // never let the helper dominate a bounds query
  root.add(interference);
  disposables.add(interferenceGeometry);
  disposables.add(interferenceMaterial);
  disposables.add(interferenceEdges.geometry);
  disposables.add(interferenceEdges.material);

  /* ---------------- public surface ---------------- */

  buildBase();
  for (const slot of SLOTS) buildSlotNode(slot);

  function setFinish(finishId) {
    if (finishId === currentFinish) return;
    currentFinish = finishId;
    const next = materials.build(finishId);
    for (const [key, material] of Object.entries(materialSet)) {
      material.color.copy(next[key].color);
      material.roughness = next[key].roughness;
      if ('metalness' in next[key]) material.metalness = next[key].metalness;
      next[key].dispose();
    }
    // per-part clones follow the shared set
    root.traverse(object => {
      if (!object.isMesh) return;
      const key = object.userData.materialKey;
      if (!key || !materialSet[key]) return;
      object.material.color.copy(materialSet[key].color);
      object.material.roughness = materialSet[key].roughness;
      if ('metalness' in materialSet[key]) object.material.metalness = materialSet[key].metalness;
      object.material.needsUpdate = true;
    });
  }

  /**
   * Reconcile with an evaluation.
   * @param {object} evaluation constraints.evaluate() output
   * @param {object} options { animate:boolean, changedSlot:string|null }
   */
  function sync(evaluation, options = {}) {
    const animate = options.animate !== false;
    state.faults = new Set();
    for (const issue of evaluation.errors) {
      for (const slotId of issue.slots) state.faults.add(slotId);
    }

    for (const slot of SLOTS) {
      const record = slotNodes.get(slot.id);
      const nextId = evaluation.loadout[slot.id];
      if (nextId === record.moduleId && record.phase === 'idle') continue;
      if (nextId === record.moduleId) continue;

      const module = getModule(nextId);
      if (record.meshes) {
        record.outgoing = record.meshes;
        record.meshes = null;
      }
      record.moduleId = nextId;

      if (module) {
        const meshes = buildMeshes(module, { slotId: slot.id });
        record.carriage.add(meshes);
        record.meshes = meshes;
        record.phase = animate ? 'installing' : 'idle';
        record.duration = INSTALL_SECONDS;
        record.clock = 0;
        if (!animate) applyPose(record, 'idle', 1);
        else state.events.push({ type: 'install-start', slot: slot.id, module: module.id });
      } else {
        record.phase = animate && record.outgoing ? 'removing' : 'idle';
        record.duration = REMOVE_SECONDS;
        record.clock = 0;
        if (!animate) clearOutgoing(record);
        else if (record.outgoing) state.events.push({ type: 'remove-start', slot: slot.id });
      }
    }

    updateBalance(evaluation);
    updateInterference(evaluation);
    updateHighlights();
  }

  function clearOutgoing(record) {
    if (!record.outgoing) return;
    record.carriage.remove(record.outgoing);
    disposeGroup(record.outgoing);
    record.outgoing = null;
  }

  function disposeGroup(group) {
    group.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      disposables.delete(object.geometry);
      object.material.dispose();
      disposables.delete(object.material);
    });
  }

  /** Play the arrested-approach rejection without touching the document. */
  function reject(slotId, moduleId) {
    const record = slotNodes.get(slotId);
    if (!record) return null;
    const module = getModule(moduleId);
    if (!module) return null;
    if (record.ghost) {
      record.carriage.remove(record.ghost);
      disposeGroup(record.ghost);
    }
    const ghost = buildMeshes(module, { slotId });
    ghost.traverse(object => {
      if (!object.isMesh) return;
      object.material.transparent = true;
      object.material.opacity = 0.86;
      object.castShadow = false;
    });
    record.carriage.add(ghost);
    record.ghost = ghost;
    record.phase = 'rejecting';
    record.duration = REJECT_SECONDS;
    record.clock = 0;
    state.events.push({ type: 'reject-start', slot: slotId, module: moduleId });
    return REJECT_SECONDS;
  }

  function applyPose(record, phase, t) {
    const target = phase === 'rejecting' ? record.ghost : (phase === 'removing' ? record.outgoing : record.meshes);
    if (!target) return;
    if (phase === 'idle') {
      target.position.set(0, 0, 0);
      target.rotation.set(0, 0, 0);
      return;
    }
    const { offset, rotation } = poseFor(record, phase, t);
    target.position.copy(offset);
    target.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  function update(dt) {
    const events = [];

    for (const record of slotNodes.values()) {
      if (record.phase !== 'idle') {
        const before = record.clock / record.duration;
        record.clock += dt;
        const t = clamp01(record.clock / record.duration);

        if (record.phase === 'installing') {
          if (before < 0.60 && t >= 0.60) events.push({ type: 'seat', slot: record.slot.id });
          if (before < 0.82 && t >= 0.82) events.push({ type: 'lock', slot: record.slot.id, lock: record.slot.install.lock });
          applyPose(record, 'installing', t);
          clearOutgoing(record);
          if (t >= 1) { record.phase = 'idle'; applyPose(record, 'idle', 1); events.push({ type: 'install-end', slot: record.slot.id }); }
        } else if (record.phase === 'removing') {
          applyPose(record, 'removing', t);
          if (record.outgoing) {
            const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
            record.outgoing.traverse(object => {
              if (!object.isMesh) return;
              object.material.transparent = true;
              object.material.opacity = fade;
            });
          }
          if (before < 0.18 && t >= 0.18) events.push({ type: 'unlock', slot: record.slot.id });
          if (t >= 1) { clearOutgoing(record); record.phase = 'idle'; events.push({ type: 'remove-end', slot: record.slot.id }); }
        } else if (record.phase === 'rejecting') {
          applyPose(record, 'rejecting', t);
          if (before < 0.52 && t >= 0.52) events.push({ type: 'arrest', slot: record.slot.id });
          if (record.ghost && t > 0.86) {
            const fade = 1 - (t - 0.86) / 0.14;
            record.ghost.traverse(object => { if (object.isMesh) object.material.opacity = 0.86 * fade; });
          }
          if (t >= 1) {
            if (record.ghost) { record.carriage.remove(record.ghost); disposeGroup(record.ghost); record.ghost = null; }
            record.phase = 'idle';
            events.push({ type: 'reject-end', slot: record.slot.id });
          }
        }
      }

      // indicator ring: amber while travelling, cyan when selected, red on fault
      const isFault = state.faults.has(record.slot.id);
      const busy = record.phase !== 'idle';
      const selected = state.selected === record.slot.id;
      const hovered = state.hover === record.slot.id;
      let targetOpacity = 0;
      let colour = 0x2f6d80;
      if (isFault) { targetOpacity = 0.95; colour = 0xff4d4d; }
      else if (busy) { targetOpacity = 0.9; colour = record.phase === 'rejecting' ? 0xff4d4d : 0xffa64d; }
      else if (selected) { targetOpacity = 0.85; colour = 0x4fd6e8; }
      else if (hovered) { targetOpacity = 0.5; colour = 0x4fd6e8; }
      else if (!record.moduleId) { targetOpacity = 0.34; colour = 0x3f7f92; }
      record.indicatorMaterial.color.setHex(colour);
      record.indicatorMaterial.opacity += (targetOpacity - record.indicatorMaterial.opacity) * Math.min(1, dt * 12);
      record.indicator.visible = record.indicatorMaterial.opacity > 0.01;
      const pulse = busy || isFault ? 1 + Math.sin(performance.now() * 0.012) * 0.12 : 1;
      record.indicator.scale.setScalar(pulse);
    }

    // exploded / section springs
    state.explode += (state.explodeTarget - state.explode) * Math.min(1, dt * 5.5);
    state.section += (state.sectionTarget - state.section) * Math.min(1, dt * 6.5);
    applyExplode();
    applySection();

    const queued = state.events.splice(0, state.events.length);
    return queued.concat(events);
  }

  function applyExplode() {
    const amount = state.explode;
    for (const group of baseParts) {
      const vector = group.userData.explode;
      group.position.set(vector.x * amount, vector.y * amount, vector.z * amount);
    }
    for (const record of slotNodes.values()) {
      const vector = record.explode;
      record.carriage.position.set(vector.x * amount, vector.y * amount, vector.z * amount);
    }
    balanceGroup.visible = amount < 0.35;
  }

  let sectionActive = false;
  function applySection() {
    const active = state.section > 0.02;
    if (active === sectionActive) return;
    sectionActive = active;
    context.renderer.localClippingEnabled = active;
    root.traverse(object => {
      if (!object.isMesh) return;
      object.material.clippingPlanes = active ? [sectionPlane] : [];
      object.material.side = active ? DoubleSide : object.material.side;
      object.material.needsUpdate = true;
    });
  }

  function setViewMode(mode) {
    state.view = mode;
    state.explodeTarget = mode === 'exploded' ? 1 : 0;
    state.sectionTarget = mode === 'section' ? 1 : 0;
  }

  function setSelection(slotId) {
    state.selected = slotId;
    updateHighlights();
  }

  function setHover(slotId) {
    if (state.hover === slotId) return;
    state.hover = slotId;
    updateHighlights();
  }

  function updateHighlights() {
    for (const record of slotNodes.values()) {
      const group = record.meshes;
      if (!group) continue;
      const selected = state.selected === record.slot.id;
      const hovered = state.hover === record.slot.id;
      const fault = state.faults.has(record.slot.id);
      const dim = state.selected && !selected ? 0.55 : 1;
      group.traverse(object => {
        if (!object.isMesh || !object.material.emissive) return;
        if (object.userData.materialKey === 'emissive') return;
        const target = fault ? new Color(0x30090a) : selected ? new Color(0x08222a) : hovered ? new Color(0x04151b) : new Color(0x000000);
        object.material.emissive.copy(target);
        object.material.emissiveIntensity = fault ? 0.9 : selected ? 0.62 : 0.5;
        object.material.color.multiplyScalar(1);
        object.material.opacity = dim;
        object.material.transparent = dim < 1;
      });
    }
  }

  function updateBalance(evaluation) {
    const m = evaluation.measurements;
    if (!m.valid) { balanceGroup.visible = false; return; }
    balanceGroup.position.set(m.balance_point_mm * MM, m.bounds_mm.y[0] * MM, 0);
    balanceGroup.visible = state.explode < 0.35;
  }

  function updateInterference(evaluation) {
    const issue = evaluation.errors.find(item => item.rule === 'clearance' && item.overlap);
    if (!issue) { interference.visible = false; return null; }
    const box = issue.overlap;
    interference.visible = true;
    interference.position.set(
      ((box.x[0] + box.x[1]) / 2) * MM,
      ((box.y[0] + box.y[1]) / 2) * MM,
      ((box.z[0] + box.z[1]) / 2) * MM
    );
    interference.scale.set(
      Math.max(0.002, (box.x[1] - box.x[0]) * MM),
      Math.max(0.002, (box.y[1] - box.y[0]) * MM),
      Math.max(0.002, (box.z[1] - box.z[0]) * MM)
    );
    return issue;
  }

  /** Deterministic picking: returns a slot id or null. */
  function pick(ndcX, ndcY) {
    pointer.set(ndcX, ndcY);
    raycaster.setFromCamera(pointer, camera);
    const targets = [];
    for (const record of slotNodes.values()) {
      if (record.meshes && record.phase === 'idle') targets.push(record.meshes);
    }
    const hits = raycaster.intersectObjects(targets, true);
    return hits.length ? hits[0].object.userData.slotId || null : null;
  }

  /**
   * World-space centre of a slot plus a viewing distance scaled to the part, so
   * focusing a 400 mm stock and a 66 mm flash hider both frame sensibly.
   */
  function slotFocus(slotId) {
    const record = slotNodes.get(slotId);
    if (!record) return null;
    const target = new Vector3();
    if (record.meshes) {
      const box = new Box3().setFromObject(record.meshes);
      if (!box.isEmpty()) {
        box.getCenter(target);
        const size = new Vector3();
        box.getSize(size);
        target.radius = Math.max(0.36, size.length() * 1.75);
        return target;
      }
    }
    record.node.getWorldPosition(target);
    target.radius = 0.42;
    return target;
  }

  /**
   * Bounds of the PARTS only.
   *
   * Box3.setFromObject(root) also swallows the annotation helpers — the slot
   * indicator rings, the balance marker and the unit-scaled interference cube —
   * so it reported a phantom volume roughly a metre across and the camera framed
   * empty space. Measuring the same mesh set the OBJ exporter writes keeps the
   * framing honest and makes the geometry round trip a like-for-like comparison.
   */
  function assemblyBounds() {
    root.updateMatrixWorld(true);
    const box = new Box3();
    for (const mesh of collectMeshes()) box.expandByObject(mesh);
    return box.isEmpty() ? null : box;
  }

  /**
   * Bounds the assembly WOULD occupy at a given explode amount. The separation
   * spring has not settled when the view mode changes, so framing against the
   * live bounds leaves the outermost modules off screen.
   */
  function boundsForExplode(amount) {
    const saved = state.explode;
    state.explode = amount;
    applyExplode();
    const box = assemblyBounds();
    state.explode = saved;
    applyExplode();
    return box;
  }

  function busy() {
    for (const record of slotNodes.values()) if (record.phase !== 'idle') return true;
    return false;
  }

  /** Collect every visible mesh for OBJ export. */
  function collectMeshes() {
    const list = [];
    root.updateWorldMatrix(true, true);
    root.traverse(object => {
      if (object.isMesh && object.visible && object !== interference && !interference.children.includes(object)) {
        if (object.userData.materialKey) list.push(object);
      }
    });
    return list;
  }

  function dispose() {
    for (const record of slotNodes.values()) {
      clearOutgoing(record);
      if (record.ghost) disposeGroup(record.ghost);
      if (record.meshes) disposeGroup(record.meshes);
    }
    for (const group of baseParts) disposeGroup(group);
    for (const item of disposables) item.dispose?.();
    disposables.clear();
    RING_GEOMETRY.dispose();
    stage.remove(root);
  }

  return {
    root, sync, reject, update, setFinish, setViewMode, setSelection, setHover,
    pick, slotFocus, assemblyBounds, boundsForExplode, busy, collectMeshes, dispose,
    get triangles() { return triangleCount; },
    get state() { return state; },
    slotNodes
  };
}
