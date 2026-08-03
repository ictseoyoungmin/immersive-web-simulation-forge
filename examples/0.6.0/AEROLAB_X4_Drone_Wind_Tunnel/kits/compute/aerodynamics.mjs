import { V3 } from '../math/vec3.mjs';
import { Q4 } from '../math/quat.mjs';

const TMP = Array.from({ length: 8 }, () => V3.create());

export function computeAerodynamicForces({ state, windSample, parameters }) {
  const rho = parameters.get('environment.airDensity');
  const cd = parameters.get('drone.dragCoefficient');
  const frontalArea = parameters.get('drone.frontalArea');
  const liftCoeff = parameters.get('drone.liftCoefficient');
  const rel = V3.sub(TMP[0], windSample.velocity, state.velocity);
  const speed = V3.length(rel);
  const relDir = speed > 1e-6 ? V3.scale(TMP[1], rel, 1 / speed) : V3.set(TMP[1], 0, 0, 0);
  const bodyRel = Q4.inverseRotateVec3(TMP[2], state.orientation, rel);

  // Projected area changes with body incidence to the flow.
  const incidence = Math.atan2(bodyRel[1], Math.hypot(bodyRel[0], bodyRel[2]) + 1e-6);
  const areaMultiplier = .62 + .72 * Math.abs(Math.sin(incidence));
  const q = .5 * rho * speed * speed;
  const drag = V3.scale(TMP[3], relDir, q * cd * frontalArea * areaMultiplier);

  const bodyUp = Q4.rotateVec3(TMP[4], state.orientation, [0, 1, 0]);
  const flowAlongUp = V3.dot(relDir, bodyUp);
  const liftScale = q * frontalArea * liftCoeff * Math.sin(2 * incidence);
  // Lift acts mostly along body normal, but is reduced when flow is aligned with that normal.
  const lift = V3.scale(TMP[5], bodyUp, liftScale * (1 - .35 * Math.abs(flowAlongUp)));

  // Aerodynamic center offset causes a restoring/disturbance torque.
  const copBody = V3.set(TMP[6], -.05, -.04, 0);
  const copWorld = Q4.rotateVec3(TMP[7], state.orientation, copBody);
  const totalAero = V3.create();
  V3.add(totalAero, drag, lift);
  const torqueWorld = V3.create();
  V3.cross(torqueWorld, copWorld, totalAero);
  const torqueBody = V3.create();
  Q4.inverseRotateVec3(torqueBody, state.orientation, torqueWorld);

  // Rotational aerodynamic damping, roughly quadratic at speed.
  torqueBody[0] -= state.angularVelocity[0] * (.016 + q * .00017);
  torqueBody[1] -= state.angularVelocity[1] * (.012 + q * .00012);
  torqueBody[2] -= state.angularVelocity[2] * (.016 + q * .00017);

  return {
    relativeVelocity: V3.clone(rel),
    drag: V3.clone(drag),
    lift: V3.clone(lift),
    force: totalAero,
    torqueBody,
    incidence,
    dynamicPressure: q
  };
}
