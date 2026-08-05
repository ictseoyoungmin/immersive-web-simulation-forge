/**
 * Panel rendering.
 *
 * Panels are pure functions of (document, evaluation, interaction state). They
 * never hold their own copy of the truth — they are handed the evaluation and
 * they draw it, so the rack, the inspector, the readout and the 3D view can
 * never disagree.
 */

import {
  SLOTS, MODULES, WEAPON_BASE, getModule, getSlot, modulesForSlot,
  MOUNT_LABELS, CAPABILITY_LABELS, BUS_CAPACITY_A
} from '../data/catalog.mjs';
import { FINISHES, getFinish } from '../doc/document.mjs';
import { previewInstall, diffMeasurements } from '../domain/constraints.mjs';
import { createIcon, iconButton } from './icons.mjs';

const fmt = (value, digits = 0) =>
  Number.isFinite(value) ? value.toFixed(digits) : '—';

const signed = (value, digits = 0) =>
  !Number.isFinite(value) ? '—' : `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function section(title, count) {
  const wrapper = element('div', 'section');
  const head = element('div', 'section-head');
  head.appendChild(element('span', null, title));
  if (count !== undefined) head.appendChild(element('span', 'count', count));
  const body = element('div', 'section-body');
  wrapper.append(head, body);
  return { wrapper, body, head };
}

/* ------------------------------------------------------------------ *
 * Left rail — slot list, module rack, finish
 * ------------------------------------------------------------------ */

export function renderRack(container, context) {
  const { doc, evaluation, selectedSlot, handlers } = context;
  container.replaceChildren();

  /* ---- slots ---- */
  const slots = section('슬롯', `${evaluation.installed.length}/${SLOTS.length}`);
  for (const slot of SLOTS) {
    const moduleId = evaluation.loadout[slot.id];
    const module = getModule(moduleId);
    const faulted = evaluation.errors.some(issue => issue.slots.includes(slot.id));

    const row = element('button', 'slot-row');
    row.type = 'button';
    row.setAttribute('aria-selected', String(selectedSlot === slot.id));
    row.dataset.slot = slot.id;

    const dot = element('span', 'slot-dot');
    dot.dataset.state = faulted ? 'fault' : module ? 'filled' : slot.required ? 'required' : 'empty';

    const main = element('span', 'slot-main');
    main.appendChild(element('span', 'slot-name', slot.short));
    const value = element('span', `slot-value${module ? '' : ' empty'}`, module ? module.name : '— 비어 있음');
    main.appendChild(value);

    const meta = element('span', 'slot-meta');
    meta.textContent = module
      ? `${module.mass_g} g${module.power_a ? `\n${module.power_a.toFixed(1)} A` : ''}`
      : '';
    meta.style.whiteSpace = 'pre';

    row.append(dot, main, meta);
    row.addEventListener('click', () => handlers.selectSlot(slot.id));
    slots.body.appendChild(row);
  }
  container.appendChild(slots.wrapper);

  /* ---- module rack for the selected slot ---- */
  const slot = getSlot(selectedSlot) || SLOTS[0];
  const candidates = modulesForSlot(slot.id);
  const rack = section(`${slot.name} 모듈`, `${candidates.length}`);

  const mountNote = element('div', 'module-note good');
  mountNote.appendChild(createIcon('slot', { size: 14 }));
  mountNote.appendChild(element('span', null, `${MOUNT_LABELS[slot.accepts[0]] || slot.accepts[0]} · ${slot.note}`));
  mountNote.style.padding = '2px 2px 8px';
  mountNote.style.lineHeight = '1.5';
  rack.body.appendChild(mountNote);

  const installed = evaluation.loadout[slot.id];

  if (!slot.required) {
    const clear = element('button', 'module-card');
    clear.type = 'button';
    clear.dataset.installed = String(installed === null);
    clear.dataset.compatible = 'true';
    clear.append(element('span', 'module-name', '비우기 — 미장착'));
    const note = element('span', 'module-note good');
    note.textContent = '슬롯을 비운 상태로 유지한다.';
    clear.appendChild(note);
    clear.appendChild(element('span', 'module-figures', '0 g'));
    clear.addEventListener('click', () => handlers.install(slot.id, null));
    clear.addEventListener('mouseenter', () => handlers.previewModule(slot.id, null));
    rack.body.appendChild(clear);
  }

  for (const module of candidates) {
    const preview = previewInstall(evaluation.loadout, slot.id, module.id);
    const isInstalled = installed === module.id;

    const card = element('button', 'module-card');
    card.type = 'button';
    card.dataset.installed = String(isInstalled);
    card.dataset.compatible = String(preview.ok);
    card.dataset.module = module.id;

    card.appendChild(element('span', 'module-name', module.name));

    const note = element('span', `module-note ${preview.ok ? 'good' : 'bad'}`);
    note.appendChild(createIcon(preview.ok ? 'check' : 'warning', { size: 13 }));
    const shortReason = preview.ok
      ? (isInstalled ? '장착됨' : '장착 가능')
      : preview.issues[0]?.title || '장착 불가';
    note.appendChild(element('span', null, shortReason));
    card.appendChild(note);

    const figures = element('span', 'module-figures');
    figures.appendChild(element('b', null, `${module.mass_g} g`));
    figures.appendChild(document.createTextNode(module.power_a ? `${module.power_a.toFixed(1)} A` : '—'));
    card.appendChild(figures);

    card.addEventListener('click', () => handlers.install(slot.id, module.id));
    card.addEventListener('mouseenter', () => handlers.previewModule(slot.id, module.id));
    card.addEventListener('focus', () => handlers.previewModule(slot.id, module.id));
    rack.body.appendChild(card);
  }
  container.appendChild(rack.wrapper);

  /* ---- finish ---- */
  const finishSection = section('표면 처리');
  const list = element('div', 'finish-list');
  for (const finish of FINISHES) {
    const option = element('button', 'finish-option');
    option.type = 'button';
    option.setAttribute('aria-pressed', String(doc.finish === finish.id));
    const swatch = element('span', 'finish-swatch');
    swatch.style.background = `linear-gradient(135deg, #${finish.alu.color.toString(16).padStart(6, '0')}, #${finish.steel.color.toString(16).padStart(6, '0')})`;
    const text = element('span');
    text.appendChild(element('span', 'finish-label', finish.name));
    text.appendChild(element('span', 'finish-note', finish.note));
    text.firstChild.style.display = 'block';
    text.lastChild.style.display = 'block';
    option.append(swatch, text);
    option.addEventListener('click', () => handlers.setFinish(finish.id));
    list.appendChild(option);
  }
  finishSection.body.appendChild(list);
  container.appendChild(finishSection.wrapper);

  const hint = element('div', 'hintline');
  hint.innerHTML =
    '<kbd>1</kbd>–<kbd>6</kbd> 슬롯 선택 · <kbd>E</kbd> 분해 · <kbd>X</kbd> 단면 · <kbd>M</kbd> 측정 · ' +
    '<kbd>F</kbd> 포커스 · <kbd>Home</kbd> 시점 초기화 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 실행 취소';
  container.appendChild(hint);
}

