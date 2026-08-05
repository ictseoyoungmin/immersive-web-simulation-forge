/**
 * ARMORY BENCH — application wiring.
 *
 * Authority order, top to bottom:
 *   history(document) -> evaluate() -> { scene, readout, panels, exporters }
 * Nothing below the arrow ever writes upward.
 */

import { createLifecycle } from './kits/lifecycle.mjs';
import { createFrameLoop } from './kits/frame-loop.mjs';
import { createResolutionPolicy } from './kits/resolution-policy.mjs';
import { createHistoryStore } from './kits/history-store.mjs';

import {
  SLOTS, MODULES, WEAPON_BASE, BUS_CAPACITY_A, CATALOG_VERSION,
  getModule, getSlot, MODULE_COUNT, SLOT_COUNT
} from './data/catalog.mjs';
import { createDocument, canonicalise, validateDocument, nextVariantId, FINISHES } from './doc/document.mjs';
import { encodeDocument, decodeDocument, encodeSpecSheetCSV, downloadText, roundTripDocument } from './doc/codec.mjs';
import { evaluate, previewInstall, diffMeasurements } from './domain/constraints.mjs';
import { verifyDomain } from './domain/verify.mjs';

import { createMaterialLibrary } from './view/materials.mjs';
import { createScene } from './view/scene.mjs';
import { createAssembly } from './view/assembly.mjs';
import { createInspectCamera, CAMERA_LIMITS } from './view/camera.mjs';
import { createOverlay } from './view/overlay.mjs';
import { exportOBJ, readOBJ } from './view/objexport.mjs';

import { createIcon, iconButton, listIcons, ICON_GRID, OPTICAL_SIZES } from './ui/icons.mjs';
import { renderRack, renderInspector, createReadout, renderStatus, createToaster } from './ui/panels.mjs';
import { createFoley } from './audio/foley.mjs';

const STORAGE_KEY = 'armory-bench.document.v2';
const params = new URLSearchParams(location.search);
const CAPTURE_ROUTE = params.get('forgeCapture') === '1';
const CAPTURE_PRESET = params.get('forgePreset') || 'presentation';

const dom = {
  app: document.getElementById('app'),
  boot: document.getElementById('boot'),
  canvas: document.getElementById('scene'),
  overlay: document.getElementById('overlay'),
  viewport: document.getElementById('viewport'),
  rack: document.getElementById('rack-body'),
  inspector: document.getElementById('inspector-body'),
  readout: document.getElementById('readout'),
  status: document.getElementById('viewport-status'),
  hint: document.getElementById('viewport-hint'),
  viewtools: document.getElementById('viewtools'),
  actions: document.getElementById('actions'),
  toasts: document.getElementById('toasts'),
  docName: document.getElementById('doc-name'),
  docState: document.getElementById('doc-state'),
  importInput: document.getElementById('import-input'),
  leftPanel: document.getElementById('rack'),
  rightPanel: document.getElementById('inspector')
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const state = {
  selectedSlot: 'optic',
  hoverSlot: null,
  focusModuleId: null,
  compareVariantId: null,
  viewMode: 'assembled',
  showMeasure: true,
  lastDelta: null,
  savedSnapshot: null,
  dirty: false,
  motionScale: reducedMotion ? 0 : 1,
  ready: false,
  lastEvaluation: null,
  frame: { wallDelta: 1 / 60, samples: 0 }
};

const history = createHistoryStore({ initialState: loadInitialDocument(), maxEntries: 80 });
let doc = history.value;
let evaluation = evaluate(doc.slots);

function loadInitialDocument() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDocument();
    const { document: restored } = decodeDocument(stored);
    return restored;
  } catch {
    return createDocument();
  }
}

/* ------------------------------------------------------------------ *
 * Runtime
 * ------------------------------------------------------------------ */

const resolution = createResolutionPolicy({
  presets: {
    presentation: { sceneScale: 1.0, quality: 1.0, adaptive: false },
    balanced: { sceneScale: 0.92, quality: 0.92, adaptive: true },
    performance: { sceneScale: 0.76, quality: 0.78, adaptive: true }
  },
  initialPreset: 'balanced',
  capturePreset: 'presentation',
  adaptiveFloor: 0.72,
  adaptiveCeiling: 1.0,
  dprCap: 2,
  lowFps: 42,
  highFps: 57
});

let sceneContext = null;
let assembly = null;
let inspect = null;
let overlay = null;
let readout = null;
let toaster = null;
let foley = null;
let loop = null;
let lifecycle = null;
let contextLost = false;

/* ------------------------------------------------------------------ *
 * Document flow
 * ------------------------------------------------------------------ */

function commit(mutator, label) {
  const before = evaluation.measurements;
  const changed = history.transact(mutator, label);
  if (!changed) return false;
  const after = evaluate(history.value.slots).measurements;
  state.lastDelta = { label, rows: diffMeasurements(before, after) };
  return true;
}

history.subscribe((snapshot, reason) => {
  doc = snapshot.value;
  evaluation = evaluate(doc.slots);
  state.lastEvaluation = evaluation;
  const animate = state.motionScale > 0 && reason !== 'replace';
  assembly?.setFinish(doc.finish);
  assembly?.sync(evaluation, { animate });
  if (!animate) assembly?.update(2);
  refreshDocumentChrome();
  renderAll({ flash: reason === 'commit' });
});

