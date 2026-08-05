/**
 * ARMORY BENCH — authored module catalog.
 *
 * COORDINATE SYSTEM (authoritative, weapon-local):
 *   origin  = receiver datum (rear face of the barrel extension)
 *   +X      = toward the muzzle, along the bore axis
 *   +Y      = up
 *   +Z      = to the shooter's right   (right-handed: X x Y = Z)
 *   units   = millimetres (mm) for length, grams (g) for mass, amperes (A) for bus draw
 *
 * Every part — base part or attachment module — declares the same five things:
 *   1. mass_g          authored design mass
 *   2. extents         local bounding extents in mm (mount-frame relative)
 *   3. com             local centre-of-mass offset in mm
 *   4. inertia.shape   the uniform-density primitive used for its inertia tensor
 *   5. features        the procedural geometry that renders it
 *
 * The mass values are DESIGN DATA for a fictional weapon. The mathematics applied
 * to them (parallel-axis theorem, compound-pendulum period) is standard rigid-body
 * mechanics and is verified against closed-form cases in domain/verify.mjs.
 */

export const CATALOG_VERSION = '1.4.0';

/** Bus capacity of the MK-VII receiver power cell, in amperes. */
export const BUS_CAPACITY_A = 4.2;

/** Gravitational acceleration used for the compound-pendulum readout (m/s^2). */
export const GRAVITY_MS2 = 9.80665;

/** Interference test inset, in mm. Envelopes are shrunk by this before overlap testing. */
export const CLEARANCE_INSET_MM = 2;

export const MATERIALS = ['steel', 'alu', 'polymer', 'glass', 'emissive', 'rubber'];

/* ------------------------------------------------------------------ *
 * Weapon base — the MK-VII "REVENANT" receiver group.
 * Fixed parts: never removable, but they carry mass and geometry.
 * ------------------------------------------------------------------ */

export const WEAPON_BASE = {
  id: 'mk7-revenant',
  name: 'MK-VII 〈REVENANT〉',
  designation: 'MK7-R / 6.8×43 CT',
  provides: ['bus-power', 'thread-M15x1-LH'],
  bus_capacity_a: BUS_CAPACITY_A,
  parts: [
    {
      id: 'base-receiver',
      name: '리시버 상·하부',
      mass_g: 1240,
      extents: { x: [-186, 34], y: [-32, 42], z: [-24, 24] },
      com: { x: -70, y: 4, z: 0 },
      inertia: { shape: 'box' },
      features: [
        { k: 'box', x: [-186, 34], y: [-4, 34], z: [-22, 22], bevel: 3, mat: 'alu' },
        { k: 'box', x: [-176, 20], y: [-32, -2], z: [-19, 19], bevel: 2.5, mat: 'alu' },
        { k: 'rail', x: [-150, 30], y: 44, height: 10.4, mat: 'alu' },
        { k: 'vents', x: [-124, -44], face: 'z±', at: 22, span: [6, 28], count: 5, w: 5, depth: 2.2, mat: 'steel' },
        { k: 'box', x: [-40, 34], y: [-2, 30], z: [-24, 24], bevel: 3, mat: 'alu' },
        { k: 'knurl', x: [26, 34], ro: 18, ri: 11.4, count: 3, mat: 'steel' },
        { k: 'bolt', at: [-160, 18, 22], r: 2.6, mat: 'steel' },
        { k: 'bolt', at: [-160, 18, -22], r: 2.6, mat: 'steel' },
        { k: 'bolt', at: [8, 12, 24], r: 2.6, mat: 'steel' },
        { k: 'bolt', at: [8, 12, -24], r: 2.6, mat: 'steel' },
        { k: 'plate', x: [-150, -60], y: [4, 26], z: 22.6, mat: 'polymer' },
        { k: 'led', at: [-52, 26, 21], r: 1.5, color: 0x58e0ff, mat: 'emissive' },
        { k: 'led', at: [-44, 26, 21], r: 1.5, color: 0x2a5560, mat: 'emissive' }
      ]
    },
    {
      id: 'base-barrel',
      name: '배럴 어셈블리',
      mass_g: 860,
      extents: { x: [0, 372], y: [-11, 11], z: [-11, 11] },
      com: { x: 172, y: 0, z: 0 },
      inertia: { shape: 'tube', ro: 11, ri: 5.5 },
      features: [
        { k: 'tube', x: [0, 40], ro: 15, ri: 5.5, mat: 'steel' },
        { k: 'tube', x: [40, 300], ro: 11, ri: 5.5, mat: 'steel' },
        { k: 'tube', x: [300, 366], ro: 9.6, ri: 5.5, mat: 'steel' },
        { k: 'tube', x: [366, 372], ro: 8.4, ri: 5.5, mat: 'steel' },
        { k: 'knurl', x: [366, 372], ro: 8.4, ri: 5.6, count: 4, mat: 'steel' },
        { k: 'box', x: [196, 246], y: [8, 20], z: [-7, 7], bevel: 1.5, mat: 'steel' },
        { k: 'tube', x: [206, 300], ro: 5.2, ri: 3.4, y: 14, mat: 'steel' }
      ]
    },
    {
      id: 'base-bcg',
      name: '볼트 캐리어 그룹',
      mass_g: 420,
      extents: { x: [-150, -6], y: [-14, 14], z: [-14, 14] },
      com: { x: -78, y: 2, z: 0 },
      inertia: { shape: 'box' },
      features: [
        { k: 'tube', x: [-150, -6], ro: 13, ri: 6, seg: 20, y: 8, mat: 'steel', internal: true }
      ]
    },
    {
      id: 'base-grip',
      name: '권총 손잡이',
      mass_g: 210,
      extents: { x: [-150, -92], y: [-160, -24], z: [-16, 16] },
      com: { x: -122, y: -86, z: 0 },
      inertia: { shape: 'box' },
      features: [
        { k: 'box', x: [-148, -96], y: [-158, -26], z: [-15, 15], bevel: 5, tiltZ: -9, mat: 'polymer' },
        { k: 'plate', x: [-144, -102], y: [-146, -40], z: 15.4, bevel: 3, mat: 'rubber' },
        { k: 'plate', x: [-144, -102], y: [-146, -40], z: -14.5, bevel: 3, mat: 'rubber' }
      ]
    },
    {
      id: 'base-trigger',
      name: '격발 기구',
      mass_g: 180,
      extents: { x: [-112, -58], y: [-46, -6], z: [-13, 13] },
      com: { x: -86, y: -24, z: 0 },
      inertia: { shape: 'box' },
      features: [
        { k: 'box', x: [-112, -58], y: [-46, -30], z: [-12, 12], bevel: 2, mat: 'alu' },
        { k: 'box', x: [-96, -88], y: [-42, -14], z: [-3, 3], bevel: 1, mat: 'steel' }
      ]
    }
  ]
};

