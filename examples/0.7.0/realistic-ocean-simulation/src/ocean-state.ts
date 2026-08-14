export type QualityPreset = 'efficient' | 'balanced' | 'presentation';
export type PresetName = 'calm-dawn' | 'trade-wind' | 'golden-swell' | 'storm-front';

export interface Vec2State {
  x: number;
  z: number;
}

export interface Vec3State {
  x: number;
  y: number;
  z: number;
}

export interface WaterOptics {
  absorption: Vec3State;
  scatter: Vec3State;
  clarityM: number;
  roughness: number;
}

export interface GustState {
  active: boolean;
  ageS: number;
  drive: number;
  trace: number;
  serial: number;
  origin: Vec2State;
}

export interface OceanState {
  schemaVersion: 'OceanState/v1';
  timeS: number;
  seed: number;
  preset: PresetName | 'custom';
  revision: number;
  windSpeedMps: number;
  windDirection: Vec2State;
  swellAmplitudeM: number;
  swellDirection: Vec2State;
  swellPeriodS: number;
  currentMps: Vec2State;
  water: WaterOptics;
  sunDirection: Vec3State;
  sunElevationRad: number;
  cloudAmount: number;
  stormAmount: number;
  quality: QualityPreset;
  gust: GustState;
}

export interface WaveSample {
  heightM: number;
  slopeX: number;
  slopeZ: number;
  crest: number;
}

type Transition = {
  from: OceanState;
  to: OceanState;
  elapsedS: number;
  durationS: number;
};

const TAU = Math.PI * 2;
const GRAVITY_MPS2 = 9.81;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

export function directionFromBearing(degrees: number): Vec2State {
  const radians = (finite(degrees, 0) * Math.PI) / 180;
  return normalizeDirection({ x: Math.sin(radians), z: -Math.cos(radians) });
}

export function bearingFromDirection(direction: Vec2State): number {
  const normal = normalizeDirection(direction);
  return (Math.atan2(normal.x, -normal.z) * 180 / Math.PI + 360) % 360;
}

export function normalizeDirection(direction: Vec2State, fallback: Vec2State = { x: 0, z: -1 }): Vec2State {
  const x = finite(direction?.x, fallback.x);
  const z = finite(direction?.z, fallback.z);
  const magnitude = Math.hypot(x, z);
  if (magnitude < 1e-12) return { ...fallback };
  if (Math.abs(magnitude - 1) < 1e-12) return { x, z };
  return { x: x / magnitude, z: z / magnitude };
}

function normalizeDirection3(direction: Vec3State): Vec3State {
  const x = finite(direction?.x, 0.35);
  const y = finite(direction?.y, 0.58);
  const z = finite(direction?.z, -0.73);
  const magnitude = Math.hypot(x, y, z);
  if (magnitude < 1e-12) return { x: 0.35, y: 0.58, z: -0.73 };
  if (Math.abs(magnitude - 1) < 1e-12) return { x, y, z };
  return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}

