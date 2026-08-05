/**
 * Wavefront OBJ export of the assembled weapon, plus a minimal reader used to
 * prove the round trip.
 *
 * The export is geometry only and therefore LOSSY with respect to the document:
 * it carries no parameters, module identity is preserved only as group names,
 * and materials are named but not written as an .mtl. That is stated in the file
 * header and in the UI rather than left for the user to discover.
 *
 * Units: millimetres, matching the authored catalog. OBJ carries no unit tag, so
 * the header states it explicitly.
 */

import { Vector3 } from '../../vendor/three/three.module.min.js';

const MM_PER_M = 1000;

/**
 * @param {Array<Mesh>} meshes  world-transformed meshes with userData.partId
 * @param {object} meta         document/evaluation summary written into the header
 */
export function exportOBJ(meshes, meta = {}) {
  const lines = [];
  lines.push('# ARMORY BENCH — assembled geometry export');
  lines.push('# UNITS: millimetres. +X muzzle, +Y up, +Z shooter right. Origin = receiver datum.');
  lines.push('# LOSSY: geometry only — no parameters, no constraints, no .mtl. Not re-importable as a configuration.');
  if (meta.name) lines.push(`# configuration: ${meta.name}`);
  if (meta.finish) lines.push(`# finish: ${meta.finish}`);
  if (meta.mass_g !== undefined) lines.push(`# total mass: ${meta.mass_g.toFixed(1)} g`);
  if (meta.length_mm !== undefined) lines.push(`# overall length: ${meta.length_mm.toFixed(1)} mm`);
  lines.push(`# generated: ${new Date().toISOString()}`);

  const vertices = [];
  const groups = [];
  const index = new Map();
  const vector = new Vector3();

  const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;

  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    if (!position) continue;
    mesh.updateWorldMatrix(true, false);
    const faces = [];
    const local = [];

    for (let i = 0; i < position.count; i += 1) {
      vector.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).multiplyScalar(MM_PER_M);
      const id = key(vector.x, vector.y, vector.z);
      let vertexIndex = index.get(id);
      if (vertexIndex === undefined) {
        vertices.push([vector.x, vector.y, vector.z]);
        vertexIndex = vertices.length;   // OBJ indices are 1-based
        index.set(id, vertexIndex);
      }
      local.push(vertexIndex);
    }

    const indices = mesh.geometry.index;
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        faces.push([local[indices.getX(i)], local[indices.getX(i + 1)], local[indices.getX(i + 2)]]);
      }
    } else {
      for (let i = 0; i < local.length; i += 3) faces.push([local[i], local[i + 1], local[i + 2]]);
    }

    groups.push({
      name: `${mesh.userData.partId || 'part'}_${mesh.userData.materialKey || 'mat'}`,
      material: mesh.userData.materialKey || 'steel',
      faces
    });
  }

  for (const [x, y, z] of vertices) {
    lines.push(`v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  }

  let faceCount = 0;
  for (const group of groups) {
    lines.push(`g ${group.name}`);
    lines.push(`usemtl ${group.material}`);
    for (const [a, b, c] of group.faces) {
      lines.push(`f ${a} ${b} ${c}`);
      faceCount += 1;
    }
  }

  return {
    text: `${lines.join('\n')}\n`,
    vertexCount: vertices.length,
    faceCount,
    groupCount: groups.length
  };
}

/** Minimal independent reader — deliberately does not share code with the writer. */
export function readOBJ(text) {
  const vertices = [];
  let faces = 0;
  let groups = 0;
  const bounds = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity] };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('v ')) {
      const parts = line.slice(2).trim().split(/\s+/).map(Number);
      if (parts.length < 3 || parts.some(value => !Number.isFinite(value))) {
        throw new Error(`OBJ에 유한하지 않은 정점 좌표가 있다: ${line}`);
      }
      vertices.push(parts);
      bounds.x[0] = Math.min(bounds.x[0], parts[0]); bounds.x[1] = Math.max(bounds.x[1], parts[0]);
      bounds.y[0] = Math.min(bounds.y[0], parts[1]); bounds.y[1] = Math.max(bounds.y[1], parts[1]);
      bounds.z[0] = Math.min(bounds.z[0], parts[2]); bounds.z[1] = Math.max(bounds.z[1], parts[2]);
    } else if (line.startsWith('f ')) {
      const refs = line.slice(2).trim().split(/\s+/);
      if (refs.length !== 3) throw new Error(`삼각형이 아닌 면이 있다: ${line}`);
      for (const ref of refs) {
        const idx = Number.parseInt(ref.split('/')[0], 10);
        if (!Number.isInteger(idx) || idx < 1 || idx > vertices.length) {
          throw new Error(`면 인덱스가 범위를 벗어난다: ${line}`);
        }
      }
      faces += 1;
    } else if (line.startsWith('g ')) {
      groups += 1;
    }
  }

  return { vertexCount: vertices.length, faceCount: faces, groupCount: groups, bounds_mm: bounds };
}