function refreshDocumentChrome() {
  if (document.activeElement !== dom.docName) dom.docName.value = doc.name;
  const snapshot = safeEncode(doc);
  state.dirty = snapshot !== state.savedSnapshot;
  dom.docState.dataset.dirty = String(state.dirty);
  dom.docState.textContent = state.dirty ? '변경됨 — 미저장' : '저장됨';
  updateActionStates();
}

function safeEncode(document) {
  try { return encodeDocument(document); } catch { return null; }
}

/* ------------------------------------------------------------------ *
 * Handlers
 * ------------------------------------------------------------------ */

const handlers = {
  selectSlot(slotId) {
    state.selectedSlot = slotId;
    state.focusModuleId = null;
    assembly?.setSelection(slotId);
    const focus = assembly?.slotFocus(slotId);
    if (focus) inspect?.focusOn(focus, slotId, focus.radius);
    foley?.ui('select');
    renderAll();
  },

  previewModule(slotId, moduleId) {
    if (state.focusModuleId === moduleId) return;
    state.focusModuleId = moduleId;
    renderInspectorPanel();
  },

  install(slotId, moduleId) {
    if (assembly?.busy()) return;
    const slot = getSlot(slotId);
    if (!slot) return;
    if (doc.slots[slotId] === moduleId) return;

    if (moduleId) {
      const preview = previewInstall(doc.slots, slotId, moduleId);
      if (!preview.ok) {
        rejectInstall(slotId, moduleId, preview);
        return;
      }
    } else if (slot.required) {
      toaster.show(`${slot.name} 슬롯은 비워 둘 수 없다. ${slot.note}`, { tone: 'bad', title: '필수 슬롯' });
      foley?.fault();
      return;
    }

    const module = getModule(moduleId);
    const label = module ? `${slot.name}: ${module.name} 장착` : `${slot.name}: 해제`;
    state.selectedSlot = slotId;
    if (commit(draft => { draft.slots[slotId] = moduleId; }, label)) {
      foley?.resume();
      if (state.motionScale > 0) foley?.startServo(module ? 0.95 : 0.68);
      const focus = assembly?.slotFocus(slotId);
      if (focus) inspect?.focusOn(focus, slotId, focus.radius);
    }
  },

  setFinish(finishId) {
    if (doc.finish === finishId) return;
    const finish = FINISHES.find(item => item.id === finishId);
    commit(draft => { draft.finish = finishId; }, `표면 처리: ${finish.name}`);
    foley?.ui('commit');
  },

  saveVariant() {
    const m = evaluation.measurements;
    const name = `${doc.name} · ${doc.variants.length + 1}`;
    const variant = {
      id: nextVariantId(),
      name,
      finish: doc.finish,
      slots: { ...doc.slots },
      createdAt: new Date().toISOString(),
      status: evaluation.status,
      mass_g: m.mass_g,
      length_mm: m.length_mm,
      balance_point_mm: m.balance_point_mm,
      inertia_yaw_kgm2: m.inertia_yaw_kgm2,
      gyradius_mm: m.gyradius_mm,
      swing_period_ms: m.swing_period_ms
    };
    commit(draft => { draft.variants.push(variant); }, `변형 저장: ${name}`);
    state.compareVariantId = variant.id;
    toaster.show(`${name} — ${m.mass_g.toFixed(0)} g / ${m.length_mm.toFixed(0)} mm 로 기록했다.`,
      { tone: 'ok', title: '변형 저장' });
    foley?.ui('commit');
    renderAll();
  },

  compareVariant(id) {
    state.compareVariantId = state.compareVariantId === id ? null : id;
    renderInspectorPanel();
    foley?.ui('tick');
  },

  loadVariant(id) {
    const variant = doc.variants.find(item => item.id === id);
    if (!variant) return;
    commit(draft => {
      draft.slots = { ...variant.slots };
      draft.finish = variant.finish;
    }, `변형 적용: ${variant.name}`);
    toaster.show(`${variant.name} 구성을 작업대에 올렸다.`, { tone: 'info', title: '변형 적용' });
  },

  deleteVariant(id) {
    const variant = doc.variants.find(item => item.id === id);
    if (!variant) return;
    if (state.compareVariantId === id) state.compareVariantId = null;
    commit(draft => { draft.variants = draft.variants.filter(item => item.id !== id); }, `변형 삭제: ${variant.name}`);
    renderAll();
  }
};

function rejectInstall(slotId, moduleId, preview) {
  const module = getModule(moduleId);
  state.selectedSlot = slotId;
  state.focusModuleId = moduleId;
  assembly.setSelection(slotId);
  const focus = assembly.slotFocus(slotId);
  if (focus) inspect?.focusOn(focus, slotId, focus.radius);

  if (state.motionScale > 0) {
    assembly.reject(slotId, moduleId);
    foley?.resume();
    foley?.startServo(0.5);
  }
  foley?.fault();
  toaster.show(preview.reason, { tone: 'bad', title: `${module.name} — ${preview.issues[0]?.title || '장착 불가'}`, duration: 6200 });
  renderAll();
}

/* ------------------------------------------------------------------ *
 * Persistence, import and export
 * ------------------------------------------------------------------ */

