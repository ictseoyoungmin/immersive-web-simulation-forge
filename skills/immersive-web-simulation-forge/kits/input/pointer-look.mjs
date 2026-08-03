/**
 * Host-safe pointer look. Standard defaults: moving right turns right and
 * moving up looks up. Drag and pointer-lock paths share the same sign rules.
 */
export function createPointerLook(options) {
  const element = options?.element;
  if (!element) throw new Error('createPointerLook requires an element');
  const state = {
    yaw: options.yaw || 0,
    pitch: options.pitch || 0,
    sensitivityX: options.sensitivityX || 0.002,
    sensitivityY: options.sensitivityY || 0.002,
    invertX: Boolean(options.invertX),
    invertY: Boolean(options.invertY),
    dragging: false,
    pointerId: null,
    x: 0,
    y: 0
  };
  const minPitch = options.minPitch ?? -Math.PI * 0.48;
  const maxPitch = options.maxPitch ?? Math.PI * 0.48;
  const listeners = [];
  const on = (target, type, handler, config) => {
    target.addEventListener(type, handler, config);
    listeners.push(() => target.removeEventListener(type, handler, config));
  };
  const emit = () => options.onChange?.({ yaw: state.yaw, pitch: state.pitch });

  function applyDelta(dx, dy) {
    // Positive mouse X means turn right in the default convention.
    state.yaw += dx * state.sensitivityX * (state.invertX ? -1 : 1);
    // Screen Y grows downward, so positive dy normally lowers the view.
    state.pitch -= dy * state.sensitivityY * (state.invertY ? -1 : 1);
    state.pitch = Math.max(minPitch, Math.min(maxPitch, state.pitch));
    emit();
  }

  on(element, 'pointerdown', event => {
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.x = event.clientX;
    state.y = event.clientY;
    try { element.setPointerCapture?.(event.pointerId); } catch {}
  });
  on(window, 'pointerup', event => {
    if (event.pointerId !== state.pointerId) return;
    state.dragging = false;
    try { element.releasePointerCapture?.(event.pointerId); } catch {}
    state.pointerId = null;
  });
  on(window, 'pointermove', event => {
    if (document.pointerLockElement === element) {
      applyDelta(event.movementX || 0, event.movementY || 0);
      return;
    }
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    state.x = event.clientX;
    state.y = event.clientY;
    applyDelta(dx, dy);
  });

  async function requestLock() {
    if (!element.requestPointerLock) return false;
    try {
      const result = element.requestPointerLock({ unadjustedMovement: true });
      if (result?.catch) await result.catch(() => element.requestPointerLock());
      return true;
    } catch {
      try { element.requestPointerLock(); return true; } catch { return false; }
    }
  }

  function setInversion({ x = state.invertX, y = state.invertY } = {}) {
    state.invertX = Boolean(x);
    state.invertY = Boolean(y);
  }
  function destroy() { listeners.splice(0).forEach(off => off()); }
  return { state, applyDelta, requestLock, setInversion, destroy };
}