/* ------------------------------------------------------------------ *
 * Slot definitions — where modules mount, and what they accept.
 * `install` describes the mechanical seating grammar used by the
 * assembly animation: the axis the module travels along and how it locks.
 * ------------------------------------------------------------------ */

export const SLOTS = [
  {
    id: 'optic',
    name: '광학 조준경',
    short: 'OPTIC',
    anchor: { x: -40, y: 44, z: 0 },
    accepts: ['rail-1913-top'],
    required: false,
    install: { axis: 'y', approach: 84, seat: 10, lock: 'lever', lockDeg: 74, lockAxis: 'x' },
    note: 'MIL-STD-1913 상부 레일. 리코일 그루브 3~9번 구간 사용.'
  },
  {
    id: 'muzzle',
    name: '총구 장치',
    short: 'MUZZLE',
    anchor: { x: 372, y: 0, z: 0 },
    accepts: ['thread-M15x1-LH'],
    required: false,
    install: { axis: 'x', approach: 96, seat: 14, lock: 'thread', lockDeg: 900, lockAxis: 'x' },
    note: 'M15×1 좌나사. 체결 토크 32 N·m.'
  },
  {
    id: 'handguard',
    name: '핸드가드',
    short: 'HANDGUARD',
    anchor: { x: 34, y: 0, z: 0 },
    accepts: ['ring-mk7'],
    required: false,
    install: { axis: 'x', approach: 120, seat: 18, lock: 'collar', lockDeg: 42, lockAxis: 'x' },
    note: '배럴 너트 위 클램프 링. M-LOK 인터페이스 제공.'
  },
  {
    id: 'underbarrel',
    name: '하부 레일',
    short: 'UNDER',
    anchor: { x: 150, y: -34, z: 0 },
    accepts: ['rail-mlok'],
    required: false,
    install: { axis: 'y', approach: -70, seat: 9, lock: 'lever', lockDeg: -68, lockAxis: 'x' },
    note: '핸드가드 6시 방향 M-LOK. 유효 길이는 핸드가드에 종속.'
  },
  {
    id: 'magazine',
    name: '탄창',
    short: 'MAG',
    anchor: { x: -46, y: -26, z: 0 },
    accepts: ['magwell-mk7'],
    required: false,
    install: { axis: 'y', approach: -96, seat: 12, lock: 'catch', lockDeg: 0, lockAxis: 'z' },
    note: '탄창 멈치 후방 삽입. 삽탄 시 질량 포함.'
  },
  {
    id: 'stock',
    name: '개머리판',
    short: 'STOCK',
    anchor: { x: -186, y: 6, z: 0 },
    accepts: ['buffer-mk7'],
    required: true,
    install: { axis: 'x', approach: -108, seat: 16, lock: 'pin', lockDeg: 0, lockAxis: 'y' },
    note: '완충기 튜브 인터페이스. 미장착 시 완충기 노출 — 사격 불가.'
  }
];

/* ------------------------------------------------------------------ *
 * Attachment modules.
 * `clearance` volumes are used for assembly interference checking and are
 * expressed in the same mount-frame millimetres as `extents`.
 * ------------------------------------------------------------------ */

