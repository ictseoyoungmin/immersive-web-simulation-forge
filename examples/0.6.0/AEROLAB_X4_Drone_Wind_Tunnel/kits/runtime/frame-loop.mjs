export function createFrameLoop({ update, render, fixedStep = 1 / 120, maxDelta = 0.1, maxSteps = 12, onFrameStats } = {}) {
  if (typeof update !== 'function' || typeof render !== 'function') throw new TypeError('update and render callbacks are required');
  let raf = 0, running = false, suspended = false, previous = 0, accumulator = 0, time = 0;
  let frameCount = 0, statsTime = 0, fps = 60, droppedTime = 0, lastSteps = 0;

  const tick = now => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (suspended) { previous = now; return; }
    const delta = previous ? Math.min(maxDelta, (now - previous) / 1000) : fixedStep;
    previous = now; accumulator += delta; statsTime += delta; frameCount++;
    let steps = 0;
    while (accumulator >= fixedStep && steps < maxSteps) {
      update(fixedStep, time); time += fixedStep; accumulator -= fixedStep; steps++;
    }
    if (steps === maxSteps && accumulator >= fixedStep) { droppedTime += accumulator; accumulator = 0; }
    lastSteps = steps;
    render(accumulator / fixedStep, time, delta);
    if (statsTime >= .5) {
      fps = frameCount / statsTime;
      onFrameStats?.({ fps, frameCount, elapsed: statsTime, steps: lastSteps, droppedTime, simulationTime: time });
      frameCount = 0; statsTime = 0; droppedTime = 0;
    }
  };

  return {
    start() { if (!running) { running = true; previous = 0; raf = requestAnimationFrame(tick); } },
    suspend() { suspended = true; },
    resume() { suspended = false; previous = 0; },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    reset() { accumulator = 0; previous = 0; time = 0; frameCount = 0; statsTime = 0; },
    setTime(value) { time = Math.max(0, Number(value) || 0); },
    get running() { return running; }, get suspended() { return suspended; }, get time() { return time; }, get fps() { return fps; }
  };
}
