export class ComputeTaskRunner extends EventTarget {
  constructor({ physics, measurements, telemetryHz = 30 }) {
    super();
    this.physics = physics;
    this.measurements = measurements;
    this.telemetryInterval = 1 / telemetryHz;
    this.telemetryAccumulator = 0;
    this.latest = physics.telemetry(0);
  }
  step(dt, time) {
    this.latest = this.physics.step(dt, time);
    this.telemetryAccumulator += dt;
    if (this.telemetryAccumulator >= this.telemetryInterval) {
      this.telemetryAccumulator %= this.telemetryInterval;
      this.measurements.sample(time, this.latest);
      this.dispatchEvent(new CustomEvent('telemetry', { detail: this.latest }));
    }
    return this.latest;
  }
  reset() {
    this.physics.reset();
    this.measurements.clear();
    this.telemetryAccumulator = 0;
    this.latest = this.physics.telemetry(0);
  }
}
