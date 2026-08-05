/**
 * Rigid-body mass properties for an assembled weapon configuration.
 *
 * CLAIM LEVEL: educational.
 *   The arithmetic here is standard rigid-body mechanics — additive mass,
 *   mass-weighted centroid, uniform-density primitive inertia, the parallel-axis
 *   theorem, and the compound-pendulum period. It is exact for the model it is
 *   given.
 *
 *   The MODEL is a declared simplification: every part is treated as a single
 *   uniform-density primitive (box / rod / hollow tube / point mass) filling its
 *   authored bounding extents. Real components are not uniform, so the inertia
 *   figures describe this idealised assembly, not a manufactured weapon.
 *
 *   The masses themselves are authored design data for a fictional weapon.
 *
 * UNITS
 *   authored : millimetres (mm), grams (g)
 *   internal : metres (m), kilograms (kg)
 *   reported : mm, g, kg·m², milliseconds
 *
 * AXES (weapon-local, right-handed)
 *   +X muzzle · +Y up · +Z shooter's right · origin at the receiver datum
 *   I_yaw   = inertia about the vertical (Y) axis  -> horizontal traverse
 *   I_pitch = inertia about the lateral  (Z) axis  -> elevation swing
 */

import { GRAVITY_MS2 } from '../data/catalog.mjs';

const MM_PER_M = 1000;
const G_PER_KG = 1000;

/**
 * Inertia of one part about its own centre of mass, in kg·m².
 * Returns { x, y, z } — the diagonal terms for rotations about each axis.
 *
 * Closed forms (uniform density):
 *   box (a,b,c)            Ix = m(b²+c²)/12   Iy = m(a²+c²)/12   Iz = m(a²+b²)/12
 *   rod length L along X   Ix = 0             Iy = Iz = mL²/12
 *   tube ro,ri length L    Ix = m(ro²+ri²)/2  Iy = Iz = m(3(ro²+ri²)+L²)/12
 *   point                  0
 */
export function primitiveInertia(part) {
  const massKg = part.mass_g / G_PER_KG;
  const shape = part.inertia?.shape || 'box';
  const ex = part.extents;
  const a = (ex.x[1] - ex.x[0]) / MM_PER_M;
  const b = (ex.y[1] - ex.y[0]) / MM_PER_M;
  const c = (ex.z[1] - ex.z[0]) / MM_PER_M;

  if (shape === 'point') return { x: 0, y: 0, z: 0 };

  if (shape === 'rod') {
    const l2 = (a * a) / 12;
    return { x: 0, y: massKg * l2, z: massKg * l2 };
  }

  if (shape === 'tube') {
    const ro = (part.inertia.ro ?? 0) / MM_PER_M;
    const ri = (part.inertia.ri ?? 0) / MM_PER_M;
    const axial = (massKg * (ro * ro + ri * ri)) / 2;
    const transverse = (massKg * (3 * (ro * ro + ri * ri) + a * a)) / 12;
    return { x: axial, y: transverse, z: transverse };
  }

  // default: solid box
  return {
    x: (massKg * (b * b + c * c)) / 12,
    y: (massKg * (a * a + c * c)) / 12,
    z: (massKg * (a * a + b * b)) / 12
  };
}

/**
 * Place a part in weapon coordinates.
 * `anchor` is the slot anchor in mm ({x,y,z}); base parts use a zero anchor
 * because their extents are already authored in weapon coordinates.
 */
export function placePart(part, anchor = { x: 0, y: 0, z: 0 }) {
  const offset = part.offset || { x: 0, y: 0, z: 0 };
  const dx = anchor.x + (offset.x || 0);
  const dy = anchor.y + (offset.y || 0);
  const dz = anchor.z + (offset.z || 0);
  return {
    id: part.id,
    name: part.name,
    slot: part.slot || null,
    mass_kg: part.mass_g / G_PER_KG,
    mass_g: part.mass_g,
    power_a: part.power_a || 0,
    // centre of mass in weapon coordinates, mm
    com_mm: { x: dx + part.com.x, y: dy + part.com.y, z: dz + part.com.z },
    // bounding extents in weapon coordinates, mm
    box_mm: {
      x: [dx + part.extents.x[0], dx + part.extents.x[1]],
      y: [dy + part.extents.y[0], dy + part.extents.y[1]],
      z: [dz + part.extents.z[0], dz + part.extents.z[1]]
    },
    inertia_cm: primitiveInertia(part),
    origin_mm: { x: dx, y: dy, z: dz }
  };
}

/** Total mass in kg. Exactly additive. */
export function totalMass(placed) {
  return placed.reduce((sum, part) => sum + part.mass_kg, 0);
}

