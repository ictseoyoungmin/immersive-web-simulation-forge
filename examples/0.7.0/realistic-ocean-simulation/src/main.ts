import './style.css';
import {
  OceanController,
  PRESETS,
  allFinite,
  bearingFromDirection,
  cloneState,
  createDefaultState,
  currentDrift,
  directionFromBearing,
  evaluateWaveAt,
  parseState,
  serializeState,
  windEnergyScale,
  type OceanState,
  type PresetName,
  type QualityPreset,
} from './ocean-state';
import { PelagicWorld } from './world';

type EvidenceView =
  | 'hero'
  | 'three-quarter'
  | 'side-or-rear'
  | 'close-material'
  | 'contact'
  | 'representative-near'
  | 'representative-mid'
  | 'gust-event'
  | 'recovery';

interface WorkflowEvidence {
  status: 'pass' | 'fail';
  scenario: string;
  steps: Record<string, boolean>;
  snapshots: Record<string, unknown>;
}

interface ForgeHooks {
  ready: boolean;
  setCaptureMode: (enabled: boolean, preset?: QualityPreset) => unknown;
  prepareVerification: (scenario?: string) => unknown;
  verifyWorkflow: (scenario?: string) => WorkflowEvidence;
  verifyDomain: (scenario?: string) => unknown;
  prepareEvidenceView: (view: EvidenceView, scenario?: string) => unknown;
  reportScene: () => unknown;
  reportSpatialEvidence: () => unknown;
  reportAssetEvidence: () => unknown;
  reportFidelity: () => unknown;
  reportPerformance: () => unknown;
  serializeState: () => string;
  loadState: (serialized: string) => unknown;
  resetRecovery: () => unknown;
  suspend: () => void;
  resume: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    __FORGE__?: ForgeHooks;
    __PELAGIC_READY__?: boolean;
  }
}

const FIXED_STEP_S = 1 / 60;
const MAX_CATCH_UP_STEPS = 6;

const requireElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
};

const canvas = requireElement<HTMLCanvasElement>('#ocean-canvas');
const statusSurface = requireElement<HTMLElement>('#system-status');
const statusTitle = requireElement<HTMLElement>('#system-status-title');
const statusCopy = requireElement<HTMLElement>('#system-status-copy');
const recoveryButton = requireElement<HTMLButtonElement>('#recovery-button');

function showSystemStatus(title: string, copy: string): void {
  statusTitle.textContent = title;
  statusCopy.textContent = copy;
  statusSurface.hidden = false;
  document.body.classList.add('has-system-status');
}

function hideSystemStatus(): void {
  statusSurface.hidden = true;
  document.body.classList.remove('has-system-status');
}

const context = canvas.getContext('webgl2', {
  antialias: true,
  alpha: false,
  depth: true,
  stencil: false,
  powerPreference: 'high-performance',
});