function saveDocument() {
  try {
    const encoded = encodeDocument(doc);
    localStorage.setItem(STORAGE_KEY, encoded);
    state.savedSnapshot = encoded;
    refreshDocumentChrome();
    toaster.show(`${(encoded.length / 1024).toFixed(1)} KB — 브라우저 저장소에 기록했다.`,
      { tone: 'ok', title: '저장 완료' });
    foley?.ui('commit');
    return { ok: true, bytes: encoded.length };
  } catch (error) {
    toaster.show(`저장에 실패했다: ${error.message}. 현재 구성은 그대로 유지된다.`,
      { tone: 'bad', title: '저장 실패', duration: 7000 });
    return { ok: false, error: String(error.message) };
  }
}

function exportJSON() {
  const text = encodeDocument(doc);
  const result = downloadText(`${slug(doc.name)}.armorybench.json`, text, 'application/json');
  toaster.show(`${result.filename} — ${(result.bytes / 1024).toFixed(1)} KB. 그대로 다시 가져올 수 있다.`,
    { tone: 'ok', title: 'JSON 내보내기' });
  return result;
}

function exportCSV() {
  const text = encodeSpecSheetCSV(doc, evaluation);
  const result = downloadText(`${slug(doc.name)}.제원표.csv`, text, 'text/csv');
  toaster.show(`${result.filename} — 측정 결과 요약본이다. 문서로 다시 가져올 수는 없다.`,
    { tone: 'info', title: 'CSV 내보내기 (손실 있음)' });
  return result;
}

function exportOBJFile() {
  const meshes = assembly.collectMeshes();
  const m = evaluation.measurements;
  const result = exportOBJ(meshes, {
    name: doc.name, finish: doc.finish, mass_g: m.mass_g, length_mm: m.length_mm
  });
  const download = downloadText(`${slug(doc.name)}.obj`, result.text, 'model/obj');
  toaster.show(
    `${download.filename} — 정점 ${result.vertexCount.toLocaleString()}개 / 면 ${result.faceCount.toLocaleString()}개, ` +
    `${(download.bytes / 1048576).toFixed(1)} MB. 형상만 담긴 손실 내보내기다.`,
    { tone: 'info', title: 'OBJ 내보내기 (형상 전용)', duration: 6500 }
  );
  return { ...result, bytes: download.bytes };
}

function slug(name) {
  return (name || 'loadout').trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\-_.]/gu, '').slice(0, 40) || 'loadout';
}

async function importFile(file) {
  try {
    const text = await file.text();
    const { document: imported, migratedFrom } = decodeDocument(text);
    history.replace(imported, `가져오기: ${file.name}`);
    state.savedSnapshot = null;
    state.compareVariantId = null;
    refreshDocumentChrome();
    toaster.show(
      migratedFrom
        ? `${file.name} — 스키마 v${migratedFrom} 문서를 v2로 변환해 불러왔다.`
        : `${file.name} — 구성을 불러왔다.`,
      { tone: 'ok', title: '가져오기 완료' }
    );
    return { ok: true, migratedFrom };
  } catch (error) {
    // recovery: the open document is untouched
    toaster.show(
      `${error.message} — 작업 중인 구성은 그대로 유지된다.`,
      { tone: 'bad', title: '가져오기 실패', duration: 8000 }
    );
    foley?.fault();
    return { ok: false, error: String(error.message) };
  }
}

/* ------------------------------------------------------------------ *
 * Chrome construction
 * ------------------------------------------------------------------ */

const actionButtons = {};

function buildActions() {
  const bar = dom.actions;
  bar.replaceChildren();

  const add = (key, icon, label, onClick) => {
    const button = iconButton(icon, label, { size: 18 });
    button.addEventListener('click', onClick);
    bar.appendChild(button);
    actionButtons[key] = button;
    return button;
  };
  const divider = () => bar.appendChild(Object.assign(document.createElement('span'), { className: 'divider' }));

  add('undo', 'undo', '실행 취소 (Ctrl+Z)', () => undo());
  add('redo', 'redo', '다시 실행 (Ctrl+Shift+Z)', () => redo());
  divider();
  add('save', 'save', '브라우저에 저장 (Ctrl+S)', () => saveDocument());
  add('import', 'importFile', 'JSON 가져오기', () => dom.importInput.click());
  add('exportJson', 'exportFile', 'JSON 내보내기 — 무손실', () => exportJSON());

  const csv = document.createElement('button');
  csv.type = 'button';
  csv.className = 'text-button';
  csv.title = 'CSV 제원표 내보내기 (손실)';
  csv.appendChild(document.createTextNode('CSV'));
  csv.addEventListener('click', () => exportCSV());
  bar.appendChild(csv);

  const obj = document.createElement('button');
  obj.type = 'button';
  obj.className = 'text-button';
  obj.title = 'OBJ 형상 내보내기 (손실)';
  obj.appendChild(document.createTextNode('OBJ'));
  obj.addEventListener('click', () => exportOBJFile());
  bar.appendChild(obj);

  divider();
  const audio = add('audio', 'audioOn', '기계음 켜기/끄기', () => {
    const muted = foley.setMuted(!foley.muted);
    audio.replaceChildren(createIcon(muted ? 'audioOff' : 'audioOn', { size: 18 }));
    audio.setAttribute('aria-pressed', String(!muted));
    audio.setAttribute('aria-label', muted ? '기계음 켜기' : '기계음 끄기');
    if (!muted) { foley.resume(); foley.ui('commit'); }
  });
  audio.setAttribute('aria-pressed', 'true');

  const panelToggle = add('panels', 'chevronRight', '상세 패널 열기/닫기', () => {
    const open = dom.rightPanel.dataset.open === 'true';
    dom.rightPanel.dataset.open = String(!open);
    dom.leftPanel.dataset.open = 'false';
  });
  panelToggle.classList.add('panel-toggle');
}

