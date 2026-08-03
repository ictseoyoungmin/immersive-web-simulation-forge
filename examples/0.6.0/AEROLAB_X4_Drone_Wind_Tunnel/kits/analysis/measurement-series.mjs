export class RingSeries {
  constructor(capacity = 720) {
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
    this.values = new Float64Array(capacity);
    this.head = 0; this.length = 0;
  }
  push(time, value) {
    this.times[this.head] = time; this.values[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    this.length = Math.min(this.capacity, this.length + 1);
  }
  clear() { this.head = 0; this.length = 0; }
  toArray() {
    const out = [];
    const start = (this.head - this.length + this.capacity) % this.capacity;
    for (let i = 0; i < this.length; i++) {
      const index = (start + i) % this.capacity;
      out.push({ time: this.times[index], value: this.values[index] });
    }
    return out;
  }
  latest(fallback = 0) { return this.length ? this.values[(this.head - 1 + this.capacity) % this.capacity] : fallback; }
  range() {
    if (!this.length) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const { value } of this.toArray()) { min = Math.min(min, value); max = Math.max(max, value); }
    return { min, max };
  }
}

export class MeasurementSeries {
  constructor({ capacity = 900 } = {}) {
    this.series = new Map(); this.capacity = capacity;
  }
  ensure(name) { if (!this.series.has(name)) this.series.set(name, new RingSeries(this.capacity)); return this.series.get(name); }
  push(name, time, value) { if (Number.isFinite(value)) this.ensure(name).push(time, value); }
  sample(time, telemetry) {
    this.push('roll', time, telemetry.rollDeg);
    this.push('pitch', time, telemetry.pitchDeg);
    this.push('yaw', time, telemetry.yawDeg);
    this.push('power', time, telemetry.powerWatts);
    this.push('wind', time, telemetry.windSpeed);
    telemetry.rotorThrusts.forEach((value, i) => this.push(`rotor${i}`, time, value));
    this.push('altitude', time, telemetry.position[1]);
    this.push('speed', time, telemetry.speed);
  }
  get(name) { return this.ensure(name); }
  clear() { for (const series of this.series.values()) series.clear(); }
  snapshot() { return Object.fromEntries([...this.series].map(([name, series]) => [name, series.toArray()])); }
}
