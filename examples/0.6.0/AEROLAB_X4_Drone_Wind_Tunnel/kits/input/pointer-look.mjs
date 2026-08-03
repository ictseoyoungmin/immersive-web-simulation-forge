const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function createPointerLook({ element, initial = {}, onChange, onClick, enabled = true } = {}) {
  if (!(element instanceof Element)) throw new TypeError('element is required');
  const state = {
    yaw: initial.yaw ?? -0.52,
    pitch: initial.pitch ?? .18,
    distance: initial.distance ?? 4.75,
    target: [...(initial.target ?? [0, 2.08, 0])]
  };
  let dragging = false, moved = false, pointerId = null, lastX = 0, lastY = 0, active = enabled;
  const aborter = new AbortController();
  const emit = () => onChange?.({ ...state, target: [...state.target] });
  element.style.touchAction = 'none';
  element.addEventListener('pointerdown', event => {
    if (!active || event.button !== 0) return;
    dragging = true; moved = false; pointerId = event.pointerId; lastX = event.clientX; lastY = event.clientY;
    try { element.setPointerCapture(pointerId); } catch {}
  }, { signal: aborter.signal });
  element.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY; lastX = event.clientX; lastY = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    // Direction contract: drag right turns the camera right; drag up looks up.
    state.yaw -= dx * .0062;
    state.pitch = clamp(state.pitch + dy * .0052, -1.12, 1.18);
    emit();
  }, { signal: aborter.signal });
  const end = event => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    try { element.releasePointerCapture(pointerId); } catch {}
    if (!moved) onClick?.(event);
  };
  element.addEventListener('pointerup', end, { signal: aborter.signal });
  element.addEventListener('pointercancel', end, { signal: aborter.signal });
  element.addEventListener('wheel', event => {
    if (!active) return; event.preventDefault();
    state.distance = clamp(state.distance * Math.exp(event.deltaY * .0011), 2.4, 16); emit();
  }, { signal: aborter.signal, passive: false });
  element.addEventListener('dblclick', () => { state.target = [0, 2.08, 0]; state.distance = 4.75; emit(); }, { signal: aborter.signal });
  emit();
  return {
    get state(){return {...state,target:[...state.target]}},
    setTarget(target){state.target=[...target];emit();},
    setEnabled(value){active=!!value;},
    destroy(){aborter.abort();}
  };
}
