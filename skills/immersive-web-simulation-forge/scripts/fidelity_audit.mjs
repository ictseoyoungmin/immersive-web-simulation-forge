#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const input = args.find(arg => !arg.startsWith('--'));
if (!input) {
  console.error('Usage: node scripts/fidelity_audit.mjs <entry.html> [--flagship] [--out report.json]');
  process.exit(2);
}
const flagship = args.includes('--flagship');
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : null;
const inputPath = path.resolve(input);
const file = fs.statSync(inputPath).isDirectory() ? path.join(inputPath, 'index.html') : inputPath;
const projectRoot = fs.statSync(inputPath).isDirectory() ? inputPath : path.dirname(file);
const visited = new Set();
const sourceFiles = [];
const queue = [file];
while (queue.length) {
  const current = queue.shift();
  if (!current || visited.has(current) || !fs.existsSync(current) || !fs.statSync(current).isFile()) continue;
  if (!current.startsWith(projectRoot + path.sep) && current !== file) continue;
  visited.add(current);
  const source = fs.readFileSync(current, 'utf8');
  sourceFiles.push({ file: current, source });
  const refs = [];
  if (/\.html?$/i.test(current)) {
    for (const match of source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) refs.push(match[1]);
  }
  if (/\.[mc]?js$/i.test(current)) {
    for (const match of source.matchAll(/(?:import\s*(?:[^"']*?\sfrom\s*)?|export\s+[^"']*?\sfrom\s*|import\s*\()\s*["']([^"']+)["']/g)) refs.push(match[1]);
  }
  for (const ref of refs) {
    if (!ref || ref.startsWith('#') || ref.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0];
    const resolved = ref.startsWith('/')
      ? path.resolve(projectRoot, clean.replace(/^\/+/, ''))
      : path.resolve(path.dirname(current), clean);
    if (resolved.startsWith(projectRoot + path.sep) && !visited.has(resolved)) queue.push(resolved);
  }
}
const entryText = sourceFiles.find(item => item.file === file)?.source || '';
const text = sourceFiles.map(item => item.source).join('\n');
const compact = text.replace(/\s+/g, ' ');
const findings = [];
const add = (id, severity, detail) => findings.push({ id, severity, detail });

const scaleExpression = compact.match(/renderScale\s*:\s*([^,}]+)/i)?.[1] || '';
const scaleWindow = compact.match(/renderScale.{0,240}/i)?.[0] || scaleExpression;
const likelySceneScales = [...scaleExpression.matchAll(/(?:0?\.\d+)/g)].map(m => Number(m[0])).filter(value => value > 0 && value <= 1.5);
const hasReconstruction = /resolve[-_ ]?pass|upscal|sharpen|rcas|easu|fsr|smaa|fxaa|taa|post[-_ ]?chain/i.test(compact);
const hasCaptureLock = /captureMode|capturePreset|presentationPreset|lockQuality|adaptiveLocked|captureLocked/i.test(compact);
const hasAdaptiveResolution = /sceneScale|renderScale|adaptiveFloor|adaptiveCeiling|resolutionPolicy|setSize\([^)]*(?:scale|ratio)/i.test(compact);
const adaptiveCeilMatches = [...compact.matchAll(/renderScale\s*<\s*(0?\.\d+)|Math\.min\(\s*(0?\.\d+)\s*,\s*state\.renderScale/gi)]
  .map(m => Number(m[1] || m[2])).filter(Number.isFinite);
const adaptiveCeiling = adaptiveCeilMatches.length ? Math.max(...adaptiveCeilMatches) : null;

if (likelySceneScales.length && Math.max(...likelySceneScales) < 0.85 && !hasReconstruction) {
  add('low-default-scene-density', flagship ? 'error' : 'warning', `renderScale candidates ${JSON.stringify(likelySceneScales)} remain below 0.85 without a reconstruction/resolve pass`);
}
if (adaptiveCeiling !== null && adaptiveCeiling < 0.9) {
  add('low-adaptive-ceiling', flagship ? 'error' : 'warning', `adaptive resolution ceiling appears to be ${adaptiveCeiling}; no near-native presentation tier is reachable`);
}
if (/test/i.test(scaleExpression) && likelySceneScales.some(value => value < 0.6) && !hasCaptureLock) {
  add('test-capture-quality-coupling', flagship ? 'error' : 'warning', 'test mode appears to lower render quality and no independent presentation capture lock was found');
}
if (/antialias\s*:\s*false/i.test(compact) && !hasReconstruction) {
  add('no-explicit-resolve', 'warning', 'antialiasing is disabled and no native-resolution resolve/reconstruction stage was detected');
}
if (/grain.{0,100}gl_FragCoord|hash\w*\(frag/i.test(compact) && likelySceneScales.some(v => v < 0.9) && !hasReconstruction) {
  add('high-frequency-before-upscale', 'warning', 'grain/scanline-like high-frequency detail is generated in the low-resolution scene pass rather than native output space');
}

const buttonBodies = [...entryText.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[1].trim());
const unicodeButtons = buttonBodies.filter(body => {
  if (!body || /<svg\b/i.test(body) || /<img\b/i.test(body)) return false;
  const stripped = body.replace(/<[^>]+>/g, '').trim();
  return stripped.length > 0 && stripped.length <= 8 && !/[A-Za-z0-9가-힣]/.test(stripped);
});
if (unicodeButtons.length) {
  add('unicode-icon-placeholders', flagship ? 'error' : 'warning', `${unicodeButtons.length} button(s) use text symbols instead of an authored SVG/icon system: ${unicodeButtons.slice(0,6).join(' ')}`);
}
if (/yaw\s*-=\s*(?:dx|e\.movementX|event\.movementX)/i.test(compact)) {
  add('possible-inverted-horizontal-look', 'warning', 'horizontal pointer delta subtracts from yaw; verify that dragging/moving right turns the view right and expose inversion settings when appropriate');
}
if (/pointerLock/i.test(compact) && !/invertX|invertY|setInversion|directionReviewed/i.test(compact)) {
  add('pointer-direction-contract-missing', 'warning', 'pointer look exists but no explicit inversion/direction contract was detected');
}

const worldSize = Number(compact.match(/\bWORLD_SIZE\s*=\s*(\d+(?:\.\d+)?)/i)?.[1]);
const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*km\s*(?:²|2)/i);
const displayedArea = Number(areaMatch?.[1]);
const meterSemantics = /(?:--|distance|거리|alt|coordinates?).{0,80}\bm\b|\b\d+(?:\.\d+)?\s*m\b/i.test(compact);
let computedBoundingArea = null;
if (Number.isFinite(worldSize) && Number.isFinite(displayedArea) && meterSemantics) {
  computedBoundingArea = worldSize * worldSize / 1_000_000;
  const relativeError = Math.abs(displayedArea - computedBoundingArea) / Math.max(computedBoundingArea, 1e-9);
  if (relativeError > 0.1) {
    add('displayed-world-area-mismatch', flagship ? 'error' : 'warning', `displayed area ${displayedArea} km² does not match WORLD_SIZE ${worldSize} m bounding area ${computedBoundingArea.toFixed(4)} km²; label a different area basis explicitly if intended`);
  }
}

const hasWebGL = /getContext\(\s*['"]webgl2?/i.test(compact);
if (hasWebGL && !/webglcontextlost/i.test(compact)) {
  add('webgl-context-loss-unhandled', 'warning', 'WebGL is used but no context-loss handler was detected');
}
if (hasWebGL && !/beforeunload|pagehide|destroy\s*\(|dispose\s*\(/i.test(compact)) {
  add('runtime-disposal-missing', 'warning', 'no explicit lifecycle/disposal path was detected for WebGL resources and listeners');
}
if (/prefers-reduced-motion/i.test(compact) && !/motionScale|reducedMotion|reduceMotion|worldMotion/i.test(compact)) {
  add('css-only-reduced-motion', 'warning', 'reduced-motion handling appears limited to CSS; change camera/world motion law as well');
}
if (/\bdt\s*=\s*Math\.min\(/i.test(compact) && /fpsFrames\s*\/\s*fpsAccum|\b1\s*\/\s*dt\b/i.test(compact)) {
  add('clamped-delta-performance-telemetry', 'warning', 'FPS appears to be derived from a clamped simulation delta; measure successive requestAnimationFrame wall timestamps instead');
}
const sceneTextureSamples = (text.match(/texture\s*\(\s*uScene\b/g) || []).length;
if (sceneTextureSamples >= 7 && !hasAdaptiveResolution) {
  add('full-screen-post-without-adaptation', 'warning', `${sceneTextureSamples} scene-texture samples were detected in a full-screen post path without an adaptive-resolution contract`);
}

const errors = findings.filter(item => item.severity === 'error');
const report = {
  status: errors.length ? 'fail' : 'pass',
  file,
  flagship,
  metrics: {
    render_scale_candidates: likelySceneScales,
    adaptive_ceiling: adaptiveCeiling,
    reconstruction_detected: hasReconstruction,
    capture_lock_detected: hasCaptureLock,
    unicode_icon_buttons: unicodeButtons.length,
    world_size_m_candidate: Number.isFinite(worldSize) ? worldSize : null,
    displayed_area_km2_candidate: Number.isFinite(displayedArea) ? displayedArea : null,
    computed_bounding_area_km2: computedBoundingArea,
    scene_texture_samples: sceneTextureSamples,
    adaptive_resolution_detected: hasAdaptiveResolution,
    source_files_scanned: sourceFiles.map(item => path.relative(projectRoot, item.file).split(path.sep).join('/') || path.basename(item.file))
  },
  findings
};
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
process.exit(report.status === 'pass' ? 0 : 1);