/* ------------------------------------------------------------------ *
 * Right rail — specification, compatibility verdict, delta, variants
 * ------------------------------------------------------------------ */

export function renderInspector(container, context) {
  const {
    doc, evaluation, selectedSlot, focusModuleId, lastDelta, variants,
    compareVariantId, handlers
  } = context;
  container.replaceChildren();

  const slot = getSlot(selectedSlot);
  const installedId = slot ? evaluation.loadout[slot.id] : null;
  const module = getModule(focusModuleId || installedId);

  /* ---- header ---- */
  const head = element('div', 'inspect-head');
  if (module) {
    head.appendChild(element('div', 'inspect-title', module.name));
    head.appendChild(element('div', 'inspect-sub',
      `${slot ? slot.short : module.slot.toUpperCase()} · ${MOUNT_LABELS[module.mount] || module.mount}`));
  } else if (slot) {
    head.appendChild(element('div', 'inspect-title', `${slot.name} — 비어 있음`));
    head.appendChild(element('div', 'inspect-sub', `${slot.short} · ${MOUNT_LABELS[slot.accepts[0]] || slot.accepts[0]}`));
  } else {
    head.appendChild(element('div', 'inspect-title', WEAPON_BASE.name));
    head.appendChild(element('div', 'inspect-sub', WEAPON_BASE.designation));
  }
  container.appendChild(head);

  if (module) {
    container.appendChild(element('p', 'inspect-role', module.role));

    const spec = section('제원');
    const table = element('table', 'spec-table');
    const rows = [
      ['질량', `${module.mass_g} g`],
      ['전력', module.power_a ? `${module.power_a.toFixed(1)} A` : '무전원'],
      ['체결', MOUNT_LABELS[module.mount] || module.mount],
      ...module.spec.map(([key, value]) => [key, value])
    ];
    for (const [key, value] of rows) {
      const tr = element('tr');
      tr.appendChild(element('th', null, key));
      tr.appendChild(element('td', null, value));
      table.appendChild(tr);
    }
    spec.body.style.padding = '0';
    spec.body.appendChild(table);
    container.appendChild(spec.wrapper);

    /* ---- compatibility verdict: why it can or cannot mount ---- */
    const preview = previewInstall(evaluation.loadout, module.slot, module.id);
    const verdict = element('div', 'verdict');
    verdict.dataset.tone = preview.ok ? 'ok' : 'bad';
    const vhead = element('div', 'verdict-head');
    vhead.appendChild(createIcon(preview.ok ? 'check' : 'warning', { size: 14 }));
    vhead.appendChild(element('span', null, preview.ok ? '장착 가능' : '장착 불가'));
    verdict.appendChild(vhead);

    if (preview.ok) {
      const reasons = element('ul');
      reasons.appendChild(element('li', null,
        `${MOUNT_LABELS[module.mount] || module.mount} 규격이 ${getSlot(module.slot).name} 슬롯과 일치한다.`));
      if (module.requires?.length) {
        reasons.appendChild(element('li', null,
          `선행 조건 충족: ${module.requires.map(t => CAPABILITY_LABELS[t] || t).join(', ')}`));
      }
      if (module.power_a) {
        const after = evaluation.bus.draw_a - (getModule(installedId)?.power_a || 0) + module.power_a;
        reasons.appendChild(element('li', null,
          `버스 부하 ${after.toFixed(1)} A / ${BUS_CAPACITY_A.toFixed(1)} A — 여유 ${(BUS_CAPACITY_A - after).toFixed(1)} A`));
      }
      reasons.appendChild(element('li', null, '점유 체적이 다른 장착 부품과 겹치지 않는다.'));
      verdict.appendChild(reasons);
    } else {
      for (const issue of preview.issues) {
        const p = element('p');
        p.appendChild(element('strong', null, `${issue.title} — `));
        p.appendChild(document.createTextNode(issue.detail));
        p.style.marginBottom = '5px';
        verdict.appendChild(p);
      }
    }
    container.appendChild(verdict);
  }

  /* ---- diagnostics for the whole configuration ---- */
  const diagnostics = section('진단', evaluation.issues.length ? String(evaluation.issues.length) : '정상');
  if (!evaluation.issues.length) {
    const ok = element('div', 'verdict');
    ok.dataset.tone = 'ok';
    const okHead = element('div', 'verdict-head');
    okHead.appendChild(createIcon('check', { size: 14 }));
    okHead.appendChild(element('span', null, '구성 유효'));
    ok.appendChild(okHead);
    ok.appendChild(element('p', null,
      `${evaluation.installed.length}개 모듈이 규격·선행조건·간섭·전력 검사를 모두 통과했다.`));
    ok.style.margin = '8px 10px';
    diagnostics.body.style.padding = '0 0 6px';
    diagnostics.body.appendChild(ok);
  } else {
    diagnostics.body.style.padding = '0 0 6px';
    for (const issue of evaluation.issues) {
      const box = element('div', 'verdict');
      box.dataset.tone = issue.severity === 'error' ? 'bad' : 'warn';
      box.style.margin = '8px 10px';
      const ihead = element('div', 'verdict-head');
      ihead.appendChild(createIcon(issue.severity === 'error' ? 'warning' : 'info', { size: 14 }));
      ihead.appendChild(element('span', null, issue.title));
      box.appendChild(ihead);
      box.appendChild(element('p', null, issue.detail));
      if (issue.slots.length) {
        const jump = element('button', 'text-button');
        jump.type = 'button';
        jump.style.marginTop = '7px';
        jump.appendChild(createIcon('focus', { size: 13 }));
        jump.appendChild(element('span', null, '해당 슬롯 보기'));
        jump.addEventListener('click', () => handlers.selectSlot(issue.slots[0]));
        box.appendChild(jump);
      }
      diagnostics.body.appendChild(box);
    }
  }
  container.appendChild(diagnostics.wrapper);

  /* ---- delta from the previous committed state ---- */
  const delta = section('직전 변경 대비');
  if (!lastDelta) {
    delta.body.appendChild(element('div', 'empty-note',
      '아직 변경이 없다. 모듈을 교체하면 질량 특성 변화가 여기에 나타난다.'));
  } else {
    delta.body.style.padding = '0';
    const table = element('table', 'delta-table');
    const header = element('tr');
    header.appendChild(element('th', null, lastDelta.label));
    header.appendChild(element('th', null, '이전'));
    header.appendChild(element('th', null, '변화'));
    header.firstChild.style.width = '46%';
    for (const cell of header.children) cell.style.textAlign = cell === header.firstChild ? 'left' : 'right';
    table.appendChild(header);

    for (const row of lastDelta.rows) {
      const tr = element('tr');
      tr.dataset.changed = String(row.changed);
      tr.appendChild(element('th', null, row.label));
      tr.appendChild(element('td', null, `${fmt(row.before, row.digits)}`));
      const change = element('td', row.changed ? (row.delta > 0 ? 'change up' : 'change down') : null,
        row.changed ? `${signed(row.delta, row.digits)} ${row.unit}`.trim() : '—');
      tr.appendChild(change);
      table.appendChild(tr);
    }
    delta.body.appendChild(table);
  }
  container.appendChild(delta.wrapper);

  /* ---- variants ---- */
  const variantSection = section('변형 비교', String(variants.length));
  const save = element('button', 'text-button primary');
  save.type = 'button';
  save.appendChild(createIcon('variant', { size: 14 }));
  save.appendChild(element('span', null, '현재 구성을 변형으로 저장'));
  save.style.width = '100%';
  save.style.justifyContent = 'center';
  save.addEventListener('click', () => handlers.saveVariant());
  variantSection.body.appendChild(save);

  if (!variants.length) {
    variantSection.body.appendChild(element('div', 'empty-note',
      '변형을 저장해 두면 서로 다른 구성의 질량·전장·관성을 나란히 비교할 수 있다.'));
  } else {
    for (const variant of variants) {
      const row = element('div', 'variant-row');
      row.dataset.active = String(compareVariantId === variant.id);
      const name = element('span', 'variant-name', variant.name);
      const figures = element('span', 'variant-figures',
        `${fmt(variant.mass_g, 0)} g · ${fmt(variant.length_mm, 0)} mm`);
      const controls = element('span');
      controls.style.display = 'flex';
      const compare = iconButton('compare', `${variant.name} 비교`, { size: 16 });
      compare.setAttribute('aria-pressed', String(compareVariantId === variant.id));
      compare.addEventListener('click', () => handlers.compareVariant(variant.id));
      const load = iconButton('importFile', `${variant.name} 불러오기`, { size: 16 });
      load.addEventListener('click', () => handlers.loadVariant(variant.id));
      const remove = iconButton('trash', `${variant.name} 삭제`, { size: 16 });
      remove.addEventListener('click', () => handlers.deleteVariant(variant.id));
      controls.append(compare, load, remove);
      row.append(name, figures, controls);
      variantSection.body.appendChild(row);
    }

    const active = variants.find(variant => variant.id === compareVariantId);
    if (active) {
      const rows = diffMeasurements(active, evaluation.measurements);
      const table = element('table', 'delta-table');
      const header = element('tr');
      header.appendChild(element('th', null, `vs ${active.name}`));
      header.appendChild(element('th', null, '변형'));
      header.appendChild(element('th', null, '현재'));
      for (const cell of header.children) cell.style.textAlign = cell === header.firstChild ? 'left' : 'right';
      table.appendChild(header);
      for (const row of rows) {
        const tr = element('tr');
        tr.dataset.changed = String(row.changed);
        tr.appendChild(element('th', null, row.label));
        tr.appendChild(element('td', null, fmt(row.before, row.digits)));
        const now = element('td', row.changed ? (row.delta > 0 ? 'change up' : 'change down') : null,
          `${fmt(row.after, row.digits)}`);
        tr.appendChild(now);
        table.appendChild(tr);
      }
      table.style.marginTop = '8px';
      variantSection.body.appendChild(table);
    }
  }
  container.appendChild(variantSection.wrapper);

  /* ---- model disclosure: the honest footer ---- */
  const model = section('산출 근거');
  const note = element('div', 'empty-note');
  note.innerHTML =
    '질량·치수는 이 가상 무기의 <b>설계 데이터</b>다. 그 위에 적용한 계산은 표준 강체 역학이다:<br>' +
    '· 총 질량 = Σmᵢ<br>' +
    '· 밸런스 포인트 = Σmᵢxᵢ / Σmᵢ (datum 기준)<br>' +
    '· 관성 = 평행축 정리, 각 부품을 균일 밀도 프리미티브(직육면체·봉·중공관)로 근사<br>' +
    '· 스윙 주기 = 2π√(I / m g d), 견착점 기준 복합진자 (미소각)<br>' +
    '실제 총기의 탄도·반동을 예측하지 않는다.';
  note.style.lineHeight = '1.75';
  model.body.appendChild(note);
  container.appendChild(model.wrapper);
}