function buildViewTools() {
  const bar = dom.viewtools;
  bar.replaceChildren();
  const modes = [
    ['assembled', 'orbit', '조립 상태'],
    ['exploded', 'explode', '분해 검수 (E)'],
    ['section', 'section', '단면 절개 (X)']
  ];
  const buttons = new Map();
  for (const [mode, icon, label] of modes) {
    const button = iconButton(icon, label, { size: 18 });
    button.setAttribute('aria-pressed', String(state.viewMode === mode));
    button.addEventListener('click', () => setViewMode(mode));
    bar.appendChild(button);
    buttons.set(mode, button);
  }
  bar.appendChild(Object.assign(document.createElement('span'), { className: 'divider' }));

  const measure = iconButton('measure', '치수 표시 (M)', { size: 18 });
  measure.setAttribute('aria-pressed', String(state.showMeasure));
  measure.addEventListener('click', () => {
    state.showMeasure = !state.showMeasure;
    measure.setAttribute('aria-pressed', String(state.showMeasure));
    foley?.ui('tick');
  });
  bar.appendChild(measure);

  const focus = iconButton('focus', '선택 슬롯으로 포커스 (F)', { size: 18 });
  focus.addEventListener('click', () => focusSelection());
  bar.appendChild(focus);

  const reset = iconButton('resetView', '시점 초기화 (Home)', { size: 18 });
  reset.addEventListener('click', () => { inspect.reset(); foley?.ui('tick'); });
  bar.appendChild(reset);

  actionButtons.viewModes = buttons;
}

function setViewMode(mode) {
  state.viewMode = mode;
  assembly.setViewMode(mode);
  if (state.motionScale === 0) assembly.update(2);
  for (const [key, button] of actionButtons.viewModes) {
    button.setAttribute('aria-pressed', String(key === mode));
  }
  inspect.frame(assembly.boundsForExplode(mode === 'exploded' ? 1 : 0), mode === 'exploded' ? 1.08 : 1.10);
  foley?.ui('tick');
}

function focusSelection() {
  const focus = assembly.slotFocus(state.selectedSlot);
  if (focus) inspect.focusOn(focus, state.selectedSlot, focus.radius * 0.86);
  foley?.ui('tick');
}

function undo() {
  if (!history.canUndo) return false;
  history.undo();
  toaster.show('직전 변경을 되돌렸다.', { tone: 'info', duration: 2200 });
  return true;
}

function redo() {
  if (!history.canRedo) return false;
  history.redo();
  return true;
}

function updateActionStates() {
  if (actionButtons.undo) actionButtons.undo.disabled = !history.canUndo;
  if (actionButtons.redo) actionButtons.redo.disabled = !history.canRedo;
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

function renderAll(options = {}) {
  renderRack(dom.rack, { doc, evaluation, selectedSlot: state.selectedSlot, handlers });
  renderInspectorPanel();
  readout?.update(evaluation, options);
  renderStatus(dom.status, evaluation);
  updateActionStates();
}

function renderInspectorPanel() {
  renderInspector(dom.inspector, {
    doc,
    evaluation,
    selectedSlot: state.selectedSlot,
    focusModuleId: state.focusModuleId,
    lastDelta: state.lastDelta,
    variants: doc.variants,
    compareVariantId: state.compareVariantId,
    handlers
  });
}

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */

function bindInput(life) {
  const canvas = dom.canvas;

  life.listen(canvas, 'pointermove', event => {
    if (inspect.dragging) { assembly.setHover(null); return; }
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const slotId = assembly.pick(x, y);
    assembly.setHover(slotId);
    canvas.style.cursor = slotId ? 'pointer' : (inspect.dragging ? 'grabbing' : 'grab');
  });

  life.listen(canvas, 'pointerleave', () => assembly.setHover(null));

  let downAt = null;
  life.listen(canvas, 'pointerdown', event => { downAt = { x: event.clientX, y: event.clientY, t: performance.now() }; });
  life.listen(canvas, 'pointerup', event => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    const elapsed = performance.now() - downAt.t;
    downAt = null;
    if (moved > 5 || elapsed > 420) return;   // it was a drag, not a click
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const slotId = assembly.pick(x, y);
    if (slotId) handlers.selectSlot(slotId);
  });

  life.listen(window, 'keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      if (event.key === 'Escape') event.target.blur();
      return;
    }
    const meta = event.ctrlKey || event.metaKey;
    if (meta && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
      return;
    }
    if (meta && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
    if (meta && event.key.toLowerCase() === 's') { event.preventDefault(); saveDocument(); return; }
    if (meta) return;

    const index = Number.parseInt(event.key, 10);
    if (index >= 1 && index <= SLOTS.length) { handlers.selectSlot(SLOTS[index - 1].id); return; }

    switch (event.key.toLowerCase()) {
      case 'e': setViewMode(state.viewMode === 'exploded' ? 'assembled' : 'exploded'); break;
      case 'x': setViewMode(state.viewMode === 'section' ? 'assembled' : 'section'); break;
      case 'm': {
        state.showMeasure = !state.showMeasure;
        const button = dom.viewtools.querySelector('[aria-label^="치수"]');
        button?.setAttribute('aria-pressed', String(state.showMeasure));
        break;
      }
      case 'f': focusSelection(); break;
      case 'arrowleft': inspect.nudge('left'); event.preventDefault(); break;
      case 'arrowright': inspect.nudge('right'); event.preventDefault(); break;
      case 'arrowup': inspect.nudge('up'); event.preventDefault(); break;
      case 'arrowdown': inspect.nudge('down'); event.preventDefault(); break;
      case 'home': inspect.nudge('home'); break;
      case '+': case '=': inspect.nudge('in'); break;
      case '-': case '_': inspect.nudge('out'); break;
      default: break;
    }
  });

  life.listen(dom.docName, 'change', () => {
    const name = dom.docName.value.trim() || '이름 없는 구성';
    if (name === doc.name) return;
    commit(draft => { draft.name = name; }, `이름 변경: ${name}`);
  });

  life.listen(dom.importInput, 'change', async () => {
    const file = dom.importInput.files?.[0];
    if (file) await importFile(file);
    dom.importInput.value = '';
  });

  life.listen(dom.viewport, 'dragover', event => { event.preventDefault(); });
  life.listen(dom.viewport, 'drop', async event => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) await importFile(file);
  });

  life.listen(document, 'visibilitychange', () => {
    if (document.hidden) { loop.suspend(); foley?.stopServo(); }
    else loop.resume();
  });

  life.listen(window, 'beforeunload', event => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  life.listen(dom.canvas, 'webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    loop.suspend();
    toaster.show('그래픽 컨텍스트가 손실되었다. 복구를 시도한다 — 구성 데이터는 안전하다.',
      { tone: 'bad', title: 'WebGL 컨텍스트 손실', duration: 9000 });
  });

  life.listen(dom.canvas, 'webglcontextrestored', () => {
    contextLost = false;
    assembly.sync(evaluation, { animate: false });
    assembly.update(2);
    loop.resume();
    toaster.show('컨텍스트를 복구했다.', { tone: 'ok', duration: 3000 });
  });

  // first gesture unlocks audio
  const unlock = () => { foley?.resume(); };
  life.listen(window, 'pointerdown', unlock, { once: true });
  life.listen(window, 'keydown', unlock, { once: true });
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

