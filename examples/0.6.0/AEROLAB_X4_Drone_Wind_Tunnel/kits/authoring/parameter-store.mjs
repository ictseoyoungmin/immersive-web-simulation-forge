const DEFAULTS = {
  'drone.mass': 1.45,
  'drone.bladeRadius': 0.127,
  'drone.maxRPM': 12500,
  'drone.dragCoefficient': 0.92,
  'drone.frontalArea': 0.038,
  'drone.liftCoefficient': 0.28,
  'drone.armLength': 0.46,
  'drone.motorResponse': 0.055,
  'drone.manualThrottle': 0.52,
  'wind.speed': 8,
  'wind.yaw': 0,
  'wind.pitch': 0,
  'wind.turbulence': 0.36,
  'wind.flowMode': 'turbulent',
  'environment.airDensity': 1.225,
  'environment.gravity': 9.80665,
  'pid.roll': { p: 5.8, i: 0.35, d: 1.45 },
  'pid.pitch': { p: 5.8, i: 0.35, d: 1.45 },
  'pid.yaw': { p: 2.2, i: 0.18, d: 0.62 },
  'simulation.flightMode': 'hover',
  'simulation.paused': false,
  'visual.quality': 'high',
  'visual.flowVisible': true,
  'visual.vectorGrid': false,
  'visual.forceVectors': true,
  'visual.postFX': true
};

const LIMITS = {
  'drone.mass': [0.45, 5],
  'drone.bladeRadius': [.07, .22],
  'drone.maxRPM': [4000, 22000],
  'drone.dragCoefficient': [.15, 1.8],
  'drone.frontalArea': [.015, .18],
  'drone.liftCoefficient': [0, 1.2],
  'drone.manualThrottle': [0, 1],
  'wind.speed': [0, 30],
  'wind.yaw': [-180, 180],
  'wind.pitch': [-30, 30],
  'wind.turbulence': [0, 1],
  'environment.airDensity': [.8, 1.4]
};

const deepClone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export class ParameterStore extends EventTarget {
  constructor(initial = {}) {
    super();
    this.values = new Map(Object.entries({ ...deepClone(DEFAULTS), ...deepClone(initial) }));
  }
  get(path) {
    const value = this.values.get(path);
    return value && typeof value === 'object' ? deepClone(value) : value;
  }
  set(path, value, meta = {}) {
    if (!this.values.has(path)) throw new Error(`Unknown parameter: ${path}`);
    const previous = this.get(path);
    let next = value;
    if (LIMITS[path] && typeof value === 'number') {
      const [min, max] = LIMITS[path];
      next = Math.min(max, Math.max(min, value));
    }
    if (next && typeof next === 'object') next = deepClone(next);
    if (JSON.stringify(previous) === JSON.stringify(next)) return false;
    this.values.set(path, next);
    this.dispatchEvent(new CustomEvent('change', { detail: { path, value: this.get(path), previous, meta } }));
    return true;
  }
  patch(entries, meta = {}) {
    const changed = [];
    for (const [path, value] of Object.entries(entries)) if (this.set(path, value, { ...meta, batch: true })) changed.push(path);
    if (changed.length) this.dispatchEvent(new CustomEvent('batchchange', { detail: { paths: changed, meta } }));
    return changed;
  }
  snapshot() { return Object.fromEntries([...this.values].map(([key, value]) => [key, deepClone(value)])); }
  restore(snapshot, meta = {}) {
    for (const [path, value] of Object.entries(snapshot)) if (this.values.has(path)) this.set(path, value, { ...meta, restore: true });
  }
  reset(meta = {}) { this.restore(DEFAULTS, { ...meta, reset: true }); }
  schema() { return { defaults: deepClone(DEFAULTS), limits: deepClone(LIMITS) }; }
}

export const PARAMETER_DEFAULTS = deepClone(DEFAULTS);
export const PARAMETER_LIMITS = deepClone(LIMITS);
