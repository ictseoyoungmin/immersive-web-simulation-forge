import { V3 } from '../math/vec3.mjs';
import { Q4 } from '../math/quat.mjs';
import { evaluateRotor, motorPower, ROTOR_LAYOUT, rotorCoefficients } from './rotor-model.mjs';
import { computeAerodynamicForces } from './aerodynamics.mjs';
import { FlightController } from './pid-controller.mjs';

const TMP = Array.from({ length: 24 }, () => V3.create());
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
const RAD2DEG = 180 / Math.PI;

export const PAYLOAD_MOUNTS = [
  { id: 'P1', bodyPosition: V3.create(.20, -.16, -.20) },
  { id: 'P2', bodyPosition: V3.create(.20, -.16, .20) },
  { id: 'P3', bodyPosition: V3.create(-.20, -.16, .20) },
  { id: 'P4', bodyPosition: V3.create(-.20, -.16, -.20) }
];

function defaultState() {
  return {
    position: V3.create(0, 2.15, 0),
    previousPosition: V3.create(0, 2.15, 0),
    velocity: V3.create(),
    acceleration: V3.create(),
    orientation: Q4.create(),
    previousOrientation: Q4.create(),
    angularVelocity: V3.create(),
    angularAcceleration: V3.create(),
    rotorRPM: new Float64Array(4),
    rotorTargetRPM: new Float64Array(4),
    rotorAngles: new Float64Array(4),
    rotorThrusts: new Float64Array(4),
    rotorTorques: new Float64Array(4),
    payloads: new Map(),
    totalPayloadMass: 0,
    totalMass: 1.45,
    inertia: V3.create(.038, .054, .038),
    forceWorld: V3.create(),
    torqueBody: V3.create(),
    aero: null,
    wind: null,
    controller: null,
    powerWatts: 0,
    solverStable: true,
    resetCount: 0,
    impactEnergy: 0,
    maxTilt: 0,
    stepCount: 0
  };
}

export function yUpAttitude(orientation, out = new Float64Array(3)) {
  const up = Q4.rotateVec3(TMP[0], orientation, [0, 1, 0]);
  const forward = Q4.rotateVec3(TMP[1], orientation, [1, 0, 0]);
  out[0] = Math.atan2(up[2], Math.max(1e-9, up[1]));            // roll about X
  out[1] = Math.atan2(-up[0], Math.max(1e-9, up[1]));           // pitch about Z
  out[2] = Math.atan2(-forward[2], Math.max(1e-9, forward[0])); // yaw about Y
  return out;
}

export class DronePhysics {
  constructor({ parameters, windField }) {
    this.parameters = parameters;
    this.windField = windField;
    this.state = defaultState();
    this.controller = new FlightController(parameters);
    this.euler = new Float64Array(3);
    this.lastTelemetry = null;
    this.reset();
  }

  reset({ preservePayloads = true } = {}) {
    const payloads = preservePayloads ? new Map(this.state.payloads) : new Map();
    const count = this.state.resetCount + 1;
    this.state = defaultState();
    this.state.payloads = payloads;
    this.state.resetCount = count;
    this.controller.reset();
    this.#recomputeMassProperties();
    const hoverRpm = this.#rpmForThrust(this.state.totalMass * this.parameters.get('environment.gravity') / 4);
    this.state.rotorRPM.fill(hoverRpm * .94);
    this.state.rotorTargetRPM.fill(hoverRpm);
    return this.state;
  }

  attachPayload(mountId, mass = .15) {
    const mount = PAYLOAD_MOUNTS.find(item => item.id === mountId);
    if (!mount) throw new Error(`Unknown payload mount ${mountId}`);
    if (this.state.payloads.has(mountId)) this.state.payloads.delete(mountId);
    else this.state.payloads.set(mountId, clamp(Number(mass) || .15, .05, .75));
    this.#recomputeMassProperties();
    return this.state.payloads.has(mountId);
  }