function boot() {
  sceneContext = createScene(dom.canvas, createMaterialLibrary);
  assembly = createAssembly(sceneContext);
  inspect = createInspectCamera(sceneContext.camera, dom.canvas);
  overlay = createOverlay(dom.overlay);
  readout = createReadout(dom.readout);
  toaster = createToaster(dom.toasts);
  foley = createFoley();

  buildActions();
  buildViewTools();
  bindInput(lifecycle);

  // establish the canvas size (and therefore camera aspect) before framing
  applyResolution();

  state.savedSnapshot = localStorage.getItem(STORAGE_KEY);
  assembly.setFinish(doc.finish);
  assembly.sync(evaluation, { animate: false });
  assembly.update(2);
  assembly.setSelection(state.selectedSlot);
  inspect.frame(assembly.assemblyBounds(), 1.10);

  refreshDocumentChrome();
  renderAll({ flash: false });

  if (CAPTURE_ROUTE) resolution.setCaptureMode(true, CAPTURE_PRESET);

  loop = createFrameLoop({ update: step, render, fixedStep: 1 / 60, maxDelta: 0.1, maxSteps: 4 });
  loop.start();
  state.ready = true;
  dom.app.dataset.loading = 'false';

  setTimeout(() => { dom.hint.dataset.faded = 'true'; }, 9000);

  if (state.savedSnapshot) {
    toaster.show('이전에 저장한 구성을 복원했다.', { tone: 'info', title: '작업대 복원', duration: 4000 });
  }
}

function step(dt) {
  if (contextLost) return;
  const events = assembly.update(dt * (state.motionScale || 1));
  inspect.update(dt);
  for (const event of events) handleAssemblyEvent(event);
}

function handleAssemblyEvent(event) {
  switch (event.type) {
    case 'seat': foley?.seat(); break;
    case 'lock': foley?.lock(event.lock); foley?.stopServo(); break;
    case 'unlock': foley?.unlock(); break;
    case 'arrest': foley?.arrest(); foley?.stopServo(); break;
    case 'install-end': case 'remove-end': foley?.stopServo(); break;
    default: break;
  }
}

function render(alpha, time, simulationDelta, meta) {
  if (contextLost) return;
  state.frame.wallDelta = meta.wallDelta;
  state.frame.samples += 1;
  resolution.sampleFrame(meta.wallDelta);
  applyResolution();
  sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);

  const rect = dom.canvas.getBoundingClientRect();
  overlay.update({
    camera: sceneContext.camera,
    assembly,
    evaluation,
    mode: state.viewMode,
    width: rect.width,
    height: rect.height,
    showMeasure: state.showMeasure && state.viewMode !== 'exploded'
  });
}

let lastSize = '';
function applyResolution() {
  const { width, height, dpr } = lifecycle.size;
  const size = resolution.resolveSize(width, height, dpr);
  const key = `${size.outputWidth}x${size.outputHeight}`;
  if (key === lastSize) return;
  lastSize = key;
  sceneContext.setSize(size.cssWidth, size.cssHeight, size.outputWidth, size.outputHeight);
  dom.overlay.setAttribute('viewBox', `0 0 ${size.cssWidth} ${size.cssHeight}`);
  dom.overlay.setAttribute('width', size.cssWidth);
  dom.overlay.setAttribute('height', size.cssHeight);
}

