/**
 * Renderer-neutral internal-resolution policy.
 * It keeps visual capture deterministic and prevents slow validation hardware
 * from silently degrading the representative screenshot.
 */
export function createResolutionPolicy(options = {}) {
  const presets = {
    presentation: { sceneScale: 1.0, quality: 1.0, adaptive: false },
    balanced: { sceneScale: 0.86, quality: 0.9, adaptive: true },
    performance: { sceneScale: 0.68, quality: 0.72, adaptive: true },
    ...(options.presets || {})
  };
  const state = {
    preset: options.initialPreset || 'presentation',
    capture: false,
    capturePreset: options.capturePreset || 'presentation',
    sceneScale: 1,
    quality: 1,
    fps: 60,
    frameMs: 1000 / 60,
    lowSeconds: 0,
    highSeconds: 0,
    dprCap: Number.isFinite(options.dprCap) ? options.dprCap : 2,
    adaptiveFloor: Number.isFinite(options.adaptiveFloor) ? options.adaptiveFloor : 0.68,
    adaptiveCeiling: Number.isFinite(options.adaptiveCeiling) ? options.adaptiveCeiling : 1,
    lowFps: options.lowFps || 42,
    highFps: options.highFps || 58,
    lastSize: null
  };

  function activePreset() {
    return presets[state.capture ? state.capturePreset : state.preset] || presets.presentation;
  }

  function syncFromPreset() {
    const p = activePreset();
    state.sceneScale = Math.min(state.adaptiveCeiling, Math.max(state.adaptiveFloor, p.sceneScale));
    state.quality = p.quality;
  }
  syncFromPreset();

  function setPreset(name) {
    if (!presets[name]) throw new Error(`Unknown resolution preset: ${name}`);
    state.preset = name;
    if (!state.capture) syncFromPreset();
  }

  function setCaptureMode(enabled, preset = state.capturePreset) {
    if (enabled && !presets[preset]) throw new Error(`Unknown capture preset: ${preset}`);
    state.capture = Boolean(enabled);
    state.capturePreset = preset;
    state.lowSeconds = 0;
    state.highSeconds = 0;
    syncFromPreset();
  }

  function sampleFrame(wallDeltaSeconds) {
    const dt = Math.max(1 / 500, Number(wallDeltaSeconds) || 1 / 60);
    const instant = 1 / dt;
    const smoothing = 1 - Math.exp(-Math.min(dt, 1) / 0.55);
    state.fps += (instant - state.fps) * smoothing;
    state.frameMs += (dt * 1000 - state.frameMs) * smoothing;
    const p = activePreset();
    if (state.capture || p.adaptive === false) return;

    if (state.fps < state.lowFps) {
      state.lowSeconds += dt;
      state.highSeconds = 0;
      if (state.lowSeconds > 1.25) {
        state.sceneScale = Math.max(state.adaptiveFloor, state.sceneScale - 0.05);
        state.quality = Math.max(0.5, state.quality - 0.04);
        state.lowSeconds = 0;
      }
    } else if (state.fps > state.highFps) {
      state.highSeconds += dt;
      state.lowSeconds = 0;
      if (state.highSeconds > 3.25) {
        state.sceneScale = Math.min(state.adaptiveCeiling, state.sceneScale + 0.025);
        state.quality = Math.min(p.quality, state.quality + 0.02);
        state.highSeconds = 0;
      }
    } else {
      state.lowSeconds = Math.max(0, state.lowSeconds - dt * 0.5);
      state.highSeconds = Math.max(0, state.highSeconds - dt * 0.5);
    }
  }

  function resolveSize(cssWidth, cssHeight, devicePixelRatio = 1) {
    const cssW = Math.max(1, Math.round(cssWidth));
    const cssH = Math.max(1, Math.round(cssHeight));
    const outputDpr = Math.min(Math.max(1, devicePixelRatio || 1), state.dprCap);
    const outputWidth = Math.max(1, Math.round(cssW * outputDpr));
    const outputHeight = Math.max(1, Math.round(cssH * outputDpr));
    const sceneWidth = Math.max(1, Math.round(outputWidth * state.sceneScale));
    const sceneHeight = Math.max(1, Math.round(outputHeight * state.sceneScale));
    state.lastSize = {
      cssWidth: cssW,
      cssHeight: cssH,
      outputWidth,
      outputHeight,
      sceneWidth,
      sceneHeight,
      outputDpr,
      effectivePixelRatio: sceneWidth / cssW,
      sceneScale: state.sceneScale,
      preset: state.capture ? state.capturePreset : state.preset,
      captureLocked: state.capture
    };
    return state.lastSize;
  }

  function report() {
    return {
      preset: state.capture ? state.capturePreset : state.preset,
      captureLocked: state.capture,
      fps: Number(state.fps.toFixed(1)),
      frameMs: Number(state.frameMs.toFixed(2)),
      telemetrySource: 'raw-wall-frame-delta',
      quality: Number(state.quality.toFixed(3)),
      sceneScale: Number(state.sceneScale.toFixed(3)),
      size: state.lastSize ? { ...state.lastSize } : null
    };
  }

  return { presets, state, setPreset, setCaptureMode, sampleFrame, resolveSize, report };
}
