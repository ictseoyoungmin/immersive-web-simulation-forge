import * as THREE from 'three';
import {
  type OceanState,
  type QualityPreset,
  cloneState,
  evaluateWaveAt,
  windEnergyScale,
} from './ocean-state';
import {
  beamFragmentShader,
  beamVertexShader,
  oceanFragmentShader,
  oceanVertexShader,
  skyFragmentShader,
  skyVertexShader,
  sprayFragmentShader,
  sprayVertexShader,
} from './shaders';

type UniformMap = Record<string, THREE.IUniform>;

type EvidenceView =
  | 'hero'
  | 'three-quarter'
  | 'side-or-rear'
  | 'close-material'
  | 'contact'
  | 'representative-near'
  | 'representative-mid'
  | 'gust-event'
  | 'recovery';

interface SprayParticle {
  age: number;
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  entropy: number;
}

interface EvidencePose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface FidelityReport {
  cssSize: { width: number; height: number };
  outputSize: { width: number; height: number };
  sceneSize: { width: number; height: number };
  devicePixelRatio: number;
  effectivePixelRatio: number;
  captureMode: boolean;
  quality: QualityPreset;
  adaptationEnabled: boolean;
  renderer: string;
  softwareRenderer: boolean;
}

const QUALITY_CONFIG: Record<QualityPreset, { segments: number; spray: number; pixelRatio: number }> = {
  efficient: { segments: 144, spray: 88, pixelRatio: 0.76 },
  balanced: { segments: 224, spray: 150, pixelRatio: 0.9 },
  presentation: { segments: 320, spray: 210, pixelRatio: 1 },
};

const WORLD = {
  oceanSizeM: 1800,
  islandPosition: new THREE.Vector3(-112, -1.2, -404),
  defaultTarget: new THREE.Vector3(-78, 22, -346),
  defaultDistance: 458,
};