lifecycle = createLifecycle(dom.viewport, {
  onMount() { boot(); },
  onResize() { lastSize = ''; },
  onSuspend() { loop?.suspend(); foley?.stopServo(); },
  onResume() { loop?.resume(); },
  onDestroy() {
    loop?.stop();
    foley?.dispose();
    overlay?.dispose();
    inspect?.dispose();
    assembly?.dispose();
    sceneContext?.dispose();
  }
});

lifecycle.mount();

/* ------------------------------------------------------------------ *
 * Verification surface
 * ------------------------------------------------------------------ */

function settle(seconds = 3) {
  const stepSize = 1 / 60;
  for (let t = 0; t < seconds; t += stepSize) {
    const events = assembly.update(stepSize);
    inspect.update(stepSize);
    for (const event of events) { /* drain silently during verification */ void event; }
    if (!assembly.busy() && Math.abs(assembly.state.explode - assembly.state.explodeTarget) < 0.001) break;
  }
}

/**
 * Deterministic scenarios.
 *
 * Each name puts the bench into a specific, reproducible state so a performance
 * sample or a capture describes what its label says it describes. A measurement
 * run that silently uses the default view for every scenario name would be
 * fabricated evidence.
 */
const SCENARIOS = {
  'reference-case': {
    slots: null,
    view: 'assembled',
    measure: true,
    pose: { azimuth: 0.72, polar: 1.09 }
  },
  'exploded-annotated': {
    slots: null,
    view: 'exploded',
    measure: false,
    pose: { azimuth: 0.72, polar: 1.02 }
  },
  'heavy-section': {
    slots: {
      optic: 'opt-thermal', muzzle: 'mz-reflex', handguard: 'hg-std',
      underbarrel: 'ub-bipod', magazine: 'mag-drum', stock: 'st-fixed'
    },
    view: 'section',
    measure: true,
    pose: { azimuth: 0.58, polar: 1.16 }
  }
};

async function prepareVerification(scenario = 'reference-case') {
  const preset = SCENARIOS[scenario] || SCENARIOS['reference-case'];
  foley?.setMuted(true);
  state.motionScale = 0;
  state.compareVariantId = null;
  history.replace(
    createDocument(preset.slots ? { slots: preset.slots, name: `검증 구성 · ${scenario}` } : {}),
    `검증 구성: ${scenario}`
  );
  doc = history.value;
  evaluation = evaluate(doc.slots);
  assembly.setFinish(doc.finish);
  assembly.sync(evaluation, { animate: false });
  state.showMeasure = preset.measure;
  state.selectedSlot = 'muzzle';
  assembly.setSelection('muzzle');
  setViewMode(preset.view);
  settle(2);
  inspect.setPose({ azimuth: preset.pose.azimuth, polar: preset.pose.polar });
  inspect.frame(assembly.boundsForExplode(preset.view === 'exploded' ? 1 : 0), preset.view === 'exploded' ? 1.08 : 1.10);
  settle(2);
  renderAll({ flash: false });
  return {
    scenario,
    ready: true,
    motionScale: state.motionScale,
    view: state.viewMode,
    slots: { ...doc.slots },
    triangles: assembly.triangles
  };
}

