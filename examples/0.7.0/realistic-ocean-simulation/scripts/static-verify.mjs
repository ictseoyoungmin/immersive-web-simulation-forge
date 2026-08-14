import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];
const notes = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.forge') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await collect(path));
    else paths.push(path);
  }
  return paths;
}

const files = await collect(root);
const sourceFiles = files.filter((path) => /\.(?:ts|css|html|mjs|json|md)$/.test(path));
const source = (await Promise.all(sourceFiles.map((path) => readFile(path, 'utf8')))).join('\n');
const productFiles = sourceFiles.filter((path) => !path.endsWith('static-verify.mjs'));
const productSource = (await Promise.all(productFiles.map((path) => readFile(path, 'utf8')))).join('\n');

const rendererCount = (source.match(/new THREE\.WebGLRenderer\(/g) ?? []).length;
if (rendererCount !== 1) failures.push(`expected exactly one WebGLRenderer construction, found ${rendererCount}`);

const oceanPathCount = (source.match(/pelagic-ocean-single-render-path/g) ?? []).length;
if (oceanPathCount < 1) failures.push('single ocean path marker missing');

for (const token of ['start', 'resize', 'suspend', 'resume', 'destroy']) {
  if (!source.includes(token)) failures.push(`lifecycle token missing: ${token}`);
}

for (const hook of ['prepareVerification', 'verifyWorkflow', 'verifyDomain', 'prepareEvidenceView', 'reportScene', 'reportSpatialEvidence', 'reportAssetEvidence', 'reportFidelity']) {
  if (!source.includes(hook)) failures.push(`Forge hook missing: ${hook}`);
}

if (/\p{Extended_Pictographic}/u.test(productSource)) failures.push('emoji/pictographic glyph found in authored source');
if (/\b(?:TODO|PLACEHOLDER)\b/.test(productSource)) failures.push('unfinished implementation marker found');

const implementationBytes = (await Promise.all(files.filter((path) => !path.endsWith('package-lock.json')).map(async (path) => (await stat(path)).size))).reduce((sum, size) => sum + size, 0);
notes.push(`implementation files: ${files.length}`);
notes.push(`implementation bytes (excluding package lock): ${implementationBytes}`);
notes.push(`renderer constructors: ${rendererCount}`);

const report = {
  status: failures.length ? 'fail' : 'pass',
  root,
  files: files.map((path) => relative(root, path)),
  failures,
  notes,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
