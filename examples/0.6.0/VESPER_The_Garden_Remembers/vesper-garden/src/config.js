(function (V) {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, value) => {
    const t = clamp((value - a) / Math.max(1e-9, b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeOutCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const wrapAngle = angle => {
    while (angle > Math.PI) angle -= TAU;
    while (angle < -Math.PI) angle += TAU;
    return angle;
  };
  const magnitude = (x, y) => Math.hypot(x, y);
  const normalize = (x, y) => {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, length };
  };
  const hexToRgb = hex => {
    const value = parseInt(hex.replace("#", ""), 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  };
  const rgba = (hex, alpha) => {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  };

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  const FLOWER_DEFINITIONS = [
    {
      id: "aurel", name: "AUREL", korean: "호박빛 숨", x: 548, y: 1002,
      color: "#f6c878", core: "#fff2c2", period: 4.8, radius: 410, strength: 490,
      field: "radial-out", orbitDirection: 1, orbitTurns: 1.35, petals: 6, note: 0, phase: 0.07
    },
    {
      id: "mora", name: "MORA", korean: "푸른 회랑", x: 438, y: 390,
      color: "#70d9e2", core: "#d8fbff", period: 4.15, radius: 470, strength: 530,
      field: "tangent-cw", orbitDirection: -1, orbitTurns: 1.5, petals: 7, note: 2, phase: 0.31
    },
    {
      id: "vela", name: "VELA", korean: "보랏빛 당김", x: 1146, y: 234,
      color: "#aa87ff", core: "#e1d7ff", period: 5.35, radius: 500, strength: 570,
      field: "radial-in", orbitDirection: 1, orbitTurns: 1.65, petals: 8, note: 4, phase: 0.56
    },
    {
      id: "serein", name: "SEREIN", korean: "붉은 사선", x: 1900, y: 396,
      color: "#ff8d91", core: "#ffd4ce", period: 3.75, radius: 500, strength: 610,
      field: "directional", orbitDirection: -1, orbitTurns: 1.8, petals: 6, note: 5, phase: 0.18, directionAngle: 2.38
    },
    {
      id: "virid", name: "VIRID", korean: "초록 소용돌이", x: 1952, y: 1012,
      color: "#67e0b5", core: "#d6ffe9", period: 4.55, radius: 540, strength: 640,
      field: "tangent-ccw", orbitDirection: 1, orbitTurns: 1.95, petals: 9, note: 7, phase: 0.72
    },
    {
      id: "nyra", name: "NYRA", korean: "자홍의 쌍박", x: 1286, y: 1184,
      color: "#e987d7", core: "#ffd7f7", period: 3.4, radius: 560, strength: 690,
      field: "alternating", orbitDirection: -1, orbitTurns: 2.1, petals: 8, note: 9, phase: 0.43
    }
  ];

  const THORN_CLUSTERS = [
    { x: 787, y: 1080, r: 47, arms: 7, spin: .2 },
    { x: 852, y: 927, r: 58, arms: 8, spin: 1.1 },
    { x: 707, y: 690, r: 43, arms: 6, spin: 2.4 },
    { x: 650, y: 540, r: 52, arms: 8, spin: .7 },
    { x: 865, y: 362, r: 61, arms: 9, spin: 1.9 },
    { x: 1060, y: 474, r: 44, arms: 7, spin: .1 },
    { x: 1354, y: 430, r: 53, arms: 8, spin: 1.4 },
    { x: 1584, y: 328, r: 45, arms: 7, spin: 2.8 },
    { x: 1720, y: 605, r: 62, arms: 9, spin: .3 },
    { x: 1920, y: 708, r: 42, arms: 6, spin: 1.7 },
    { x: 1685, y: 875, r: 55, arms: 8, spin: 2.2 },
    { x: 1572, y: 1088, r: 48, arms: 7, spin: .9 },
    { x: 1370, y: 920, r: 42, arms: 6, spin: 2.1 },
    { x: 1132, y: 1030, r: 57, arms: 8, spin: .5 },
    { x: 1018, y: 780, r: 36, arms: 6, spin: 1.6 },
    { x: 1390, y: 690, r: 38, arms: 6, spin: 2.7 }
  ];

  const CONFIG = Object.freeze({
    VERSION: 1,
    SAVE_KEY: "vesper.garden.save.v1",
    SETTINGS_KEY: "vesper.garden.settings.v1",
    GAME_DURATION_SECONDS: 900,
    WORLD_WIDTH: 2400,
    WORLD_HEIGHT: 1400,
    ACTIVE_FLOWER_LIMIT: 6,
    FIXED_STEP: 1 / 120,
    MAX_CATCHUP_STEPS: 12,
    PLAYER_RADIUS: 18,
    PLAYER_ACCELERATION: 880,
    PLAYER_FOCUS_ACCELERATION: 1080,
    PLAYER_MAX_SPEED: 305,
    PLAYER_DAMPING: 2.25,
    FIELD_FORCE_CAP: 880,
    FOCUS_DRAIN_PER_SECOND: .205,
    FOCUS_REGEN_PER_SECOND: .105,
    FOCUS_FIELD_FACTOR: .24,
    ORBIT_MIN_RADIUS: 72,
    ORBIT_MAX_RADIUS: 160,
    ORBIT_PROGRESS_DECAY: .22,
    RESONANCE_GATE_COUNT: 4,
    RESONANCE_GATE_RADIUS: 48,
    RESONANCE_HOLD_SECONDS: 8.5,
    MOVEMENT_BIND_COUNTS: [2, 4],
    MOVEMENT_BIND_SECONDS: 7,
    START_X: 350,
    START_Y: 1030,
    HEART_X: 1200,
    HEART_Y: 700,
    HEART_RADIUS: 98,
    CODA_SECONDS: 24,
    FLOWER_DEFINITIONS,
    THORN_CLUSTERS
  });

  V.TAU = TAU;
  V.clamp = clamp;
  V.lerp = lerp;
  V.smoothstep = smoothstep;
  V.easeOutCubic = easeOutCubic;
  V.wrapAngle = wrapAngle;
  V.magnitude = magnitude;
  V.normalize = normalize;
  V.rgba = rgba;
  V.hexToRgb = hexToRgb;
  V.mulberry32 = mulberry32;
  V.hashString = hashString;
  V.CONFIG = CONFIG;
})(window.Vesper ||= {});
