import { V3 } from './vec3.mjs';

export const Q4 = {
  create: (x = 0, y = 0, z = 0, w = 1) => new Float64Array([x, y, z, w]),
  identity: out => { out[0] = out[1] = out[2] = 0; out[3] = 1; return out; },
  clone: q => new Float64Array(q),
  copy: (out, q) => { out.set(q); return out; },
  normalize: (out, q) => {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    out[0] = q[0] / l; out[1] = q[1] / l; out[2] = q[2] / l; out[3] = q[3] / l;
    return out;
  },
  multiply: (out, a, b) => {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = aw * bx + ax * bw + ay * bz - az * by;
    out[1] = aw * by - ax * bz + ay * bw + az * bx;
    out[2] = aw * bz + ax * by - ay * bx + az * bw;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  },
  fromEuler: (out, roll, pitch, yaw) => {
    const cr = Math.cos(roll * .5), sr = Math.sin(roll * .5);
    const cp = Math.cos(pitch * .5), sp = Math.sin(pitch * .5);
    const cy = Math.cos(yaw * .5), sy = Math.sin(yaw * .5);
    out[0] = sr * cp * cy - cr * sp * sy;
    out[1] = cr * sp * cy + sr * cp * sy;
    out[2] = cr * cp * sy - sr * sp * cy;
    out[3] = cr * cp * cy + sr * sp * sy;
    return Q4.normalize(out, out);
  },
  toEuler: (q, out = new Float64Array(3)) => {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const sinr = 2 * (w * x + y * z);
    const cosr = 1 - 2 * (x * x + y * y);
    out[0] = Math.atan2(sinr, cosr);
    const sinp = 2 * (w * y - z * x);
    out[1] = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
    const siny = 2 * (w * z + x * y);
    const cosy = 1 - 2 * (y * y + z * z);
    out[2] = Math.atan2(siny, cosy);
    return out;
  },
  rotateVec3: (out, q, v) => {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const vx = v[0], vy = v[1], vz = v[2];
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    out[0] = vx + qw * tx + (qy * tz - qz * ty);
    out[1] = vy + qw * ty + (qz * tx - qx * tz);
    out[2] = vz + qw * tz + (qx * ty - qy * tx);
    return out;
  },
  inverseRotateVec3: (out, q, v) => {
    const inv = new Float64Array([-q[0], -q[1], -q[2], q[3]]);
    return Q4.rotateVec3(out, inv, v);
  },
  integrateAngularVelocity: (out, q, omegaBody, dt) => {
    const half = .5 * dt;
    const dq = new Float64Array([omegaBody[0] * half, omegaBody[1] * half, omegaBody[2] * half, 0]);
    const prod = new Float64Array(4);
    Q4.multiply(prod, q, dq);
    out[0] = q[0] + prod[0]; out[1] = q[1] + prod[1]; out[2] = q[2] + prod[2]; out[3] = q[3] + prod[3];
    return Q4.normalize(out, out);
  },
  slerp: (out, a, b, t) => {
    let cos = a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
    const bb = new Float64Array(b);
    if (cos < 0) { cos = -cos; for (let i=0;i<4;i++) bb[i] = -bb[i]; }
    if (cos > .9995) { for (let i=0;i<4;i++) out[i] = a[i] + (bb[i]-a[i])*t; return Q4.normalize(out,out); }
    const theta = Math.acos(Math.min(1, cos)), s = Math.sin(theta);
    const wa = Math.sin((1-t)*theta)/s, wb = Math.sin(t*theta)/s;
    for (let i=0;i<4;i++) out[i] = a[i]*wa + bb[i]*wb;
    return out;
  },
  finite: q => Array.from(q).every(Number.isFinite)
};

export function bodyAxes(q) {
  const right = V3.create(), up = V3.create(), forward = V3.create();
  Q4.rotateVec3(right, q, [1,0,0]);
  Q4.rotateVec3(up, q, [0,1,0]);
  Q4.rotateVec3(forward, q, [0,0,1]);
  return { right, up, forward };
}
