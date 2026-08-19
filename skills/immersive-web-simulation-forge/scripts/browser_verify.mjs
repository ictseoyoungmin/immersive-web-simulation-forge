#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const positional = args.find(arg => !arg.startsWith('--'));
if (!positional) {
  console.error('Usage: browser_verify.mjs <project-or-entry> [--capture | --measure] [--out file] [--viewport 1200x720] [--screenshot file] [--min-ratio 0.9] [--warmup-ms 1500] [--measure-ms 3000] [--samples 3] [--scenario name] [--pointer-test] [--workflow-test] [--domain-test] [--evidence-suite] [--evidence-views hero,alternate] [--screenshot-dir dir] [--executable path] [--browser-arg value]');
  process.exit(2);
}

function valueAfter(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}
function percentile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

const target = path.resolve(positional);
const targetIsDirectory = fs.statSync(target).isDirectory();
const project = targetIsDirectory ? target : path.dirname(target);
const entry = targetIsDirectory ? 'index.html' : path.basename(target);
const outFile = path.resolve(valueAfter('--out', path.join(project, '.forge', 'browser.json')));
const viewportText = valueAfter('--viewport', '1200x720');
const viewportMatch = viewportText.match(/^(\d+)x(\d+)$/i);
const viewport = { width: Number(viewportMatch?.[1] || 1200), height: Number(viewportMatch?.[2] || 720) };
const capture = args.includes('--capture');
const measure = args.includes('--measure');
const pointerTest = args.includes('--pointer-test');
const workflowTest = args.includes('--workflow-test');
const domainTest = args.includes('--domain-test');
const evidenceSuite = args.includes('--evidence-suite');
const evidenceViews = String(valueAfter('--evidence-views', 'hero,alternate')).split(',').map(value => value.trim()).filter(Boolean);
const screenshotDir = valueAfter('--screenshot-dir');
const screenshot = valueAfter('--screenshot');
const minRatio = Number(valueAfter('--min-ratio', capture ? '0.9' : '0'));
const warmupMs = Math.max(0, Number(valueAfter('--warmup-ms', measure ? '1500' : '800')));
const measureMs = Math.max(500, Number(valueAfter('--measure-ms', '3000')));
const samples = Math.max(1, Math.min(9, Number(valueAfter('--samples', '3'))));
const scenario = valueAfter('--scenario', capture ? 'presentation' : measure ? 'default' : 'smoke');
const executablePath = valueAfter('--executable', process.env.CHROME_PATH || null);
const browserArgs = args.flatMap((value, index) => value === '--browser-arg' && args[index + 1] ? [args[index + 1]] : []);

if (capture && measure) {
  console.error('Capture and performance measurement must be separate runs.');
  process.exit(2);
}
if (measure && (screenshot || evidenceSuite)) {
  console.error('Do not combine performance measurement with screenshot/evidence capture.');
  process.exit(2);
}
if (measure && screenshot) {
  console.error('Do not take a screenshot during a performance run.');
  process.exit(2);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
if (screenshot) fs.mkdirSync(path.dirname(path.resolve(screenshot)), { recursive: true });
if (screenshotDir) fs.mkdirSync(path.resolve(screenshotDir), { recursive: true });

const contentTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm'
};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  let file = path.resolve(project, pathname === '/' ? entry : pathname.replace(/^\/+/, ''));
  if (!file.startsWith(project + path.sep) && file !== path.resolve(project, entry)) {
    response.writeHead(403); response.end('forbidden'); return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { response.writeHead(404); response.end('not found'); return; }
  response.writeHead(200, {
    'content-type': contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(file).pipe(response);
});

let playwright;
try {
  playwright = await import('playwright');
} catch {
  try {
    const projectRequire = createRequire(path.join(project, 'package.json'));
    playwright = projectRequire('playwright');
  } catch {
    const report = {
      status: 'blocked', executed: false, reason: 'playwright is not installed',
      limitations: ['Install Playwright in the project or make it available to Node before browser verification.']
    };
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
}

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const query = (capture || evidenceSuite) ? '?forgeCapture=1&forgePreset=presentation' : '';
const url = `http://127.0.0.1:${server.address().port}/${encodeURI(entry)}${query}`;
const report = {
  status: 'pass', executed: true, intended_route: true, mode: evidenceSuite ? 'evidence-suite' : capture ? 'capture' : measure ? 'performance' : (workflowTest || domainTest) ? 'product-verification' : 'smoke',
  url, viewport, scenario, capture_mode_requested: capture,
  console_errors: [], page_errors: [], request_failures: [], metrics: {}, performance: null,
  pointer_direction: null, workflow: null, domain: null, evidence: evidenceSuite ? { views: [], scene: null, spatial: null, asset: null } : null, limitations: []
};

async function collectMetrics(page) {
  return page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')].map((canvas, index) => {
      let renderer = 'none';
      let software = null;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
          software = /swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer);
        }
      } catch {}
      const rect = canvas.getBoundingClientRect();
      return {
        index, id: canvas.id || '', width: canvas.width, height: canvas.height,
        clientWidth: Math.round(rect.width), clientHeight: Math.round(rect.height),
        ratioX: rect.width ? canvas.width / rect.width : 0,
        ratioY: rect.height ? canvas.height / rect.height : 0,
        renderer, software
      };
    });
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
      canvases,
      forgeReport: window.__FORGE__?.reportFidelity?.() || window.__FORGE__?.report?.() || null
    };
  });
}

