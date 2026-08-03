import { V3 } from '../math/vec3.mjs';
import { fbm3, seedNoise } from './noise.mjs';

const DEG = Math.PI / 180;

export class WindField {
  constructor(parameters) {
    this.parameters = parameters;
    this.base = V3.create();
    this.tmp = V3.create();
    this.seed = 0x41A7D;
    seedNoise(this.seed);
  }

  setSeed(seed) { this.seed = seed >>> 0; seedNoise(this.seed); }

  baseVector(out = V3.create()) {
    const speed = this.parameters.get('wind.speed');
    const yaw = this.parameters.get('wind.yaw') * DEG;
    const pitch = this.parameters.get('wind.pitch') * DEG;
    const cp = Math.cos(pitch);
    out[0] = speed * cp * Math.cos(yaw);
    out[1] = speed * Math.sin(pitch);
    out[2] = speed * cp * Math.sin(yaw);
    return out;
  }

  sample(position, time, out = {}) {
    const base = this.baseVector(this.base);
    const mode = this.parameters.get('wind.flowMode');
    const intensity = mode === 'turbulent' ? this.parameters.get('wind.turbulence') : 0;
    let tx = 0, ty = 0, tz = 0;
    if (intensity > 0.0001) {
      const scale = .38;
      const advect = time * (.16 + this.parameters.get('wind.speed') * .014);
      // Three decorrelated curl-like channels. Spatially coherent and deterministic.
      tx = fbm3(position[0] * scale + advect, position[1] * scale + 11.7, position[2] * scale - 4.3, 4);
      ty = fbm3(position[0] * scale - 7.1, position[1] * scale + advect * .83, position[2] * scale + 9.2, 4);
      tz = fbm3(position[0] * scale + 5.8, position[1] * scale - 13.4, position[2] * scale + advect * 1.17, 4);
      const gust = Math.max(1.2, this.parameters.get('wind.speed') * .34) * intensity;
      tx *= gust; ty *= gust * .72; tz *= gust;
      // Boundary-layer attenuation near floor and tunnel walls.
      const wall = Math.min(1, Math.max(.18, (position[1] + .15) / 1.25));
      tx *= wall; ty *= wall; tz *= wall;
    }
    const velocity = out.velocity || V3.create();
    velocity[0] = base[0] + tx; velocity[1] = base[1] + ty; velocity[2] = base[2] + tz;
    const speed = V3.length(velocity);
    const rho = this.parameters.get('environment.airDensity');
    const dynamicPressure = .5 * rho * speed * speed;
    out.velocity = velocity;
    out.speed = speed;
    out.dynamicPressure = dynamicPressure;
    out.pressure = 101325 - dynamicPressure;
    out.turbulence = Math.hypot(tx, ty, tz);
    out.vorticity = intensity * (Math.abs(tx - tz) + Math.abs(ty)) * .18;
    out.mode = mode;
    return out;
  }

  buildVectorGrid({ min = [-7, .1, -2.8], max = [7, 4.7, 2.8], divisions = [12, 6, 6], time = 0 } = {}) {
    const grid = [];
    for (let ix = 0; ix < divisions[0]; ix++) for (let iy = 0; iy < divisions[1]; iy++) for (let iz = 0; iz < divisions[2]; iz++) {
      const p = V3.create(
        min[0] + (max[0] - min[0]) * ix / Math.max(1, divisions[0] - 1),
        min[1] + (max[1] - min[1]) * iy / Math.max(1, divisions[1] - 1),
        min[2] + (max[2] - min[2]) * iz / Math.max(1, divisions[2] - 1)
      );
      const s = this.sample(p, time, {});
      grid.push({ position: p, velocity: V3.clone(s.velocity), pressure: s.pressure, speed: s.speed });
    }
    return grid;
  }
}
