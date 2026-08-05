/**
 * Procedural hard-surface geometry.
 *
 * Every part in the catalog is described as a list of mechanical FEATURES rather
 * than as a bespoke mesh. A feature is a machining operation with real-world
 * semantics — a chamfered block, a bored tube, a 1913 rail with recoil grooves,
 * an M-LOK slot row, a knurled band, a heat fin stack, a hex fastener.
 *
 * This keeps function, appearance and fastening separable (planning §7): a new
 * module is authored as data, and the same feature vocabulary renders it.
 *
 * All feature coordinates are in module-local MILLIMETRES. buildPart() returns a
 * geometry already scaled to metres so it drops straight into the scene.
 */

import {
  BufferGeometry, BufferAttribute, BoxGeometry, CylinderGeometry, SphereGeometry,
  RingGeometry, ExtrudeGeometry, Shape, Matrix4, Vector3, Euler
} from '../../vendor/three/three.module.min.js';

const MM = 0.001;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ *
 * Merge helper — the core build has no BufferGeometryUtils.
 * ------------------------------------------------------------------ */

function toNonIndexed(geometry) {
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

export function mergeGeometries(list) {
  const parts = list.map(toNonIndexed).filter(g => g.getAttribute('position'));
  if (!parts.length) return null;
  let total = 0;
  for (const geometry of parts) total += geometry.getAttribute('position').count;

  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let vertexOffset = 0;

  for (const geometry of parts) {
    const p = geometry.getAttribute('position');
    const n = geometry.getAttribute('normal');
    const t = geometry.getAttribute('uv');
    position.set(p.array.subarray(0, p.count * 3), vertexOffset * 3);
    if (n) normal.set(n.array.subarray(0, n.count * 3), vertexOffset * 3);
    if (t) uv.set(t.array.subarray(0, t.count * 2), vertexOffset * 2);
    vertexOffset += p.count;
  }

  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(position, 3));
  merged.setAttribute('normal', new BufferAttribute(normal, 3));
  merged.setAttribute('uv', new BufferAttribute(uv, 2));
  for (const geometry of parts) geometry.dispose();
  return merged;
}

function transform(geometry, { translate, rotate, scale } = {}) {
  const matrix = new Matrix4();
  if (rotate) matrix.makeRotationFromEuler(new Euler(rotate[0], rotate[1], rotate[2]));
  if (scale) matrix.scale(new Vector3(scale[0], scale[1], scale[2]));
  if (translate) matrix.setPosition(translate[0], translate[1], translate[2]);
  geometry.applyMatrix4(matrix);
  return geometry;
}

const mid = range => (range[0] + range[1]) / 2;
const span = range => Math.abs(range[1] - range[0]);

/* ------------------------------------------------------------------ *
 * Primitive machining operations
 * ------------------------------------------------------------------ */

/** Rounded rectangle in the shape plane, used as the extrusion profile. */
function roundedRect(width, height, radius) {
  const r = Math.max(0.01, Math.min(radius, width / 2 - 0.01, height / 2 - 0.01));
  const w = width / 2;
  const h = height / 2;
  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/**
 * Chamfered block. The bevel is what makes hard-surface silhouettes catch a
 * specular edge; a plain box reads as a placeholder.
 */
export function bevelBox(x, y, z, bevel = 2, tiltZ = 0) {
  const length = span(x);
  const height = span(y);
  const width = span(z);
  const b = Math.max(0.2, Math.min(bevel, length / 2.2, height / 2.2, width / 2.2));

  const shape = roundedRect(width, height, b * 1.2);
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.2, length - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b * 0.15,
    // a single bevel segment is the correct read for a machined chamfer, and it
    // halves the triangle budget versus a rounded fillet
    bevelSegments: 1,
    curveSegments: 3,
    steps: 1
  });
  // extrude runs along +Z of the shape plane; map it onto the bore axis (+X)
  geometry.translate(0, 0, -(length - b * 2) / 2);
  geometry.rotateY(Math.PI / 2);
  if (tiltZ) geometry.rotateZ(tiltZ * DEG);
  geometry.translate(mid(x), mid(y), mid(z));
  return geometry;
}