async function measureWallFrames(page, durationMs) {
  return page.evaluate(duration => new Promise(resolve => {
    const timestamps = [];
    const started = performance.now();
    function frame(now) {
      timestamps.push(now);
      if (now - started >= duration && timestamps.length >= 2) {
        const intervals = timestamps.slice(1).map((value, index) => value - timestamps[index]);
        const elapsed = timestamps.at(-1) - timestamps[0];
        const sorted = [...intervals].sort((a, b) => a - b);
        const pick = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))] ?? null;
        resolve({
          frameCount: timestamps.length,
          intervalCount: intervals.length,
          elapsedMs: elapsed,
          averageFps: elapsed > 0 ? intervals.length * 1000 / elapsed : null,
          frameMsMedian: pick(0.5),
          frameMsP95: pick(0.95),
          frameMsMax: sorted.at(-1) ?? null
        });
      } else {
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
  }), durationMs);
}

async function readLookState(page) {
  return page.evaluate(() => {
    const forge = window.__FORGE__;
    const state = forge?.getLookState?.() || forge?.input?.state || forge?.player || null;
    const probe = typeof forge?.getInputProbeState === 'function' ? forge.getInputProbeState() : null;
    const bearingText = document.querySelector('[data-forge-bearing], #bearing')?.textContent || '';
    const bearing = Number.parseFloat(bearingText);
    const finiteVec = value => value && ['x','y','z'].every(key => Number.isFinite(Number(value[key])));
    return {
      yaw: Number.isFinite(state?.yaw) ? state.yaw : null,
      pitch: Number.isFinite(state?.pitch) ? state.pitch : null,
      bearing: Number.isFinite(bearing) ? bearing : null,
      forward: finiteVec(probe?.forward) ? probe.forward : null,
      right: finiteVec(probe?.right) ? probe.right : null,
      up: finiteVec(probe?.up) ? probe.up : {x:0,y:1,z:0}
    };
  });
}

async function runForgeVerificationHook(page, hookName, scenarioName) {
  return page.evaluate(async ({ hookName: name, scenario }) => {
    const hook = window.__FORGE__?.[name];
    if (typeof hook !== 'function') return { status: 'blocked', reason: `window.__FORGE__.${name} is not available` };
    try {
      const result = await hook(scenario);
      return result && typeof result === 'object' ? result : { status: result === true ? 'pass' : 'fail', result };
    } catch (error) {
      return { status: 'fail', error: String(error?.stack || error) };
    }
  }, { hookName, scenario: scenarioName });
}

async function runOptionalReportHook(page, hookName) {
  return page.evaluate(async name => {
    const hook = window.__FORGE__?.[name];
    if (typeof hook !== 'function') return { status: 'not-applicable', reason: `window.__FORGE__.${name} is not available` };
    try {
      const result = await hook();
      return result && typeof result === 'object' ? { status: result.status || 'pass', ...result } : { status: result === false ? 'fail' : 'pass', result };
    } catch (error) { return { status: 'fail', error: String(error?.stack || error) }; }
  }, hookName);
}

