import { createLifecycle } from '../../kits/runtime/lifecycle.mjs';

export function createSimulation({ container, hostApi, initialState }) {
  const life = createLifecycle(container);
  let state = initialState;

  return {
    mount() { life.mount(); },
    update(nextState) { state = nextState; },
    resize(width, height, dpr) { life.resize(width, height, dpr); },
    suspend(reason = 'hidden') { life.suspend(reason); },
    resume() { life.resume(); },
    destroy() { life.destroy(); },
    get state() { return state; }
  };
}