/* ------------------------------------------------------------------ *
 * Readout strip
 * ------------------------------------------------------------------ */

const METRICS = [
  { key: 'mass_g', label: '총 질량', unit: 'g', digits: 0, icon: 'mass' },
  { key: 'length_mm', label: '전장', unit: 'mm', digits: 0, icon: 'ruler' },
  { key: 'balance_point_mm', label: '밸런스', unit: 'mm', digits: 1, icon: 'balance', signed: true },
  { key: 'inertia_yaw_kgm2', label: '조준 관성', unit: 'kg·m²', digits: 4, icon: 'orbit' },
  { key: 'gyradius_mm', label: '회전 반경', unit: 'mm', digits: 0, icon: 'focus' },
  { key: 'swing_period_ms', label: '스윙 주기', unit: 'ms', digits: 0, icon: 'measure' },
  { key: 'power_draw_a', label: '버스 부하', unit: 'A', digits: 1, icon: 'power' }
];

export function createReadout(container) {
  const cells = new Map();
  container.replaceChildren();

  for (const metric of METRICS) {
    const cell = element('div', 'metric');
    cell.dataset.metric = metric.key;
    const label = element('div', 'metric-label');
    label.appendChild(createIcon(metric.icon, { size: 11 }));
    label.appendChild(element('span', null, metric.label));
    const value = element('div', 'metric-value');
    const delta = element('div', 'metric-delta');
    cell.append(label, value, delta);
    container.appendChild(cell);
    cells.set(metric.key, { cell, value, delta });
  }

  let previous = null;

  function update(evaluation, options = {}) {
    const m = evaluation.measurements;
    for (const metric of METRICS) {
      const entry = cells.get(metric.key);
      const raw = metric.key === 'power_draw_a' ? evaluation.bus.draw_a : m[metric.key];
      if (!Number.isFinite(raw)) {
        entry.value.textContent = '—';
        entry.delta.textContent = '';
        continue;
      }
      const text = metric.signed && raw >= 0 ? `+${raw.toFixed(metric.digits)}` : raw.toFixed(metric.digits);
      entry.value.replaceChildren(document.createTextNode(text));
      const unit = element('span', 'unit', metric.key === 'power_draw_a'
        ? `A / ${BUS_CAPACITY_A.toFixed(1)}`
        : metric.unit);
      entry.value.appendChild(unit);

      const before = previous?.[metric.key];
      if (Number.isFinite(before) && Math.abs(raw - before) > Math.pow(10, -metric.digits) / 2) {
        entry.delta.textContent = `${signed(raw - before, metric.digits)}`;
        entry.delta.dataset.dir = raw > before ? 'up' : 'down';
        if (options.flash !== false) {
          entry.cell.dataset.flash = 'true';
          setTimeout(() => { entry.cell.dataset.flash = 'false'; }, 560);
        }
      } else if (!Number.isFinite(before)) {
        entry.delta.textContent = '';
        delete entry.delta.dataset.dir;
      }

      entry.cell.dataset.fault = String(
        metric.key === 'power_draw_a' && evaluation.bus.draw_a > BUS_CAPACITY_A
      );
    }
    previous = {
      ...m,
      power_draw_a: evaluation.bus.draw_a
    };
  }

  function reset() { previous = null; }

  return { update, reset, metrics: METRICS };
}

