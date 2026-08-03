const NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  audio: [['path',{d:'M5 10v4h3l4 3V7L8 10H5'}],['path',{d:'M15 9.5a4 4 0 0 1 0 5'}],['path',{d:'M17.5 7a7.5 7.5 0 0 1 0 10'}]],
  mute: [['path',{d:'M5 10v4h3l4 3V7L8 10H5'}],['path',{d:'m16 10 5 5'}],['path',{d:'m21 10-5 5'}]],
  storm: [['path',{d:'M6 16h11.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.3-1.7A4.5 4.5 0 0 0 6 16Z'}],['path',{d:'m13 15-2 4h3l-2 4'}]],
  cinema: [['rect',{x:'4',y:'6',width:'16',height:'12',rx:'2'}],['path',{d:'M8 6v12M16 6v12M4 10h4M16 10h4M4 14h4M16 14h4'}]],
  scan: [['path',{d:'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3'}],['circle',{cx:'12',cy:'12',r:'3'}]],
  settings: [['circle',{cx:'12',cy:'12',r:'3'}],['path',{d:'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1H9.6V21a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1V9.6h.1A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4v.1A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6 1.1Z'}]],
  compass: [['circle',{cx:'12',cy:'12',r:'8'}],['path',{d:'m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z'}]],
  pause: [['path',{d:'M9 6v12M15 6v12'}]],
  play: [['path',{d:'m9 6 9 6-9 6V6Z'}]],
  close: [['path',{d:'M6 6l12 12M18 6 6 18'}]],
  chevronLeft: [['path',{d:'m15 18-6-6 6-6'}]],
  chevronRight: [['path',{d:'m9 18 6-6-6-6'}]]
};

function makeNode([tag, attrs]) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

export function createIcon(name, options = {}) {
  const definition = ICONS[name];
  if (!definition) throw new Error(`Unknown icon: ${name}`);
  const svg = document.createElementNS(NS, 'svg');
  const size = options.size || 20;
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', options.stroke || 'currentColor');
  svg.setAttribute('stroke-width', String(options.strokeWidth || 1.6));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', options.decorative === false ? 'false' : 'true');
  svg.setAttribute('focusable', 'false');
  svg.dataset.icon = name;
  definition.forEach(item => svg.appendChild(makeNode(item)));
  return svg;
}

export function mountIcon(target, name, options = {}) {
  if (!target) throw new Error('mountIcon requires a target');
  target.replaceChildren(createIcon(name, options));
  if (options.label) target.setAttribute('aria-label', options.label);
  return target;
}

export function listIcons() { return Object.keys(ICONS); }