export const PRESETS: Record<PresetName, Readonly<OceanState>> = {
  'calm-dawn': {
    schemaVersion: 'OceanState/v1',
    timeS: 0,
    seed: 7319,
    preset: 'calm-dawn',
    revision: 0,
    windSpeedMps: 3.2,
    windDirection: directionFromBearing(255),
    swellAmplitudeM: 0.48,
    swellDirection: directionFromBearing(316),
    swellPeriodS: 12.8,
    currentMps: { x: 0.14, z: -0.08 },
    water: {
      absorption: { x: 0.22, y: 0.075, z: 0.038 },
      scatter: { x: 0.018, y: 0.092, z: 0.112 },
      clarityM: 24,
      roughness: 0.18,
    },
    sunDirection: normalizeDirection3({ x: -0.78, y: 0.17, z: -0.6 }),
    sunElevationRad: 0.18,
    cloudAmount: 0.18,
    stormAmount: 0.02,
    quality: 'balanced',
    gust: { active: false, ageS: 0, drive: 0, trace: 0, serial: 0, origin: { x: 90, z: -360 } },
  },
  'trade-wind': {
    schemaVersion: 'OceanState/v1',
    timeS: 0,
    seed: 7319,
    preset: 'trade-wind',
    revision: 0,
    windSpeedMps: 15.2,
    windDirection: directionFromBearing(242),
    swellAmplitudeM: 1.08,
    swellDirection: directionFromBearing(314),
    swellPeriodS: 9.6,
    currentMps: { x: 0.56, z: -0.22 },
    water: {
      absorption: { x: 0.25, y: 0.086, z: 0.044 },
      scatter: { x: 0.018, y: 0.102, z: 0.125 },
      clarityM: 20,
      roughness: 0.34,
    },
    sunDirection: normalizeDirection3({ x: -0.58, y: 0.43, z: -0.69 }),
    sunElevationRad: 0.45,
    cloudAmount: 0.36,
    stormAmount: 0.1,
    quality: 'balanced',
    gust: { active: false, ageS: 0, drive: 0, trace: 0, serial: 0, origin: { x: 90, z: -360 } },
  },
  'golden-swell': {
    schemaVersion: 'OceanState/v1',
    timeS: 0,
    seed: 7319,
    preset: 'golden-swell',
    revision: 0,
    windSpeedMps: 11.5,
    windDirection: directionFromBearing(292),
    swellAmplitudeM: 1.55,
    swellDirection: directionFromBearing(327),
    swellPeriodS: 13.4,
    currentMps: { x: 0.39, z: -0.16 },
    water: {
      absorption: { x: 0.26, y: 0.092, z: 0.046 },
      scatter: { x: 0.014, y: 0.087, z: 0.105 },
      clarityM: 21,
      roughness: 0.27,
    },
    sunDirection: normalizeDirection3({ x: -0.74, y: 0.31, z: -0.59 }),
    sunElevationRad: 0.31,
    cloudAmount: 0.34,
    stormAmount: 0.08,
    quality: 'balanced',
    gust: { active: false, ageS: 0, drive: 0, trace: 0, serial: 0, origin: { x: 105, z: -330 } },
  },
  'storm-front': {
    schemaVersion: 'OceanState/v1',
    timeS: 0,
    seed: 7319,
    preset: 'storm-front',
    revision: 0,
    windSpeedMps: 21.0,
    windDirection: directionFromBearing(278),
    swellAmplitudeM: 2.35,
    swellDirection: directionFromBearing(336),
    swellPeriodS: 10.7,
    currentMps: { x: 0.82, z: -0.34 },
    water: {
      absorption: { x: 0.34, y: 0.13, z: 0.066 },
      scatter: { x: 0.012, y: 0.064, z: 0.082 },
      clarityM: 13,
      roughness: 0.53,
    },
    sunDirection: normalizeDirection3({ x: -0.76, y: 0.2, z: -0.62 }),
    sunElevationRad: 0.22,
    cloudAmount: 0.84,
    stormAmount: 0.76,
    quality: 'balanced',
    gust: { active: false, ageS: 0, drive: 0, trace: 0, serial: 0, origin: { x: 110, z: -310 } },
  },
};

export function cloneState(state: OceanState): OceanState {
  return JSON.parse(JSON.stringify(state)) as OceanState;
}

export function createDefaultState(): OceanState {
  return cloneState(PRESETS['golden-swell']);
}

