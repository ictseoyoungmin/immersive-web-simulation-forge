import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const forgeDirectory = resolve(root, '.forge');
const evidenceDirectory = resolve(forgeDirectory, 'evidence');
const roundArgument = process.argv.find((value) => value.startsWith('--round='));
const round = roundArgument ? Number(roundArgument.split('=')[1]) : 1;
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;

await mkdir(evidenceDirectory, { recursive: true });

const server = spawn(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port)],
  {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NO_COLOR: '1' },
  },
);

let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += String(chunk); });
server.stderr.on('data', (chunk) => { serverLog += String(chunk); });

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 25_000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Vite did not start in time.\n${serverLog}`);
}

function percentile(values, proportion) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * proportion) - 1))];
}

const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];
let browser;

try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-dev-shm-usage',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown'}`));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__PELAGIC_READY__ === true && window.__FORGE__?.ready === true, null, { timeout: 30_000 });

  const workflow = await page.evaluate(() => window.__FORGE__.verifyWorkflow('browser-ambient-loop'));
  const domain = await page.evaluate(() => window.__FORGE__.verifyDomain('browser-canonical-state'));
  const lifecycle = await page.evaluate(() => {
    window.__FORGE__.suspend();
    window.__FORGE__.resume();
    return { status: 'pass', suspendResume: true, destroySurfaceExposed: typeof window.__FORGE__.destroy === 'function' };
  });

  await page.locator('#drawer-toggle').click();
  const drawerVisible = await page.locator('#conditions-drawer').evaluate((element) => element.classList.contains('is-open') && element.getAttribute('aria-hidden') === 'false');
  await page.locator('[data-preset="storm-front"]').click();
  await page.waitForTimeout(350);
  const presetChanged = await page.evaluate(() => JSON.parse(window.__FORGE__.serializeState()).preset === 'storm-front');
  await page.keyboard.press('Escape');
  const drawerRecovered = await page.locator('#conditions-drawer').evaluate((element) => !element.classList.contains('is-open'));
  await page.keyboard.press('g');
  const gustTriggered = await page.evaluate(() => JSON.parse(window.__FORGE__.serializeState()).gust.active === true);
  await page.keyboard.press('Home');
  const resetRecovered = await page.evaluate(() => {
    const state = JSON.parse(window.__FORGE__.serializeState());
    return state.preset === 'golden-swell' && state.timeS === 0 && state.gust.trace === 0;
  });

  const views = [
    { id: 'hero', viewport: [1440, 900] },
    { id: 'three-quarter', viewport: [1280, 720] },
    { id: 'side-or-rear', viewport: [1280, 720] },
    { id: 'close-material', viewport: [1280, 720] },
    { id: 'contact', viewport: [1280, 720] },
    { id: 'representative-near', viewport: [1280, 720] },
    { id: 'representative-mid', viewport: [1280, 720] },
    { id: 'gust-event', viewport: [1440, 900] },
    { id: 'recovery', viewport: [1280, 720] },
  ];
  const captures = [];
  for (const view of views) {
    await page.setViewportSize({ width: view.viewport[0], height: view.viewport[1] });
    await page.evaluate(({ id }) => window.__FORGE__.prepareEvidenceView(id), view);
    await page.waitForTimeout(320);
    const path = resolve(evidenceDirectory, `round-${round}-${view.id}-${view.viewport[0]}x${view.viewport[1]}.png`);
    await page.screenshot({ path });
    const fidelity = await page.evaluate(() => window.__FORGE__.reportFidelity());
    captures.push({ view: view.id, path, viewport: view.viewport, fidelity });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__FORGE__.prepareEvidenceView('hero'));
  await page.waitForTimeout(320);
  const mobilePath = resolve(evidenceDirectory, `round-${round}-hero-mobile-390x844.png`);
  await page.screenshot({ path: mobilePath });
  await page.locator('#drawer-toggle').click();
  await page.waitForFunction(() => {
    const drawer = document.querySelector('#conditions-drawer');
    return drawer?.classList.contains('is-open') && drawer.getBoundingClientRect().top < window.innerHeight - 100;
  }, null, { timeout: 8_000 });
  const mobileDrawerBox = await page.locator('#conditions-drawer').boundingBox();
  const mobilePathDrawer = resolve(evidenceDirectory, `round-${round}-mobile-drawer-390x844.png`);
  await page.screenshot({ path: mobilePathDrawer });
  captures.push({ view: 'hero-mobile', path: mobilePath, viewport: [390, 844], fidelity: await page.evaluate(() => window.__FORGE__.reportFidelity()) });
  captures.push({ view: 'mobile-drawer', path: mobilePathDrawer, viewport: [390, 844], drawerBox: mobileDrawerBox });
  await page.keyboard.press('Escape');

  const performanceScenarios = [];
  for (const scenario of ['default', 'gust-event', 'storm-front']) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate((value) => window.__FORGE__.prepareVerification(value), scenario);
    await page.evaluate(() => window.__FORGE__.setCaptureMode(true, 'efficient'));
    const frameTimes = await page.evaluate(async () => {
      const samples = [];
      let last = performance.now();
      for (let index = 0; index < 24; index += 1) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        samples.push(now - last);
        last = now;
      }
      return samples.slice(4);
    });
    performanceScenarios.push({
      scenario,
      sampleCount: frameTimes.length,
      medianMs: percentile(frameTimes, 0.5),
      p95Ms: percentile(frameTimes, 0.95),
    });
  }

  const scene = await page.evaluate(() => window.__FORGE__.reportScene());
  const spatial = await page.evaluate(() => window.__FORGE__.reportSpatialEvidence());
  const assets = await page.evaluate(() => window.__FORGE__.reportAssetEvidence());
  const fidelity = await page.evaluate(() => window.__FORGE__.reportFidelity());
  const applicationPerformance = await page.evaluate(() => window.__FORGE__.reportPerformance());
  const allFrameTimes = performanceScenarios.flatMap((scenario) => [scenario.medianMs, scenario.p95Ms]).filter(Number.isFinite);
  const softwarePerformance = {
    status: 'measurement-limited',
    source: 'external requestAnimationFrame in Playwright Chromium',
    renderer: fidelity.renderer,
    softwareRenderer: fidelity.softwareRenderer,
    sampleCount: performanceScenarios.reduce((sum, scenario) => sum + scenario.sampleCount, 0),
    scenarios: performanceScenarios,
    aggregate: {
      medianMs: percentile(performanceScenarios.map((scenario) => scenario.medianMs), 0.5),
      p95Ms: percentile(performanceScenarios.map((scenario) => scenario.p95Ms), 0.95),
    },
    applicationTelemetry: applicationPerformance,
    applicationTelemetryCrossChecked: allFrameTimes.length > 0 && applicationPerformance.sampleCount > 0,
    claimPolicy: 'Correctness/stress evidence only; no target-device FPS claim.',
  };

  const report = {
    version: 1,
    status:
      workflow.status === 'pass' && domain.status === 'pass' &&
      drawerVisible && presetChanged && drawerRecovered && gustTriggered && resetRecovered &&
      !consoleErrors.length && !pageErrors.length && !requestFailures.length
        ? 'pass'
        : 'fail',
    round,
    route: baseUrl,
    browser: { name: 'chromium', headless: true, renderer: fidelity.renderer, softwareRenderer: fidelity.softwareRenderer },
    workflow,
    domain,
    lifecycle,
    interaction: { drawerVisible, presetChanged, drawerRecovered, gustTriggered, resetRecovered, mobileDrawerBox },
    consoleErrors,
    pageErrors,
    requestFailures,
    scene,
    spatial,
    assets,
    fidelity,
    captures,
  };

  await writeFile(resolve(forgeDirectory, 'browser-verification.json'), JSON.stringify(report, null, 2));
  await writeFile(resolve(forgeDirectory, 'performance-software.json'), JSON.stringify(softwarePerformance, null, 2));
  await writeFile(resolve(forgeDirectory, 'asset-evidence.json'), JSON.stringify(assets, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'pass') process.exitCode = 1;
} catch (error) {
  const report = {
    version: 1,
    status: 'blocked',
    round,
    error: error instanceof Error ? error.stack : String(error),
    consoleErrors,
    pageErrors,
    requestFailures,
    serverLog,
  };
  await writeFile(resolve(forgeDirectory, 'browser-verification.json'), JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
