const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class SharedField2D {
  constructor({ width = 128, height = 128, channels = 4, bounds = [-1, -1, 1, 1], ArrayType = Float32Array } = {}) {
    this.width = width | 0;
    this.height = height | 0;
    this.channels = channels | 0;
    this.bounds = [...bounds];
    this.data = new ArrayType(this.width * this.height * this.channels);
    this.version = 0;
  }

  index(x, y, channel = 0) {
    return ((y * this.width + x) * this.channels) + channel;
  }

  clear(value = 0) {
    this.data.fill(value);
    this.version += 1;
  }

  write(x, y, values) {
    const px = clamp(x | 0, 0, this.width - 1);
    const py = clamp(y | 0, 0, this.height - 1);
    const base = this.index(px, py);
    for (let c = 0; c < this.channels; c += 1) this.data[base + c] = Number(values[c] ?? 0);
  }

  fill(fn) {
    const [x0, y0, x1, y1] = this.bounds;
    const out = new Array(this.channels).fill(0);
    for (let y = 0; y < this.height; y += 1) {
      const wy = lerp(y0, y1, y / Math.max(1, this.height - 1));
      for (let x = 0; x < this.width; x += 1) {
        const wx = lerp(x0, x1, x / Math.max(1, this.width - 1));
        const values = fn(wx, wy, out) || out;
        this.write(x, y, values);
      }
    }
    this.version += 1;
    return this;
  }

  sample(wx, wy, out = new Float32Array(this.channels)) {
    const [x0, y0, x1, y1] = this.bounds;
    const fx = clamp((wx - x0) / Math.max(1e-9, x1 - x0) * (this.width - 1), 0, this.width - 1.001);
    const fy = clamp((wy - y0) / Math.max(1e-9, y1 - y0) * (this.height - 1), 0, this.height - 1.001);
    const ix = fx | 0;
    const iy = fy | 0;
    const tx = fx - ix;
    const ty = fy - iy;
    for (let c = 0; c < this.channels; c += 1) {
      const a = this.data[this.index(ix, iy, c)];
      const b = this.data[this.index(ix + 1, iy, c)];
      const d = this.data[this.index(ix, iy + 1, c)];
      const e = this.data[this.index(ix + 1, iy + 1, c)];
      out[c] = lerp(lerp(a, b, tx), lerp(d, e, tx), ty);
    }
    return out;
  }

  addRadial({ x, y, radius, values, falloff = 2 }) {
    const [x0, y0, x1, y1] = this.bounds;
    for (let py = 0; py < this.height; py += 1) {
      const wy = lerp(y0, y1, py / Math.max(1, this.height - 1));
      for (let px = 0; px < this.width; px += 1) {
        const wx = lerp(x0, x1, px / Math.max(1, this.width - 1));
        const d = Math.hypot(wx - x, wy - y) / Math.max(radius, 1e-6);
        if (d >= 1) continue;
        const weight = Math.pow(1 - d, falloff);
        const base = this.index(px, py);
        for (let c = 0; c < this.channels; c += 1) this.data[base + c] += Number(values[c] ?? 0) * weight;
      }
    }
    this.version += 1;
  }
}
