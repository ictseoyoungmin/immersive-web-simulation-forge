/**
 * Native-resolution annotation layer.
 *
 * Everything measured or named is drawn as SVG over the canvas, never inside the
 * scene pass: leader lines, part callouts, dimension lines and the balance-point
 * label stay at output resolution even when the renderer is running below native
 * (references/perceptual-fidelity.md — the micro-interface is its own resolution).
 */

import { Vector3, Box3 } from '../../vendor/three/three.module.min.js';
import { SLOTS, WEAPON_BASE, getModule } from '../data/catalog.mjs';

const NS = 'http://www.w3.org/2000/svg';
const MM = 0.001;

function node(tag, attributes = {}) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function createOverlay(svg) {
  const layers = {
    dimension: node('g', { class: 'ovl-dimension' }),
    leader: node('g', { class: 'ovl-leader' }),
    fault: node('g', { class: 'ovl-fault' })
  };
  svg.append(layers.dimension, layers.leader, layers.fault);

  const scratch = new Vector3();
  const box = new Box3();

  function project(point, camera, width, height) {
    scratch.copy(point).project(camera);
    return {
      x: (scratch.x * 0.5 + 0.5) * width,
      y: (-scratch.y * 0.5 + 0.5) * height,
      z: scratch.z,
      visible: scratch.z > -1 && scratch.z < 1
    };
  }

  function onScreen(point, width, height, margin = 8) {
    return point.visible && point.x > margin && point.x < width - margin
      && point.y > margin && point.y < height - margin;
  }

  function clear(layer) {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  }

  function label(x, y, lines, variant = 'default', anchor = 'start') {
    const group = node('g', { class: `ovl-label ovl-${variant}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    const width = Math.max(...lines.map(line => line.text.length * (line.small ? 5.6 : 6.6))) + 16;
    const height = lines.length * 13 + 8;
    const dx = anchor === 'end' ? -width : 0;
    group.appendChild(node('rect', { x: dx, y: -height / 2, width, height, rx: 2, class: 'ovl-plate' }));
    group.appendChild(node('rect', { x: dx, y: -height / 2, width: 2, height, class: 'ovl-tab' }));
    lines.forEach((line, index) => {
      const text = node('text', {
        x: dx + 9,
        y: -height / 2 + 14 + index * 13,
        class: line.small ? 'ovl-text ovl-small' : 'ovl-text'
      });
      text.textContent = line.text;
      group.appendChild(text);
    });
    return group;
  }

  function dimensionLine(a, b, text, offsetY) {
    const group = node('g', { class: 'ovl-dim' });
    const y = Math.max(a.y, b.y) + offsetY;
    group.appendChild(node('line', { x1: a.x, y1: a.y, x2: a.x, y2: y, class: 'ovl-witness' }));
    group.appendChild(node('line', { x1: b.x, y1: b.y, x2: b.x, y2: y, class: 'ovl-witness' }));
    group.appendChild(node('line', { x1: a.x, y1: y, x2: b.x, y2: y, class: 'ovl-dimline' }));
    for (const [x, direction] of [[a.x, 1], [b.x, -1]]) {
      group.appendChild(node('path', {
        d: `M${x} ${y} l${direction * 7} -3.2 l0 6.4 Z`,
        class: 'ovl-arrow'
      }));
    }
    const mid = (a.x + b.x) / 2;
    const plate = node('g', { transform: `translate(${mid.toFixed(1)} ${(y).toFixed(1)})`, class: 'ovl-dimlabel' });
    const width = text.length * 7.2 + 14;
    plate.appendChild(node('rect', { x: -width / 2, y: -9, width, height: 18, rx: 2, class: 'ovl-plate' }));
    const t = node('text', { x: 0, y: 4, class: 'ovl-text ovl-centre' });
    t.textContent = text;
    plate.appendChild(t);
    group.appendChild(plate);
    return group;
  }

  /** Simple vertical de-collision so callouts never stack on top of each other. */
  function spread(items, minGap = 30) {
    const sorted = [...items].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].y - sorted[i - 1].y < minGap) sorted[i].y = sorted[i - 1].y + minGap;
    }
    return items;
  }

  function update({ camera, assembly, evaluation, mode, width, height, showMeasure }) {
    clear(layers.leader);
    clear(layers.dimension);
    clear(layers.fault);
    if (!width || !height) return;

    const measurements = evaluation.measurements;

    /* ---- exploded view: name every separated part ---- */
    if (mode === 'exploded' && assembly.state.explode > 0.25) {
      const opacity = Math.min(1, (assembly.state.explode - 0.25) / 0.45);
      layers.leader.setAttribute('opacity', opacity.toFixed(2));
      const callouts = [];

      for (const slot of SLOTS) {
        const moduleId = evaluation.loadout[slot.id];
        const module = getModule(moduleId);
        const record = assembly.slotNodes.get(slot.id);
        if (!module || !record?.meshes) continue;
        box.setFromObject(record.meshes);
        if (box.isEmpty()) continue;
        box.getCenter(scratch);
        const point = project(scratch.clone(), camera, width, height);
        if (!onScreen(point, width, height, 70)) continue;
        callouts.push({
          anchorX: point.x, anchorY: point.y,
          x: point.x + (point.x > width * 0.5 ? 62 : -62),
          y: point.y,
          side: point.x > width * 0.5 ? 'start' : 'end',
          lines: [
            { text: module.name },
            { text: `${slot.short} · ${module.mass_g} g${module.power_a ? ` · ${module.power_a.toFixed(1)} A` : ''}`, small: true }
          ]
        });
      }

      for (const part of WEAPON_BASE.parts) {
        const group = assembly.root.getObjectByName('base')?.children
          .find(child => child.userData.partId === part.id);
        if (!group) continue;
        box.setFromObject(group);
        if (box.isEmpty()) continue;
        box.getCenter(scratch);
        const point = project(scratch.clone(), camera, width, height);
        if (!onScreen(point, width, height, 70)) continue;
        callouts.push({
          anchorX: point.x, anchorY: point.y,
          x: point.x + (point.x > width * 0.5 ? 62 : -62),
          y: point.y,
          side: point.x > width * 0.5 ? 'start' : 'end',
          base: true,
          lines: [
            { text: part.name },
            { text: `본체 고정 · ${part.mass_g} g`, small: true }
          ]
        });
      }

      spread(callouts, 34);
      for (const callout of callouts) {
        layers.leader.appendChild(node('line', {
          x1: callout.anchorX, y1: callout.anchorY,
          x2: callout.x + (callout.side === 'start' ? -6 : 6), y2: callout.y,
          class: callout.base ? 'ovl-leaderline ovl-base' : 'ovl-leaderline'
        }));
        layers.leader.appendChild(node('circle', {
          cx: callout.anchorX, cy: callout.anchorY, r: 2.4,
          class: callout.base ? 'ovl-dot ovl-base' : 'ovl-dot'
        }));
        layers.leader.appendChild(label(
          callout.x, callout.y, callout.lines,
          callout.base ? 'base' : 'module',
          callout.side
        ));
      }
    }

    /* ---- measurement overlay ---- */
    if (showMeasure && measurements.valid && assembly.state.explode < 0.4) {
      const bounds = measurements.bounds_mm;
      const yFloor = bounds.y[0] * MM;
      const rear = project(new Vector3(bounds.x[0] * MM, yFloor, 0), camera, width, height);
      const front = project(new Vector3(bounds.x[1] * MM, yFloor, 0), camera, width, height);
      if (rear.visible && front.visible) {
        layers.dimension.appendChild(dimensionLine(rear, front, `전장 ${measurements.length_mm.toFixed(0)} mm`, 46));
      }

      const balance = project(new Vector3(measurements.balance_point_mm * MM, yFloor, 0), camera, width, height);
      if (balance.visible) {
        layers.dimension.appendChild(node('line', {
          x1: balance.x, y1: balance.y, x2: balance.x, y2: balance.y + 26, class: 'ovl-balanceline'
        }));
        layers.dimension.appendChild(label(balance.x + 10, balance.y + 40, [
          { text: `밸런스 ${measurements.balance_point_mm >= 0 ? '+' : ''}${measurements.balance_point_mm.toFixed(1)} mm` },
          { text: `datum 기준 · k ${measurements.gyradius_mm.toFixed(0)} mm`, small: true }
        ], 'balance'));
      }

      const datum = project(new Vector3(0, yFloor, 0), camera, width, height);
      if (datum.visible) {
        layers.dimension.appendChild(node('line', {
          x1: datum.x, y1: datum.y - 8, x2: datum.x, y2: datum.y + 14, class: 'ovl-datum'
        }));
        const mark = node('text', { x: datum.x, y: datum.y + 26, class: 'ovl-text ovl-small ovl-centre ovl-muted' });
        mark.textContent = 'DATUM 0';
        layers.dimension.appendChild(mark);
      }
    }

    /* ---- interference callout ---- */
    const clearanceIssue = evaluation.errors.find(issue => issue.rule === 'clearance' && issue.overlap);
    if (clearanceIssue) {
      const overlap = clearanceIssue.overlap;
      const centre = new Vector3(
        ((overlap.x[0] + overlap.x[1]) / 2) * MM,
        ((overlap.y[0] + overlap.y[1]) / 2) * MM,
        ((overlap.z[0] + overlap.z[1]) / 2) * MM
      );
      const point = project(centre, camera, width, height);
      if (point.visible) {
        layers.fault.appendChild(node('circle', { cx: point.x, cy: point.y, r: 15, class: 'ovl-faultring' }));
        layers.fault.appendChild(node('line', {
          x1: point.x, y1: point.y, x2: point.x + 54, y2: point.y - 40, class: 'ovl-leaderline ovl-faultline'
        }));
        layers.fault.appendChild(label(point.x + 58, point.y - 40, [
          { text: '간섭 — 동시 체결 불가' },
          { text: `겹침 ${(overlap.x[1] - overlap.x[0]).toFixed(0)} mm @ X ${overlap.x[0].toFixed(0)}–${overlap.x[1].toFixed(0)}`, small: true }
        ], 'fault'));
      }
    }
  }

  function dispose() {
    for (const layer of Object.values(layers)) {
      clear(layer);
      layer.remove();
    }
  }

  return { update, dispose };
}