async function verifyWorkflow(scenario = 'reference-case') {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  await prepareVerification(scenario);

  try {
    /* 1. default route: a valid document is on the bench */
    const start = evaluate(doc.slots);
    add('기본 상태 유효', start.status === 'valid' && start.installed.length === SLOT_COUNT,
      `상태 ${start.status}, 장착 ${start.installed.length}/${SLOT_COUNT}`);

    /* 2. first meaningful action: install a module, measurements move */
    const beforeMass = start.measurements.mass_g;
    const beforeLength = start.measurements.length_mm;
    handlers.install('muzzle', 'mz-supp');
    settle();
    const afterInstall = evaluate(doc.slots);
    const massMoved = afterInstall.measurements.mass_g > beforeMass;
    const lengthMoved = afterInstall.measurements.length_mm > beforeLength;
    add('모듈 장착이 문서와 측정값을 바꾼다',
      doc.slots.muzzle === 'mz-supp' && massMoved && lengthMoved,
      `질량 ${beforeMass.toFixed(0)} → ${afterInstall.measurements.mass_g.toFixed(0)} g, ` +
      `전장 ${beforeLength.toFixed(0)} → ${afterInstall.measurements.length_mm.toFixed(0)} mm`);

    /* 3. one history entry per gesture, and undo restores exactly */
    const canUndo = history.canUndo;
    undo();
    settle();
    const undone = evaluate(doc.slots);
    add('실행 취소가 이전 상태를 정확히 복원',
      canUndo && doc.slots.muzzle === 'mz-brake' &&
      Math.abs(undone.measurements.mass_g - beforeMass) < 1e-9,
      `muzzle=${doc.slots.muzzle}, 질량 ${undone.measurements.mass_g.toFixed(3)} g (기대 ${beforeMass.toFixed(3)})`);

    redo();
    settle();
    add('다시 실행이 변경을 재적용', doc.slots.muzzle === 'mz-supp', `muzzle=${doc.slots.muzzle}`);

    /* 4. validation: an incompatible part is refused and does not commit */
    handlers.install('muzzle', 'mz-reflex');
    settle();
    const beforeReject = JSON.stringify(canonicalise(doc));
    handlers.install('handguard', 'hg-lr');
    settle();
    const afterReject = JSON.stringify(canonicalise(doc));
    const rejectPreview = previewInstall(doc.slots, 'handguard', 'hg-lr');
    add('간섭 부품은 거부되고 문서는 변하지 않는다',
      !rejectPreview.ok && beforeReject === afterReject && doc.slots.handguard === 'hg-std',
      `거부 사유: ${rejectPreview.issues[0]?.rule || '없음'}, 문서 변경 ${beforeReject === afterReject ? '없음' : '발생'}`);

    /* 5. every rule family refuses through the same path */
    const families = {
      prerequisite: previewInstall({ ...doc.slots, handguard: 'hg-cq' }, 'underbarrel', 'ub-bipod'),
      power: previewInstall({ ...doc.slots, optic: 'opt-thermal', muzzle: 'mz-comp' }, 'underbarrel', 'ub-laser'),
      clearance: previewInstall({ ...doc.slots, muzzle: 'mz-reflex' }, 'handguard', 'hg-lr')
    };
    const refused = Object.entries(families).filter(([, preview]) => !preview.ok).map(([name]) => name);
    add('제약 규칙별 거부 경로', refused.length === 3, `거부: ${refused.join(', ')}`);

    /* 6. comparison: save a variant and diff it against the live configuration */
    handlers.saveVariant();
    settle();
    handlers.install('magazine', 'mag-drum');
    settle();
    const variant = doc.variants[0];
    const diff = diffMeasurements(variant, evaluate(doc.slots).measurements);
    const changedRows = diff.filter(row => row.changed);
    add('변형 비교가 실제 차이를 만든다',
      doc.variants.length === 1 && changedRows.length >= 3,
      `변형 ${doc.variants.length}개, 변화 항목 ${changedRows.length}/${diff.length}`);

    /* 7. completion: JSON export round-trips exactly */
    const trip = roundTripDocument(doc);
    add('JSON 내보내기 왕복 일치', trip.ok, `${trip.bytes} 바이트`);

    /* 8. CSV spec sheet is produced and labelled lossy */
    const csv = encodeSpecSheetCSV(doc, evaluate(doc.slots));
    add('CSV 제원표 생성', csv.includes('lossy export') && csv.split('\n').length > 20,
      `${csv.split('\n').length} 행`);

    /* 9. geometry export round trip through an independent reader */
    const meshes = assembly.collectMeshes();
    const objResult = exportOBJ(meshes, { name: doc.name });
    const parsed = readOBJ(objResult.text);
    const bounds = assembly.assemblyBounds();
    const sceneWidthMm = bounds ? (bounds.max.x - bounds.min.x) * 1000 : 0;
    const objWidthMm = parsed.bounds_mm.x[1] - parsed.bounds_mm.x[0];
    const boundsError = sceneWidthMm > 0 ? Math.abs(objWidthMm - sceneWidthMm) / sceneWidthMm : 1;
    add('OBJ 형상 왕복 — 독립 파서 검증',
      parsed.vertexCount === objResult.vertexCount &&
      parsed.faceCount === objResult.faceCount &&
      boundsError < 0.005,
      `정점 ${parsed.vertexCount}, 면 ${parsed.faceCount}, X 경계 ${objWidthMm.toFixed(1)} mm vs 씬 ${sceneWidthMm.toFixed(1)} mm ` +
      `(오차 ${(boundsError * 100).toFixed(3)} %)`);

    /* 10. persistence: save, then reload from storage */
    const saved = saveDocument();
    const stored = localStorage.getItem(STORAGE_KEY);
    const reloaded = decodeDocument(stored).document;
    add('저장 후 저장소에서 재적재 일치',
      saved.ok && JSON.stringify(canonicalise(reloaded)) === JSON.stringify(canonicalise(doc)),
      `${saved.bytes} 바이트, 다시 읽은 구성 ${JSON.stringify(canonicalise(reloaded)) === JSON.stringify(canonicalise(doc)) ? '동일' : '불일치'}`);

    /* 11. failure recovery: a malformed import must not damage the open document */
    const guarded = JSON.stringify(canonicalise(doc));
    const bad = new Blob(['{"schema":"armory-bench.loadout","version":2,"data":{"name":"broken"}}'],
      { type: 'application/json' });
    const result = await importFile(new File([bad], 'broken.json', { type: 'application/json' }));
    const preserved = JSON.stringify(canonicalise(doc)) === guarded;
    add('손상된 가져오기 후 작업 문서 보존', !result.ok && preserved,
      `가져오기 거부 ${!result.ok}, 문서 보존 ${preserved}`);

    /* 12. view modes reach their targets */
    setViewMode('exploded'); settle();
    const exploded = assembly.state.explode > 0.9;
    setViewMode('section'); settle();
    const sectioned = assembly.state.section > 0.9;
    setViewMode('assembled'); settle();
    const restored = assembly.state.explode < 0.1 && assembly.state.section < 0.1;
    add('분해 / 단면 / 조립 뷰 전환', exploded && sectioned && restored,
      `분해 ${exploded}, 단면 ${sectioned}, 복귀 ${restored}`);

    /* 13. bounded camera: limits actually clamp */
    inspect.nudge('in'); inspect.nudge('in'); inspect.nudge('in');
    for (let i = 0; i < 40; i += 1) inspect.nudge('in');
    inspect.update(1);
    const tight = inspect.report();
    for (let i = 0; i < 80; i += 1) inspect.nudge('out');
    inspect.update(1);
    const wide = inspect.report();
    for (let i = 0; i < 60; i += 1) inspect.nudge('up');
    inspect.update(1);
    const high = inspect.report();
    const clamped =
      tight.radius >= CAMERA_LIMITS.radius[0] - 1e-6 &&
      wide.radius <= CAMERA_LIMITS.radius[1] + 1e-6 &&
      high.polar >= CAMERA_LIMITS.polar[0] - 1e-6;
    add('카메라 경계 제한 동작', clamped,
      `반경 ${tight.radius}–${wide.radius} (한계 ${CAMERA_LIMITS.radius.join('–')}), 극각 ${high.polar} (하한 ${CAMERA_LIMITS.polar[0].toFixed(2)})`);

    /* 14. camera direction convention: drag right turns the weapon right */
    inspect.reset(); inspect.update(1);
    const before = inspect.report().azimuth;
    inspect.nudge('right');
    inspect.update(1);
    const after = inspect.report().azimuth;
    add('시점 방향 규약 — 오른쪽 드래그 시 대상이 오른쪽으로 회전', after < before,
      `방위각 ${before} → ${after} (object-follows-pointer)`);

    /* 15. public claims match the running implementation */
    const claimEvaluation = evaluate(createDocument().slots);
    const claims = auditClaims(claimEvaluation);
    add('표시 수치 감사', claims.every(claim => claim.ok),
      claims.map(claim => `${claim.label}=${claim.displayed}${claim.ok ? '' : ' ✗'}`).join(', '));

  } catch (error) {
    add('워크플로 실행', false, String(error?.stack || error));
  }

  const failed = checks.filter(check => !check.ok);
  return {
    status: failed.length ? 'fail' : 'pass',
    scenario,
    checks,
    failed: failed.map(check => `${check.name}: ${check.detail}`)
  };
}

