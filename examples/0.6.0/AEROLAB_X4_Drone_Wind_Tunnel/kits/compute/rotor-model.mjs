import { V3 } from '../math/vec3.mjs';

export const ROTOR_LAYOUT = [
  { id: 'FL', position: V3.create(.46, .04, -.46), spin: 1 },
  { id: 'FR', position: V3.create(.46, .04, .46), spin: -1 },
  { id: 'RR', position: V3.create(-.46, .04, .46), spin: 1 },
  { id: 'RL', position: V3.create(-.46, .04, -.46), spin: -1 }
];

export function rotorCoefficients(bladeRadius, airDensity) {
  // Calibrated to representative 10-inch class propeller scaling.
  const area = Math.PI * bladeRadius * bladeRadius;
  const kt = 1.62e-5 * (airDensity / 1.225) * (bladeRadius / .127) ** 4;
  const kd = 2.25e-7 * (airDensity / 1.225) * (bladeRadius / .127) ** 5;
  const rotorInertia = .5 * .018 * bladeRadius * bladeRadius;
  return { kt, kd, area, rotorInertia };
}

export function evaluateRotor(rpm, bladeRadius, airDensity) {
  const omega = rpm * Math.PI * 2 / 60;
  const { kt, kd, area, rotorInertia } = rotorCoefficients(bladeRadius, airDensity);
  return {
    rpm,
    omega,
    thrust: kt * omega * omega,
    reactionTorque: kd * omega * omega,
    diskArea: area,
    rotorInertia
  };
}

export function motorPower(omega, reactionTorque, efficiency = .82) {
  return Math.max(0, reactionTorque * Math.abs(omega) / Math.max(.1, efficiency));
}
