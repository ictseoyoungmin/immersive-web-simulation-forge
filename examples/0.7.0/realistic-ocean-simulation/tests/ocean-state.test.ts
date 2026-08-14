import { describe, expect, it } from 'vitest';
import {
  OceanController,
  PRESETS,
  allFinite,
  bearingFromDirection,
  cloneState,
  createDefaultState,
  currentDrift,
  directionFromBearing,
  evaluateWaveAt,
  parseState,
  serializeState,
  windEnergyScale,
} from '../src/ocean-state';

describe('OceanState canonical contract', () => {
  it('round-trips the full serializable default without loss', () => {
    const state = createDefaultState();
    expect(parseState(serializeState(state))).toEqual(state);
  });

  it('evolves deterministically for equal seeds and fixed steps', () => {
    const left = new OceanController();
    const right = new OceanController();
    left.triggerGust();
    right.triggerGust();
    for (let index = 0; index < 960; index += 1) {
      left.step(1 / 60);
      right.step(1 / 60);
    }
    expect(left.snapshot()).toEqual(right.snapshot());
    expect(evaluateWaveAt(left.snapshot(), 17, -92)).toEqual(evaluateWaveAt(right.snapshot(), 17, -92));
  });

  it('keeps preset transitions bounded and finite', () => {
    const controller = new OceanController();
    for (const preset of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
      controller.applyPreset(preset, 0.4);
      for (let index = 0; index < 80; index += 1) controller.step(1 / 60);
      const state = controller.snapshot();
      expect(allFinite(state)).toBe(true);
      expect(state.windSpeedMps).toBeGreaterThanOrEqual(0);
      expect(state.windSpeedMps).toBeLessThanOrEqual(28);
      expect(state.swellAmplitudeM).toBeGreaterThan(0);
      expect(Math.hypot(state.windDirection.x, state.windDirection.z)).toBeCloseTo(1, 10);
      expect(Math.hypot(state.swellDirection.x, state.swellDirection.z)).toBeCloseTo(1, 10);
    }
  });

  it('resets exactly to Golden Swell except for monotonic revision', () => {
    const controller = new OceanController();
    controller.applyPreset('storm-front', 0);
    controller.triggerGust();
    controller.step(3.5);
    const revisionBefore = controller.state.revision;
    const reset = controller.reset();
    const expected = createDefaultState();
    expect({ ...reset, revision: 0 }).toEqual(expected);
    expect(reset.revision).toBe(revisionBefore + 1);
  });

  it('satisfies the zero-wind limiting case', () => {
    const state = createDefaultState();
    state.windSpeedMps = 0;
    expect(windEnergyScale(state)).toBe(0);
  });

  it('reverses current drift without changing the swell direction', () => {
    const positive = createDefaultState();
    positive.currentMps = { x: 0.45, z: -0.2 };
    const negative = cloneState(positive);
    negative.currentMps = { x: -0.45, z: 0.2 };
    expect(currentDrift(negative)).toEqual({ x: -currentDrift(positive).x, z: -currentDrift(positive).z });
    expect(negative.swellDirection).toEqual(positive.swellDirection);
  });

  it('keeps bearing conversion invariant around the compass', () => {
    for (const bearing of [0, 45, 90, 179, 270, 359]) {
      expect(bearingFromDirection(directionFromBearing(bearing))).toBeCloseTo(bearing, 10);
    }
  });

  it('recovers malformed and non-finite serialized input', () => {
    expect(parseState('{bad json')).toEqual(createDefaultState());
    const malformed = createDefaultState();
    malformed.windSpeedMps = Number.POSITIVE_INFINITY;
    malformed.currentMps.x = Number.NaN;
    const recovered = parseState(JSON.stringify(malformed));
    expect(allFinite(recovered)).toBe(true);
    expect(recovered.windSpeedMps).toBe(createDefaultState().windSpeedMps);
  });
});
