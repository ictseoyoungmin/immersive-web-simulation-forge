/**
 * The bench: renderer, lighting rig, room, and the shadow-catching work surface.
 *
 * The weapon is held in an inspection field above the bench rather than resting
 * on it — the configuration changes length and depth constantly, and a floating
 * subject keeps the silhouette readable while parts travel along their mount
 * axes during assembly.
 */

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshStandardMaterial,
  MeshBasicMaterial, PlaneGeometry, BoxGeometry, CylinderGeometry, ShadowMaterial,
  DirectionalLight, HemisphereLight, PointLight, Color, Fog, ACESFilmicToneMapping,
  SRGBColorSpace, PCFSoftShadowMap, CanvasTexture, RepeatWrapping, AdditiveBlending,
  DoubleSide, LinearSRGBColorSpace
} from '../../vendor/three/three.module.min.js';

export const BENCH_Y = -0.46;

/** Machined bench top: a fine grid with a subtle wear pattern. */
function benchTopTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#14181b';
  context.fillRect(0, 0, size, size);

  context.strokeStyle = 'rgba(120,140,150,0.055)';
  context.lineWidth = 1;
  for (let i = 0; i <= 16; i += 1) {
    const p = (i / 16) * size;
    context.beginPath(); context.moveTo(p, 0); context.lineTo(p, size); context.stroke();
    context.beginPath(); context.moveTo(0, p); context.lineTo(size, p); context.stroke();
  }
  context.strokeStyle = 'rgba(150,170,180,0.10)';
  for (let i = 0; i <= 4; i += 1) {
    const p = (i / 4) * size;
    context.beginPath(); context.moveTo(p, 0); context.lineTo(p, size); context.stroke();
    context.beginPath(); context.moveTo(0, p); context.lineTo(size, p); context.stroke();
  }
  // tool wear
  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 4 + Math.random() * 26;
    context.strokeStyle = `rgba(180,195,205,${0.012 + Math.random() * 0.02})`;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + (Math.random() - 0.5) * 2);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Soft elliptical contact shadow, painted rather than ray-traced. */
function blobShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.24)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createScene(canvas, materialLibraryFactory) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.background = new Color(0x0a0e12);
  scene.fog = new Fog(0x0a0e12, 1.9, 5.6);

  const camera = new PerspectiveCamera(38, 1, 0.02, 40);
  camera.position.set(0.62, 0.34, 0.78);

  const materials = materialLibraryFactory(renderer);
  scene.environment = materials.environment;

  /* ---------------- room ---------------- */
  const room = new Group();
  room.name = 'room';

  const benchTexture = benchTopTexture();
  const bench = new Mesh(
    new PlaneGeometry(4.4, 2.6),
    new MeshStandardMaterial({
      color: 0x232a2f,
      map: benchTexture,
      roughness: 0.80,
      metalness: 0.16,
      envMap: materials.environment,
      envMapIntensity: 0.32
    })
  );
  bench.rotation.x = -Math.PI / 2;
  bench.position.y = BENCH_Y;
  bench.receiveShadow = true;
  room.add(bench);

  const benchEdge = new Mesh(
    new BoxGeometry(4.4, 0.07, 0.05),
    new MeshStandardMaterial({ color: 0x14181b, roughness: 0.7, metalness: 0.5 })
  );
  benchEdge.position.set(0, BENCH_Y - 0.035, 1.3);
  room.add(benchEdge);

  // hazard stripe along the bench lip — one authored accent, not a pattern library
  const stripeCanvas = document.createElement('canvas');
  stripeCanvas.width = 256; stripeCanvas.height = 16;
  const stripeContext = stripeCanvas.getContext('2d');
  stripeContext.fillStyle = '#1b1e20';
  stripeContext.fillRect(0, 0, 256, 16);
  stripeContext.fillStyle = '#5a4a1c';
  for (let i = -16; i < 256; i += 22) {
    stripeContext.beginPath();
    stripeContext.moveTo(i, 16); stripeContext.lineTo(i + 11, 16);
    stripeContext.lineTo(i + 22, 0); stripeContext.lineTo(i + 11, 0);
    stripeContext.closePath(); stripeContext.fill();
  }
  const stripeTexture = new CanvasTexture(stripeCanvas);
  stripeTexture.wrapS = RepeatWrapping;
  stripeTexture.repeat.set(8, 1);
  stripeTexture.colorSpace = SRGBColorSpace;
  const stripe = new Mesh(
    new PlaneGeometry(4.4, 0.045),
    new MeshStandardMaterial({ map: stripeTexture, roughness: 0.85, metalness: 0.2 })
  );
  stripe.position.set(0, BENCH_Y - 0.012, 1.276);
  room.add(stripe);

  const backWall = new Mesh(
    new PlaneGeometry(6.4, 3.0),
    new MeshStandardMaterial({ color: 0x0f1418, roughness: 0.94, metalness: 0.12 })
  );
  backWall.position.set(0, 0.6, -1.5);
  backWall.receiveShadow = true;
  room.add(backWall);

  // wall pilasters give the backdrop depth without competing for attention
  for (const x of [-1.9, -0.95, 0.95, 1.9]) {
    const pilaster = new Mesh(
      new BoxGeometry(0.10, 3.0, 0.05),
      new MeshStandardMaterial({ color: 0x151b20, roughness: 0.86, metalness: 0.3 })
    );
    pilaster.position.set(x, 0.6, -1.46);
    room.add(pilaster);
  }

  // two overhead strip lights, matching the environment radiance
  const stripLights = [];
  for (const x of [-0.68, 0.68]) {
    const housing = new Mesh(
      new BoxGeometry(0.13, 0.07, 1.7),
      new MeshStandardMaterial({ color: 0x1a1f23, roughness: 0.6, metalness: 0.7 })
    );
    housing.position.set(x, 1.14, -0.1);
    room.add(housing);
    const tube = new Mesh(
      new CylinderGeometry(0.028, 0.028, 1.62, 12),
      new MeshBasicMaterial({ color: 0xd9ecff })
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(x, 1.10, -0.1);
    room.add(tube);
    stripLights.push(tube);
  }

  scene.add(room);

  /* ---------------- inspection field ---------------- */
  const stage = new Group();
  stage.name = 'stage';
  scene.add(stage);

  const shadowCatcher = new Mesh(
    new PlaneGeometry(2.2, 1.1),
    new ShadowMaterial({ opacity: 0.40 })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = BENCH_Y + 0.001;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const blob = new Mesh(
    new PlaneGeometry(1.5, 0.5),
    new MeshBasicMaterial({
      map: blobShadowTexture(), transparent: true, depthWrite: false,
      opacity: 0.34, color: 0x000000
    })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = BENCH_Y + 0.003;
  scene.add(blob);

  /* ---------------- lights ---------------- */
  const hemisphere = new HemisphereLight(0x9fc4dd, 0x14191d, 0.40);
  scene.add(hemisphere);

  const key = new DirectionalLight(0xdfeaf5, 2.95);
  key.position.set(1.15, 1.70, 0.95);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -0.75;
  key.shadow.camera.right = 0.75;
  key.shadow.camera.top = 0.55;
  key.shadow.camera.bottom = -0.55;
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 4.2;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 4.5;
  key.shadow.blurSamples = 12;
  scene.add(key);
  scene.add(key.target);

  const rim = new DirectionalLight(0x7cc0ee, 2.05);
  rim.position.set(-1.15, 0.60, -1.10);
  scene.add(rim);

  const fill = new PointLight(0xffcda6, 0.80, 2.1, 2);
  fill.position.set(-0.30, -0.24, 0.70);
  scene.add(fill);

  const inspection = new DirectionalLight(0xcfe6ff, 1.15);
  inspection.position.set(-0.25, 0.35, 1.55);
  scene.add(inspection);
  scene.add(inspection.target);

  function setSize(cssWidth, cssHeight, outputWidth, outputHeight) {
    renderer.setSize(outputWidth, outputHeight, false);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    camera.aspect = cssWidth / Math.max(1, cssHeight);
    camera.updateProjectionMatrix();
  }

  function dispose() {
    materials.dispose();
    benchTexture.dispose();
    stripeTexture.dispose();
    blob.material.map?.dispose();
    scene.traverse(object => {
      if (object.isMesh) {
        object.geometry?.dispose();
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) material?.dispose();
      }
    });
    renderer.dispose();
  }

  return {
    renderer, scene, camera, stage, materials, setSize, dispose,
    lights: { hemisphere, key, rim, fill, inspection, stripLights },
    blob, shadowCatcher, benchY: BENCH_Y,
    constants: { AdditiveBlending, DoubleSide, LinearSRGBColorSpace }
  };
}
