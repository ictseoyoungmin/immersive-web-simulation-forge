export function createFrameLoop({ update, render, fixedStep = 1 / 60, maxDelta = 0.1, maxSteps = 4 } = {}) {
  if (typeof update !== 'function' || typeof render !== 'function') {
    throw new TypeError('update and render callbacks are required');
  }

  let raf = 0;
  let running = false;
  let suspended = false;
  let previous = 0;
  let accumulator = 0;
  let time = 0;
  let wallTime = 0;
  let droppedTime = 0;

  const tick = now => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (suspended) { previous = now; return; }

    const wallDelta = previous ? Math.max(0, (now - previous) / 1000) : fixedStep;
    const simulationDelta = Math.min(maxDelta, wallDelta);
    previous = now;
    wallTime += wallDelta;
    accumulator += simulationDelta;
    let steps = 0;
    while (accumulator >= fixedStep && steps < maxSteps) {
      update(fixedStep, time);
      time += fixedStep;
      accumulator -= fixedStep;
      steps += 1;
    }
    let droppedSeconds = 0;
    if (steps === maxSteps && accumulator >= fixedStep) {
      droppedSeconds = accumulator;
      droppedTime += droppedSeconds;
      accumulator = 0;
    }
    render(accumulator / fixedStep, time, simulationDelta, {
      now: now / 1000,
      wallDelta,
      simulationDelta,
      steps,
      droppedSeconds,
      wallTime,
      simulationTime: time,
      droppedTime
    });
  };

  return {
    start() { if (!running) { running = true; previous = 0; raf = requestAnimationFrame(tick); } },
    suspend() { suspended = true; },
    resume() { suspended = false; previous = 0; },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    reset() { accumulator = 0; previous = 0; time = 0; wallTime = 0; droppedTime = 0; },
    get running() { return running; },
    get suspended() { return suspended; },
    get time() { return time; },
    get wallTime() { return wallTime; },
    get droppedTime() { return droppedTime; }
  };
}