/** Bored cylinder. ri > 0 produces a real wall with annular end faces. */
export function tube(x, ro, ri = 0, options = {}) {
  const seg = options.seg || 24;
  const length = span(x);
  const pieces = [];

  const outer = new CylinderGeometry(ro, options.ro2 ?? ro, length, seg, 1, ri > 0);
  pieces.push(outer);

  if (ri > 0) {
    const inner = new CylinderGeometry(ri, options.ri2 ?? ri, length, seg, 1, true);
    inner.scale(-1, 1, 1); // flip winding so the bore faces inward
    pieces.push(inner);
    for (const side of [-1, 1]) {
      const cap = new RingGeometry(ri, ro, seg);
      cap.rotateX(side > 0 ? -Math.PI / 2 : Math.PI / 2);
      cap.translate(0, (side * length) / 2, 0);
      pieces.push(cap);
    }
  }

  const merged = mergeGeometries(pieces);
  const axis = options.axis || 'x';
  if (axis === 'x') merged.rotateZ(-Math.PI / 2);
  else if (axis === 'z') merged.rotateX(Math.PI / 2);

  // `x` is always the span ALONG the chosen axis. The two cross-axis offsets come
  // from y / z (or xOff when the axis is not X). Reading the span array as an
  // offset produces NaN vertices, so the coordinates are taken explicitly.
  const centre = mid(x);
  const offset = value => (Number.isFinite(value) ? value : 0);
  merged.translate(
    axis === 'x' ? centre : offset(options.xOff),
    axis === 'y' ? centre : offset(options.y),
    axis === 'z' ? centre : offset(options.z)
  );
  return merged;
}

function annulus(atX, ro, ri, seg, y = 0, z = 0) {
  const ring = new RingGeometry(ri, ro, seg);
  ring.rotateY(Math.PI / 2);
  ring.translate(atX, y, z);
  return ring;
}

/**
 * MIL-STD-1913 rail: a trapezoidal top with a 45 degree shoulder and transverse
 * recoil grooves on a 10.16 mm pitch. The grooves are what identify the part at
 * a glance, so they are modelled rather than textured.
 */
function railFeature(feature) {
  const pieces = [];
  const recesses = [];
  const y0 = feature.y;
  const halfWidth = feature.width ? feature.width / 2 : 10.6;
  const topHalf = halfWidth * 0.74;
  const height = feature.height || 8.2;
  const z = feature.z || 0;

  pieces.push(bevelBox([feature.x[0], feature.x[1]], [y0 - height, y0 - height * 0.42], [z - halfWidth, z + halfWidth], 0.9));
  pieces.push(bevelBox([feature.x[0], feature.x[1]], [y0 - height * 0.52, y0], [z - topHalf, z + topHalf], 1.1));

  // Recoil grooves must break the top surface to read as slots; a recess buried
  // inside the rail body is invisible from every angle.
  const pitch = 10.16;
  const grooveWidth = 5.35;
  const length = span(feature.x);
  const count = Math.max(1, Math.floor((length - 4) / pitch));
  const start = feature.x[0] + (length - (count - 1) * pitch) / 2;
  for (let i = 0; i < count; i += 1) {
    const cx = start + i * pitch;
    recesses.push(bevelBox(
      [cx - grooveWidth / 2, cx + grooveWidth / 2],
      [y0 - height * 0.62, y0 + 0.35],
      [z - topHalf - 0.45, z + topHalf + 0.45],
      0.45
    ));
  }
  return { body: pieces, recess: recesses };
}

/** M-LOK slot row — elongated recesses with the characteristic rounded ends. */
function mlokFeature(feature) {
  const recesses = [];
  const count = feature.count || 3;
  const slotLength = feature.slotLength || 32;
  const slotWidth = feature.slotWidth || 7;
  const length = span(feature.x);
  const pitch = count > 1 ? (length - slotLength) / (count - 1) : 0;
  for (let i = 0; i < count; i += 1) {
    const cx = feature.x[0] + slotLength / 2 + i * pitch;
    const x = [cx - slotLength / 2, cx + slotLength / 2];
    if (feature.y !== undefined) {
      recesses.push(bevelBox(x, [feature.y - 3, feature.y + 3], [-slotWidth / 2, slotWidth / 2], 2.4));
    } else {
      const z = feature.z;
      recesses.push(bevelBox(x, [-slotWidth / 2, slotWidth / 2], [z - 3, z + 3], 2.4));
      recesses.push(bevelBox(x, [-slotWidth / 2, slotWidth / 2], [-z - 3, -z + 3], 2.4));
    }
  }
  return { body: [], recess: recesses };
}