export const MODULES = [
  /* ---------------- OPTIC ---------------- */
  {
    id: 'opt-iron',
    name: 'MK-7 접이식 아이언 사이트',
    slot: 'optic', mount: 'rail-1913-top',
    mass_g: 96, power_a: 0,
    role: '비전자식 예비 조준선. 전원 계통 손상 시에도 유지되는 최종 조준 수단.',
    extents: { x: [-72, 88], y: [0, 28], z: [-9, 9] },
    com: { x: 8, y: 13, z: 0 },
    inertia: { shape: 'box' },
    provides: ['sight'], requires: [],
    clearance: [{ x: [-72, 88], y: [0, 28], z: [-9, 9] }],
    spec: [['배율', '1×'], ['조준선', 'A2 포스트 / 2 MOA'], ['전개', '스프링 팝업 0.4 s'], ['영점', '25 / 100 / 300 m']],
    features: [
      { k: 'box', x: [-72, -46], y: [0, 6], z: [-8, 8], bevel: 1.5, mat: 'steel' },
      { k: 'box', x: [-68, -50], y: [6, 28], z: [-6, 6], bevel: 1.2, mat: 'steel' },
      { k: 'ring', x: -59, ro: 8, ri: 5.6, y: 21, seg: 18, mat: 'steel' },
      { k: 'box', x: [62, 88], y: [0, 6], z: [-8, 8], bevel: 1.5, mat: 'steel' },
      { k: 'box', x: [70, 80], y: [6, 27], z: [-2, 2], bevel: 0.8, mat: 'steel' },
      { k: 'box', x: [66, 84], y: [5, 9], z: [-7, 7], bevel: 1, mat: 'steel' }
    ]
  },
  {
    id: 'opt-holo',
    name: 'HL-2 홀로그래픽 사이트',
    slot: 'optic', mount: 'rail-1913-top',
    mass_g: 318, power_a: 0.9,
    role: '무한원 홀로그램 레티클. 양안 개방 사격에 유리하고 시차가 거의 없다.',
    extents: { x: [-48, 54], y: [0, 60], z: [-31, 31] },
    com: { x: 2, y: 31, z: 0 },
    inertia: { shape: 'box' },
    provides: ['sight', 'powered'], requires: [],
    clearance: [{ x: [-48, 54], y: [0, 60], z: [-31, 31] }],
    spec: [['배율', '1×'], ['레티클', '65 MOA 링 / 1 MOA 도트'], ['전력', '0.9 A @ 12 V'], ['가동 시간', '연속 340 h']],
    features: [
      { k: 'box', x: [-44, 50], y: [0, 12], z: [-26, 26], bevel: 2.5, mat: 'alu' },
      { k: 'box', x: [-44, 22], y: [12, 56], z: [-28, 28], bevel: 4, mat: 'alu' },
      { k: 'box', x: [22, 50], y: [12, 19], z: [-30, 30], bevel: 2, mat: 'alu' },
      { k: 'box', x: [22, 50], y: [50, 57], z: [-30, 30], bevel: 2, mat: 'alu' },
      { k: 'box', x: [22, 50], y: [12, 57], z: [-30, -23], bevel: 2, mat: 'alu' },
      { k: 'box', x: [22, 50], y: [12, 57], z: [23, 30], bevel: 2, mat: 'alu' },
      { k: 'box', x: [31, 35], y: [18, 51], z: [-23.5, 23.5], bevel: 1, mat: 'glass' },
      { k: 'vents', x: [-40, -18], face: 'y+', at: 56, span: [-22, 22], count: 3, w: 4, depth: 2, mat: 'steel' },
      { k: 'knob', at: [-30, 30, 28], r: 7, h: 5, axis: 'z', mat: 'steel' },
      { k: 'knob', at: [-30, 56, 0], r: 7, h: 5, axis: 'y', mat: 'steel' },
      { k: 'led', at: [46, 20, 24], r: 1.4, color: 0x58e0ff, mat: 'emissive' },
      { k: 'bolt', at: [-38, 4, 26], r: 2.2, mat: 'steel' },
      { k: 'bolt', at: [44, 4, 26], r: 2.2, mat: 'steel' }
    ]
  },
  {
    id: 'opt-lpvo',
    name: 'VX-4 1-4× 가변배율 조준경',
    slot: 'optic', mount: 'rail-1913-top',
    mass_g: 594, power_a: 0.4,
    role: '근·중거리 겸용 가변 배율. 1배에서는 무배율 사이트처럼 쓰고, 4배에서 식별 거리를 늘린다.',
    extents: { x: [-98, 104], y: [0, 64], z: [-30, 30] },
    com: { x: 0, y: 36, z: 0 },
    inertia: { shape: 'box' },
    provides: ['sight', 'magnified'], requires: [],
    clearance: [{ x: [-98, 104], y: [0, 64], z: [-30, 30] }],
    spec: [['배율', '1–4×'], ['대물경', 'Ø24 mm'], ['아이릴리프', '92 mm'], ['조명', '11단 / 0.4 A']],
    features: [
      { k: 'box', x: [-62, -34], y: [0, 20], z: [-22, 22], bevel: 2.5, mat: 'alu' },
      { k: 'box', x: [46, 74], y: [0, 20], z: [-22, 22], bevel: 2.5, mat: 'alu' },
      { k: 'tube', x: [-98, -58], ro: 21, ri: 16, y: 40, mat: 'alu' },
      { k: 'tube', x: [-58, -18], ro: 15, ri: 12, y: 40, mat: 'alu' },
      { k: 'tube', x: [-18, 40], ro: 18, ri: 13, y: 40, mat: 'alu' },
      { k: 'knurl', x: [-18, 6], ro: 18.6, ri: 17.4, count: 8, y: 40, mat: 'alu' },
      { k: 'tube', x: [40, 78], ro: 15, ri: 12, y: 40, mat: 'alu' },
      { k: 'tube', x: [78, 104], ro: 24, ri: 20, y: 40, mat: 'alu' },
      { k: 'glass', plane: 'x', at: 103, y: 40, ro: 20, tint: 0x1f4a63, mat: 'glass' },
      { k: 'glass', plane: 'x', at: -97, y: 40, ro: 16, tint: 0x243f52, mat: 'glass' },
      { k: 'knob', at: [16, 60, 0], r: 10, h: 12, axis: 'y', mat: 'steel' },
      { k: 'knob', at: [16, 40, 26], r: 10, h: 12, axis: 'z', mat: 'steel' },
      { k: 'bolt', at: [-48, 4, 22], r: 2.2, mat: 'steel' },
      { k: 'bolt', at: [60, 4, 22], r: 2.2, mat: 'steel' }
    ]
  },
  {
    id: 'opt-thermal',
    name: 'TH-9 열화상 조준경',
    slot: 'optic', mount: 'rail-1913-top',
    mass_g: 742, power_a: 2.6,
    role: '비냉각 마이크로볼로미터. 은폐·연막·야간 조건에서 표적 대비를 확보하지만 버스 부하가 크다.',
    extents: { x: [-86, 98], y: [0, 72], z: [-36, 36] },
    com: { x: 6, y: 37, z: 0 },
    inertia: { shape: 'box' },
    provides: ['sight', 'thermal', 'powered'], requires: [],
    clearance: [{ x: [-86, 98], y: [0, 72], z: [-36, 36] }],
    spec: [['센서', '640×512 / 12 µm'], ['프레임', '60 Hz'], ['전력', '2.6 A @ 12 V'], ['냉각', '비냉각 (패시브 방열)']],
    features: [
      { k: 'box', x: [-80, 92], y: [0, 14], z: [-28, 28], bevel: 2.5, mat: 'alu' },
      { k: 'box', x: [-80, 60], y: [14, 66], z: [-32, 32], bevel: 4, mat: 'alu' },
      { k: 'box', x: [60, 98], y: [10, 70], z: [-36, 36], bevel: 5, mat: 'alu' },
      { k: 'glass', plane: 'x', at: 97, y: 40, ro: 27, tint: 0x3a2a18, mat: 'glass' },
      { k: 'glass', plane: 'x', at: -79, y: 42, ro: 16, rz: 20, tint: 0x123040, mat: 'glass' },
      { k: 'fins', x: [-30, 40], face: 'y+', at: 64, span: [-26, 26], count: 9, h: 6, t: 1.4, mat: 'alu' },
      { k: 'knob', at: [-56, 42, 32], r: 8, h: 6, axis: 'z', mat: 'steel' },
      { k: 'plate', x: [-70, -34], y: [20, 52], z: 32.6, mat: 'polymer' },
      { k: 'led', at: [-64, 8, 28], r: 1.6, color: 0xff8a3c, mat: 'emissive' },
      { k: 'led', at: [-56, 8, 28], r: 1.6, color: 0x58e0ff, mat: 'emissive' }
    ]
  },

  /* ---------------- MUZZLE ---------------- */
  {
    id: 'mz-flash',
    name: 'FH-2 개방형 소염기',
    slot: 'muzzle', mount: 'thread-M15x1-LH',
    mass_g: 84, power_a: 0,
    role: '가장 가벼운 총구 장치. 발사 화염을 분산시키지만 반동 저감 효과는 거의 없다.',
    extents: { x: [0, 66], y: [-12.5, 12.5], z: [-12.5, 12.5] },
    com: { x: 28, y: 0, z: 0 },
    inertia: { shape: 'tube', ro: 12.5, ri: 8 },
    provides: [], requires: [],
    clearance: [{ x: [0, 66], y: [-13, 13], z: [-13, 13] }],
    spec: [['형식', '4-프롱 개방형'], ['소염', '−78 % 가시화염'], ['반동 저감', '−4 %'], ['나사', 'M15×1 LH']],
    features: [
      { k: 'tube', x: [0, 18], ro: 12.5, ri: 8, mat: 'steel' },
      { k: 'knurl', x: [2, 14], ro: 12.8, ri: 11.8, count: 6, mat: 'steel' },
      { k: 'tube', x: [18, 66], ro: 11, ri: 8.4, mat: 'steel' },
      { k: 'prongs', x: [26, 66], ro: 11, ri: 8.4, count: 4, w: 3.4, mat: 'steel' }
    ]
  },
  {
    id: 'mz-brake',
    name: 'CB-3 4포트 총구제동기',
    slot: 'muzzle', mount: 'thread-M15x1-LH',
    mass_g: 128, power_a: 0,
    role: '측방 배출 포트로 반동을 상쇄한다. 사수 측면 폭풍압이 크게 늘어난다.',
    extents: { x: [0, 74], y: [-18, 18], z: [-18, 18] },
    com: { x: 31, y: 0, z: 0 },
    inertia: { shape: 'tube', ro: 18, ri: 8 },
    provides: [], requires: [],
    clearance: [{ x: [0, 74], y: [-18, 18], z: [-18, 18] }],
    spec: [['형식', '4포트 수평 배플'], ['반동 저감', '−31 %'], ['총구 들림', '−44 %'], ['측방 폭풍압', '+38 %']],
    features: [
      { k: 'tube', x: [0, 16], ro: 13, ri: 8, mat: 'steel' },
      { k: 'knurl', x: [2, 12], ro: 13.4, ri: 12.4, count: 6, mat: 'steel' },
      { k: 'box', x: [16, 74], y: [-17, 17], z: [-17, 17], bevel: 4, mat: 'steel' },
      { k: 'tube', x: [16, 74], ro: 8.4, ri: 8, mat: 'steel', internal: true },
      { k: 'ports', x: [22, 70], ro: 18, count: 4, w: 8, axis: 'z', mat: 'steel' },
      { k: 'ports', x: [22, 70], ro: 18, count: 2, w: 6, axis: 'y', up: true, mat: 'steel' }
    ]
  },
  {
    id: 'mz-comp',
    name: 'AC-1 능동형 보정기',
    slot: 'muzzle', mount: 'thread-M15x1-LH',
    mass_g: 372, power_a: 1.3,
    role: '가스 압력을 실시간으로 편향시키는 서보 배플. 반동 제어가 가장 우수하지만 버스 전력을 상시 소모한다.',
    extents: { x: [0, 102], y: [-20, 20], z: [-20, 20] },
    com: { x: 44, y: 0, z: 0 },
    inertia: { shape: 'tube', ro: 20, ri: 8 },
    provides: ['active-comp', 'powered'], requires: [],
    clearance: [{ x: [0, 102], y: [-20, 20], z: [-20, 20] }],
    spec: [['형식', '서보 편향 배플'], ['반동 저감', '−47 %'], ['전력', '1.3 A @ 12 V'], ['응답', '2.1 ms / 배플']],
    features: [
      { k: 'tube', x: [0, 14], ro: 13, ri: 8, mat: 'steel' },
      { k: 'tube', x: [14, 92], ro: 19, ri: 8.4, mat: 'alu' },
      { k: 'knurl', x: [20, 86], ro: 19.6, ri: 18.4, count: 9, mat: 'alu' },
      { k: 'tube', x: [92, 102], ro: 16, ri: 8.4, mat: 'steel' },
      { k: 'ports', x: [30, 80], ro: 20, count: 6, w: 5, axis: 'z', mat: 'steel' },
      { k: 'box', x: [24, 76], y: [14, 22], z: [-9, 9], bevel: 2, mat: 'alu' },
      { k: 'led', at: [70, 22, 0], r: 1.5, color: 0xff8a3c, mat: 'emissive' },
      { k: 'led', at: [62, 22, 0], r: 1.5, color: 0x58e0ff, mat: 'emissive' }
    ]
  },
  {
    id: 'mz-supp',
    name: 'S-9 직결식 소음기',
    slot: 'muzzle', mount: 'thread-M15x1-LH',
    mass_g: 486, power_a: 0,
    role: '총구 전방으로 뻗는 직결식 배플 스택. 신호 노출을 크게 줄이지만 전장과 총구 무게가 늘어난다.',
    extents: { x: [0, 188], y: [-22, 22], z: [-22, 22] },
    com: { x: 78, y: 0, z: 0 },
    inertia: { shape: 'tube', ro: 22, ri: 9 },
    provides: ['suppressed'], requires: [],
    clearance: [{ x: [0, 188], y: [-22, 22], z: [-22, 22] }],
    spec: [['형식', '직결 / 9배플 스택'], ['감쇄', '−28 dB'], ['총구 화염', '−94 %'], ['배압', '+18 %']],
    features: [
      { k: 'tube', x: [0, 22], ro: 15, ri: 8, mat: 'steel' },
      { k: 'knurl', x: [3, 19], ro: 15.4, ri: 14.2, count: 7, mat: 'steel' },
      { k: 'tube', x: [22, 176], ro: 21.5, ri: 9, mat: 'steel' },
      { k: 'knurl', x: [30, 170], ro: 22, ri: 20.6, count: 14, mat: 'steel' },
      { k: 'tube', x: [176, 188], ro: 17, ri: 9, mat: 'steel' },
      { k: 'plate', x: [40, 150], y: [-7, 7], z: 22.2, mat: 'polymer' }
    ]
  },
  {
    id: 'mz-reflex',
    name: 'T-40 반사식 소음기',
    slot: 'muzzle', mount: 'thread-M15x1-LH',
    mass_g: 560, power_a: 0,
    role: '배럴 위로 슬리브가 후방까지 겹쳐 전장 증가를 억제하는 반사식 구조. 대신 핸드가드 후단과 물리적으로 간섭할 수 있다.',
    extents: { x: [-102, 122], y: [-24, 24], z: [-24, 24] },
    com: { x: 6, y: 0, z: 0 },
    inertia: { shape: 'tube', ro: 24, ri: 11 },
    provides: ['suppressed', 'reflex-sleeve'], requires: [],
    clearance: [{ x: [-102, 122], y: [-24, 24], z: [-24, 24] }],
    spec: [['형식', '반사식 / 후방 슬리브'], ['감쇄', '−26 dB'], ['전장 증가', '+122 mm'], ['후방 간섭', '−102 mm 침범']],
    features: [
      { k: 'tube', x: [-102, 110], ro: 23.5, ri: 12, mat: 'steel' },
      { k: 'tube', x: [110, 122], ro: 18, ri: 9, mat: 'steel' },
      { k: 'knurl', x: [-96, -60], ro: 24, ri: 22.6, count: 5, mat: 'steel' },
      { k: 'ring', x: -102, ro: 23.5, ri: 12.5, seg: 26, mat: 'steel' },
      { k: 'plate', x: [-60, 90], y: [-8, 8], z: 24.2, mat: 'polymer' },
      { k: 'vents', x: [-40, 60], face: 'y+', at: 23.4, span: [-6, 6], count: 6, w: 5, depth: 2, mat: 'steel' }
    ]
  },

  /* ---------------- HANDGUARD ---------------- */
  {
    id: 'hg-cq',
    name: 'CQ 단축 핸드가드',
    slot: 'handguard', mount: 'ring-mk7',
    mass_g: 288, power_a: 0,
    role: '실내·차량 기동을 위한 최단 길이. 전방 레일이 짧아 대형 하부 부착물은 물리지 않는다.',
    extents: { x: [0, 152], y: [-42, 40], z: [-32, 32] },
    com: { x: 70, y: -2, z: 0 },
    inertia: { shape: 'box' },
    provides: ['rail-short'], requires: [],
    clearance: [{ x: [0, 152], y: [-42, 40], z: [-32, 32] }],
    spec: [['길이', '152 mm'], ['인터페이스', 'M-LOK 3·6·9시'], ['전방 여유', '220 mm'], ['방열', '알루미늄 직접']],
    features: [
      { k: 'tube', x: [0, 18], ro: 30, ri: 17, seg: 22, mat: 'alu' },
      { k: 'shell', x: [18, 152], ro: 27, ri: 20, seg: 22, mat: 'alu' },
      { k: 'rail', x: [4, 150], y: 34, mat: 'alu' },
      { k: 'mlok', x: [40, 140], y: -26, count: 3, mat: 'alu' },
      { k: 'mlok', x: [40, 140], z: 26, count: 3, mat: 'alu' },
      { k: 'bolt', at: [9, 22, 20], r: 3, mat: 'steel' },
      { k: 'bolt', at: [9, 22, -20], r: 3, mat: 'steel' }
    ]
  },
  {
    id: 'hg-std',
    name: '표준 M-LOK 핸드가드',
    slot: 'handguard', mount: 'ring-mk7',
    mass_g: 372, power_a: 0,
    role: '균형 잡힌 기본 길이. 하부 부착물을 위한 충분한 레일과 반사식 소음기 후방 여유를 동시에 확보한다.',
    extents: { x: [0, 232], y: [-42, 40], z: [-32, 32] },
    com: { x: 106, y: -2, z: 0 },
    inertia: { shape: 'box' },
    provides: ['rail-short', 'rail-long'], requires: [],
    clearance: [{ x: [0, 232], y: [-42, 40], z: [-32, 32] }],
    spec: [['길이', '232 mm'], ['인터페이스', 'M-LOK 3·6·9시'], ['전방 여유', '140 mm'], ['방열', '알루미늄 직접']],
    features: [
      { k: 'tube', x: [0, 18], ro: 30, ri: 17, seg: 22, mat: 'alu' },
      { k: 'shell', x: [18, 232], ro: 27, ri: 20, seg: 22, mat: 'alu' },
      { k: 'rail', x: [4, 230], y: 34, mat: 'alu' },
      { k: 'mlok', x: [44, 220], y: -26, count: 5, mat: 'alu' },
      { k: 'mlok', x: [44, 220], z: 26, count: 5, mat: 'alu' },
            { k: 'bolt', at: [9, 22, 20], r: 3, mat: 'steel' },
      { k: 'bolt', at: [9, 22, -20], r: 3, mat: 'steel' }
    ]
  },
  {
    id: 'hg-lr',
    name: 'LR 확장 핸드가드',
    slot: 'handguard', mount: 'ring-mk7',
    mass_g: 468, power_a: 0,
    role: '장거리 사격을 위한 최대 길이. 이각대 지지점을 앞으로 밀 수 있지만 후방으로 겹치는 소음기와는 물리적으로 공존할 수 없다.',
    extents: { x: [0, 282], y: [-42, 40], z: [-32, 32] },
    com: { x: 130, y: -2, z: 0 },
    inertia: { shape: 'box' },
    provides: ['rail-short', 'rail-long', 'rail-extended'], requires: [],
    clearance: [{ x: [0, 282], y: [-42, 40], z: [-32, 32] }],
    spec: [['길이', '282 mm'], ['인터페이스', 'M-LOK 3·6·9시'], ['전방 여유', '90 mm'], ['방열', '알루미늄 + 방열핀']],
    features: [
      { k: 'tube', x: [0, 18], ro: 30, ri: 17, seg: 22, mat: 'alu' },
      { k: 'shell', x: [18, 282], ro: 27, ri: 20, seg: 22, mat: 'alu' },
      { k: 'rail', x: [4, 280], y: 34, mat: 'alu' },
      { k: 'mlok', x: [44, 270], y: -26, count: 6, mat: 'alu' },
      { k: 'mlok', x: [44, 270], z: 26, count: 6, mat: 'alu' },
      { k: 'fins', x: [60, 250], face: 'z±', at: 24, span: [-7, 7], count: 10, h: 3.5, t: 1.1, mat: 'alu' },
      { k: 'bolt', at: [9, 22, 20], r: 3, mat: 'steel' },
      { k: 'bolt', at: [9, 22, -20], r: 3, mat: 'steel' }
    ]
  },

  /* ---------------- UNDERBARREL ---------------- */
  {
    id: 'ub-grip',
    name: 'AG-2 수직 손잡이',
    slot: 'underbarrel', mount: 'rail-mlok',
    mass_g: 142, power_a: 0,
    role: '전방 제어를 위한 수직 그립. 가볍고 어떤 핸드가드에서도 물린다.',
    extents: { x: [-24, 28], y: [-118, 0], z: [-18, 18] },
    com: { x: 1, y: -56, z: 0 },
    inertia: { shape: 'box' },
    provides: ['foregrip'], requires: [],
    // clearance excludes the M-LOK clamp itself, which is designed to sit against
    // the handguard's underside; only the volume below the mounting interface is
    // swept for interference.
    clearance: [{ x: [-24, 28], y: [-118, -16], z: [-18, 18] }],
    spec: [['형식', '수직 / 폴리머'], ['길이', '118 mm'], ['체결', 'M-LOK 2점'], ['내부', '건전지 수납']],
    features: [
      { k: 'box', x: [-24, 28], y: [-14, 0], z: [-17, 17], bevel: 2, mat: 'alu' },
      { k: 'tube', x: [-106, -12], ro: 16, ri: 0, seg: 20, axis: 'y', xOff: 2, mat: 'polymer' },
      { k: 'knurl', x: [-94, -30], ro: 16.4, ri: 15.1, count: 7, axis: 'y', xOff: 2, mat: 'polymer' },
      { k: 'box', x: [-13, 13], y: [-118, -102], z: [-14, 14], bevel: 4, mat: 'polymer' },
      { k: 'bolt', at: [-16, -6, 17], r: 2.4, mat: 'steel' },
      { k: 'bolt', at: [20, -6, 17], r: 2.4, mat: 'steel' }
    ]
  },
  {
    id: 'ub-bipod',
    name: 'BP-5 접이식 이각대',
    slot: 'underbarrel', mount: 'rail-mlok',
    mass_g: 396, power_a: 0,
    role: '지지 사격용 이각대. 클램프가 앞쪽으로 길어 짧은 핸드가드에는 물리지 않는다.',
    extents: { x: [-30, 46], y: [-186, 0], z: [-98, 98] },
    com: { x: 6, y: -82, z: 0 },
    inertia: { shape: 'box' },
    provides: ['bipod'], requires: ['rail-long'],
    clearance: [{ x: [-30, 46], y: [-186, -22], z: [-98, 98] }],
    spec: [['형식', '접이식 / 5단 높이'], ['전개폭', '196 mm'], ['높이', '150–186 mm'], ['요구 레일', '길이 200 mm 이상']],
    features: [
      { k: 'box', x: [-30, 46], y: [-20, 0], z: [-20, 20], bevel: 2.5, mat: 'alu' },
      { k: 'box', x: [-6, 22], y: [-40, -16], z: [-24, 24], bevel: 3, mat: 'alu' },
      { k: 'leg', from: [8, -34, 16], to: [16, -182, 92], r: 5, mat: 'steel' },
      { k: 'leg', from: [8, -34, -16], to: [16, -182, -92], r: 5, mat: 'steel' },
      { k: 'tube', x: [-26, 26], ro: 4, ri: 0, seg: 12, axis: 'z', xOff: 8, y: -30, mat: 'steel' },
      { k: 'bolt', at: [-22, -8, 20], r: 2.6, mat: 'steel' },
      { k: 'bolt', at: [38, -8, 20], r: 2.6, mat: 'steel' }
    ]
  },
  {
    id: 'ub-laser',
    name: 'TL-9 레이저 지시기',
    slot: 'underbarrel', mount: 'rail-mlok',
    mass_g: 118, power_a: 1.4,
    role: '가시광 + IR 이중 지시기. 조준경 없이도 즉각 지향 사격이 가능하지만 상시 전력을 쓴다.',
    extents: { x: [-38, 32], y: [-48, 0], z: [-20, 20] },
    com: { x: -3, y: -22, z: 0 },
    inertia: { shape: 'box' },
    provides: ['laser', 'powered'], requires: [],
    clearance: [{ x: [-38, 32], y: [-48, -14], z: [-20, 20] }],
    spec: [['출력', '가시 5 mW / IR 25 mW'], ['전력', '1.4 A @ 12 V'], ['영점', '풍·고저 각 60 MOA'], ['원격', '압력 스위치 포함']],
    features: [
      { k: 'box', x: [-38, 32], y: [-12, 0], z: [-18, 18], bevel: 2, mat: 'alu' },
      { k: 'box', x: [-34, 28], y: [-46, -10], z: [-17, 17], bevel: 3, mat: 'alu' },
      { k: 'tube', x: [24, 32], ro: 6, ri: 3.4, y: -22, z: -8, mat: 'steel' },
      { k: 'tube', x: [24, 32], ro: 6, ri: 3.4, y: -22, z: 8, mat: 'steel' },
      { k: 'led', at: [31, -22, -8], r: 2.2, color: 0xff3a3a, mat: 'emissive' },
      { k: 'led', at: [31, -22, 8], r: 2.2, color: 0x9a6bff, mat: 'emissive' },
      { k: 'knob', at: [-30, -28, 17], r: 5, h: 4, axis: 'z', mat: 'steel' },
      { k: 'bolt', at: [-30, -6, 18], r: 2.2, mat: 'steel' },
      { k: 'bolt', at: [24, -6, 18], r: 2.2, mat: 'steel' }
    ]
  },

  /* ---------------- MAGAZINE ---------------- */
  {
    id: 'mag-20',
    name: '20발 표준 탄창',
    slot: 'magazine', mount: 'magwell-mk7',
    mass_g: 312, power_a: 0,
    role: '기본 급탄. 엎드려 쏴 자세에서 지면 간섭이 가장 적다.',
    extents: { x: [-26, 28], y: [-188, 0], z: [-15, 15] },
    com: { x: 1, y: -84, z: 0 },
    inertia: { shape: 'box' },
    provides: ['feed'], requires: [],
    clearance: [{ x: [-26, 28], y: [-188, 0], z: [-15, 15] }],
    spec: [['용량', '20발'], ['장탄 질량', '312 g'], ['재질', '강화 폴리머'], ['잔탄 확인', '측면 관측창']],
    features: [
      { k: 'box', x: [-26, 28], y: [-176, 0], z: [-14, 14], bevel: 2.5, tiltZ: 5, mat: 'polymer' },
      { k: 'box', x: [-28, 30], y: [-188, -172], z: [-15.5, 15.5], bevel: 2, mat: 'polymer' },
            { k: 'plate', x: [-18, 18], y: [-150, -40], z: 14.3, mat: 'glass' }
    ]
  },
  {
    id: 'mag-35',
    name: '35발 확장 탄창',
    slot: 'magazine', mount: 'magwell-mk7',
    mass_g: 468, power_a: 0,
    role: '지속 사격용 확장 탄창. 무게 중심이 아래·뒤로 내려가고 낮은 자세에서 걸린다.',
    extents: { x: [-26, 28], y: [-264, 0], z: [-15, 15] },
    com: { x: 1, y: -118, z: 0 },
    inertia: { shape: 'box' },
    provides: ['feed'], requires: [],
    clearance: [{ x: [-26, 28], y: [-264, 0], z: [-15, 15] }],
    spec: [['용량', '35발'], ['장탄 질량', '468 g'], ['재질', '강화 폴리머'], ['비고', '엎드려 쏴 간섭']],
    features: [
      { k: 'box', x: [-26, 28], y: [-252, 0], z: [-14, 14], bevel: 2.5, tiltZ: 5, mat: 'polymer' },
      { k: 'box', x: [-28, 30], y: [-264, -248], z: [-15.5, 15.5], bevel: 2, mat: 'polymer' },
            { k: 'plate', x: [-18, 18], y: [-226, -40], z: 14.3, mat: 'glass' }
    ]
  },
  {
    id: 'mag-drum',
    name: '60발 드럼 탄창',
    slot: 'magazine', mount: 'magwell-mk7',
    mass_g: 894, power_a: 0,
    role: '분대 지원 화력용 드럼. 총 질량과 관성이 급격히 늘어 조준 전환이 눈에 띄게 느려진다.',
    extents: { x: [-58, 62], y: [-176, 0], z: [-40, 40] },
    com: { x: 2, y: -98, z: 0 },
    inertia: { shape: 'box' },
    provides: ['feed'], requires: [],
    clearance: [{ x: [-58, 62], y: [-176, 0], z: [-40, 40] }],
    spec: [['용량', '60발'], ['장탄 질량', '894 g'], ['형식', '이중 나선 드럼'], ['비고', '조준 전환 저하']],
    features: [
      { k: 'box', x: [-24, 26], y: [-76, 0], z: [-14, 14], bevel: 2.5, mat: 'polymer' },
      { k: 'tube', x: [-38, 38], ro: 58, ri: 0, seg: 32, axis: 'z', xOff: 2, y: -116, mat: 'polymer' },
      { k: 'tube', x: [-40, 40], ro: 44, ri: 0, seg: 32, axis: 'z', xOff: 2, y: -116, mat: 'polymer' },
      { k: 'tube', x: [-42, 42], ro: 19, ri: 0, seg: 22, axis: 'z', xOff: 2, y: -116, mat: 'alu' },
      { k: 'knurl', x: [-40, 40], ro: 19.4, ri: 18.1, count: 6, axis: 'z', xOff: 2, y: -116, mat: 'alu' },
      { k: 'led', at: [2, -60, 39], r: 2, color: 0x58e0ff, mat: 'emissive' }
    ]
  },

  /* ---------------- STOCK ---------------- */
  {
    id: 'st-pdw',
    name: 'PDW 접이식 스톡',
    slot: 'stock', mount: 'buffer-mk7',
    mass_g: 268, power_a: 0,
    role: '최소 전장. 무게 중심이 앞으로 이동해 총구 처짐이 커지지만 기동성이 가장 높다.',
    extents: { x: [-142, 0], y: [-42, 38], z: [-26, 26] },
    com: { x: -66, y: -2, z: 0 },
    inertia: { shape: 'box' },
    provides: ['buffer'], requires: [],
    clearance: [{ x: [-142, 0], y: [-42, 38], z: [-26, 26] }],
    spec: [['형식', '측면 접이식'], ['길이', '142 mm'], ['견착 길이', '가변 2단'], ['버트패드', '경질 고무']],
    features: [
      { k: 'tube', x: [-96, 0], ro: 17, ri: 12, mat: 'alu' },
      { k: 'box', x: [-124, -88], y: [-30, 30], z: [-11, 11], bevel: 3, mat: 'polymer' },
      { k: 'box', x: [-142, -126], y: [-40, 36], z: [-24, 24], bevel: 5, mat: 'rubber' },
      { k: 'bolt', at: [-108, 0, 12], r: 3, mat: 'steel' }
    ]
  },
  {
    id: 'st-collapse',
    name: '5단 신축식 개머리판',
    slot: 'stock', mount: 'buffer-mk7',
    mass_g: 356, power_a: 0,
    role: '표준 신축식. 견착 길이를 장구류에 맞춰 조절할 수 있는 범용 선택.',
    extents: { x: [-198, 0], y: [-52, 44], z: [-26, 26] },
    com: { x: -94, y: -3, z: 0 },
    inertia: { shape: 'box' },
    provides: ['buffer'], requires: [],
    clearance: [{ x: [-198, 0], y: [-52, 44], z: [-26, 26] }],
    spec: [['형식', '5단 신축'], ['길이', '198 mm'], ['견착 조절', '5단 / 92 mm'], ['버트패드', '경질 고무']],
    features: [
      { k: 'tube', x: [-150, 0], ro: 17, ri: 12, mat: 'alu' },
      { k: 'ratchet', x: [-146, -20], y: -17, count: 5, mat: 'alu' },
      { k: 'box', x: [-186, -80], y: [-16, 40], z: [-22, 22], bevel: 6, mat: 'polymer' },
      { k: 'box', x: [-176, -110], y: [-48, -12], z: [-13, 13], bevel: 4, mat: 'polymer' },
      { k: 'box', x: [-198, -182], y: [-46, 40], z: [-24, 24], bevel: 5, mat: 'rubber' },
      { k: 'box', x: [-120, -92], y: [-30, -8], z: [-16, 16], bevel: 3, mat: 'polymer' }
    ]
  },
  {
    id: 'st-fixed',
    name: '고정식 정밀 개머리판',
    slot: 'stock', mount: 'buffer-mk7',
    mass_g: 424, power_a: 0,
    role: '치크 라이저와 길이 스페이서를 갖춘 고정식. 무겁지만 무게 중심을 뒤로 당겨 조준 안정성이 가장 높다.',
    extents: { x: [-234, 0], y: [-58, 62], z: [-26, 26] },
    com: { x: -116, y: -1, z: 0 },
    inertia: { shape: 'box' },
    provides: ['buffer', 'cheek-riser'], requires: [],
    clearance: [{ x: [-234, 0], y: [-58, 62], z: [-26, 26] }],
    spec: [['형식', '고정식 / 치크 라이저'], ['길이', '234 mm'], ['라이저', '수직 26 mm 조절'], ['버트패드', '흡진 고무 12 mm']],
    features: [
      { k: 'tube', x: [-120, 0], ro: 17, ri: 12, mat: 'alu' },
      { k: 'box', x: [-222, -60], y: [-14, 42], z: [-22, 22], bevel: 6, mat: 'polymer' },
      { k: 'box', x: [-206, -104], y: [42, 60], z: [-16, 16], bevel: 4, mat: 'polymer' },
      { k: 'box', x: [-200, -120], y: [-56, -10], z: [-13, 13], bevel: 4, mat: 'polymer' },
      { k: 'box', x: [-234, -216], y: [-54, 44], z: [-24, 24], bevel: 5, mat: 'rubber' },
      { k: 'vents', x: [-190, -130], face: 'y-', at: -54, span: [-11, 11], count: 3, w: 6, depth: 3, mat: 'rubber' },
      { k: 'bolt', at: [-96, 6, 18], r: 3, mat: 'steel' }
    ]
  }
];