async function prepareEvidenceView(page, view, scenarioName) {
  return page.evaluate(async ({ viewName, scenario }) => {
    const hook = window.__FORGE__?.prepareEvidenceView;
    if (typeof hook !== 'function') return { status: 'not-applicable', view: viewName };
    try {
      const result = await hook(viewName, scenario);
      return result && typeof result === 'object' ? { status: result.status || 'pass', view: viewName, ...result } : { status: result === false ? 'fail' : 'pass', view: viewName, result };
    } catch (error) { return { status: 'fail', view: viewName, error: String(error?.stack || error) }; }
  }, { viewName: view, scenario: scenarioName });
}

function signedDegrees(after, before) {
  return ((after - before + 540) % 360) - 180;
}

let browser;
try {
  browser = await playwright.chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    ...(browserArgs.length ? { args: browserArgs } : {})
  });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error') report.console_errors.push(message.text()); });
  page.on('pageerror', error => report.page_errors.push(String(error)));
  page.on('requestfailed', request => report.request_failures.push({ url: request.url(), failure: request.failure() }));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  await page.evaluate(async ({ captureMode, scenarioName }) => {
    const forge = window.__FORGE__;
    if (captureMode && forge?.setCaptureMode) await forge.setCaptureMode(true, 'presentation');
    if (forge?.prepareVerification) await forge.prepareVerification(scenarioName);
    document.dispatchEvent(new CustomEvent('forge:verification-scenario', {
      detail: { capture: captureMode, scenario: scenarioName }
    }));
  }, { captureMode: capture || evidenceSuite, scenarioName: scenario });

  await page.waitForTimeout(warmupMs);
  report.metrics = await collectMetrics(page);
  const ratios = report.metrics.canvases.map(canvas => Math.min(canvas.ratioX, canvas.ratioY)).filter(value => value > 0);
  report.metrics.minimum_canvas_ratio = ratios.length ? Math.min(...ratios) : null;
  report.metrics.software_renderer = report.metrics.canvases.some(canvas => canvas.software === true);

  if (evidenceSuite) {
    report.evidence.scene = await runOptionalReportHook(page, 'reportScene');
    report.evidence.spatial = await runOptionalReportHook(page, 'reportSpatialEvidence');
    report.evidence.asset = await runOptionalReportHook(page, 'reportAssetEvidence');
    if (report.evidence.scene.status === 'fail' || report.evidence.spatial.status === 'fail' || report.evidence.asset.status === 'fail') report.status = 'fail';
    for (const viewName of evidenceViews) {
      const prepared = await prepareEvidenceView(page, viewName, scenario);
      await page.waitForTimeout(120);
      const metrics = await collectMetrics(page);
      const viewRecord = { view: viewName, prepared, metrics, screenshot: null };
      if (screenshotDir) {
        const safe = viewName.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'view';
        const shotPath = path.join(path.resolve(screenshotDir), `${safe}.png`);
        await page.screenshot({ path: shotPath, type: 'png', timeout: 120000 });
        viewRecord.screenshot = shotPath;
      }
      report.evidence.views.push(viewRecord);
      if (prepared.status === 'fail') report.status = 'fail';
    }
  }

  if (measure) {
    const wallSamples = [];
    for (let index = 0; index < samples; index += 1) {
      wallSamples.push(await measureWallFrames(page, measureMs));
    }
    const valid = wallSamples.filter(sample => Number.isFinite(sample.averageFps));
    const internalFps = Number(report.metrics.forgeReport?.fps);
    report.performance = {
      source: 'external-requestAnimationFrame-wall-clock',
      warmupMs, measureMs, sampleCount: wallSamples.length,
      samples: wallSamples,
      summary: {
        medianAverageFps: percentile(valid.map(sample => sample.averageFps), 0.5),
        medianFrameMs: percentile(valid.map(sample => sample.frameMsMedian), 0.5),
        worstP95FrameMs: valid.length ? Math.max(...valid.map(sample => sample.frameMsP95)) : null
      },
      applicationReportedFps: Number.isFinite(internalFps) ? internalFps : null,
      renderer: report.metrics.canvases.find(canvas => canvas.renderer !== 'none')?.renderer || 'none',
      softwareRenderer: report.metrics.software_renderer,
      adaptationLocked: Boolean(report.metrics.forgeReport?.captureLocked || report.metrics.forgeReport?.adaptationLocked)
    };
    const externalFps = report.performance.summary.medianAverageFps;
    if (Number.isFinite(internalFps) && Number.isFinite(externalFps) && externalFps > 0) {
      report.performance.telemetryRelativeError = Math.abs(internalFps - externalFps) / externalFps;
      if (report.performance.telemetryRelativeError > 0.25) {
        report.limitations.push(`Application telemetry differs from external wall-clock FPS by ${(report.performance.telemetryRelativeError * 100).toFixed(1)}%.`);
      }
    }
    if (report.performance.softwareRenderer) {
      report.limitations.push('Performance was measured on a software renderer and cannot substantiate target-GPU FPS.');
    }
  }

  if (screenshot) {
    const shotPath = path.resolve(screenshot);
    const ext = path.extname(shotPath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) throw new Error('browser screenshot path must end in .png, .jpg, or .jpeg');
    await page.screenshot({ path: shotPath, type: ext === '.png' ? 'png' : 'jpeg', timeout: 120000 });
  }

  if (pointerTest) {
    await page.evaluate(() => { if (document.pointerLockElement) document.exitPointerLock?.(); });
    await page.waitForTimeout(100);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      report.pointer_direction = { status: 'blocked', reason: 'no visible canvas' };
      report.status = 'fail';
    } else {
      const before = await readLookState(page);
      const x = box.x + box.width * 0.5;
      const y = box.y + box.height * 0.5;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 90, y - 60, { steps: 6 });
      await page.waitForTimeout(80);
      const after = await readLookState(page);
      await page.mouse.up();
      const yawDelta = before.yaw !== null && after.yaw !== null ? after.yaw - before.yaw : null;
      const pitchDelta = before.pitch !== null && after.pitch !== null ? after.pitch - before.pitch : null;
      const bearingDelta = before.bearing !== null && after.bearing !== null ? signedDegrees(after.bearing, before.bearing) : null;
      const dot = (a,b) => a && b ? Number(a.x)*Number(b.x)+Number(a.y)*Number(b.y)+Number(a.z)*Number(b.z) : null;
      const basisRightPass = before.right && after.forward ? dot(after.forward, before.right) > 0.01 : null;
      const basisUpPass = before.forward && after.forward && before.up ? dot({x:after.forward.x-before.forward.x,y:after.forward.y-before.forward.y,z:after.forward.z-before.forward.z}, before.up) > 0.001 : null;
      // Raw yaw/pitch signs are renderer-specific and are diagnostic only, never the oracle.
      const rightPass = basisRightPass !== null ? basisRightPass : bearingDelta !== null ? bearingDelta > 0 : null;
      const upPass = basisUpPass !== null ? basisUpPass : null;
      const status = rightPass === null ? 'blocked' : rightPass === true && (upPass === true || upPass === null) ? 'pass' : 'fail';
      report.pointer_direction = { status, before, after, yawDelta, pitchDelta, bearingDelta, basisRightPass, basisUpPass, rightPass, upPass };
      if (status !== 'pass') { report.status = 'fail'; if (status === 'blocked') report.limitations.push('Pointer direction could not be verified from actual view basis or observable bearing; raw yaw sign is not accepted as proof.'); }
    }
  }

  if (workflowTest) {
    report.workflow = await runForgeVerificationHook(page, 'verifyWorkflow', scenario);
    if (report.workflow.status !== 'pass') report.status = 'fail';
  }

  if (domainTest) {
    report.domain = await runForgeVerificationHook(page, 'verifyDomain', scenario);
    if (report.domain.status !== 'pass') report.status = 'fail';
  }

  if (capture && ratios.length && Math.max(...ratios) < minRatio) {
    report.status = 'fail';
    report.limitations.push(`presentation capture canvas ratio ${Math.max(...ratios).toFixed(3)} is below required ${minRatio}`);
  }
  if (report.console_errors.length || report.page_errors.length || report.request_failures.length) report.status = 'fail';
} catch (error) {
  report.status = 'fail';
  report.fatal = String(error?.stack || error);
} finally {
  await browser?.close();
  server.close();
}

fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.status === 'pass' ? 0 : 1);