/** A row of machined slots on a named face. */
function slotRow(feature, thickness) {
  const recesses = [];
  const count = feature.count || 3;
  const width = feature.w || 4;
  const length = span(feature.x);
  const pitch = count > 1 ? (length - width) / (count - 1) : 0;
  const depth = feature.depth || 2;
  const spanRange = feature.span || [-6, 6];

  for (let i = 0; i < count; i += 1) {
    const cx = feature.x[0] + width / 2 + i * pitch;
    const x = [cx - width / 2, cx + width / 2];
    const face = feature.face || 'z±';
    if (face === 'y+' || face === 'y-') {
      const y = feature.at;
      const sign = face === 'y+' ? -1 : 1;
      recesses.push(bevelBox(x, [y + sign * depth, y - sign * depth * 0.1], spanRange, Math.min(1.2, width / 3)));
    } else {
      const z = Math.abs(feature.at);
      const faces = face === 'z±' ? [z, -z] : [face === 'z+' ? z : -z];
      for (const at of faces) {
        const sign = at > 0 ? -1 : 1;
        recesses.push(bevelBox(x, spanRange, [at + sign * depth, at - sign * depth * 0.1], Math.min(1.2, width / 3)));
      }
    }
  }
  return { body: [], recess: recesses, thickness };
}

/**
 * Heat-sink fins — proud material, not recesses.
 *   face 'y+' : `at` is the base height, `span` is the Z extent
 *   face 'z±' : `at` is the side plane, `span` is the Y extent, mirrored
 */
function finStack(feature) {
  const pieces = [];
  const count = feature.count || 6;
  const height = feature.h || 5;
  const thickness = feature.t || 1.2;
  const length = span(feature.x);
  const pitch = count > 1 ? (length - thickness * 2) / (count - 1) : 0;
  const spanRange = feature.span || [-10, 10];
  const face = feature.face || 'y+';

  for (let i = 0; i < count; i += 1) {
    const cx = feature.x[0] + thickness + i * pitch;
    const x = [cx - thickness, cx + thickness];
    if (face === 'y+' || face === 'y-') {
      const sign = face === 'y+' ? 1 : -1;
      pieces.push(bevelBox(x, [feature.at, feature.at + sign * height], spanRange, 0.5));
    } else {
      const at = Math.abs(feature.at);
      const planes = face === 'z±' ? [at, -at] : [face === 'z+' ? at : -at];
      for (const plane of planes) {
        const sign = plane > 0 ? 1 : -1;
        pieces.push(bevelBox(x, spanRange, [plane, plane + sign * height], 0.5));
      }
    }
  }
  return { body: pieces, recess: [] };
}

/** Radial gas ports around a bored tube. */
function portRow(feature) {
  const recesses = [];
  const count = feature.count || 4;
  const width = feature.w || 6;
  const ro = feature.ro;
  const length = span(feature.x);
  const pitch = count > 1 ? (length - width) / (count - 1) : 0;
  for (let i = 0; i < count; i += 1) {
    const cx = feature.x[0] + width / 2 + i * pitch;
    const x = [cx - width / 2, cx + width / 2];
    if (feature.axis === 'y') {
      const y = feature.up ? ro * 0.55 : -ro * 0.55;
      recesses.push(bevelBox(x, [y, y + (feature.up ? ro : -ro)], [-ro * 0.45, ro * 0.45], 1));
    } else {
      recesses.push(bevelBox(x, [-ro * 0.5, ro * 0.5], [ro * 0.45, ro * 1.05], 1));
      recesses.push(bevelBox(x, [-ro * 0.5, ro * 0.5], [-ro * 1.05, -ro * 0.45], 1));
    }
  }
  return { body: [], recess: recesses };
}

/** Circumferential knurl / grip bands. */
function knurlBands(feature) {
  const recesses = [];
  const count = feature.count || 5;
  const length = span(feature.x);
  const bandWidth = Math.max(0.7, (length / count) * 0.42);
  const pitch = count > 1 ? (length - bandWidth) / (count - 1) : 0;
  const axis = feature.axis || 'x';
  for (let i = 0; i < count; i += 1) {
    const c = feature.x[0] + bandWidth / 2 + i * pitch;
    recesses.push(tube([c - bandWidth / 2, c + bandWidth / 2], feature.ri, 0, {
      seg: feature.seg || 20, axis,
      y: feature.y ?? 0, z: feature.z ?? 0, xOff: feature.xOff ?? 0
    }));
  }
  return { body: [], recess: recesses };
}

