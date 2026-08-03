export function pointerToNdc(event, element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) throw new Error('Viewport has no drawable size');
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  };
}

export function createPickingController({ THREE, camera, domElement, objects, filter = object => object.visible !== false, onSelection = () => {} }) {
  if (!THREE?.Raycaster || !THREE?.Vector2) throw new TypeError('THREE Raycaster and Vector2 are required');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selected = null;
  const pick = event => {
    const ndc = pointerToNdc(event, domElement);
    pointer.set(ndc.x, ndc.y);
    raycaster.setFromCamera(pointer, camera);
    const roots = typeof objects === 'function' ? objects() : objects;
    const hit = raycaster.intersectObjects((roots || []).filter(filter), true)[0] || null;
    selected = hit?.object || null;
    onSelection(selected, hit, event);
    return { object: selected, hit };
  };
  const clear = () => { selected = null; onSelection(null, null, null); };
  domElement.addEventListener('pointerdown', pick);
  return { pick, clear, get selected() { return selected; }, destroy() { domElement.removeEventListener('pointerdown', pick); selected = null; } };
}

export function createGizmoTransaction({ readState, applyState, history }) {
  let start = null;
  let active = false;
  return {
    begin() { if (active) throw new Error('Transform already active'); start = readState(); active = true; },
    preview(nextState) { if (!active) throw new Error('No active transform'); applyState(nextState); },
    commit(label = 'Transform') { if (!active) return false; const finalState = readState(); active = false; start = null; return history.commit(finalState, label); },
    cancel() { if (!active) return false; applyState(start); active = false; start = null; return true; },
    get active() { return active; }
  };
}