/** Recompute every user-visible constant from the running implementation. */
function auditClaims(defaultEvaluation) {
  const m = defaultEvaluation.measurements;
  const round = (value, digits) => Number(value.toFixed(digits));
  return [
    { label: '모듈 수', displayed: MODULE_COUNT, ok: MODULE_COUNT === MODULES.length, unit: 'count' },
    { label: '슬롯 수', displayed: SLOT_COUNT, ok: SLOT_COUNT === SLOTS.length, unit: 'count' },
    { label: '버스 용량', displayed: BUS_CAPACITY_A, ok: BUS_CAPACITY_A === WEAPON_BASE.bus_capacity_a, unit: 'A' },
    { label: '기본 구성 질량', displayed: round(m.mass_g, 1), ok: Math.abs(m.mass_g - 4514) < 0.5, unit: 'g' },
    { label: '기본 구성 전장', displayed: round(m.length_mm, 1), ok: Math.abs(m.length_mm - 830) < 0.5, unit: 'mm' },
    { label: '기본 구성 밸런스', displayed: round(m.balance_point_mm, 1), ok: Number.isFinite(m.balance_point_mm), unit: 'mm' },
    { label: '기본 구성 조준 관성', displayed: round(m.inertia_yaw_kgm2, 5), ok: Number.isFinite(m.inertia_yaw_kgm2), unit: 'kg·m²' },
    { label: '카탈로그 판', displayed: CATALOG_VERSION, ok: typeof CATALOG_VERSION === 'string', unit: 'version' }
  ];
}

function reportFidelity() {
  const report = resolution.report();
  const rect = dom.canvas.getBoundingClientRect();
  return {
    ...report,
    // `report.fps` is an exponential average of RAW wall-frame deltas. The
    // instantaneous 1/lastFrame value was being reported instead, which made the
    // external cross-check disagree with itself rather than with the renderer.
    lastFrameMs: Number((state.frame.wallDelta * 1000).toFixed(2)),
    telemetrySource: 'raw-wall-frame-delta-exponential-average',
    captureLocked: report.captureLocked,
    adaptationLocked: report.captureLocked,
    cssSize: [Math.round(rect.width), Math.round(rect.height)],
    canvasSize: [dom.canvas.width, dom.canvas.height],
    effectivePixelRatio: rect.width ? Number((dom.canvas.width / rect.width).toFixed(3)) : 0,
    triangles: assembly?.triangles ?? 0,
    icons: { system: 'authored-inline-svg', grid: ICON_GRID, opticalSizes: OPTICAL_SIZES, count: listIcons().length },
    camera: inspect?.report() ?? null,
    reducedMotion,
    renderer: sceneContext?.renderer?.getContext()?.getParameter(0x1F01) || 'unknown'
  };
}

window.__FORGE__ = {
  prepareVerification,
  verifyWorkflow,
  verifyDomain: async () => verifyDomain(),
  reportFidelity,
  async setCaptureMode(enabled, preset = 'presentation') {
    resolution.setCaptureMode(enabled, preset);
    lastSize = '';
    applyResolution();
    return resolution.report();
  },
  // read-only introspection for debugging; never a write path
  inspect: () => ({
    document: canonicalise(doc),
    evaluation: {
      status: evaluation.status,
      measurements: evaluation.measurements,
      issues: evaluation.issues.map(issue => ({ rule: issue.rule, title: issue.title }))
    },
    view: { mode: state.viewMode, measure: state.showMeasure, selected: state.selectedSlot },
    history: { canUndo: history.canUndo, canRedo: history.canRedo }
  })
};