/** Hex fastener with a driven recess. */
function boltFeature(feature) {
  const [x, y, z] = feature.at;
  const r = feature.r || 2.5;
  const head = new CylinderGeometry(r, r * 0.96, r * 0.72, 6);
  const socket = new CylinderGeometry(r * 0.5, r * 0.5, r * 0.5, 6);
  const axis = feature.axis || (Math.abs(z) > Math.abs(y) ? 'z' : 'y');
  const sign = axis === 'z' ? Math.sign(z) || 1 : Math.sign(y) || 1;
  if (axis === 'z') { head.rotateX(Math.PI / 2); socket.rotateX(Math.PI / 2); }
  head.translate(x, y, z);
  socket.translate(
    x,
    axis === 'y' ? y + sign * r * 0.25 : y,
    axis === 'z' ? z + sign * r * 0.25 : z
  );
  return { body: [head], recess: [socket] };
}

/** Adjustment turret / knob. */
function knobFeature(feature) {
  const [x, y, z] = feature.at;
  const r = feature.r || 6;
  const h = feature.h || 6;
  const axis = feature.axis || 'y';
  const body = new CylinderGeometry(r, r * 0.94, h, 18);
  const cap = new CylinderGeometry(r * 0.7, r * 0.86, h * 0.35, 18);
  const place = geometry => {
    if (axis === 'z') geometry.rotateX(Math.PI / 2);
    else if (axis === 'x') geometry.rotateZ(Math.PI / 2);
    return geometry;
  };
  place(body);
  place(cap);
  const push = (geometry, amount) => {
    geometry.translate(
      x + (axis === 'x' ? amount : 0),
      y + (axis === 'y' ? amount : 0),
      z + (axis === 'z' ? amount : 0)
    );
    return geometry;
  };
  const sign = axis === 'y' ? 1 : Math.sign(axis === 'z' ? z : x) || 1;
  push(body, (sign * h) / 2);
  push(cap, sign * (h * 0.9));
  const grooves = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const groove = new BoxGeometry(r * 0.24, h * 0.9, r * 0.24);
    place(groove);
    groove.translate(
      x + Math.cos(angle) * r * (axis === 'x' ? 0 : 1),
      y + (axis === 'y' ? (sign * h) / 2 : Math.sin(angle) * r),
      z + (axis === 'z' ? (sign * h) / 2 : (axis === 'y' ? Math.sin(angle) * r : Math.cos(angle) * r))
    );
    grooves.push(groove);
  }
  return { body: [body, cap], recess: grooves };
}

/** Bipod leg / any strut between two points. */
function legFeature(feature) {
  const from = new Vector3(...feature.from);
  const to = new Vector3(...feature.to);
  const direction = new Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new CylinderGeometry(feature.r * 0.8, feature.r, length, 12);
  const up = new Vector3(0, 1, 0);
  const axis = new Vector3().crossVectors(up, direction.clone().normalize());
  const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(direction.clone().normalize()))));
  if (axis.lengthSq() > 1e-8) {
    geometry.applyMatrix4(new Matrix4().makeRotationAxis(axis.normalize(), angle));
  }
  const centre = from.clone().add(to).multiplyScalar(0.5);
  geometry.translate(centre.x, centre.y, centre.z);
  const foot = new SphereGeometry(feature.r * 1.25, 10, 8);
  foot.translate(to.x, to.y, to.z);
  return { body: [geometry, foot], recess: [] };
}

/** Optical element: tinted disc plus a machined bezel. */
function glassFeature(feature) {
  const ro = feature.ro;
  const rz = feature.rz || ro;
  const at = feature.at;
  const y = feature.y || 0;
  const z = feature.z || 0;
  const lens = new CylinderGeometry(ro, ro, 0.8, 28);
  lens.rotateZ(Math.PI / 2);
  lens.scale(1, 1, rz / ro);
  lens.translate(at, y, z);
  const bezel = annulus(at - Math.sign(at || 1) * 0.6, ro * 1.14, ro * 0.98, 28, y, z);
  bezel.scale(1, 1, rz / ro);
  return { glass: [lens], body: [bezel] };
}

