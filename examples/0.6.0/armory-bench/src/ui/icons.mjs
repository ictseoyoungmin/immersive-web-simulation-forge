/**
 * Authored icon system.
 *
 * One grid (24), one stroke weight (1.7 at 20 px optical size, 1.5 at 16 px),
 * round caps and joins, currentColor. No Unicode glyphs, no emoji, no font
 * dependency — every functional icon in the product comes from this file.
 */

const NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  // viewport modes
  orbit: [
    ['circle', { cx: '12', cy: '12', r: '3.2' }],
    ['path', { d: 'M12 3.4c4.8 0 8.6 1.5 8.6 3.4s-3.8 3.4-8.6 3.4S3.4 8.7 3.4 6.8 7.2 3.4 12 3.4Z', transform: 'rotate(28 12 12)' }],
    ['path', { d: 'M5.6 17.2a8.6 8.6 0 0 0 12.8 0' }]
  ],
  explode: [
    ['path', { d: 'M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21' }],
    ['rect', { x: '9.2', y: '9.2', width: '5.6', height: '5.6', rx: '1' }],
    ['path', { d: 'M5.6 5.6 8 8M18.4 5.6 16 8M5.6 18.4 8 16M18.4 18.4 16 16' }]
  ],
  section: [
    ['path', { d: 'M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z' }],
    ['path', { d: 'M12 4v16' }],
    ['path', { d: 'M4 7.5 12 11l8-3.5', 'stroke-dasharray': '2.2 2' }]
  ],
  measure: [
    ['rect', { x: '2.6', y: '8.4', width: '18.8', height: '7.2', rx: '1.2', transform: 'rotate(-14 12 12)' }],
    ['path', { d: 'M7 9.4v2.6M11 8.4v3.4M15 7.4v2.6M19 6.4v3.4', transform: 'rotate(-14 12 12)' }]
  ],
  resetView: [
    ['path', { d: 'M4.2 10.4A8 8 0 1 1 4 14' }],
    ['path', { d: 'M3.6 5.4v5h5' }],
    ['circle', { cx: '12', cy: '12', r: '1.6' }]
  ],
  focus: [
    ['path', { d: 'M4 8.6V5.4A1.4 1.4 0 0 1 5.4 4h3.2M15.4 4h3.2A1.4 1.4 0 0 1 20 5.4v3.2M20 15.4v3.2a1.4 1.4 0 0 1-1.4 1.4h-3.2M8.6 20H5.4A1.4 1.4 0 0 1 4 18.6v-3.2' }],
    ['circle', { cx: '12', cy: '12', r: '2.6' }]
  ],

  // history and document
  undo: [
    ['path', { d: 'M4 9h9.6a5.4 5.4 0 0 1 0 10.8H8' }],
    ['path', { d: 'm7.6 5.2-3.8 3.8 3.8 3.8' }]
  ],
  redo: [
    ['path', { d: 'M20 9h-9.6a5.4 5.4 0 0 0 0 10.8H16' }],
    ['path', { d: 'm16.4 5.2 3.8 3.8-3.8 3.8' }]
  ],
  save: [
    ['path', { d: 'M5.4 4h10.2L20 8.4v11.2A1.4 1.4 0 0 1 18.6 21H5.4A1.4 1.4 0 0 1 4 19.6V5.4A1.4 1.4 0 0 1 5.4 4Z' }],
    ['path', { d: 'M8 4v5h7V4' }],
    ['rect', { x: '8', y: '13', width: '8', height: '8', rx: '0.8' }]
  ],
  exportFile: [
    ['path', { d: 'M20 15.4v3.2A1.4 1.4 0 0 1 18.6 20H5.4A1.4 1.4 0 0 1 4 18.6v-3.2' }],
    ['path', { d: 'M12 3.6v11.2' }],
    ['path', { d: 'm7.8 8 4.2-4.4L16.2 8' }]
  ],
  importFile: [
    ['path', { d: 'M20 15.4v3.2A1.4 1.4 0 0 1 18.6 20H5.4A1.4 1.4 0 0 1 4 18.6v-3.2' }],
    ['path', { d: 'M12 15.2V4' }],
    ['path', { d: 'm7.8 10.8 4.2 4.4 4.2-4.4' }]
  ],
  compare: [
    ['path', { d: 'M12 3.4v17.2' }],
    ['path', { d: 'M7.6 7.2H4.2v9.6h3.4ZM19.8 5.2h-3.4v13.6h3.4Z' }]
  ],
  variant: [
    ['circle', { cx: '6.4', cy: '6.4', r: '2.4' }],
    ['circle', { cx: '6.4', cy: '17.6', r: '2.4' }],
    ['circle', { cx: '17.6', cy: '12', r: '2.4' }],
    ['path', { d: 'M8.6 7.6 15.4 11M8.6 16.4 15.4 13' }]
  ],
  trash: [
    ['path', { d: 'M4.6 6.6h14.8' }],
    ['path', { d: 'M9.2 6.6V4.8a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1v1.8' }],
    ['path', { d: 'M6.6 6.6 7.5 19a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12.4' }]
  ],

  // state and diagnostics
  lock: [
    ['rect', { x: '5', y: '10.4', width: '14', height: '9.6', rx: '1.6' }],
    ['path', { d: 'M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6' }],
    ['circle', { cx: '12', cy: '15', r: '1.3' }]
  ],
  warning: [
    ['path', { d: 'M12 4.2 21 19.4H3Z' }],
    ['path', { d: 'M12 10v4.2' }],
    ['circle', { cx: '12', cy: '17', r: '0.9', fill: 'currentColor', stroke: 'none' }]
  ],
  check: [
    ['circle', { cx: '12', cy: '12', r: '8.4' }],
    ['path', { d: 'm8.2 12.2 2.7 2.7 5-5.6' }]
  ],
  power: [
    ['path', { d: 'M12 3.4v8.4' }],
    ['path', { d: 'M7.4 6.6a7.2 7.2 0 1 0 9.2 0' }]
  ],
  mass: [
    ['path', { d: 'M5 20h14l-2.6-9.6H7.6Z' }],
    ['circle', { cx: '12', cy: '6.4', r: '2.4' }],
    ['path', { d: 'M9.7 8.2 8.4 10.4M14.3 8.2l1.3 2.2' }]
  ],
  ruler: [
    ['path', { d: 'M3.4 15.2 15.2 3.4l5.4 5.4L8.8 20.6Z' }],
    ['path', { d: 'm7.2 11.4 1.8 1.8M10 8.6l1.8 1.8M12.8 5.8l1.8 1.8' }]
  ],
  balance: [
    ['path', { d: 'M12 4.6v14.8M6.4 19.4h11.2' }],
    ['path', { d: 'M4 9.4h16' }],
    ['path', { d: 'M4 9.4 1.8 14.6h4.4ZM20 9.4l-2.2 5.2h4.4' }]
  ],

  // audio
  audioOn: [
    ['path', { d: 'M5 9.6v4.8h3.2L12.6 18V6l-4.4 3.6Z' }],
    ['path', { d: 'M15.6 9.4a3.6 3.6 0 0 1 0 5.2' }],
    ['path', { d: 'M18 7a7 7 0 0 1 0 10' }]
  ],
  audioOff: [
    ['path', { d: 'M5 9.6v4.8h3.2L12.6 18V6l-4.4 3.6Z' }],
    ['path', { d: 'm16 10 4.4 4.4M20.4 10 16 14.4' }]
  ],

  // navigation
  chevronDown: [['path', { d: 'm6.4 9.6 5.6 5.2 5.6-5.2' }]],
  chevronRight: [['path', { d: 'm9.6 6.4 5.2 5.6-5.2 5.6' }]],
  close: [['path', { d: 'M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6' }]],
  info: [
    ['circle', { cx: '12', cy: '12', r: '8.4' }],
    ['path', { d: 'M12 11.2v5' }],
    ['circle', { cx: '12', cy: '8.2', r: '0.95', fill: 'currentColor', stroke: 'none' }]
  ],
  slot: [
    ['rect', { x: '3.6', y: '8.6', width: '16.8', height: '6.8', rx: '1.2' }],
    ['path', { d: 'M7.6 8.6v6.8M12 8.6v6.8M16.4 8.6v6.8' }]
  ]
};

/** Stroke weight tuned per optical size so 16 px icons stay crisp. */
function strokeFor(size) {
  if (size <= 16) return 1.5;
  if (size <= 20) return 1.7;
  return 1.8;
}

export function createIcon(name, options = {}) {
  const definition = ICONS[name];
  if (!definition) throw new Error(`Unknown icon: ${name}`);
  const size = options.size || 20;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(options.strokeWidth || strokeFor(size)));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  svg.dataset.icon = name;
  for (const [tag, attributes] of definition) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    svg.appendChild(node);
  }
  return svg;
}

/** Icon button with an accessible name — never an icon alone without a label. */
export function iconButton(name, label, { size = 20, className = '', title = label } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-button ${className}`.trim();
  button.setAttribute('aria-label', label);
  button.title = title;
  button.appendChild(createIcon(name, { size }));
  return button;
}

export function listIcons() {
  return Object.keys(ICONS);
}

export const ICON_GRID = 24;
export const OPTICAL_SIZES = [16, 20, 24];