  setPayloadMass(mountId, mass) {
    if (!this.state.payloads.has(mountId)) return false;
    this.state.payloads.set(mountId, clamp(Number(mass) || .15, .05, .75));
    this.#recomputeMassProperties();
    return true;
  }

  #recomputeMassProperties() {
    const baseMass = this.parameters.get('drone.mass');
    let payloadMass = 0;
    const inertia = V3.create(.026 + baseMass * .0085, .039 + baseMass * .010, .026 + baseMass * .0085);
    for (const [id, mass] of this.state.payloads) {
      payloadMass += mass;
      const mount = PAYLOAD_MOUNTS.find(item => item.id === id);
      if (!mount) continue;
      const [x, y, z] = mount.bodyPosition;
      inertia[0] += mass * (y * y + z * z);
      inertia[1] += mass * (x * x + z * z);
      inertia[2] += mass * (x * x + y * y);
    }
    this.state.totalPayloadMass = payloadMass;
    this.state.totalMass = baseMass + payloadMass;
    V3.copy(this.state.inertia, inertia);
  }

  #rpmForThrust(thrust) {
    const { kt } = rotorCoefficients(this.parameters.get('drone.bladeRadius'), this.parameters.get('environment.airDensity'));
    const omega = Math.sqrt(Math.max(0, thrust) / Math.max(1e-12, kt));
    return omega * 60 / (2 * Math.PI);
  }

  #mixController(command) {
    const arm = this.parameters.get('drone.armLength');
    const { kt, kd } = rotorCoefficients(this.parameters.get('drone.bladeRadius'), this.parameters.get('environment.airDensity'));
    const yawRatio = kd / Math.max(1e-12, kt);
    const S = command.totalThrust;
    const rx = command.rollTorque / Math.max(.05, 4 * arm);
    const pz = command.pitchTorque / Math.max(.05, 4 * arm);
    const yy = -command.yawTorque / Math.max(1e-5, 4 * yawRatio);
    const thrusts = [
      S / 4 + rx + pz + yy,
      S / 4 - rx + pz - yy,
      S / 4 - rx - pz + yy,
      S / 4 + rx - pz - yy
    ];
    const maxRPM = this.parameters.get('drone.maxRPM');
    for (let i = 0; i < 4; i++) this.state.rotorTargetRPM[i] = clamp(this.#rpmForThrust(Math.max(0, thrusts[i])), 0, maxRPM);
  }

  #updateRotorTargets(dt) {
    const mode = this.parameters.get('simulation.flightMode');
    const gravity = this.parameters.get('environment.gravity');
    const attitude = yUpAttitude(this.state.orientation, this.euler);
    if (mode === 'hover') {
      const command = this.controller.compute(this.state, attitude, dt, this.state.totalMass, gravity);
      this.state.controller = command;
      this.#mixController(command);
    } else if (mode === 'manual') {
      const throttle = this.parameters.get('drone.manualThrottle');
      const rpm = this.parameters.get('drone.maxRPM') * Math.sqrt(clamp(throttle, 0, 1));
      this.state.rotorTargetRPM.fill(rpm);
      this.state.controller = { totalThrust: 0, rollTorque: 0, pitchTorque: 0, yawTorque: 0, desiredRoll: 0, desiredPitch: 0 };
    } else {
      // Wind reaction test: constant collective equivalent to static hover, no attitude feedback.
      const rpm = this.#rpmForThrust(this.state.totalMass * gravity / 4);
      this.state.rotorTargetRPM.fill(clamp(rpm, 0, this.parameters.get('drone.maxRPM')));
      this.state.controller = { totalThrust: this.state.totalMass * gravity, rollTorque: 0, pitchTorque: 0, yawTorque: 0, desiredRoll: 0, desiredPitch: 0 };
    }
  }

  step(dt, time) {
    const s = this.state;
    s.stepCount++;
    V3.copy(s.previousPosition, s.position);
    Q4.copy(s.previousOrientation, s.orientation);
    this.#recomputeMassProperties();
    this.#updateRotorTargets(dt);

    const response = Math.max(.012, this.parameters.get('drone.motorResponse'));
    const rpmAlpha = 1 - Math.exp(-dt / response);
    const bladeRadius = this.parameters.get('drone.bladeRadius');
    const rho = this.parameters.get('environment.airDensity');
    const forceBody = V3.set(TMP[2], 0, 0, 0);
    const torqueBody = V3.set(TMP[3], 0, 0, 0);
    let netRotorMomentum = 0;
    let power = 0;

    for (let i = 0; i < 4; i++) {
      s.rotorRPM[i] += (s.rotorTargetRPM[i] - s.rotorRPM[i]) * rpmAlpha;
      const rotor = evaluateRotor(s.rotorRPM[i], bladeRadius, rho);
      s.rotorAngles[i] = (s.rotorAngles[i] + rotor.omega * ROTOR_LAYOUT[i].spin * dt) % (Math.PI * 2);
      s.rotorThrusts[i] = rotor.thrust;
      s.rotorTorques[i] = rotor.reactionTorque;
      forceBody[1] += rotor.thrust;
      const r = ROTOR_LAYOUT[i].position;
      torqueBody[0] += -r[2] * rotor.thrust;
      torqueBody[2] += r[0] * rotor.thrust;
      torqueBody[1] -= ROTOR_LAYOUT[i].spin * rotor.reactionTorque;
      netRotorMomentum += ROTOR_LAYOUT[i].spin * rotor.rotorInertia * rotor.omega;
      power += motorPower(rotor.omega, rotor.reactionTorque);
    }

    // Rotor gyroscopic precession: body experiences the opposite of Ω × H.
    torqueBody[0] += s.angularVelocity[2] * netRotorMomentum;
    torqueBody[2] -= s.angularVelocity[0] * netRotorMomentum;

    const wind = this.windField.sample(s.position, time, {});
    s.wind = wind;
    const aero = computeAerodynamicForces({ state: s, windSample: wind, parameters: this.parameters });
    s.aero = aero;
    V3.add(torqueBody, torqueBody, aero.torqueBody);

    const forceWorld = Q4.rotateVec3(TMP[4], s.orientation, forceBody);
    V3.add(forceWorld, forceWorld, aero.force);
    forceWorld[1] -= s.totalMass * this.parameters.get('environment.gravity');
    V3.copy(s.forceWorld, forceWorld);
    V3.copy(s.torqueBody, torqueBody);

    // Semi-implicit Euler translation.
    V3.scale(s.acceleration, forceWorld, 1 / s.totalMass);
    V3.madd(s.velocity, s.velocity, s.acceleration, dt);
    V3.clampLength(s.velocity, s.velocity, 75);
    V3.madd(s.position, s.position, s.velocity, dt);

    // Euler rigid-body equation in body coordinates: I*ωdot = τ - ω×(Iω).
    const Iomega = V3.mul(TMP[5], s.inertia, s.angularVelocity);
    const coriolis = V3.cross(TMP[6], s.angularVelocity, Iomega);
    const netAngular = V3.sub(TMP[7], torqueBody, coriolis);
    s.angularAcceleration[0] = netAngular[0] / Math.max(.005, s.inertia[0]);
    s.angularAcceleration[1] = netAngular[1] / Math.max(.005, s.inertia[1]);
    s.angularAcceleration[2] = netAngular[2] / Math.max(.005, s.inertia[2]);
    V3.madd(s.angularVelocity, s.angularVelocity, s.angularAcceleration, dt);
    V3.clampLength(s.angularVelocity, s.angularVelocity, 18);
    Q4.integrateAngularVelocity(s.orientation, s.orientation, s.angularVelocity, dt);

    this.#resolveTunnelBounds(dt);
    s.powerWatts = power;
    const att = yUpAttitude(s.orientation, this.euler);
    const tilt = Math.hypot(att[0], att[1]);
    s.maxTilt = Math.max(s.maxTilt, tilt);
    s.solverStable = V3.finite(s.position) && V3.finite(s.velocity) && V3.finite(s.angularVelocity) && Q4.finite(s.orientation) && tilt < Math.PI * .95;
    if (!s.solverStable) this.reset({ preservePayloads: true });
    this.lastTelemetry = this.telemetry(time);
    return this.lastTelemetry;
  }

  #resolveTunnelBounds() {
    const s = this.state;
    const bounds = { x: 6.5, yMin: .28, yMax: 4.55, z: 2.55 };
    let impact = 0;
    const collide = (axis, min, max, restitution = .22) => {
      if (s.position[axis] < min) { impact += .5 * s.totalMass * s.velocity[axis] ** 2; s.position[axis] = min; s.velocity[axis] = Math.abs(s.velocity[axis]) * restitution; }
      if (s.position[axis] > max) { impact += .5 * s.totalMass * s.velocity[axis] ** 2; s.position[axis] = max; s.velocity[axis] = -Math.abs(s.velocity[axis]) * restitution; }
    };
    collide(0, -bounds.x, bounds.x, .12);
    collide(1, bounds.yMin, bounds.yMax, .16);
    collide(2, -bounds.z, bounds.z, .12);
    if (impact > 0) {
      s.impactEnergy = impact;
      s.angularVelocity[0] *= .84; s.angularVelocity[1] *= .84; s.angularVelocity[2] *= .84;
    } else s.impactEnergy *= .94;
  }

  telemetry(time) {
    const s = this.state;
    const attitude = yUpAttitude(s.orientation, new Float64Array(3));
    const speed = V3.length(s.velocity);
    const totalThrust = s.rotorThrusts.reduce((a, b) => a + b, 0);
    return {
      time,
      position: Array.from(s.position),
      velocity: Array.from(s.velocity),
      acceleration: Array.from(s.acceleration),
      orientation: Array.from(s.orientation),
      angularVelocity: Array.from(s.angularVelocity),
      roll: attitude[0], pitch: attitude[1], yaw: attitude[2],
      rollDeg: attitude[0] * RAD2DEG, pitchDeg: attitude[1] * RAD2DEG, yawDeg: attitude[2] * RAD2DEG,
      tiltDeg: Math.hypot(attitude[0], attitude[1]) * RAD2DEG,
      speed,
      rotorRPM: Array.from(s.rotorRPM),
      rotorTargetRPM: Array.from(s.rotorTargetRPM),
      rotorThrusts: Array.from(s.rotorThrusts),
      totalThrust,
      powerWatts: s.powerWatts,
      windSpeed: s.wind?.speed ?? 0,
      windVector: Array.from(s.wind?.velocity ?? [0, 0, 0]),
      dynamicPressure: s.aero?.dynamicPressure ?? 0,
      dragForce: Array.from(s.aero?.drag ?? [0, 0, 0]),
      liftForce: Array.from(s.aero?.lift ?? [0, 0, 0]),
      netForce: Array.from(s.forceWorld),
      torqueBody: Array.from(s.torqueBody),
      incidenceDeg: (s.aero?.incidence ?? 0) * RAD2DEG,
      payloadMass: s.totalPayloadMass,
      totalMass: s.totalMass,
      solverStable: s.solverStable,
      impactEnergy: s.impactEnergy,
      maxTiltDeg: s.maxTilt * RAD2DEG,
      flightMode: this.parameters.get('simulation.flightMode')
    };
  }

  interpolated(alpha) {
    const position = V3.create();
    const orientation = Q4.create();
    V3.lerp(position, this.state.previousPosition, this.state.position, alpha);
    Q4.slerp(orientation, this.state.previousOrientation, this.state.orientation, alpha);
    return { position, orientation, rotorAngles: new Float64Array(this.state.rotorAngles) };
  }
}