/* ------------------------------------------------------------------ *
 * Viewport status chip
 * ------------------------------------------------------------------ */

export function renderStatus(container, evaluation) {
  container.replaceChildren();
  container.dataset.state = evaluation.status;
  const icon = createIcon(
    evaluation.status === 'valid' ? 'check' : evaluation.status === 'warning' ? 'info' : 'warning',
    { size: 13 }
  );
  container.appendChild(icon);
  const text = evaluation.status === 'valid'
    ? '구성 유효'
    : evaluation.status === 'warning'
      ? '경고'
      : `제약 위반 ${evaluation.errors.length}건`;
  container.appendChild(element('span', null, text));
  const first = evaluation.errors[0] || evaluation.warnings[0];
  if (first) container.appendChild(element('span', 'detail', first.title));
}

/* ------------------------------------------------------------------ *
 * Toasts
 * ------------------------------------------------------------------ */

export function createToaster(container) {
  function show(message, { tone = 'info', title = null, duration = 4200 } = {}) {
    const toast = element('div', 'toast');
    toast.dataset.tone = tone;
    toast.appendChild(createIcon(tone === 'bad' ? 'warning' : tone === 'ok' ? 'check' : 'info', { size: 15 }));
    const body = element('div');
    if (title) body.appendChild(element('strong', null, title));
    body.appendChild(document.createTextNode(message));
    toast.appendChild(body);
    container.appendChild(toast);
    const remove = () => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 220);
    };
    const timer = setTimeout(remove, duration);
    return () => { clearTimeout(timer); remove(); };
  }
  function clear() { container.replaceChildren(); }
  return { show, clear };
}

export { MODULES, fmt };