export function sanitizeState(candidate: OceanState, fallback: OceanState = createDefaultState()): OceanState {
  const safe = cloneState(candidate);
  safe.schemaVersion = 'OceanState/v1';
  safe.timeS = Math.max(0, finite(safe.timeS, fallback.timeS));
  safe.seed = Math.trunc(clamp(finite(safe.seed, fallback.seed), 1, 0x7fffffff));
  safe.revision = Math.max(0, Math.trunc(finite(safe.revision, fallback.revision)));
  safe.preset = ['calm-dawn', 'trade-wind', 'golden-swell', 'storm-front', 'custom'].includes(safe.preset)
    ? safe.preset
    : fallback.preset;
  safe.windSpeedMps = clamp(finite(safe.windSpeedMps, fallback.windSpeedMps), 0, 28);
  safe.windDirection = normalizeDirection(safe.windDirection, fallback.windDirection);
  safe.swellAmplitudeM = clamp(finite(safe.swellAmplitudeM, fallback.swellAmplitudeM), 0.05, 3.5);
  safe.swellDirection = normalizeDirection(safe.swellDirection, fallback.swellDirection);
  safe.swellPeriodS = clamp(finite(safe.swellPeriodS, fallback.swellPeriodS), 4, 22);
  safe.currentMps.x = clamp(finite(safe.currentMps?.x, fallback.currentMps.x), -1.5, 1.5);
  safe.currentMps.z = clamp(finite(safe.currentMps?.z, fallback.currentMps.z), -1.5, 1.5);
  safe.water.absorption.x = clamp(finite(safe.water?.absorption?.x, fallback.water.absorption.x), 0.001, 2);
  safe.water.absorption.y = clamp(finite(safe.water?.absorption?.y, fallback.water.absorption.y), 0.001, 2);
  safe.water.absorption.z = clamp(finite(safe.water?.absorption?.z, fallback.water.absorption.z), 0.001, 2);
  safe.water.scatter.x = clamp(finite(safe.water?.scatter?.x, fallback.water.scatter.x), 0, 1);
  safe.water.scatter.y = clamp(finite(safe.water?.scatter?.y, fallback.water.scatter.y), 0, 1);
  safe.water.scatter.z = clamp(finite(safe.water?.scatter?.z, fallback.water.scatter.z), 0, 1);
  safe.water.clarityM = clamp(finite(safe.water?.clarityM, fallback.water.clarityM), 1, 80);
  safe.water.roughness = clamp(finite(safe.water?.roughness, fallback.water.roughness), 0.03, 0.9);
  safe.sunDirection = normalizeDirection3(safe.sunDirection);
  safe.sunElevationRad = clamp(finite(safe.sunElevationRad, fallback.sunElevationRad), 0.04, 1.35);
  safe.cloudAmount = clamp(finite(safe.cloudAmount, fallback.cloudAmount), 0, 1);
  safe.stormAmount = clamp(finite(safe.stormAmount, fallback.stormAmount), 0, 1);
  safe.quality = ['efficient', 'balanced', 'presentation'].includes(safe.quality) ? safe.quality : fallback.quality;
  safe.gust.active = Boolean(safe.gust?.active);
  safe.gust.ageS = Math.max(0, finite(safe.gust?.ageS, 0));
  safe.gust.drive = clamp(finite(safe.gust?.drive, 0), 0, 1.35);
  safe.gust.trace = clamp(finite(safe.gust?.trace, 0), 0, 1);
  safe.gust.serial = Math.max(0, Math.trunc(finite(safe.gust?.serial, 0)));
  safe.gust.origin.x = clamp(finite(safe.gust?.origin?.x, 105), -600, 600);
  safe.gust.origin.z = clamp(finite(safe.gust?.origin?.z, -330), -700, 200);
  return safe;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function interpolateScalar(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function interpolateState(from: OceanState, to: OceanState, amount: number, currentTime: number): OceanState {
  const t = smoothstep(0, 1, amount);
  const result = cloneState(from);
  const scalarKeys: Array<keyof Pick<OceanState, 'windSpeedMps' | 'swellAmplitudeM' | 'swellPeriodS' | 'sunElevationRad' | 'cloudAmount' | 'stormAmount'>> = [
    'windSpeedMps', 'swellAmplitudeM', 'swellPeriodS', 'sunElevationRad', 'cloudAmount', 'stormAmount',
  ];
  for (const key of scalarKeys) result[key] = interpolateScalar(from[key], to[key], t);
  result.windDirection = normalizeDirection({
    x: interpolateScalar(from.windDirection.x, to.windDirection.x, t),
    z: interpolateScalar(from.windDirection.z, to.windDirection.z, t),
  });
  result.swellDirection = normalizeDirection({
    x: interpolateScalar(from.swellDirection.x, to.swellDirection.x, t),
    z: interpolateScalar(from.swellDirection.z, to.swellDirection.z, t),
  });
  result.currentMps = {
    x: interpolateScalar(from.currentMps.x, to.currentMps.x, t),
    z: interpolateScalar(from.currentMps.z, to.currentMps.z, t),
  };
  result.water.absorption = {
    x: interpolateScalar(from.water.absorption.x, to.water.absorption.x, t),
    y: interpolateScalar(from.water.absorption.y, to.water.absorption.y, t),
    z: interpolateScalar(from.water.absorption.z, to.water.absorption.z, t),
  };
  result.water.scatter = {
    x: interpolateScalar(from.water.scatter.x, to.water.scatter.x, t),
    y: interpolateScalar(from.water.scatter.y, to.water.scatter.y, t),
    z: interpolateScalar(from.water.scatter.z, to.water.scatter.z, t),
  };
  result.water.clarityM = interpolateScalar(from.water.clarityM, to.water.clarityM, t);
  result.water.roughness = interpolateScalar(from.water.roughness, to.water.roughness, t);
  result.sunDirection = normalizeDirection3({
    x: interpolateScalar(from.sunDirection.x, to.sunDirection.x, t),
    y: interpolateScalar(from.sunDirection.y, to.sunDirection.y, t),
    z: interpolateScalar(from.sunDirection.z, to.sunDirection.z, t),
  });
  result.timeS = currentTime;
  // The selected regime is canonical immediately; its physical fields still blend continuously.
  result.preset = to.preset;
  result.revision = to.revision;
  result.quality = to.quality;
  return sanitizeState(result, from);
}

export function windEnergyScale(state: OceanState): number {
  if (state.windSpeedMps <= 0) return 0;
  return Math.pow(state.windSpeedMps / 12, 2);
}

export function currentDrift(state: OceanState): Vec2State {
  return { x: state.currentMps.x, z: state.currentMps.z };
}

const SPECTRAL_COMPONENTS = [
  { k: 0.043, weight: 0.36, spread: -0.08, band: 'swell' },
  { k: 0.061, weight: 0.28, spread: 0.05, band: 'swell' },
  { k: 0.088, weight: 0.18, spread: 0.13, band: 'swell' },
  { k: 0.15, weight: 0.085, spread: -0.3, band: 'wind' },
  { k: 0.23, weight: 0.058, spread: 0.18, band: 'wind' },
  { k: 0.36, weight: 0.041, spread: -0.16, band: 'wind' },
  { k: 0.54, weight: 0.028, spread: 0.35, band: 'wind' },
  { k: 0.82, weight: 0.018, spread: -0.42, band: 'wind' },
] as const;

function rotateDirection(direction: Vec2State, radians: number): Vec2State {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: direction.x * c - direction.z * s, z: direction.x * s + direction.z * c };
}

export function evaluateWaveAt(state: OceanState, x: number, z: number, timeS = state.timeS): WaveSample {
  let heightM = 0;
  let slopeX = 0;
  let slopeZ = 0;
  let curvature = 0;
  const windScale = clamp(windEnergyScale(state), 0, 3.2);

  SPECTRAL_COMPONENTS.forEach((component, index) => {
    const baseDirection = component.band === 'swell' ? state.swellDirection : state.windDirection;
    const direction = rotateDirection(baseDirection, component.spread);
    const k = component.band === 'swell'
      ? component.k * Math.pow(13.4 / state.swellPeriodS, 2)
      : component.k;
    const amplitude = component.band === 'swell'
      ? state.swellAmplitudeM * component.weight
      : (0.12 + windScale * 0.16) * component.weight * 5.2;
    const omega = Math.sqrt(GRAVITY_MPS2 * k);
    const seedPhase = ((state.seed * (index + 17) * 0.000117) % 1) * TAU;
    const phase = k * (direction.x * x + direction.z * z) - omega * timeS + seedPhase;
    const sinPhase = Math.sin(phase);
    const cosPhase = Math.cos(phase);
    heightM += amplitude * sinPhase;
    slopeX += amplitude * k * direction.x * cosPhase;
    slopeZ += amplitude * k * direction.z * cosPhase;
    curvature += amplitude * k * k * Math.max(0, sinPhase);
  });

  if (state.gust.active || state.gust.trace > 0.001) {
    const dx = x - state.gust.origin.x - state.currentMps.x * state.gust.ageS * 4;
    const dz = z - state.gust.origin.z - state.currentMps.z * state.gust.ageS * 4;
    const distance = Math.hypot(dx, dz);
    const ring = Math.exp(-Math.pow((distance - state.gust.ageS * 32) / 36, 2));
    heightM += ring * state.gust.drive * 0.42 * Math.sin(distance * 0.19 - timeS * 4.1);
    curvature += ring * state.gust.trace * 0.12;
  }

  const crest = clamp(curvature * 18 + Math.hypot(slopeX, slopeZ) * 0.44 - 0.08, 0, 1);
  return { heightM, slopeX, slopeZ, crest };
}

export function serializeState(state: OceanState): string {
  return JSON.stringify(sanitizeState(state));
}

export function parseState(serialized: string): OceanState {
  try {
    return sanitizeState(JSON.parse(serialized) as OceanState);
  } catch {
    return createDefaultState();
  }
}

export function allFinite(state: OceanState): boolean {
  const stack: unknown[] = [state];
  while (stack.length) {
    const value = stack.pop();
    if (typeof value === 'number' && !Number.isFinite(value)) return false;
    if (value && typeof value === 'object') stack.push(...Object.values(value));
  }
  return true;
}

export class OceanController {
  private canonical: OceanState;
  private transition: Transition | null = null;

  constructor(initial: OceanState = createDefaultState()) {
    this.canonical = sanitizeState(initial);
  }

  get state(): Readonly<OceanState> {
    return this.canonical;
  }

  snapshot(): OceanState {
    return cloneState(this.canonical);
  }

  reset(): OceanState {
    const previousRevision = this.canonical.revision;
    this.transition = null;
    this.canonical = createDefaultState();
    this.canonical.revision = previousRevision + 1;
    return this.snapshot();
  }

  applyPreset(name: PresetName, durationS = 1.8): void {
    const target = cloneState(PRESETS[name]);
    target.timeS = this.canonical.timeS;
    target.quality = this.canonical.quality;
    target.gust = cloneState(this.canonical).gust;
    target.revision = this.canonical.revision + 1;
    if (durationS <= 0) {
      this.canonical = sanitizeState(target);
      this.transition = null;
      return;
    }
    this.transition = { from: this.snapshot(), to: target, elapsedS: 0, durationS };
    this.canonical.preset = name;
    this.canonical.revision = target.revision;
  }

  patch(patch: Partial<OceanState>): void {
    const candidate = cloneState(this.canonical);
    Object.assign(candidate, patch);
    candidate.preset = 'custom';
    candidate.revision += 1;
    this.transition = null;
    this.canonical = sanitizeState(candidate, this.canonical);
  }

  setWindBearing(degrees: number): void {
    this.patch({ windDirection: directionFromBearing(degrees) });
  }

  setCurrentAlongWind(speedMps: number): void {
    const cross = rotateDirection(this.canonical.windDirection, -0.22);
    this.patch({ currentMps: { x: cross.x * speedMps, z: cross.z * speedMps } });
  }

  setQuality(quality: QualityPreset): void {
    const candidate = cloneState(this.canonical);
    candidate.quality = quality;
    candidate.revision += 1;
    this.transition = null;
    this.canonical = sanitizeState(candidate, this.canonical);
  }

  triggerGust(): void {
    this.transition = null;
    this.canonical.gust = {
      active: true,
      ageS: 0,
      drive: 0,
      trace: Math.max(this.canonical.gust.trace, 0.05),
      serial: this.canonical.gust.serial + 1,
      origin: {
        x: 115 + ((this.canonical.seed + this.canonical.gust.serial * 37) % 70) - 35,
        z: -335 - ((this.canonical.seed + this.canonical.gust.serial * 19) % 55),
      },
    };
    this.canonical.revision += 1;
  }

  step(dtS: number): OceanState {
    const dt = clamp(finite(dtS, 0), 0, 0.1);
    const nextTime = this.canonical.timeS + dt;

    if (this.transition) {
      this.transition.elapsedS += dt;
      const amount = clamp(this.transition.elapsedS / this.transition.durationS, 0, 1);
      const event = cloneState(this.canonical).gust;
      this.canonical = interpolateState(this.transition.from, this.transition.to, amount, nextTime);
      this.canonical.gust = event;
      if (amount >= 1) this.transition = null;
    } else {
      this.canonical.timeS = nextTime;
    }

    const gust = this.canonical.gust;
    if (gust.active) {
      gust.ageS += dt;
      const anticipation = smoothstep(0, 1.25, gust.ageS);
      const release = 1 - smoothstep(4.2, 8.5, gust.ageS);
      gust.drive = clamp(anticipation * release * 1.16, 0, 1.16);
      gust.trace = clamp(gust.trace + gust.drive * dt * 0.35, 0, 1);
      if (gust.ageS >= 9) gust.active = false;
    } else {
      gust.drive = Math.max(0, gust.drive - dt * 0.3);
      gust.trace *= Math.exp(-dt * 0.12);
      if (gust.trace < 0.001) gust.trace = 0;
    }

    this.canonical = sanitizeState(this.canonical);
    return this.snapshot();
  }
}
