export const V3 = {
  create: (x = 0, y = 0, z = 0) => new Float64Array([x, y, z]),
  clone: a => new Float64Array(a),
  set: (out, x, y, z) => { out[0] = x; out[1] = y; out[2] = z; return out; },
  copy: (out, a) => { out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; return out; },
  add: (out, a, b) => { out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; out[2] = a[2] + b[2]; return out; },
  sub: (out, a, b) => { out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2]; return out; },
  scale: (out, a, s) => { out[0] = a[0] * s; out[1] = a[1] * s; out[2] = a[2] * s; return out; },
  madd: (out, a, b, s) => { out[0] = a[0] + b[0] * s; out[1] = a[1] + b[1] * s; out[2] = a[2] + b[2] * s; return out; },
  mul: (out, a, b) => { out[0] = a[0] * b[0]; out[1] = a[1] * b[1]; out[2] = a[2] * b[2]; return out; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (out, a, b) => {
    const ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  },
  lengthSq: a => a[0] ** 2 + a[1] ** 2 + a[2] ** 2,
  length: a => Math.hypot(a[0], a[1], a[2]),
  normalize: (out, a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[0] = a[0] / l; out[1] = a[1] / l; out[2] = a[2] / l;
    return out;
  },
  clampLength: (out, a, max) => {
    const l = Math.hypot(a[0], a[1], a[2]);
    if (l > max && l > 0) return V3.scale(out, a, max / l);
    return V3.copy(out, a);
  },
  lerp: (out, a, b, t) => { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; },
  finite: a => Number.isFinite(a[0]) && Number.isFinite(a[1]) && Number.isFinite(a[2])
};
