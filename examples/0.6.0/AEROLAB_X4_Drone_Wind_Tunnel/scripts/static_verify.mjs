import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html',
  'bootstrap.mjs',
  'FORGE_PLAN.json',
  'kits/runtime/frame-loop.mjs',
  'kits/runtime/lifecycle.mjs',
  'kits/compute/drone-physics.mjs',
  'kits/compute/wind-field.mjs',
  'kits/compute/rotor-model.mjs',
  'kits/compute/aerodynamics.mjs',
  'kits/canvas/field-renderer.mjs',
  'kits/canvas/telemetry-renderer.mjs',
  'kits/three/post-chain.mjs',
  'kits/three/lod-bands.mjs',
  'kits/three/picking-gizmo.mjs',
  'kits/authoring/parameter-store.mjs',
  'kits/authoring/history-store.mjs',
  'kits/analysis/measurement-series.mjs',
  'kits/ui/icon-system.mjs',
  'references/physics-simulation.md',
  'scripts/browser_verify.mjs'
];
const errors = [];

for (const file of required) {
  try {
    if (!statSync(join(root, file)).isFile()) errors.push(`Not a file: ${file}`);
  } catch {
    errors.push(`Missing: ${file}`);
  }
}

const modules = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const filePath = join(directory, name);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      if (name !== '.forge' && name !== 'evidence') walk(filePath);
    } else if (/\.(mjs|js)$/.test(name)) modules.push(filePath);
  }
}
walk(root);

for (const file of modules) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`${relative(root, file)}: ${result.stderr.trim()}`);
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const token of ['id="glCanvas"', 'id="fieldCanvas"', 'type="module"', 'bootstrap.mjs']) {
  if (!html.includes(token)) errors.push(`index.html missing ${token}`);
}
if (/https?:\/\//i.test(html)) errors.push('index.html contains an unexpected remote URL');

const bootstrap = readFileSync(join(root, 'bootstrap.mjs'), 'utf8');
for (const token of [
  "./kits/runtime/frame-loop.mjs",
  "./kits/runtime/lifecycle.mjs",
  'fixedStep:1/120',
  'window.__DRONE_FORGE__',
  'runHeadlessStability'
]) {
  if (!bootstrap.includes(token)) errors.push(`bootstrap.mjs missing ${token}`);
}

const rotor = readFileSync(join(root, 'kits/compute/rotor-model.mjs'), 'utf8');
if (!/thrust:\s*kt\s*\*\s*omega\s*\*\s*omega/.test(rotor)) errors.push('rotor thrust law is not explicitly kt * omega^2');
if (!/reactionTorque:\s*kd\s*\*\s*omega\s*\*\s*omega/.test(rotor)) errors.push('rotor reaction torque law is not explicitly kd * omega^2');

const aerodynamics = readFileSync(join(root, 'kits/compute/aerodynamics.mjs'), 'utf8');
for (const token of ['.5 * rho * speed * speed', 'drag', 'lift', 'incidence']) {
  if (!aerodynamics.includes(token)) errors.push(`aerodynamics.mjs missing ${token}`);
}

const browserVerify = readFileSync(join(root, 'scripts/browser_verify.mjs'), 'utf8');
if (!browserVerify.includes('stats.averageFPS < 45')) errors.push('browser verifier does not enforce the <45 FPS warning threshold');
if (!browserVerify.includes('windSpeed:30')) errors.push('browser verifier does not run the 30 m/s case');

const plan = JSON.parse(readFileSync(join(root, 'FORGE_PLAN.json'), 'utf8'));
if (plan.performance_budget.physics_hz !== 120) errors.push('FORGE_PLAN physics_hz must be 120');
if (plan.profile !== 'full-window-world') errors.push('FORGE_PLAN profile must be full-window-world');
if (!Array.isArray(plan.system?.consumers) || plan.system.consumers.length < 5) errors.push('FORGE_PLAN must identify shared-state consumers');

if (errors.length) {
  console.error(JSON.stringify({ pass: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  pass: true,
  moduleCount: modules.length,
  requiredCount: required.length,
  profile: plan.profile,
  ambition: plan.ambition,
  physicsHz: plan.performance_budget.physics_hz,
  externalDependencies: 0,
  sharedFieldConsumers: plan.system.consumers.length
}, null, 2));