/** Human-readable names for mount interfaces, used by the compatibility panel. */
export const MOUNT_LABELS = {
  'rail-1913-top': 'MIL-STD-1913 상부 레일',
  'thread-M15x1-LH': 'M15×1 좌나사 총구',
  'ring-mk7': 'MK-7 배럴 너트 클램프',
  'rail-mlok': 'M-LOK 하부 인터페이스',
  'magwell-mk7': 'MK-7 탄창 삽입구',
  'buffer-mk7': 'MK-7 완충기 튜브'
};

/** Capability tokens explained in plain language for the compatibility panel. */
export const CAPABILITY_LABELS = {
  'rail-long': '길이 200 mm 이상의 하부 레일',
  'rail-short': '하부 레일',
  'rail-extended': '확장 하부 레일',
  'bus-power': '리시버 전력 버스',
  'thread-M15x1-LH': '총구 나사산'
};

/** The factory default configuration — the valid starting document. */
export const DEFAULT_LOADOUT = {
  optic: 'opt-holo',
  muzzle: 'mz-brake',
  handguard: 'hg-std',
  underbarrel: 'ub-laser',
  magazine: 'mag-20',
  stock: 'st-collapse'
};

const MODULE_INDEX = new Map(MODULES.map(module => [module.id, module]));
const SLOT_INDEX = new Map(SLOTS.map(slot => [slot.id, slot]));

export function getModule(id) {
  return id ? MODULE_INDEX.get(id) || null : null;
}

export function getSlot(id) {
  return SLOT_INDEX.get(id) || null;
}

export function modulesForSlot(slotId) {
  return MODULES.filter(module => module.slot === slotId);
}

export const MODULE_COUNT = MODULES.length;
export const SLOT_COUNT = SLOTS.length;