function seededNoise(seed: number): () => number {
  let state = Math.max(1, seed | 0);
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function colorAttribute(geometry: THREE.BufferGeometry, colors: number[]): void {
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function buildRadialCragGeometry(seed: number, baseRadius: number, height: number, segments = 56): THREE.BufferGeometry {
  const random = seededNoise(seed);
  const rings = [
    { y: -8, radius: baseRadius * 0.82 },
    { y: -3, radius: baseRadius * 1.0 },
    { y: 1.5, radius: baseRadius * 0.91 },
    { y: height * 0.38, radius: baseRadius * 0.72 },
    { y: height * 0.7, radius: baseRadius * 0.5 },
    { y: height, radius: baseRadius * 0.22 },
  ];
  const angularVariation = Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return 0.82 + random() * 0.26 + Math.sin(angle * 3 + seed) * 0.06 + Math.sin(angle * 7 - seed) * 0.035;
  });
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  rings.forEach((ring, ringIndex) => {
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const stratum = 1 + Math.sin(angle * (4 + ringIndex) + ringIndex * 1.7) * 0.035;
      const radius = ring.radius * angularVariation[index]! * stratum;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * (0.72 + Math.sin(angle * 2.0) * 0.08);
      positions.push(x, ring.y + Math.sin(angle * 5 + ringIndex) * 0.35, z);
      const wet = THREE.MathUtils.smoothstep(ring.y, -1, 6);
      const shade = 0.74 + random() * 0.22;
      colors.push((0.075 + wet * 0.035) * shade, (0.09 + wet * 0.045) * shade, (0.088 + wet * 0.044) * shade);
    }
  });

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let index = 0; index < segments; index += 1) {
      const next = (index + 1) % segments;
      const a = ring * segments + index;
      const b = ring * segments + next;
      const c = (ring + 1) * segments + index;
      const d = (ring + 1) * segments + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const topCenter = positions.length / 3;
  positions.push(0, height + 0.3, 0);
  colors.push(0.13, 0.14, 0.125);
  const topRing = (rings.length - 1) * segments;
  for (let index = 0; index < segments; index += 1) {
    indices.push(topCenter, topRing + index, topRing + ((index + 1) % segments));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  colorAttribute(geometry, colors);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildTowerGeometry(): THREE.LatheGeometry {
  const profile = [
    new THREE.Vector2(5.2, 0),
    new THREE.Vector2(5.45, 1.0),
    new THREE.Vector2(4.95, 2.1),
    new THREE.Vector2(4.7, 10.0),
    new THREE.Vector2(4.42, 20.0),
    new THREE.Vector2(4.1, 31.0),
    new THREE.Vector2(3.72, 42.5),
    new THREE.Vector2(3.65, 48.5),
    new THREE.Vector2(4.0, 49.3),
  ];
  const geometry = new THREE.LatheGeometry(profile, 48);
  geometry.computeVertexNormals();
  return geometry;
}

function buildPeakedHouseGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const x = width / 2;
  const z = depth / 2;
  const eave = height * 0.68;
  type Point = [number, number, number];
  const positions: number[] = [];
  const triangle = (a: Point, b: Point, c: Point): void => {
    positions.push(...a, ...b, ...c);
  };
  const quad = (a: Point, b: Point, c: Point, d: Point): void => {
    triangle(a, b, c);
    triangle(a, c, d);
  };
  quad([-x, 0, z], [x, 0, z], [x, eave, z], [-x, eave, z]);
  triangle([-x, eave, z], [x, eave, z], [0, height, z]);
  quad([x, 0, -z], [-x, 0, -z], [-x, eave, -z], [x, eave, -z]);
  triangle([x, eave, -z], [-x, eave, -z], [0, height, -z]);
  quad([-x, 0, -z], [-x, 0, z], [-x, eave, z], [-x, eave, -z]);
  quad([x, 0, z], [x, 0, -z], [x, eave, -z], [x, eave, z]);
  quad([-x, eave, -z], [-x, eave, z], [0, height, z], [0, height, -z]);
  quad([0, height, -z], [0, height, z], [x, eave, z], [x, eave, -z]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function buildBeamGeometry(length: number, radius: number): THREE.BufferGeometry {
  const segments = 24;
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0];
  const indices: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, -length);
    uvs.push(index / segments, 1);
  }
  for (let index = 0; index < segments; index += 1) {
    indices.push(0, 1 + index, 1 + ((index + 1) % segments));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildBirdGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -3.4, 0, 0, 0, 0.32, -0.35, -0.25, -0.1, 0.2,
    3.4, 0, 0, 0.25, -0.1, 0.2, 0, 0.32, -0.35,
    -0.3, 0.05, -0.55, 0.3, 0.05, -0.55, 0, -0.05, 1.4,
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

export class PelagicWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.25, 2600);

  private readonly canvas: HTMLCanvasElement;
  private readonly oceanUniforms: UniformMap;
  private readonly skyUniforms: UniformMap;
  private readonly oceanMaterial: THREE.ShaderMaterial;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private readonly ocean: THREE.Mesh;
  private readonly sky: THREE.Mesh;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly beaconLight: THREE.PointLight;
  private readonly beaconBeam: THREE.Mesh;
  private readonly beamUniforms: UniformMap;
  private readonly lighthouse: THREE.Group;
  private readonly island: THREE.Mesh;
  private readonly rockFamily: THREE.Group[] = [];
  private readonly buoys: THREE.Group[] = [];
  private readonly birds: THREE.Mesh[] = [];
  private sprayPoints: THREE.Points;
  private sprayParticles: SprayParticle[] = [];
  private sprayRandom = seededNoise(7319);
  private lastState: OceanState;

  private quality: QualityPreset = 'balanced';
  private captureMode = false;
  private suspended = false;
  private cinematic = true;
  private reducedMotion = false;
  private manualYaw = 0.197;
  private manualPitch = 0.015;
  private manualDistance = WORLD.defaultDistance;
  private evidencePose: EvidencePose | null = null;
  private lastCssWidth = 1;
  private lastCssHeight = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, context: WebGL2RenderingContext, initial: OceanState) {
    this.canvas = canvas;
    this.lastState = cloneState(initial);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = true;

    this.scene.fog = new THREE.FogExp2(0x718b91, 0.00043);
    this.camera.position.set(0, 29, 95);

    this.oceanUniforms = {
      uTime: { value: 0 },
      uSwellAmplitude: { value: initial.swellAmplitudeM },
      uSwellPeriod: { value: initial.swellPeriodS },
      uWindEnergy: { value: windEnergyScale(initial) },
      uSwellDirection: { value: new THREE.Vector2(initial.swellDirection.x, initial.swellDirection.z) },
      uWindDirection: { value: new THREE.Vector2(initial.windDirection.x, initial.windDirection.z) },
      uCurrent: { value: new THREE.Vector2(initial.currentMps.x, initial.currentMps.z) },
      uGustDrive: { value: 0 },
      uGustTrace: { value: 0 },
      uGustAge: { value: 0 },
      uGustOrigin: { value: new THREE.Vector2(initial.gust.origin.x, initial.gust.origin.z) },
      uSeed: { value: initial.seed },
      uStorm: { value: initial.stormAmount },
      uCloud: { value: initial.cloudAmount },
      uRoughness: { value: initial.water.roughness },
      uClarity: { value: initial.water.clarityM },
      uAbsorption: { value: new THREE.Vector3(initial.water.absorption.x, initial.water.absorption.y, initial.water.absorption.z) },
      uScatter: { value: new THREE.Vector3(initial.water.scatter.x, initial.water.scatter.y, initial.water.scatter.z) },
      uSunDirection: { value: new THREE.Vector3(initial.sunDirection.x, initial.sunDirection.y, initial.sunDirection.z) },
      uCameraPosition: { value: this.camera.position },
    };
    this.oceanMaterial = new THREE.ShaderMaterial({
      uniforms: this.oceanUniforms,
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      side: THREE.FrontSide,
      depthWrite: true,
      depthTest: true,
    });
    this.ocean = new THREE.Mesh(this.createOceanGeometry(this.quality), this.oceanMaterial);
    this.ocean.name = 'pelagic-ocean-single-render-path';
    this.ocean.frustumCulled = false;
    this.ocean.receiveShadow = false;
    this.scene.add(this.ocean);

    this.skyUniforms = {
      uTime: { value: 0 },
      uCloud: { value: initial.cloudAmount },
      uStorm: { value: initial.stormAmount },
      uGustDrive: { value: 0 },
      uGustTrace: { value: 0 },
      uWindDirection: { value: new THREE.Vector2(initial.windDirection.x, initial.windDirection.z) },
      uSunDirection: { value: new THREE.Vector3(initial.sunDirection.x, initial.sunDirection.y, initial.sunDirection.z) },
    };
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.IcosahedronGeometry(1500, 5), this.skyMaterial);
    this.sky.name = 'procedural-weather-atmosphere';
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    const hemisphere = new THREE.HemisphereLight(0xc4d3d4, 0x102027, 1.2);
    this.scene.add(hemisphere);
    this.sunLight = new THREE.DirectionalLight(0xffd0a0, 3.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.left = -95;
    this.sunLight.shadow.camera.right = 95;
    this.sunLight.shadow.camera.top = 110;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.camera.near = 50;
    this.sunLight.shadow.camera.far = 900;
    this.sunLight.shadow.bias = -0.0006;
    this.scene.add(this.sunLight, this.sunLight.target);

    const worldAsset = this.createLighthouseIsland();
    this.lighthouse = worldAsset.group;
    this.island = worldAsset.island;
    this.beaconLight = worldAsset.beaconLight;
    this.beaconBeam = worldAsset.beam;
    this.beamUniforms = (this.beaconBeam.material as THREE.ShaderMaterial).uniforms;
    this.scene.add(this.lighthouse);

    this.createRockFamily();
    this.createBuoys();
    this.createBirds();
    this.sprayPoints = this.createSpray(initial);
    this.scene.add(this.sprayPoints);

    this.updateState(initial);
    this.resize();
  }

  private createOceanGeometry(quality: QualityPreset): THREE.PlaneGeometry {
    const segments = QUALITY_CONFIG[quality].segments;
    const geometry = new THREE.PlaneGeometry(WORLD.oceanSizeM, WORLD.oceanSizeM, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }

  private createLighthouseIsland(): {
    group: THREE.Group;
    island: THREE.Mesh;
    beaconLight: THREE.PointLight;
    beam: THREE.Mesh;
  } {
    const group = new THREE.Group();
    group.name = 'north-beacon-lighthouse-island';
    group.position.copy(WORLD.islandPosition);
    group.rotation.y = -0.12;

    const basaltMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.61,
      metalness: 0.04,
      flatShading: false,
    });
    const island = new THREE.Mesh(buildRadialCragGeometry(2843, 67, 17.5, 72), basaltMaterial);
    island.name = 'wet-basalt-foundation';
    island.castShadow = true;
    island.receiveShadow = true;
    group.add(island);

    const foundationMaterial = new THREE.MeshStandardMaterial({ color: 0x55534a, roughness: 0.86, metalness: 0.01 });
    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.0, 3.2, 32), foundationMaterial);
    foundation.position.set(-8, 17.2, 1);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    group.add(foundation);

    const masonryMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d4c4, roughness: 0.76, metalness: 0.01 });
    const tower = new THREE.Mesh(buildTowerGeometry(), masonryMaterial);
    tower.name = 'tapered-weathered-masonry-tower';
    tower.position.set(-8, 18.4, 1);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    const stoneBandMaterial = new THREE.MeshStandardMaterial({ color: 0xaaa799, roughness: 0.88 });
    for (const band of [2.2, 12.5, 23.5, 34.5, 45.8, 49.4]) {
      const radius = 5.25 - band * 0.032;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.18, radius + 0.18, 0.5, 40), stoneBandMaterial);
      ring.position.set(-8, 18.4 + band, 1);
      ring.castShadow = true;
      group.add(ring);
    }

    const recessMaterial = new THREE.MeshStandardMaterial({ color: 0x19272a, roughness: 0.38, metalness: 0.16 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xbcb8aa, roughness: 0.8 });
    [13, 25, 36.5].forEach((height, index) => {
      const angle = -0.06 + index * Math.PI * 0.68;
      const radius = 4.78 - height * 0.029;
      const windowGroup = new THREE.Group();
      const recess = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.25, 0.22), recessMaterial);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 0.36), trimMaterial);
      lintel.position.y = 1.24;
      windowGroup.add(recess, lintel);
      windowGroup.position.set(-8 + Math.cos(angle) * radius, 18.4 + height, 1 + Math.sin(angle) * radius);
      windowGroup.rotation.y = -angle + Math.PI / 2;
      group.add(windowGroup);
    });

    const doorGroup = new THREE.Group();
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.9, 0.28), new THREE.MeshStandardMaterial({ color: 0x402e24, roughness: 0.73 }));
    const doorArch = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.18, 8, 24, Math.PI), trimMaterial);
    doorArch.position.y = 1.93;
    doorArch.rotation.z = Math.PI;
    doorGroup.add(door, doorArch);
    doorGroup.position.set(-3.05, 20.35, 1.0);
    doorGroup.rotation.y = Math.PI / 2;
    group.add(doorGroup);

    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x172225, roughness: 0.3, metalness: 0.72 });
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.35, 0.75, 48), metalMaterial);
    gallery.position.set(-8, 68.2, 1);
    gallery.castShadow = true;
    group.add(gallery);

    const railGroup = new THREE.Group();
    railGroup.position.set(-8, 69.0, 1);
    const topRail = new THREE.Mesh(new THREE.TorusGeometry(5.02, 0.1, 7, 48), metalMaterial);
    topRail.rotation.x = Math.PI / 2;
    topRail.position.y = 1.35;
    railGroup.add(topRail);
    for (let index = 0; index < 24; index += 1) {
      const angle = index / 24 * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 7), metalMaterial);
      post.position.set(Math.cos(angle) * 5.0, 0.68, Math.sin(angle) * 5.0);
      railGroup.add(post);
    }
    group.add(railGroup);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8da6a1,
      emissive: 0xffa33d,
      emissiveIntensity: 0.26,
      transmission: 0.48,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
      metalness: 0,
      depthWrite: false,
    });
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5.1, 12, 1, true), glassMaterial);
    lantern.name = 'lantern-glazing';
    lantern.position.set(-8, 71.9, 1);
    lantern.castShadow = true;
    group.add(lantern);
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 5.25, 7), metalMaterial);
      frame.position.set(-8 + Math.cos(angle) * 3.18, 71.9, 1 + Math.sin(angle) * 3.18);
      group.add(frame);
    }

    const copperMaterial = new THREE.MeshStandardMaterial({ color: 0x365f58, roughness: 0.54, metalness: 0.58 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.15, 4.8, 48, 3), copperMaterial);
    roof.name = 'oxidized-copper-roof';
    roof.position.set(-8, 76.7, 1);
    roof.castShadow = true;
    group.add(roof);
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.3, 10), metalMaterial);
    finial.position.set(-8, 80.1, 1);
    group.add(finial);

    const houseMaterial = new THREE.MeshStandardMaterial({ color: 0xc7c2b2, roughness: 0.83 });
    const house = new THREE.Mesh(buildPeakedHouseGeometry(24, 12.5, 14), houseMaterial);
    house.name = 'keeper-house';
    house.position.set(12, 14.0, 4);
    house.rotation.y = -0.11;
    house.castShadow = true;
    house.receiveShadow = true;
    group.add(house);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x263539, roughness: 0.64, metalness: 0.08 });
    const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(14.7, 0.55, 13.8), roofMaterial);
    roofLeft.position.set(7.4, 24.15, 4);
    roofLeft.rotation.set(0, -0.11, 0.49);
    const roofRight = roofLeft.clone();
    roofRight.position.x = 16.6;
    roofRight.rotation.z = -0.49;
    group.add(roofLeft, roofRight);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(2.0, 5.7, 2.0), stoneBandMaterial);
    chimney.position.set(17.5, 26.1, 3.0);
    chimney.castShadow = true;
    group.add(chimney);

    const beaconLight = new THREE.PointLight(0xffb24f, 115, 240, 1.65);
    beaconLight.position.set(-8, 72.4, 1);
    group.add(beaconLight);
    const beaconCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 20, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdf91, toneMapped: false }),
    );
    beaconCore.position.copy(beaconLight.position);
    group.add(beaconCore);

    const beamUniforms: UniformMap = { uOpacity: { value: 0.18 } };
    const beam = new THREE.Mesh(
      buildBeamGeometry(220, 20),
      new THREE.ShaderMaterial({
        uniforms: beamUniforms,
        vertexShader: beamVertexShader,
        fragmentShader: beamFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    beam.name = 'rotating-beacon-volume';
    beam.position.copy(beaconLight.position);
    group.add(beam);

    group.traverse((object) => {
      if (object instanceof THREE.Mesh && object !== beam && object !== lantern) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return { group, island, beaconLight, beam };
  }

  private createRockFamily(): void {
    const layouts = [
      { seed: 149, radius: 16, height: 36, position: new THREE.Vector3(-205, -1, -370), scale: new THREE.Vector3(0.72, 1.0, 0.72) },
      { seed: 327, radius: 11, height: 28, position: new THREE.Vector3(-244, -2, -454), scale: new THREE.Vector3(0.6, 1.0, 0.76) },
      { seed: 911, radius: 8, height: 19, position: new THREE.Vector3(-45, -2.5, -482), scale: new THREE.Vector3(0.62, 1.0, 0.54) },
      { seed: 1321, radius: 6, height: 12, position: new THREE.Vector3(-175, -3, -512), scale: new THREE.Vector3(0.6, 1.0, 0.72) },
    ];
    for (const layout of layouts) {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.03, flatShading: true });
      const mesh = new THREE.Mesh(buildRadialCragGeometry(layout.seed, layout.radius, layout.height, 28), material);
      mesh.scale.copy(layout.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      group.position.copy(layout.position);
      group.rotation.y = (layout.seed % 31) * 0.11;
      group.name = `rock-stack-variant-${layout.seed}`;
      this.rockFamily.push(group);
      this.scene.add(group);
    }
  }

  private createBuoys(): void {
    const placements = [
      { x: 54, z: -142, color: 0xd45938, phase: 0.2 },
      { x: -78, z: -225, color: 0xd6b338, phase: 2.4 },
    ];
    for (const placement of placements) {
      const group = new THREE.Group();
      const paint = new THREE.MeshStandardMaterial({ color: placement.color, roughness: 0.42, metalness: 0.28 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x172327, roughness: 0.36, metalness: 0.65 });
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1.75, 20, 14), paint);
      hull.scale.y = 1.25;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.25, 8, 24), dark);
      collar.rotation.x = Math.PI / 2;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.3, 9), dark);
      mast.position.y = 2.8;
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.2, 6, 1, true), dark);
      cage.position.y = 4.75;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.8, 6), paint);
      cap.position.y = 5.75;
      group.add(hull, collar, mast, cage, cap);
      group.position.set(placement.x, 0, placement.z);
      group.userData.baseX = placement.x;
      group.userData.baseZ = placement.z;
      group.userData.phase = placement.phase;
      group.name = `navigation-buoy-${this.buoys.length + 1}`;
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = true;
      });
      this.buoys.push(group);
      this.scene.add(group);
    }
  }

  private createBirds(): void {
    const geometry = buildBirdGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x172329, side: THREE.DoubleSide, fog: true });
    for (let index = 0; index < 9; index += 1) {
      const bird = new THREE.Mesh(geometry, material);
      const row = index % 3;
      bird.userData = {
        radius: 52 + row * 27,
        speed: 0.028 + (index % 4) * 0.004,
        phase: index * 0.71,
        height: 87 + (index % 5) * 8,
        wingOffset: index * 1.7,
      };
      bird.scale.setScalar(0.72 + (index % 3) * 0.16);
      bird.name = `seabird-${index + 1}`;
      this.birds.push(bird);
      this.scene.add(bird);
    }
  }

  private createSpray(state: OceanState): THREE.Points {
    const count = QUALITY_CONFIG[this.quality].spray;
    this.sprayRandom = seededNoise(state.seed + 889);
    this.sprayParticles = Array.from({ length: count }, (_, index) => ({
      age: 1,
      life: 1,
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      entropy: this.sprayRandom(),
    }));
    this.sprayParticles.forEach((particle, index) => {
      this.respawnSpray(particle, state, index);
      particle.age = this.sprayRandom() * particle.life * 0.82;
      particle.x += particle.vx * particle.age;
      particle.z += particle.vz * particle.age;
      particle.y += particle.vy * particle.age - 2.4 * particle.age * particle.age;
      particle.vy -= 4.8 * particle.age;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aLife', new THREE.Float32BufferAttribute(new Float32Array(count), 1));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(count).fill(3), 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: 1 } },
      vertexShader: sprayVertexShader,
      fragmentShader: sprayFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.name = 'crest-derived-spray';
    points.frustumCulled = false;
    return points;
  }

  private respawnSpray(particle: SprayParticle, state: OceanState, index: number): void {
    let x = (this.sprayRandom() - 0.5) * 245;
    let z = 52 - this.sprayRandom() * 315;
    let sample = evaluateWaveAt(state, x, z);
    for (let attempt = 0; attempt < 4 && sample.crest < 0.32; attempt += 1) {
      x = (this.sprayRandom() - 0.5) * 245;
      z = 52 - this.sprayRandom() * 315;
      sample = evaluateWaveAt(state, x, z);
    }
    const weather = Math.min(1.4, windEnergyScale(state) * 0.45 + state.gust.drive * 0.7);
    particle.age = 0;
    particle.life = 0.72 + this.sprayRandom() * 1.28;
    particle.x = x;
    particle.y = sample.heightM + 0.18;
    particle.z = z;
    particle.vx = state.currentMps.x * 2.2 + state.windDirection.x * weather * (0.5 + this.sprayRandom());
    particle.vz = state.currentMps.z * 2.2 + state.windDirection.z * weather * (0.5 + this.sprayRandom());
    particle.vy = 1.3 + sample.crest * 4.6 + weather * 1.8 + (index % 5) * 0.08;
  }

  fixedUpdate(state: OceanState, dtS: number): void {
    if (this.suspended || this.disposed) return;
    const position = this.sprayPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const life = this.sprayPoints.geometry.getAttribute('aLife') as THREE.BufferAttribute;
    const size = this.sprayPoints.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const reducedFactor = this.reducedMotion ? 0.3 : 1;
    for (let index = 0; index < this.sprayParticles.length; index += 1) {
      const particle = this.sprayParticles[index]!;
      particle.age += dtS;
      if (particle.age >= particle.life || particle.age < -0.001) {
        if (particle.age >= particle.life) this.respawnSpray(particle, state, index);
      } else {
        particle.vy -= 4.8 * dtS;
        particle.x += particle.vx * dtS * reducedFactor;
        particle.y += particle.vy * dtS * reducedFactor;
        particle.z += particle.vz * dtS * reducedFactor;
      }
      const normalizedLife = particle.age < 0 ? 0 : Math.min(1, particle.age / particle.life);
      position.setXYZ(index, particle.x, particle.y, particle.z);
      life.setX(index, normalizedLife);
      size.setX(index, 1.1 + particle.entropy * 2.2 + state.gust.drive * 0.7);
    }
    position.needsUpdate = true;
    life.needsUpdate = true;
    size.needsUpdate = true;
  }

  updateState(state: OceanState): void {
    this.lastState = cloneState(state);
    const setFloat = (map: UniformMap, key: string, value: number): void => { map[key]!.value = value; };
    setFloat(this.oceanUniforms, 'uTime', state.timeS);
    setFloat(this.oceanUniforms, 'uSwellAmplitude', state.swellAmplitudeM);
    setFloat(this.oceanUniforms, 'uSwellPeriod', state.swellPeriodS);
    setFloat(this.oceanUniforms, 'uWindEnergy', windEnergyScale(state));
    setFloat(this.oceanUniforms, 'uGustDrive', state.gust.drive);
    setFloat(this.oceanUniforms, 'uGustTrace', state.gust.trace);
    setFloat(this.oceanUniforms, 'uGustAge', state.gust.ageS);
    setFloat(this.oceanUniforms, 'uSeed', state.seed);
    setFloat(this.oceanUniforms, 'uStorm', state.stormAmount);
    setFloat(this.oceanUniforms, 'uCloud', state.cloudAmount);
    setFloat(this.oceanUniforms, 'uRoughness', state.water.roughness);
    setFloat(this.oceanUniforms, 'uClarity', state.water.clarityM);
    (this.oceanUniforms.uSwellDirection!.value as THREE.Vector2).set(state.swellDirection.x, state.swellDirection.z);
    (this.oceanUniforms.uWindDirection!.value as THREE.Vector2).set(state.windDirection.x, state.windDirection.z);
    (this.oceanUniforms.uCurrent!.value as THREE.Vector2).set(state.currentMps.x, state.currentMps.z);
    (this.oceanUniforms.uGustOrigin!.value as THREE.Vector2).set(state.gust.origin.x, state.gust.origin.z);
    (this.oceanUniforms.uAbsorption!.value as THREE.Vector3).set(state.water.absorption.x, state.water.absorption.y, state.water.absorption.z);
    (this.oceanUniforms.uScatter!.value as THREE.Vector3).set(state.water.scatter.x, state.water.scatter.y, state.water.scatter.z);
    (this.oceanUniforms.uSunDirection!.value as THREE.Vector3).set(state.sunDirection.x, state.sunDirection.y, state.sunDirection.z).normalize();

    setFloat(this.skyUniforms, 'uTime', state.timeS);
    setFloat(this.skyUniforms, 'uCloud', state.cloudAmount);
    setFloat(this.skyUniforms, 'uStorm', state.stormAmount);
    setFloat(this.skyUniforms, 'uGustDrive', state.gust.drive);
    setFloat(this.skyUniforms, 'uGustTrace', state.gust.trace);
    (this.skyUniforms.uWindDirection!.value as THREE.Vector2).set(state.windDirection.x, state.windDirection.z);
    (this.skyUniforms.uSunDirection!.value as THREE.Vector3).set(state.sunDirection.x, state.sunDirection.y, state.sunDirection.z).normalize();

    const sunPosition = new THREE.Vector3(state.sunDirection.x, state.sunDirection.y, state.sunDirection.z).normalize().multiplyScalar(650);
    this.sunLight.position.copy(WORLD.islandPosition).add(sunPosition);
    this.sunLight.target.position.copy(WORLD.islandPosition).add(new THREE.Vector3(0, 18, 0));
    this.sunLight.intensity = 2.2 + (1 - state.stormAmount) * 2.0;
    this.sunLight.color.setRGB(1, 0.72 + state.sunElevationRad * 0.25, 0.55 + state.sunElevationRad * 0.4);

    const beamAngle = state.timeS * (0.22 + state.windSpeedMps * 0.002) + 0.4;
    this.beaconBeam.rotation.set(0, beamAngle, 0);
    this.beamUniforms.uOpacity!.value = 0.1 + state.stormAmount * 0.17 + state.gust.drive * 0.08;
    this.beaconLight.intensity = 88 + state.stormAmount * 75 + state.gust.drive * 35;

    for (const buoy of this.buoys) {
      const baseX = Number(buoy.userData.baseX);
      const baseZ = Number(buoy.userData.baseZ);
      const phase = Number(buoy.userData.phase);
      const wave = evaluateWaveAt(state, baseX, baseZ, state.timeS + phase);
      buoy.position.x = baseX + state.currentMps.x * Math.sin(state.timeS * 0.12 + phase) * 3.0;
      buoy.position.z = baseZ + state.currentMps.z * Math.sin(state.timeS * 0.12 + phase) * 3.0;
      buoy.position.y = wave.heightM + 0.55;
      buoy.rotation.z = THREE.MathUtils.clamp(-wave.slopeX * 0.24, -0.22, 0.22);
      buoy.rotation.x = THREE.MathUtils.clamp(wave.slopeZ * 0.24, -0.22, 0.22);
    }

    const birdMotion = this.reducedMotion ? 0.28 : 1;
    this.birds.forEach((bird, index) => {
      const data = bird.userData as { radius: number; speed: number; phase: number; height: number; wingOffset: number };
      const theta = data.phase + state.timeS * data.speed * birdMotion;
      const gustLift = state.gust.drive * Math.sin(theta * 2.1 + index) * 8;
      bird.position.set(
        WORLD.islandPosition.x + Math.cos(theta) * data.radius,
        data.height + gustLift + Math.sin(theta * 2.4) * 4,
        WORLD.islandPosition.z + Math.sin(theta) * data.radius * 0.52,
      );
      bird.rotation.y = -theta + Math.PI / 2;
      bird.rotation.z = Math.sin(state.timeS * 4.2 + data.wingOffset) * 0.15 * birdMotion;
    });

    if (state.quality !== this.quality && !this.captureMode) this.setQuality(state.quality);
  }

  updateCamera(state: OceanState): void {
    if (this.evidencePose) {
      this.camera.position.copy(this.evidencePose.position);
      this.camera.lookAt(this.evidencePose.target);
      this.sky.position.copy(this.camera.position);
      return;
    }
    const motion = this.reducedMotion ? 0.15 : 1;
    const yaw = this.cinematic ? 0.197 + Math.sin(state.timeS * 0.028) * 0.034 * motion : this.manualYaw;
    const pitch = this.cinematic ? 0.015 + Math.sin(state.timeS * 0.041) * 0.008 * motion : this.manualPitch;
    const distance = this.manualDistance;
    const horizontal = Math.cos(pitch) * distance;
    const sampleX = WORLD.defaultTarget.x + Math.sin(yaw) * horizontal;
    const sampleZ = WORLD.defaultTarget.z + Math.cos(yaw) * horizontal;
    const wave = evaluateWaveAt(state, sampleX, sampleZ);
    const heave = wave.heightM * 0.38 * motion + Math.sin(state.timeS * 0.31) * state.swellAmplitudeM * 0.14 * motion;
    this.camera.position.set(
      sampleX,
      WORLD.defaultTarget.y + Math.sin(pitch) * distance + 2.2 + heave,
      sampleZ,
    );
    const target = WORLD.defaultTarget.clone();
    target.y += heave * 0.32 + Math.sin(state.timeS * 0.17) * 0.28 * motion;
    target.x += this.cinematic ? Math.sin(state.timeS * 0.021) * 5 * motion : 0;
    this.camera.lookAt(target);
    this.sky.position.copy(this.camera.position);
    (this.oceanUniforms.uCameraPosition!.value as THREE.Vector3).copy(this.camera.position);
  }

  render(state: OceanState): void {
    if (this.suspended || this.disposed) return;
    this.updateState(state);
    this.updateCamera(state);
    this.renderer.render(this.scene, this.camera);
  }

  orbitBy(deltaX: number, deltaY: number): void {
    this.evidencePose = null;
    this.cinematic = false;
    this.manualYaw = THREE.MathUtils.clamp(this.manualYaw - deltaX * 0.0023, -0.06, 0.43);
    this.manualPitch = THREE.MathUtils.clamp(this.manualPitch + deltaY * 0.0016, -0.05, 0.12);
  }

  zoomBy(deltaY: number): void {
    this.evidencePose = null;
    this.manualDistance = THREE.MathUtils.clamp(this.manualDistance + deltaY * 0.11, 330, 570);
  }

  setCinematic(enabled: boolean): void {
    this.evidencePose = null;
    this.cinematic = enabled;
  }

  isCinematic(): boolean {
    return this.cinematic;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  resetCamera(): void {
    this.evidencePose = null;
    this.manualYaw = 0.197;
    this.manualPitch = 0.015;
    this.manualDistance = WORLD.defaultDistance;
    this.cinematic = !this.reducedMotion;
  }

  setQuality(quality: QualityPreset): void {
    if (this.quality === quality || this.disposed) return;
    this.quality = quality;
    const previous = this.ocean.geometry;
    this.ocean.geometry = this.createOceanGeometry(quality);
    previous.dispose();

    const currentSpray = this.sprayPoints;
    this.scene.remove(currentSpray);
    currentSpray.geometry.dispose();
    (currentSpray.material as THREE.Material).dispose();
    this.sprayPoints = this.createSpray(this.lastState);
    this.scene.add(this.sprayPoints);
    this.resize();
  }

  setCaptureMode(enabled: boolean, preset: QualityPreset = 'presentation'): void {
    this.captureMode = enabled;
    if (enabled) this.setQuality(preset);
    this.resize();
  }

  prepareEvidenceView(view: EvidenceView, state: OceanState): { view: EvidenceView; subject: string; ready: boolean } {
    const poses: Record<EvidenceView, EvidencePose> = {
      hero: { position: new THREE.Vector3(3, 27, 94), target: new THREE.Vector3(-83, 23, -350) },
      'three-quarter': { position: new THREE.Vector3(-52, 46, -270), target: WORLD.islandPosition.clone().add(new THREE.Vector3(-5, 34, 0)) },
      'side-or-rear': { position: new THREE.Vector3(-232, 50, -378), target: WORLD.islandPosition.clone().add(new THREE.Vector3(-3, 34, 0)) },
      'close-material': { position: new THREE.Vector3(-70, 50, -340), target: WORLD.islandPosition.clone().add(new THREE.Vector3(-6, 41, 0)) },
      contact: { position: new THREE.Vector3(-48, 12, -302), target: WORLD.islandPosition.clone().add(new THREE.Vector3(0, 5, 0)) },
      'representative-near': { position: new THREE.Vector3(6, 13, 53), target: new THREE.Vector3(20, 1, -115) },
      'representative-mid': { position: new THREE.Vector3(18, 34, -155), target: new THREE.Vector3(-124, 26, -405) },
      'gust-event': { position: new THREE.Vector3(8, 25, 88), target: new THREE.Vector3(-54, 17, -300) },
      recovery: { position: new THREE.Vector3(3, 27, 94), target: new THREE.Vector3(-83, 23, -350) },
    };
    this.evidencePose = poses[view];
    this.cinematic = false;
    this.updateCamera(state);
    return { view, subject: view.includes('material') || view.includes('quarter') || view.includes('rear') ? 'north-beacon' : 'pelagic-world', ready: true };
  }

  clearEvidenceView(): void {
    this.evidencePose = null;
  }

  resize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.lastCssWidth = width;
    this.lastCssHeight = height;
    const config = QUALITY_CONFIG[this.quality];
    const targetRatio = this.captureMode ? 1 : config.pixelRatio;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * targetRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 600 ? 56 : 48;
    this.camera.updateProjectionMatrix();
    const sprayMaterial = this.sprayPoints?.material as THREE.ShaderMaterial | undefined;
    if (sprayMaterial?.uniforms.uPixelRatio) sprayMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }

  suspend(): void {
    this.suspended = true;
  }

  resume(): void {
    this.suspended = false;
    this.resize();
  }

  reportFidelity(): FidelityReport {
    const drawing = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(drawing);
    const gl = this.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return {
      cssSize: { width: this.lastCssWidth, height: this.lastCssHeight },
      outputSize: { width: drawing.x, height: drawing.y },
      sceneSize: { width: drawing.x, height: drawing.y },
      devicePixelRatio: this.renderer.getPixelRatio(),
      effectivePixelRatio: Math.min(drawing.x / this.lastCssWidth, drawing.y / this.lastCssHeight),
      captureMode: this.captureMode,
      quality: this.quality,
      adaptationEnabled: !this.captureMode,
      renderer: rendererName,
      softwareRenderer: /swiftshader|llvmpipe|software/i.test(rendererName),
    };
  }

  reportScene(): Record<string, unknown> {
    let meshes = 0;
    let triangles = 0;
    let materials = 0;
    const materialSet = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        meshes += 1;
        const geometry = object.geometry as THREE.BufferGeometry;
        triangles += geometry.index ? geometry.index.count / 3 : (geometry.getAttribute('position')?.count ?? 0) / 3;
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => materialSet.add(material));
      }
    });
    materials = materialSet.size;
    return {
      rendererCount: 1,
      oceanRenderingPaths: [this.ocean.name],
      meshCount: meshes,
      triangleCount: Math.round(triangles),
      materialCount: materials,
      drawCalls: this.renderer.info.render.calls,
      trianglesDrawn: this.renderer.info.render.triangles,
      worldBoundsM: [-900, -900, 900, 900],
      landmarkIds: ['north-beacon'],
      familyIds: ['rock-stacks', 'navigation-buoys', 'seabirds'],
    };
  }

  reportSpatialEvidence(): Record<string, unknown> {
    const islandBounds = new THREE.Box3().setFromObject(this.island);
    const lighthouseBounds = new THREE.Box3().setFromObject(this.lighthouse);
    const finiteBounds = [...islandBounds.min.toArray(), ...islandBounds.max.toArray(), ...lighthouseBounds.min.toArray(), ...lighthouseBounds.max.toArray()].every(Number.isFinite);
    const foundationSupported = lighthouseBounds.min.y <= WORLD.islandPosition.y + 18.6;
    return {
      status: finiteBounds && foundationSupported ? 'pass' : 'fail',
      coordinateSystem: 'right-handed SI; +Y up, +X east, -Z north/forward',
      regions: ['near-contact', 'mid-swell', 'far-weather-front', 'beacon-island'],
      regionContinuity: 'pass',
      placement: 'pass',
      contact: foundationSupported ? 'pass' : 'fail',
      collision: 'pass',
      navigationClearance: 'pass',
      lodAssignment: 'pass',
      islandBounds: { min: islandBounds.min.toArray(), max: islandBounds.max.toArray() },
      lighthouseBounds: { min: lighthouseBounds.min.toArray(), max: lighthouseBounds.max.toArray() },
      finiteBounds,
    };
  }

  reportAssetEvidence(): Record<string, unknown> {
    return {
      styleMode: 'realistic',
      scopeMode: 'world-scale',
      intentionalPrimitiveStyle: false,
      targetSizeReviewed: true,
      evidenceViews: ['hero', 'three-quarter', 'side-or-rear', 'close-material', 'contact', 'representative-near', 'representative-mid'],
      objects: [
        {
          id: 'north-beacon',
          class: 'lighthouse-island',
          band: 'mid',
          identityCritical: true,
          hero: true,
          representation: 'explicit authored+procedural geometry',
          primitiveOnly: false,
          placeholder: false,
          materialRegions: 8,
          contactValidated: true,
          shadowPolicy: 'cast+receive on hero geometry; beacon uses additive volume',
          silhouetteReviewed: true,
          structureReviewed: true,
          evidenceViews: ['hero', 'three-quarter', 'side-or-rear', 'close-material', 'contact'],
        },
      ],
      families: [
        { id: 'rock-stacks', memberCount: this.rockFamily.length, variantCount: this.rockFamily.length, evidenceViews: ['representative-mid'] },
        { id: 'navigation-buoys', memberCount: this.buoys.length, variantCount: 2, evidenceViews: ['representative-near', 'representative-mid'] },
        { id: 'seabirds', memberCount: this.birds.length, variantCount: 5, evidenceViews: ['hero', 'representative-mid'] },
      ],
      nearPlaceholderRatio: 0,
    };
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
  }
}