/** Mass-weighted centroid in mm. Returns null for a massless set. */
export function centreOfMass(placed) {
  const mass = totalMass(placed);
  if (mass <= 0) return null;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const part of placed) {
    x += part.mass_kg * part.com_mm.x;
    y += part.mass_kg * part.com_mm.y;
    z += part.mass_kg * part.com_mm.z;
  }
  return { x: x / mass, y: y / mass, z: z / mass };
}

/**
 * Moment of inertia of the assembly about an axis-aligned line through `pointMm`.
 * Parallel-axis theorem applied per part: I = Σ (I_i,cm + m_i · d_i²)
 * where d_i is the perpendicular distance from the part's centre of mass to the axis.
 */
export function inertiaAbout(placed, pointMm, axis) {
  let total = 0;
  for (const part of placed) {
    const dx = (part.com_mm.x - pointMm.x) / MM_PER_M;
    const dy = (part.com_mm.y - pointMm.y) / MM_PER_M;
    const dz = (part.com_mm.z - pointMm.z) / MM_PER_M;
    let perpendicular2;
    if (axis === 'x') perpendicular2 = dy * dy + dz * dz;
    else if (axis === 'y') perpendicular2 = dx * dx + dz * dz;
    else perpendicular2 = dx * dx + dy * dy;
    total += part.inertia_cm[axis] + part.mass_kg * perpendicular2;
  }
  return total;
}

/** Axis-aligned bounding box of the whole assembly, in mm. */
export function assemblyBounds(placed) {
  if (!placed.length) return null;
  const bounds = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity] };
  for (const part of placed) {
    for (const axis of ['x', 'y', 'z']) {
      bounds[axis][0] = Math.min(bounds[axis][0], part.box_mm[axis][0]);
      bounds[axis][1] = Math.max(bounds[axis][1], part.box_mm[axis][1]);
    }
  }
  return bounds;
}

/**
 * Compound-pendulum period for the assembly suspended at `pivotMm`, swinging in
 * the vertical plane (rotation about the lateral Z axis).
 *
 *   T = 2π · sqrt( I_pivot / (m · g · d) )
 *
 * with I_pivot the moment about the pivot and d the pivot-to-centre-of-mass
 * distance. Small-angle assumption. Returns seconds, or null when the centre of
 * mass sits on the pivot (no restoring torque).
 */
export function pendulumPeriod(placed, pivotMm) {
  const mass = totalMass(placed);
  const com = centreOfMass(placed);
  if (!com || mass <= 0) return null;
  const dx = (com.x - pivotMm.x) / MM_PER_M;
  const dy = (com.y - pivotMm.y) / MM_PER_M;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-9) return null;
  const inertia = inertiaAbout(placed, pivotMm, 'z');
  return 2 * Math.PI * Math.sqrt(inertia / (mass * GRAVITY_MS2 * distance));
}

/**
 * Full measurement set for a placed assembly.
 * Every field is derived here and nowhere else; the UI only formats it.
 */
export function measureAssembly(placed) {
  const mass = totalMass(placed);
  const com = centreOfMass(placed);
  const bounds = assemblyBounds(placed);
  if (!com || !bounds) {
    return { valid: false, mass_g: 0, parts: placed.length };
  }

  // The shoulder pocket is taken as the rearmost point of the assembly on the bore axis.
  const pivot = { x: bounds.x[0], y: 0, z: 0 };
  const muzzleX = bounds.x[1];

  const inertiaYaw = inertiaAbout(placed, pivot, 'y');
  const inertiaPitch = inertiaAbout(placed, pivot, 'z');
  const inertiaYawAboutCom = inertiaAbout(placed, com, 'y');
  const period = pendulumPeriod(placed, pivot);

  // Radius of gyration about the shoulder pivot: k = sqrt(I / m).
  // The distance at which the whole mass would produce the same traverse inertia.
  const gyradiusM = mass > 0 ? Math.sqrt(inertiaYaw / mass) : 0;

  return {
    valid: true,
    parts: placed.length,
    mass_g: mass * G_PER_KG,
    mass_kg: mass,
    com_mm: com,
    balance_point_mm: com.x,
    pivot_mm: pivot,
    bounds_mm: bounds,
    length_mm: bounds.x[1] - bounds.x[0],
    height_mm: bounds.y[1] - bounds.y[0],
    width_mm: bounds.z[1] - bounds.z[0],
    inertia_yaw_kgm2: inertiaYaw,
    inertia_pitch_kgm2: inertiaPitch,
    inertia_yaw_about_com_kgm2: inertiaYawAboutCom,
    swing_period_s: period,
    swing_period_ms: period === null ? null : period * 1000,
    gyradius_mm: gyradiusM * MM_PER_M,
    muzzle_mm: muzzleX,
    power_draw_a: placed.reduce((sum, part) => sum + (part.power_a || 0), 0)
  };
}
