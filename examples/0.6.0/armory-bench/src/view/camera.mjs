/**
 * Bounded orbit inspection camera (planning §5).
 *
 * Free rotation, but never unbounded: the polar angle stops short of the poles so
 * the model cannot flip, the dolly is clamped between a close-inspection and a
 * full-assembly distance, and panning is restricted to a box around the subject
 * so the weapon can never leave the frame.
 *
 * DIRECTION CONVENTION — object-follows-pointer:
 *   drag right -> the weapon turns right      (azimuth decreases)
 *   drag left  -> the weapon turns left
 *   drag up    -> the underside rotates toward the viewer
 *   drag down  -> the topside rotates toward the viewer
 * Pointer drag and keyboard orbit use the same signs and the same sensitivity
 * scale. `invertX` / `invertY` expose the choice rather than hiding it in a sign.
 */

import { Vector3, Spherical, MathUtils } from '../../vendor/three/three.module.min.js';

export const CAMERA_LIMITS = {
  radius: [0.26, 2.20],
  polar: [0.16, Math.PI - 0.16],
  panBox: { x: 0.30, y: 0.20, z: 0.24 }
};

export function createInspectCamera(camera, element, options = {}) {
  const home = {
    azimuth: options.azimuth ?? 0.72,
    polar: options.polar ?? 1.09,
    radius: options.radius ?? 1.02,
    centre: new Vector3(0.09, 0.0, 0)
  };

  const state = {
    azimuth: home.azimuth,
    polar: home.polar,
    radius: home.radius,
    centre: home.centre.clone(),
    goalAzimuth: home.azimuth,
    goalPolar: home.polar,
    goalRadius: home.radius,
    goalCentre: home.centre.clone(),
    origin: home.centre.clone(),   // the box the pan offset is measured from
    invertX: false,
    invertY: false,
    sensitivity: 0.0092,
    enabled: true,
    focusSlot: null,
    dragging: null
  };

  const spherical = new Spherical();
  const position = new Vector3();
  const pointers = new Map();
  let pinchDistance = 0;

  function clampGoals() {
    state.goalPolar = MathUtils.clamp(state.goalPolar, CAMERA_LIMITS.polar[0], CAMERA_LIMITS.polar[1]);
    state.goalRadius = MathUtils.clamp(state.goalRadius, CAMERA_LIMITS.radius[0], CAMERA_LIMITS.radius[1]);
    const box = CAMERA_LIMITS.panBox;
    state.goalCentre.x = MathUtils.clamp(state.goalCentre.x, state.origin.x - box.x, state.origin.x + box.x);
    state.goalCentre.y = MathUtils.clamp(state.goalCentre.y, state.origin.y - box.y, state.origin.y + box.y);
    state.goalCentre.z = MathUtils.clamp(state.goalCentre.z, state.origin.z - box.z, state.origin.z + box.z);
  }

  function orbit(dx, dy) {
    const scale = state.sensitivity;
    state.goalAzimuth -= (state.invertX ? -dx : dx) * scale;
    state.goalPolar -= (state.invertY ? -dy : dy) * scale;
    state.focusSlot = null;
    clampGoals();
  }

  function pan(dx, dy) {
    // pan in the camera's screen plane, scaled by distance so it feels constant
    const scale = state.radius * 0.0016;
    const right = new Vector3().setFromMatrixColumn(camera.matrix, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrix, 1);
    state.goalCentre.addScaledVector(right, -dx * scale);
    state.goalCentre.addScaledVector(up, dy * scale);
    state.focusSlot = null;
    clampGoals();
  }

  function dolly(delta) {
    state.goalRadius *= Math.pow(0.94, -delta);
    clampGoals();
  }

  function onPointerDown(event) {
    if (!state.enabled) return;
    element.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      state.dragging = event.button === 2 || event.shiftKey ? 'pan' : 'orbit';
    } else if (pointers.size === 2) {
      state.dragging = 'pinch';
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(event) {
    const previous = pointers.get(event.pointerId);
    if (!previous || !state.enabled) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.dragging === 'orbit') orbit(dx, dy);
    else if (state.dragging === 'pan') pan(dx, dy);
    else if (state.dragging === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      dolly((distance - pinchDistance) * 0.04);
      pinchDistance = distance;
      pan(dx * 0.5, dy * 0.5);
    }
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId);
    element.releasePointerCapture?.(event.pointerId);
    if (pointers.size === 0) state.dragging = null;
    else if (pointers.size === 1) state.dragging = 'orbit';
  }

  function onWheel(event) {
    if (!state.enabled) return;
    event.preventDefault();
    dolly(-event.deltaY * 0.0022);
  }

  /** Keyboard orbit — same direction convention and scale as the drag path. */
  function nudge(action) {
    const step = 42;
    switch (action) {
      case 'left': orbit(-step, 0); break;
      case 'right': orbit(step, 0); break;
      case 'up': orbit(0, -step); break;
      case 'down': orbit(0, step); break;
      case 'in': dolly(1.1); break;
      case 'out': dolly(-1.1); break;
      case 'home': reset(); break;
      default: break;
    }
  }

  /** Spring the orbit centre onto a slot and pull in to inspection distance. */
  function focusOn(point, slotId = null, radius = 0.46) {
    if (!point) return;
    state.origin.copy(point);
    state.goalCentre.copy(point);
    state.goalRadius = MathUtils.clamp(radius, CAMERA_LIMITS.radius[0], CAMERA_LIMITS.radius[1]);
    state.focusSlot = slotId;
    clampGoals();
  }

  /**
   * Re-centre on the whole assembly without changing the viewing angle.
   * The subject is long and the viewport is often taller than it is wide, so the
   * distance is driven by whichever field of view is narrower — otherwise the
   * muzzle and buttpad fall outside the frame on a portrait-ish panel.
   */
  function frame(box, margin = 1.06) {
    if (!box) return;
    const centre = new Vector3();
    box.getCenter(centre);
    const size = new Vector3();
    box.getSize(size);
    const radius = size.length() * 0.5;                     // bounding sphere
    const fovVertical = (camera.fov * Math.PI) / 180;
    const fovHorizontal = 2 * Math.atan(Math.tan(fovVertical / 2) * Math.max(0.2, camera.aspect));
    const fov = Math.min(fovVertical, fovHorizontal);
    const distance = (radius / Math.tan(fov / 2)) * margin;
    state.origin.copy(centre);
    state.goalCentre.copy(centre);
    state.goalRadius = MathUtils.clamp(distance, CAMERA_LIMITS.radius[0], CAMERA_LIMITS.radius[1]);
    state.focusSlot = null;
    clampGoals();
  }

  function reset() {
    state.goalAzimuth = home.azimuth;
    state.goalPolar = home.polar;
    state.goalRadius = home.radius;
    state.origin.copy(home.centre);
    state.goalCentre.copy(home.centre);
    state.focusSlot = null;
  }

  function update(dt) {
    const k = 1 - Math.exp(-dt * 9.5);
    state.azimuth += (state.goalAzimuth - state.azimuth) * k;
    state.polar += (state.goalPolar - state.polar) * k;
    state.radius += (state.goalRadius - state.radius) * k;
    state.centre.lerp(state.goalCentre, k);

    spherical.set(state.radius, state.polar, state.azimuth);
    position.setFromSpherical(spherical).add(state.centre);
    camera.position.copy(position);
    camera.lookAt(state.centre);
  }

  /** Deterministic pose for verification and capture. */
  function setPose({ azimuth, polar, radius, centre }) {
    if (Number.isFinite(azimuth)) { state.azimuth = azimuth; state.goalAzimuth = azimuth; }
    if (Number.isFinite(polar)) { state.polar = polar; state.goalPolar = polar; }
    if (Number.isFinite(radius)) { state.radius = radius; state.goalRadius = radius; }
    if (centre) { state.centre.copy(centre); state.goalCentre.copy(centre); state.origin.copy(centre); }
    clampGoals();
    update(1);
  }

  function report() {
    return {
      azimuth: Number(state.azimuth.toFixed(4)),
      polar: Number(state.polar.toFixed(4)),
      radius: Number(state.radius.toFixed(4)),
      centre: [state.centre.x, state.centre.y, state.centre.z].map(v => Number(v.toFixed(4))),
      limits: CAMERA_LIMITS,
      convention: 'object-follows-pointer',
      invertX: state.invertX,
      invertY: state.invertY,
      atRadiusLimit: state.radius <= CAMERA_LIMITS.radius[0] + 1e-4 || state.radius >= CAMERA_LIMITS.radius[1] - 1e-4,
      atPolarLimit: state.polar <= CAMERA_LIMITS.polar[0] + 1e-4 || state.polar >= CAMERA_LIMITS.polar[1] - 1e-4
    };
  }

  const listeners = [
    ['pointerdown', onPointerDown],
    ['pointermove', onPointerMove],
    ['pointerup', onPointerUp],
    ['pointercancel', onPointerUp],
    ['wheel', onWheel]
  ];
  for (const [type, handler] of listeners) {
    element.addEventListener(type, handler, type === 'wheel' ? { passive: false } : undefined);
  }
  const blockContext = event => event.preventDefault();
  element.addEventListener('contextmenu', blockContext);

  function dispose() {
    for (const [type, handler] of listeners) element.removeEventListener(type, handler);
    element.removeEventListener('contextmenu', blockContext);
    pointers.clear();
  }

  return {
    state, update, focusOn, frame, reset, nudge, setPose, report, dispose,
    setInversion(x, y) { state.invertX = Boolean(x); state.invertY = Boolean(y); },
    setEnabled(value) { state.enabled = Boolean(value); },
    get dragging() { return state.dragging; }
  };
}
