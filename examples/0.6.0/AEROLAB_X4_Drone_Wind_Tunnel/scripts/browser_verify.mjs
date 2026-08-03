import http from 'node:http';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = join(root, '.forge', 'evidence');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};
const sleep = milliseconds => new Promise(resolveSleep => setTimeout(resolveSleep, milliseconds));

function makeServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filePath = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      if (statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
      response.writeHead(200, {
        'Content-Type': mime[extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
}

class CDP {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Set();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolveConnect, rejectConnect) => {
      this.socket.addEventListener('open', resolveConnect, { once: true });
      this.socket.addEventListener('error', rejectConnect, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      setTimeout(() => {
        if (this.pending.delete(id)) rejectSend(new Error(`CDP timeout: ${method}`));
      }, 15_000);
    });
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.socket?.close();
  }
}

function buildInlineHarness() {
  const entry = join(root, 'bootstrap.mjs');
  const records = new Map();
  const order = [];

  function visit(file) {
    file = normalize(file);
    if (records.has(file)) return;
    let source = readFileSync(file, 'utf8');
    let index = 0;
    const dependencies = [];
    source = source.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g, (full, quote, specifier) => {
      const dependency = normalize(resolve(dirname(file), specifier));
      visit(dependency);
      const token = `__FORGE_IMPORT_${index++}__`;
      dependencies.push([token, dependency]);
      return full.replace(specifier, token);
    });
    records.set(file, { source, dependencies });
    order.push(file);
  }

  visit(entry);
  const serialized = order.map(file => ({
    id: relative(root, file).replaceAll('\\', '/'),
    source: records.get(file).source,
    dependencies: records.get(file).dependencies.map(([token, dependency]) => [
      token,
      relative(root, dependency).replaceAll('\\', '/')
    ])
  }));

  let html = readFileSync(join(root, 'index.html'), 'utf8');
  const css = readFileSync(join(root, 'styles.css'), 'utf8');
  html = html
    .replace(/<link[^>]+href=["']\.\/styles\.css["'][^>]*>/i, '')
    .replace(/<script\s+type=["']module["'][^>]+src=["']\.\/bootstrap\.mjs["'][^>]*><\/script>/i, '');
  const payload = JSON.stringify(serialized).replaceAll('<', '\\u003c');
  const loader = `<script>
(async()=>{
  const records=${payload}, urls={};
  for(const record of records){
    let source=record.source;
    for(const [token,dependency] of record.dependencies) source=source.split(token).join(urls[dependency]);
    urls[record.id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  }
  try{await import(urls['bootstrap.mjs']);}
  catch(error){console.error('inline module bootstrap failed',error);document.body.dataset.bootstrapError=String(error?.stack||error);}
})();
<\/script>`;
  return html.replace('</head>', `<style>${css}</style></head>`).replace('</body>', `${loader}</body>`);
}

async function waitForFile(filePath, timeout = 12_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (existsSync(filePath)) return;
    await sleep(80);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

function chromiumPath() {
  return process.env.CHROMIUM_PATH || [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].find(existsSync);
}

async function runAttempt({ port, softwareFallback = false }) {
  const executable = chromiumPath();
  if (!executable) throw new Error('Chromium not found; set CHROMIUM_PATH to a Chromium-based browser executable.');

  const userData = mkdtempSync(join(tmpdir(), 'aerolab-chromium-'));
  const hasXvfb = existsSync('/usr/bin/Xvfb');
  const display = `:${90 + Math.floor(Math.random() * 8)}`;
  const xvfb = hasXvfb ? spawn('/usr/bin/Xvfb', [display, '-screen', '0', '1440x900x24', '-nolisten', 'tcp'], { stdio: 'ignore' }) : null;
  if (xvfb) await sleep(350);

  const browserArguments = [
    ...(hasXvfb ? [] : ['--headless=new', '--ozone-platform=headless']),
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    `--user-data-dir=${userData}`,
    '--window-size=1440,900',
    '--force-device-scale-factor=1',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    ...(softwareFallback ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : []),
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    'about:blank'
  ];

  const browser = spawn(executable, browserArguments, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(hasXvfb ? { DISPLAY: display } : {}) }
  });
  let browserStderr = '';
  browser.stderr.on('data', chunk => { browserStderr += chunk.toString(); });
  let cdp;

  try {
    const activePortFile = join(userData, 'DevToolsActivePort');
    await waitForFile(activePortFile);
    const [debugPort, websocketPath] = readFileSync(activePortFile, 'utf8').trim().split('\n');
    cdp = new CDP(`ws://127.0.0.1:${debugPort}${websocketPath}`);
    await cdp.connect();

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const runtimeExceptions = [];
    const consoleErrors = [];
    cdp.on(message => {
      if (message.sessionId !== sessionId) return;
      if (message.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(message.params.exceptionDetails?.text || 'Runtime exception');
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        consoleErrors.push(message.params.entry.text);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        consoleErrors.push(message.params.args?.map(argument => argument.value || argument.description).join(' '));
      }
    });

    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/` }, sessionId);
    await sleep(500);

    const blocked = await evaluate(cdp, sessionId, "location.href.startsWith('chrome-error://')");
    let launchRoute = 'local-http';
    if (blocked) {
      launchRoute = 'inline-cdp-fallback';
      const tree = await cdp.send('Page.getFrameTree', {}, sessionId);
      await cdp.send('Page.setDocumentContent', {
        frameId: tree.frameTree.frame.id,
        html: buildInlineHarness()
      }, sessionId);
    }

    let ready = false;
    for (let index = 0; index < 160; index++) {
      await sleep(100);
      try {
        ready = await evaluate(cdp, sessionId, 'Boolean(window.__DRONE_FORGE__?.ready)');
      } catch {}
      if (ready) break;
    }
    if (!ready) {
      const diagnostics = await evaluate(cdp, sessionId, `({
        url:location.href,
        title:document.title,
        body:document.body?.innerText?.slice(0,1200),
        overlay:document.querySelector('.error-overlay')?.innerText,
        bootstrapError:document.body?.dataset?.bootstrapError,
        webgl2:Boolean(document.createElement('canvas').getContext('webgl2'))
      })`);
      throw new Error(`Simulator did not expose window.__DRONE_FORGE__.ready: ${JSON.stringify(diagnostics)}; console=${JSON.stringify(consoleErrors)}; exceptions=${JSON.stringify(runtimeExceptions)}`);
    }

    const targetSizeChecks = [];
    for (const [width, height] of [[1366, 768], [1920, 1080], [720, 900]]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false
      }, sessionId);
      await sleep(350);
      const layout = await evaluate(cdp, sessionId, `(()=>{
        const app=document.querySelector('#app')?.getBoundingClientRect();
        const view=document.querySelector('.viewport-shell')?.getBoundingClientRect();
        const left=document.querySelector('.left-rail')?.getBoundingClientRect();
        const right=document.querySelector('.right-rail')?.getBoundingClientRect();
        return {
          viewport:[innerWidth,innerHeight],
          app:[app?.width||0,app?.height||0],
          simulationViewport:[view?.width||0,view?.height||0],
          leftRail:[left?.width||0,left?.height||0],
          rightRail:[right?.width||0,right?.height||0],
          horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
          fatal:Boolean(document.querySelector('.error-overlay'))
        };
      })()`);
      const pass = !layout.horizontalOverflow && !layout.fatal && layout.simulationViewport[0] > 300 && layout.simulationViewport[1] > 300;
      targetSizeChecks.push({ width, height, pass, layout });
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    }, sessionId);
    await sleep(400);

    const renderer = await evaluate(cdp, sessionId, `(()=>{
      const gl=document.querySelector('#glCanvas')?.getContext('webgl2');
      if(!gl)return {available:false};
      const info=gl.getExtension('WEBGL_debug_renderer_info');
      return {
        available:true,
        vendor:info?gl.getParameter(info.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),
        renderer:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
        version:gl.getParameter(gl.VERSION)
      };
    })()`);
    const softwareRenderer = /swiftshader|llvmpipe|software|lavapipe/i.test(`${renderer.vendor} ${renderer.renderer}`);

    const parameterContract = await evaluate(cdp, sessionId, `(()=>{
      const before=window.__DRONE_FORGE__.getParameter('wind.speed');
      window.__DRONE_FORGE__.setParameter('wind.speed',99);
      const clamped=window.__DRONE_FORGE__.getParameter('wind.speed');
      window.__DRONE_FORGE__.setParameter('wind.speed',before);
      return {before,clamped,pass:clamped===30};
    })()`);

    await sleep(6_000);
    const stats = await evaluate(cdp, sessionId, 'window.__DRONE_FORGE__.getStats()');
    const telemetry = await evaluate(cdp, sessionId, 'window.__DRONE_FORGE__.getTelemetry()');
    const stability = await evaluate(cdp, sessionId, 'window.__DRONE_FORGE__.runHeadlessStability({seconds:8,windSpeed:30,turbulence:1})');

    // Separate representative visual capture from the adaptive performance sample.
    await evaluate(cdp, sessionId, "window.__DRONE_FORGE__.setParameter('visual.quality','ultra')");
    await sleep(3_200); // allow the LOD toast to clear and the ultra frame to settle
    const captureState = await evaluate(cdp, sessionId, `(()=>{
      const canvas=document.querySelector('#glCanvas');
      const rect=canvas.getBoundingClientRect();
      return {
        quality:window.__DRONE_FORGE__.getParameter('visual.quality'),
        stats:window.__DRONE_FORGE__.getStats(),
        cssSize:[Math.round(rect.width),Math.round(rect.height)],
        internalSize:[canvas.width,canvas.height],
        effectivePixelRatio:Math.min(canvas.width/Math.max(1,rect.width),canvas.height/Math.max(1,rect.height))
      };
    })()`);
    const screenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false
    }, sessionId);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'browser_verify.png'), Buffer.from(screenshot.data, 'base64'));

    const warnings = [];
    const failures = [...runtimeExceptions];
    if (stats.averageFPS < 45) warnings.push(`Frame rate warning: average ${stats.averageFPS.toFixed(1)} FPS < 45 FPS`);
    if (softwareRenderer) warnings.push('Performance measurement used a software renderer and is not representative of a discrete GPU.');
    if (!parameterContract.pass) failures.push(`Parameter clamping contract failed: ${JSON.stringify(parameterContract)}`);
    if (targetSizeChecks.some(check => !check.pass)) failures.push(`Target-size layout contract failed: ${JSON.stringify(targetSizeChecks.filter(check => !check.pass))}`);
    if (telemetry.solverStable !== true) failures.push('Live solver reported an unstable state.');
    if (!stability.stable || !stability.solverStable) failures.push('30 m/s maximum-wind stability case failed.');
    if (stability.maxSpeed >= 80) failures.push(`Maximum-wind speed guard exceeded: ${stability.maxSpeed}`);
    if (consoleErrors.length) failures.push(...consoleErrors.map(message => `Console error: ${message}`));

    return {
      pass: failures.length === 0,
      ready,
      launchRoute,
      renderer,
      softwareRenderer,
      softwareFallbackRequested: softwareFallback,
      averageFPS: stats.averageFPS,
      frameSamples: stats.frameSamples,
      quality: stats.quality,
      particles: stats.particleCount,
      captureQuality: captureState.quality,
      captureParticles: captureState.stats.particleCount,
      captureAdaptiveLocked: true,
      warnings: [...warnings, ...stats.warnings],
      parameterContract,
      targetSizeChecks,
      captureFidelity: {
        cssSize: captureState.cssSize,
        internalSize: captureState.internalSize,
        effectivePixelRatio: captureState.effectivePixelRatio
      },
      liveTelemetry: {
        position: telemetry.position,
        tiltDeg: telemetry.tiltDeg,
        powerWatts: telemetry.powerWatts,
        solverStable: telemetry.solverStable
      },
      maxWindStability: stability,
      consoleErrors,
      exceptions: failures,
      screenshot: '.forge/evidence/browser_verify.png'
    };
  } finally {
    cdp?.close();
    browser.kill('SIGTERM');
    xvfb?.kill('SIGTERM');
    await sleep(100);
    rmSync(userData, { recursive: true, force: true });
    if (browserStderr && process.env.FORGE_BROWSER_DEBUG === '1') {
      console.error(browserStderr.slice(-4_000));
    }
  }
}

const server = makeServer();
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const port = server.address().port;
let report;
try {
  try {
    report = await runAttempt({ port, softwareFallback: process.env.FORGE_FORCE_SOFTWARE === '1' });
  } catch (hardwareError) {
    if (process.env.FORGE_FORCE_SOFTWARE === '1') throw hardwareError;
    report = await runAttempt({ port, softwareFallback: true });
    report.warnings.unshift(`Hardware-path browser attempt failed; SwiftShader fallback used: ${hardwareError.message}`);
  }
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'browser_verify.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} catch (error) {
  report = { pass: false, error: error.message };
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'browser_verify.json'), JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  server.close();
}