function ledFeature(feature) {
  const [x, y, z] = feature.at;
  const r = feature.r || 1.5;
  const lens = new SphereGeometry(r, 10, 8);
  lens.scale(0.5, 1, 1);
  lens.translate(x, y, z);
  return { emissive: [lens], color: feature.color };
}

function ratchetFeature(feature) {
  const recesses = [];
  const count = feature.count || 5;
  const length = span(feature.x);
  const pitch = count > 1 ? (length - 5) / (count - 1) : 0;
  for (let i = 0; i < count; i += 1) {
    const cx = feature.x[0] + 2.5 + i * pitch;
    recesses.push(bevelBox([cx - 2.5, cx + 2.5], [feature.y - 3.5, feature.y + 1.5], [-4, 4], 1));
  }
  return { body: [], recess: recesses };
}

/* ------------------------------------------------------------------ *
 * Feature dispatch
 * ------------------------------------------------------------------ */

const RECESS = 'recess';

function emit(buckets, key, geometries) {
  if (!geometries || !geometries.length) return;
  if (!buckets[key]) buckets[key] = [];
  for (const geometry of geometries) buckets[key].push(geometry);
}

/**
 * Build one catalog part.
 * @returns {{ buckets: Record<string, BufferGeometry>, leds: Array }}
 *   buckets are keyed by material name and already scaled to metres.
 */
export function buildPart(part) {
  const buckets = {};
  const leds = [];

  for (const feature of part.features || []) {
    const material = feature.mat || 'steel';
    switch (feature.k) {
      case 'box':
        emit(buckets, material, [bevelBox(feature.x, feature.y, feature.z, feature.bevel ?? 2, feature.tiltZ)]);
        break;
      case 'tube':
      case 'shell':
        emit(buckets, material, [tube(feature.x, feature.ro, feature.ri ?? 0, feature)]);
        break;
      case 'ring':
        emit(buckets, material, [annulus(feature.x, feature.ro, feature.ri, feature.seg || 20, feature.y || 0, feature.z || 0)]);
        break;
      case 'rail': {
        const result = railFeature(feature);
        emit(buckets, material, result.body);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'mlok': {
        const result = mlokFeature(feature);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'vents': {
        const result = slotRow(feature);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'fins': {
        const result = finStack(feature);
        emit(buckets, material, result.body);
        break;
      }
      case 'ports':
      case 'prongs': {
        const result = portRow(feature);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'knurl': {
        const result = knurlBands(feature);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'bolt': {
        const result = boltFeature(feature);
        emit(buckets, material, result.body);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'knob': {
        const result = knobFeature(feature);
        emit(buckets, material, result.body);
        emit(buckets, RECESS, result.recess);
        break;
      }
      case 'leg': {
        const result = legFeature(feature);
        emit(buckets, material, result.body);
        break;
      }
      case 'plate':
        emit(buckets, material, [bevelBox(
          feature.x, feature.y,
          [feature.z - Math.sign(feature.z || 1) * 0.9, feature.z],
          feature.bevel ?? 1.4
        )]);
        break;
      case 'glass': {
        const result = glassFeature(feature);
        emit(buckets, 'glass', result.glass);
        emit(buckets, 'alu', result.body);
        break;
      }
      case 'led': {
        const result = ledFeature(feature);
        emit(buckets, 'emissive', result.emissive);
        leds.push({ at: feature.at, color: feature.color, r: feature.r || 1.5 });
        break;
      }
      case 'ratchet': {
        const result = ratchetFeature(feature);
        emit(buckets, RECESS, result.recess);
        break;
      }
      default:
        break;
    }
  }

  const merged = {};
  for (const [material, list] of Object.entries(buckets)) {
    const geometry = mergeGeometries(list);
    if (!geometry) continue;
    geometry.scale(MM, MM, MM);
    geometry.computeBoundingSphere();
    merged[material] = geometry;
  }
  return { buckets: merged, leds };
}

/** Count triangles across a bucket set — used by the runtime diagnostics. */
export function countTriangles(buckets) {
  let total = 0;
  for (const geometry of Object.values(buckets)) {
    total += geometry.getAttribute('position').count / 3;
  }
  return total;
}

export { transform, MM };