if (!context) {
  showSystemStatus(
    'This ocean needs WebGL 2.0',
    'Try a current browser with hardware acceleration enabled. The fallback is explicit because a static image would misrepresent the living simulation.',
  );
  recoveryButton.addEventListener('click', () => window.location.reload());
  window.__PELAGIC_READY__ = false;
} else {
  const controller = new OceanController();
  const world = new PelagicWorld(canvas, context, controller.snapshot());
  let destroyed = false;
  let userPaused = false;
  let contextLost = false;
  let visibilitySuspended = document.hidden;
  let accumulatorS = 0;
  let lastTimestampMs = performance.now();
  let animationFrame = 0;
  let lastUiUpdateS = -1;
  let nextAutoGustS = 34;
  let pointerDragging = false;
  let pointerX = 0;
  let pointerY = 0;
  const startedAtMs = performance.now();
  const wallFrameSamplesMs: number[] = [];

  const drawerToggle = requireElement<HTMLButtonElement>('#drawer-toggle');
  const drawerClose = requireElement<HTMLButtonElement>('#drawer-close');
  const drawer = requireElement<HTMLElement>('#conditions-drawer');
  const conditionLabel = requireElement<HTMLElement>('#condition-label');
  const conditionDetail = requireElement<HTMLElement>('#condition-detail');
  const presetStatus = requireElement<HTMLElement>('#preset-status');
  const windInput = requireElement<HTMLInputElement>('#wind-speed');
  const windDirectionInput = requireElement<HTMLInputElement>('#wind-direction');
  const swellInput = requireElement<HTMLInputElement>('#swell-amplitude');
  const currentInput = requireElement<HTMLInputElement>('#current-speed');
  const windOutput = requireElement<HTMLOutputElement>('#wind-output');
  const windDirectionOutput = requireElement<HTMLOutputElement>('#wind-dir-output');
  const swellOutput = requireElement<HTMLOutputElement>('#swell-output');
  const currentOutput = requireElement<HTMLOutputElement>('#current-output');
  const qualitySelect = requireElement<HTMLSelectElement>('#quality-select');
  const cinematicButton = requireElement<HTMLButtonElement>('#cinematic-button');
  const pauseButton = requireElement<HTMLButtonElement>('#pause-button');
  const gustButton = requireElement<HTMLButtonElement>('#gust-button');
  const resetButton = requireElement<HTMLButtonElement>('#reset-button');
  const eventToast = requireElement<HTMLElement>('#event-toast');
  const eventPhase = requireElement<HTMLElement>('#event-phase');
  const presetButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-preset]')];

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyReducedMotion = (reduced: boolean): void => {
    world.setReducedMotion(reduced);
    document.documentElement.dataset.reducedMotion = String(reduced);
    if (reduced) world.setCinematic(false);
    cinematicButton.classList.toggle('is-on', world.isCinematic());
    cinematicButton.setAttribute('aria-pressed', String(world.isCinematic()));
  };
  applyReducedMotion(motionQuery.matches);
  const motionListener = (event: MediaQueryListEvent): void => applyReducedMotion(event.matches);
  motionQuery.addEventListener('change', motionListener);

  function signedCurrentSpeed(state: Readonly<OceanState>): number {
    const c = Math.cos(-0.22);
    const s = Math.sin(-0.22);
    const direction = {
      x: state.windDirection.x * c - state.windDirection.z * s,
      z: state.windDirection.x * s + state.windDirection.z * c,
    };
    return state.currentMps.x * direction.x + state.currentMps.z * direction.z;
  }

  function readablePreset(state: Readonly<OceanState>): string {
    return state.preset === 'custom' ? 'CUSTOM WEATHER' : state.preset.replace('-', ' ').toUpperCase();
  }

  function updateInterface(force = false): void {
    const state = controller.state;
    if (!force && state.timeS - lastUiUpdateS < 0.25) return;
    lastUiUpdateS = state.timeS;
    conditionLabel.textContent = readablePreset(state);
    conditionDetail.textContent = `WIND ${state.windSpeedMps.toFixed(1)} M/S`;
    presetStatus.textContent = state.preset === 'custom' ? 'MODIFIED' : state.preset === 'golden-swell' ? 'DEFAULT' : 'PRESET';
    windInput.value = state.windSpeedMps.toFixed(1);
    windDirectionInput.value = Math.round(bearingFromDirection(state.windDirection)).toString();
    swellInput.value = state.swellAmplitudeM.toFixed(2);
    currentInput.value = signedCurrentSpeed(state).toFixed(2);
    qualitySelect.value = state.quality;
    windOutput.textContent = `${state.windSpeedMps.toFixed(1)} m/s`;
    windDirectionOutput.textContent = `${Math.round(bearingFromDirection(state.windDirection))}°`;
    swellOutput.textContent = `${state.swellAmplitudeM.toFixed(2)} m`;
    currentOutput.textContent = `${signedCurrentSpeed(state).toFixed(2)} m/s`;
    presetButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.preset === state.preset));

    const gust = state.gust;
    eventToast.classList.toggle('is-visible', gust.active || gust.trace > 0.18);
    if (gust.active) {
      if (gust.ageS < 1.25) eventPhase.textContent = 'THE FRONT IS GATHERING';
      else if (gust.ageS < 4.2) eventPhase.textContent = 'CREST ENERGY RISING';
      else if (gust.ageS < 8.5) eventPhase.textContent = 'MOVING THROUGH THE FIELD';
      else eventPhase.textContent = 'LIGHT AND FOAM REMAIN';
    } else {
      eventPhase.textContent = 'A FOAM TRACE IS FADING';
    }
  }

  function setDrawer(open: boolean): void {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawerToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('drawer-open', open);
    if (open) drawerClose.focus({ preventScroll: true });
    else if (document.activeElement && drawer.contains(document.activeElement)) drawerToggle.focus({ preventScroll: true });
  }

  function setPaused(paused: boolean): void {
    userPaused = paused;
    pauseButton.classList.toggle('is-on', paused);
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.lastChild!.textContent = paused ? ' Resume' : ' Pause';
    document.body.classList.toggle('is-paused', paused);
  }

  function triggerGust(): void {
    controller.triggerGust();
    nextAutoGustS = controller.state.timeS + 74;
    updateInterface(true);
  }

  function resetExperience(): void {
    controller.reset();
    world.resetCamera();
    setPaused(false);
    nextAutoGustS = controller.state.timeS + 34;
    cinematicButton.classList.toggle('is-on', world.isCinematic());
    cinematicButton.setAttribute('aria-pressed', String(world.isCinematic()));
    updateInterface(true);
  }

  function deterministicAdvance(seconds: number): void {
    const steps = Math.max(0, Math.round(seconds / FIXED_STEP_S));
    for (let index = 0; index < steps; index += 1) {
      const state = controller.step(FIXED_STEP_S);
      world.fixedUpdate(state, FIXED_STEP_S);
    }
    world.render(controller.state);
    updateInterface(true);
  }

  drawerToggle.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  drawerClose.addEventListener('click', () => setDrawer(false));
  presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.preset as PresetName;
      controller.applyPreset(name);
      updateInterface(true);
    });
  });
  windInput.addEventListener('input', () => controller.patch({ windSpeedMps: Number(windInput.value) }));
  windDirectionInput.addEventListener('input', () => controller.setWindBearing(Number(windDirectionInput.value)));
  swellInput.addEventListener('input', () => controller.patch({ swellAmplitudeM: Number(swellInput.value) }));
  currentInput.addEventListener('input', () => controller.setCurrentAlongWind(Number(currentInput.value)));
  qualitySelect.addEventListener('change', () => controller.setQuality(qualitySelect.value as QualityPreset));
  gustButton.addEventListener('click', triggerGust);
  resetButton.addEventListener('click', resetExperience);
  pauseButton.addEventListener('click', () => setPaused(!userPaused));
  cinematicButton.addEventListener('click', () => {
    world.setCinematic(!world.isCinematic());
    cinematicButton.classList.toggle('is-on', world.isCinematic());
    cinematicButton.setAttribute('aria-pressed', String(world.isCinematic()));
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerDragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointerDragging) return;
    world.orbitBy(event.clientX - pointerX, event.clientY - pointerY);
    pointerX = event.clientX;
    pointerY = event.clientY;
    cinematicButton.classList.remove('is-on');
    cinematicButton.setAttribute('aria-pressed', 'false');
  });
  const stopPointer = (event: PointerEvent): void => {
    if (!pointerDragging) return;
    pointerDragging = false;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', stopPointer);
  canvas.addEventListener('pointercancel', stopPointer);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    world.zoomBy(event.deltaY);
  }, { passive: false });

  const keyHandler = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === 'Escape') setDrawer(false);
    if (event.key === ' ' && !event.repeat) {
      event.preventDefault();
      setPaused(!userPaused);
    }
    if (event.key.toLowerCase() === 'g' && !event.repeat) triggerGust();
    if (event.key.toLowerCase() === 'c' && !event.repeat) {
      world.setCinematic(!world.isCinematic());
      cinematicButton.classList.toggle('is-on', world.isCinematic());
      cinematicButton.setAttribute('aria-pressed', String(world.isCinematic()));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      resetExperience();
    }
  };
  window.addEventListener('keydown', keyHandler);

  const resizeObserver = new ResizeObserver(() => world.resize());
  resizeObserver.observe(canvas);
  const resizeHandler = (): void => world.resize();
  window.addEventListener('resize', resizeHandler);

  const visibilityHandler = (): void => {
    visibilitySuspended = document.hidden;
    if (visibilitySuspended) world.suspend();
    else if (!contextLost) {
      lastTimestampMs = performance.now();
      accumulatorS = 0;
      world.resume();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  const contextLostHandler = (event: Event): void => {
    event.preventDefault();
    contextLost = true;
    world.suspend();
    showSystemStatus('The ocean is resting', 'The graphics context was interrupted. The canonical ocean state is safe; use Try again after the browser restores it.');
  };
  const contextRestoredHandler = (): void => {
    contextLost = false;
    hideSystemStatus();
    lastTimestampMs = performance.now();
    world.resume();
  };
  canvas.addEventListener('webglcontextlost', contextLostHandler);
  canvas.addEventListener('webglcontextrestored', contextRestoredHandler);
  recoveryButton.addEventListener('click', () => {
    if (!contextLost) hideSystemStatus();
    else showSystemStatus('Waiting for the ocean renderer', 'The browser has not restored WebGL yet. Your canonical state remains intact.');
  });

  function frame(timestampMs: number): void {
    if (destroyed) return;
    const rawWallDeltaMs = Math.max(0, timestampMs - lastTimestampMs);
    lastTimestampMs = timestampMs;
    if (timestampMs - startedAtMs > 1500 && rawWallDeltaMs > 0 && rawWallDeltaMs < 250 && !visibilitySuspended) {
      wallFrameSamplesMs.push(rawWallDeltaMs);
      if (wallFrameSamplesMs.length > 1800) wallFrameSamplesMs.splice(0, wallFrameSamplesMs.length - 1800);
    }

    if (!userPaused && !visibilitySuspended && !contextLost) {
      accumulatorS += Math.min(rawWallDeltaMs / 1000, 0.25);
      let steps = 0;
      while (accumulatorS >= FIXED_STEP_S && steps < MAX_CATCH_UP_STEPS) {
        const state = controller.step(FIXED_STEP_S);
        world.fixedUpdate(state, FIXED_STEP_S);
        accumulatorS -= FIXED_STEP_S;
        steps += 1;
      }
      if (steps === MAX_CATCH_UP_STEPS && accumulatorS >= FIXED_STEP_S) accumulatorS %= FIXED_STEP_S;
      if (controller.state.timeS >= nextAutoGustS && !controller.state.gust.active) triggerGust();
    }

    world.render(controller.state);
    updateInterface();
    animationFrame = requestAnimationFrame(frame);
  }

  function percentile(values: number[], proportion: number): number | null {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * proportion) - 1));
    return sorted[index] ?? null;
  }

  function verifyWorkflow(scenario = 'ambient-loop'): WorkflowEvidence {
    const probe = new OceanController();
    const arrival = probe.snapshot();
    for (let index = 0; index < 120; index += 1) probe.step(FIXED_STEP_S);
    const evolved = probe.snapshot();
    probe.triggerGust();
    for (let index = 0; index < 330; index += 1) probe.step(FIXED_STEP_S);
    const event = probe.snapshot();
    for (let index = 0; index < 480; index += 1) probe.step(FIXED_STEP_S);
    const trace = probe.snapshot();
    const beforeResetRevision = trace.revision;
    const recovered = probe.reset();
    const steps = {
      stateArrival: arrival.preset === 'golden-swell' && arrival.timeS === 0,
      evolution: evolved.timeS > arrival.timeS && evaluateWaveAt(evolved, 0, -120).heightM !== evaluateWaveAt(arrival, 0, -120).heightM,
      weatherEvent: event.gust.active && event.gust.drive > 0.1,
      persistentTrace: trace.gust.trace > 0 && !trace.gust.active,
      resetRecovery: recovered.preset === 'golden-swell' && recovered.timeS === 0 && recovered.gust.trace === 0 && recovered.revision === beforeResetRevision + 1,
    };
    return {
      status: Object.values(steps).every(Boolean) ? 'pass' : 'fail',
      scenario,
      steps,
      snapshots: {
        arrival: { preset: arrival.preset, timeS: arrival.timeS },
        evolution: { timeS: evolved.timeS },
        event: { ageS: event.gust.ageS, drive: event.gust.drive },
        trace: { active: trace.gust.active, trace: trace.gust.trace },
        recovery: { preset: recovered.preset, timeS: recovered.timeS, trace: recovered.gust.trace },
      },
    };
  }

  const hooks: ForgeHooks = {
    ready: true,
    setCaptureMode(enabled, preset = 'presentation') {
      world.setCaptureMode(enabled, preset);
      return world.reportFidelity();
    },
    prepareVerification(scenario = 'default') {
      controller.reset();
      world.resetCamera();
      world.setCaptureMode(true, 'presentation');
      if (scenario === 'storm-front') controller.applyPreset('storm-front', 0);
      if (scenario === 'gust-event') {
        controller.triggerGust();
        deterministicAdvance(2.7);
      } else deterministicAdvance(2);
      return { status: 'ready', scenario, state: controller.snapshot(), fidelity: world.reportFidelity() };
    },
    verifyWorkflow,
    verifyDomain(scenario = 'canonical-state') {
      const base = createDefaultState();
      const serialized = serializeState(base);
      const roundTrip = parseState(serialized);
      const first = new OceanController(base);
      const second = new OceanController(base);
      first.triggerGust();
      second.triggerGust();
      for (let index = 0; index < 360; index += 1) {
        first.step(FIXED_STEP_S);
        second.step(FIXED_STEP_S);
      }
      const zeroWind = cloneState(base);
      zeroWind.windSpeedMps = 0;
      const positive = cloneState(base);
      const negative = cloneState(base);
      positive.currentMps = { x: 0.4, z: -0.2 };
      negative.currentMps = { x: -0.4, z: 0.2 };
      const checks = {
        finite: allFinite(first.snapshot()),
        serializationRoundTrip: JSON.stringify(roundTrip) === JSON.stringify(base),
        deterministicReplay: JSON.stringify(first.snapshot()) === JSON.stringify(second.snapshot()),
        zeroWindLimit: windEnergyScale(zeroWind) === 0,
        reverseCurrentInvariance:
          currentDrift(positive).x === -currentDrift(negative).x &&
          currentDrift(positive).z === -currentDrift(negative).z &&
          JSON.stringify(positive.swellDirection) === JSON.stringify(negative.swellDirection),
      };
      return {
        status: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
        scenario,
        claimLevel: 'visual-concept',
        checks,
        limitations: [
          'Directional spectral approximation, not FFT or a Navier-Stokes solver.',
          'No bathymetry, wave-island coupling, forecast, navigation, or engineering validity.',
        ],
      };
    },
    prepareEvidenceView(view, scenario = 'golden-swell') {
      controller.reset();
      controller.applyPreset(scenario === 'storm-front' ? 'storm-front' : 'golden-swell', 0);
      world.setCaptureMode(true, 'presentation');
      if (view === 'gust-event') {
        controller.triggerGust();
        deterministicAdvance(2.8);
      } else if (view === 'recovery') {
        controller.triggerGust();
        deterministicAdvance(12.5);
      } else deterministicAdvance(2.2);
      return {
        ...world.prepareEvidenceView(view, controller.state),
        scenario,
        stateTimeS: controller.state.timeS,
        gust: { ...controller.state.gust },
      };
    },
    reportScene: () => world.reportScene(),
    reportSpatialEvidence: () => world.reportSpatialEvidence(),
    reportAssetEvidence: () => world.reportAssetEvidence(),
    reportFidelity: () => world.reportFidelity(),
    reportPerformance() {
      const fidelity = world.reportFidelity();
      return {
        measured: wallFrameSamplesMs.length >= 30,
        source: 'raw requestAnimationFrame wall timestamps',
        warmupMs: 1500,
        sampleCount: wallFrameSamplesMs.length,
        frameTime: {
          medianMs: percentile(wallFrameSamplesMs, 0.5),
          p95Ms: percentile(wallFrameSamplesMs, 0.95),
        },
        renderer: fidelity.renderer,
        softwareRenderer: fidelity.softwareRenderer,
        scenario: readablePreset(controller.state),
        adaptationEnabled: fidelity.adaptationEnabled,
      };
    },
    serializeState: () => serializeState(controller.snapshot()),
    loadState(serialized) {
      const parsed = parseState(serialized);
      controller.patch(parsed);
      updateInterface(true);
      return controller.snapshot();
    },
    resetRecovery() {
      resetExperience();
      return { status: 'pass', state: controller.snapshot(), cameraRecovered: world.isCinematic() || motionQuery.matches };
    },
    suspend: () => world.suspend(),
    resume: () => world.resume(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      motionQuery.removeEventListener('change', motionListener);
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('resize', resizeHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      canvas.removeEventListener('webglcontextlost', contextLostHandler);
      canvas.removeEventListener('webglcontextrestored', contextRestoredHandler);
      world.destroy();
      window.__PELAGIC_READY__ = false;
    },
  };

  window.__FORGE__ = hooks;
  window.__PELAGIC_READY__ = true;
  updateInterface(true);
  hideSystemStatus();
  animationFrame = requestAnimationFrame(frame);
}
