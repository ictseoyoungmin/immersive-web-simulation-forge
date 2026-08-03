import assert from 'node:assert/strict';
import { ParameterStore } from '../kits/authoring/parameter-store.mjs';
import { WindField } from '../kits/compute/wind-field.mjs';
import { DronePhysics } from '../kits/compute/drone-physics.mjs';
import { evaluateRotor } from '../kits/compute/rotor-model.mjs';

const almostEqual = (actual, expected, tolerance, message) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, received ${actual}`);
};

function run(parameters, seconds) {
  const field = new WindField(parameters);
  const physics = new DronePhysics({ parameters, windField: field });
  let telemetry = null;
  let maxSpeed = 0;
  let maxTilt = 0;
  let maxPower = 0;
  for (let index = 0; index < seconds * 120; index++) {
    telemetry = physics.step(1 / 120, index / 120);
    maxSpeed = Math.max(maxSpeed, telemetry.speed);
    maxTilt = Math.max(maxTilt, telemetry.tiltDeg);
    maxPower = Math.max(maxPower, telemetry.powerWatts);
    assert.equal(telemetry.solverStable, true, 'solver became unstable');
    assert.ok(telemetry.position.every(Number.isFinite), 'position contains a non-finite value');
    assert.ok(telemetry.velocity.every(Number.isFinite), 'velocity contains a non-finite value');
    assert.ok(telemetry.orientation.every(Number.isFinite), 'orientation contains a non-finite value');
  }
  return { physics, telemetry, maxSpeed, maxTilt, maxPower };
}

// Rotor constitutive law: both thrust and reaction torque scale with angular speed squared.
const rotor5000 = evaluateRotor(5_000, .127, 1.225);
const rotor10000 = evaluateRotor(10_000, .127, 1.225);
almostEqual(rotor10000.thrust / rotor5000.thrust, 4, 1e-9, 'rotor thrust omega-squared law');
almostEqual(rotor10000.reactionTorque / rotor5000.reactionTorque, 4, 1e-9, 'reaction torque omega-squared law');

// Wind-vector orientation, dynamic pressure, and deterministic turbulence contracts.
const vectorParameters = new ParameterStore({
  'wind.speed': 10,
  'wind.yaw': 90,
  'wind.pitch': 0,
  'wind.flowMode': 'laminar'
});
const vectorField = new WindField(vectorParameters);
let sample = vectorField.sample([0, 2, 0], 0, {});
almostEqual(sample.velocity[0], 0, 1e-10, '90 degree yaw x component');
almostEqual(sample.velocity[2], 10, 1e-10, '90 degree yaw z component');
almostEqual(sample.dynamicPressure, .5 * 1.225 * 100, 1e-9, 'dynamic pressure');
vectorParameters.patch({ 'wind.yaw': 0, 'wind.pitch': 30 });
sample = vectorField.sample([0, 2, 0], 0, {});
almostEqual(sample.velocity[1], 5, 1e-10, '30 degree pitch y component');
vectorParameters.patch({ 'wind.flowMode': 'turbulent', 'wind.turbulence': .8 });
const turbulentA = vectorField.sample([1.2, 2.1, -.4], 3.5, {});
const turbulentB = vectorField.sample([1.2, 2.1, -.4], 3.5, {});
for (let axis = 0; axis < 3; axis++) almostEqual(turbulentA.velocity[axis], turbulentB.velocity[axis], 1e-12, `deterministic turbulence axis ${axis}`);

// Calm hover should remain tightly bounded when no aerodynamic disturbance exists.
const calmParameters = new ParameterStore({
  'wind.speed': 0,
  'wind.flowMode': 'laminar',
  'simulation.flightMode': 'hover'
});
const calm = run(calmParameters, 5);
assert.ok(calm.telemetry.position[1] > .25 && calm.telemetry.position[1] < 4.6, 'calm hover left tunnel bounds');
assert.ok(calm.maxTilt < 1, `calm hover tilt excessive: ${calm.maxTilt}`);
assert.ok(Math.abs(calm.telemetry.position[1] - 2.15) < .02, 'calm hover altitude drift exceeded 2 cm');

// Payload attachment must propagate into mass properties and hover demand.
const massBefore = calm.physics.state.totalMass;
const inertiaBefore = Array.from(calm.physics.state.inertia);
assert.equal(calm.physics.attachPayload('P1', .25), true, 'payload did not attach');
almostEqual(calm.physics.state.totalMass, massBefore + .25, 1e-12, 'payload total mass');
assert.ok(calm.physics.state.inertia.some((value, index) => value > inertiaBefore[index]), 'payload did not increase inertia');
const payloadTelemetry = calm.physics.step(1 / 120, 5);
assert.equal(payloadTelemetry.payloadMass, .25, 'payload telemetry mass mismatch');

// Maximum supported wind/turbulence condition must remain finite and tunnel-bounded.
const maxWindParameters = new ParameterStore({
  'wind.speed': 30,
  'wind.turbulence': 1,
  'wind.flowMode': 'turbulent',
  'simulation.flightMode': 'hover'
});
const maxWind = run(maxWindParameters, 8);
assert.ok(maxWind.maxSpeed < 80, 'velocity safety limit violated');
assert.ok(maxWind.maxTilt < 175, 'orientation became singular');
assert.ok(maxWind.telemetry.position[0] >= -6.5 && maxWind.telemetry.position[0] <= 6.5, 'x tunnel bound failed');
assert.ok(maxWind.telemetry.position[1] >= .28 && maxWind.telemetry.position[1] <= 4.55, 'y tunnel bound failed');
assert.ok(maxWind.telemetry.position[2] >= -2.55 && maxWind.telemetry.position[2] <= 2.55, 'z tunnel bound failed');

console.log(JSON.stringify({
  pass: true,
  rotor: {
    thrustScaling: rotor10000.thrust / rotor5000.thrust,
    reactionTorqueScaling: rotor10000.reactionTorque / rotor5000.reactionTorque
  },
  windField: {
    yaw90Velocity: [0, 0, 10],
    pitch30VerticalVelocity: 5,
    dynamicPressureAt10ms: .5 * 1.225 * 100,
    deterministicTurbulence: true
  },
  calm: {
    finalPosition: calm.telemetry.position,
    maxTilt: calm.maxTilt,
    maxPower: calm.maxPower
  },
  payload: {
    addedMass: .25,
    totalMass: calm.physics.state.totalMass,
    inertia: Array.from(calm.physics.state.inertia)
  },
  maxWind: {
    finalPosition: maxWind.telemetry.position,
    maxTilt: maxWind.maxTilt,
    maxSpeed: maxWind.maxSpeed,
    maxPower: maxWind.maxPower
  }
}, null, 2));
