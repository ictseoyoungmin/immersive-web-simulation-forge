const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrapPi = x => Math.atan2(Math.sin(x), Math.cos(x));

export class PIDAxis {
  constructor({ p = 0, i = 0, d = 0, integralLimit = 1, outputLimit = Infinity } = {}) {
    this.p = p; this.i = i; this.d = d; this.integralLimit = integralLimit; this.outputLimit = outputLimit;
    this.integral = 0; this.previousError = 0; this.derivative = 0;
  }
  configure({ p, i, d }) { this.p = p; this.i = i; this.d = d; }
  reset() { this.integral = 0; this.previousError = 0; this.derivative = 0; }
  update(error, dt, measuredRate = null) {
    this.integral = clamp(this.integral + error * dt, -this.integralLimit, this.integralLimit);
    const derivative = measuredRate == null ? (error - this.previousError) / Math.max(1e-6, dt) : -measuredRate;
    this.derivative += (derivative - this.derivative) * Math.min(1, dt * 30);
    this.previousError = error;
    return clamp(this.p * error + this.i * this.integral + this.d * this.derivative, -this.outputLimit, this.outputLimit);
  }
}

export class FlightController {
  constructor(parameters) {
    this.parameters = parameters;
    this.roll = new PIDAxis({ integralLimit: .5, outputLimit: 2.8 });
    this.pitch = new PIDAxis({ integralLimit: .5, outputLimit: 2.8 });
    this.yaw = new PIDAxis({ integralLimit: .6, outputLimit: 1.6 });
    this.altitude = new PIDAxis({ p: 4.8, i: 1.1, d: 2.8, integralLimit: 1.5, outputLimit: 12 });
    this.xHold = new PIDAxis({ p: .55, i: .04, d: .62, integralLimit: 2, outputLimit: .95 });
    this.zHold = new PIDAxis({ p: .65, i: .05, d: .72, integralLimit: 2, outputLimit: .75 });
    this.target = { position: [0, 2.15, 0], yaw: 0 };
  }
  reset() { [this.roll, this.pitch, this.yaw, this.altitude, this.xHold, this.zHold].forEach(p => p.reset()); }
  configure() {
    this.roll.configure(this.parameters.get('pid.roll'));
    this.pitch.configure(this.parameters.get('pid.pitch'));
    this.yaw.configure(this.parameters.get('pid.yaw'));
  }
  compute(state, euler, dt, totalMass, gravity = 9.80665) {
    this.configure();
    const xError = this.target.position[0] - state.position[0];
    const zError = this.target.position[2] - state.position[2];
    const desiredPitch = -this.xHold.update(xError, dt, state.velocity[0]);
    const desiredRoll = this.zHold.update(zError, dt, state.velocity[2]);
    const altitudeCorrection = this.altitude.update(this.target.position[1] - state.position[1], dt, state.velocity[1]);
    const tiltCompensation = 1 / Math.max(.42, Math.cos(desiredRoll) * Math.cos(desiredPitch));
    const totalThrust = Math.max(0, (totalMass * gravity + totalMass * altitudeCorrection) * tiltCompensation);
    const rollTorque = this.roll.update(desiredRoll - euler[0], dt, state.angularVelocity[0]);
    const pitchTorque = this.pitch.update(desiredPitch - euler[1], dt, state.angularVelocity[2]);
    const yawTorque = this.yaw.update(wrapPi(this.target.yaw - euler[2]), dt, state.angularVelocity[1]);
    return { totalThrust, rollTorque, pitchTorque, yawTorque, desiredRoll, desiredPitch };
  }
}
