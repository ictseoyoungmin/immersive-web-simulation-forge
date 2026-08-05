/**
 * Material families and their procedural maps.
 *
 * Five families carry the art direction (planning §9 — industrial trust over
 * sleek hi-tech): phosphated steel, hard-anodised aluminium, textured polymer,
 * coated optical glass, and emissive indicator points. A sixth, `recess`, is the
 * dark material used for every machined cut so grooves and slots read as removed
 * material rather than painted lines.
 *
 * Everything is generated at runtime — no image assets, no network fetches.
 */

import {
  MeshPhysicalMaterial, MeshStandardMaterial, CanvasTexture, DataTexture,
  RepeatWrapping, EquirectangularReflectionMapping, PMREMGenerator,
  Color, LinearSRGBColorSpace, FloatType, SRGBColorSpace
} from '../../vendor/three/three.module.min.js';
import { getFinish } from '../doc/document.mjs';

/* ------------------------------------------------------------------ *
 * Deterministic noise — same maps on every run, so captures are stable.
 * ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(random, size, cells) {
  const grid = new Float32Array((cells + 1) * (cells + 1));
  for (let i = 0; i < grid.length; i += 1) grid[i] = random();
  const smooth = t => t * t * (3 - 2 * t);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const a = grid[y0 * (cells + 1) + x0];
      const b = grid[y0 * (cells + 1) + x0 + 1];
      const c = grid[(y0 + 1) * (cells + 1) + x0];
      const d = grid[(y0 + 1) * (cells + 1) + x0 + 1];
      out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

function fbm(random, size, octaves = 4) {
  const out = new Float32Array(size * size);
  let amplitude = 0.5;
  let cells = 4;
  let sum = 0;
  for (let o = 0; o < octaves; o += 1) {
    const layer = valueNoise(random, size, cells);
    for (let i = 0; i < out.length; i += 1) out[i] += layer[i] * amplitude;
    sum += amplitude;
    amplitude *= 0.5;
    cells *= 2;
  }
  for (let i = 0; i < out.length; i += 1) out[i] /= sum;
  return out;
}

/* ------------------------------------------------------------------ *
 * Maps
 * ------------------------------------------------------------------ */

/** Machining grain: fine anisotropic tooling marks plus microscopic pitting. */
function machinedRoughnessMap(size = 512, seed = 1337, base = 0.62, contrast = 0.3) {
  const random = mulberry32(seed);
  const field = fbm(random, size, 4);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      // directional tooling streaks along U
      const streak = Math.sin(y * 2.1 + field[i] * 9) * 0.5 + 0.5;
      const value = base + (field[i] - 0.5) * contrast + (streak - 0.5) * 0.08;
      const byte = Math.max(0, Math.min(255, Math.round(value * 255)));
      image.data[i * 4] = byte;
      image.data[i * 4 + 1] = byte;
      image.data[i * 4 + 2] = byte;
      image.data[i * 4 + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = LinearSRGBColorSpace;
  return texture;
}

/** Micro-relief normal map derived from the same noise field. */
function microNormalMap(size = 512, seed = 90210, strength = 2.2, cellScale = 1) {
  const random = mulberry32(seed);
  const field = fbm(random, size, 5);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const at = (x, y) => field[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      image.data[i] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round((1 / length) * 255);
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(8 * cellScale, 8 * cellScale);
  texture.colorSpace = LinearSRGBColorSpace;
  return texture;
}

/** Polymer stipple — coarser, rounder relief than machined metal. */
function stippleNormalMap(size = 256, seed = 4242) {
  const random = mulberry32(seed);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#8080ff';
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 1.2 + random() * 2.2;
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(150,150,255,0.9)');
    gradient.addColorStop(0.5, 'rgba(128,128,255,0.35)');
    gradient.addColorStop(1, 'rgba(106,106,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(14, 14);
  texture.colorSpace = LinearSRGBColorSpace;
  return texture;
}

/**
 * Workshop environment: an equirectangular radiance field with two overhead
 * strip lights, a cold back wall and a warm bench bounce. Metal without an
 * environment reads as flat plastic, so this is load-bearing, not decoration.
 */
function workshopEnvironment(renderer) {
  const width = 128;
  const height = 64;
  const data = new Float32Array(width * height * 4);
  const write = (x, y, r, g, b) => {
    const i = (y * width + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 1;
  };

  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);          // 0 = up, 1 = down
    const elevation = Math.cos(v * Math.PI);
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      // Base gradient: cool ceiling, warm bench bounce below. This carries most
      // of the metal's appearance — a near-black environment turns high-metalness
      // materials into silhouettes, which is exactly the failure to avoid here.
      let r = 0.018 + Math.max(0, elevation) * 0.046;
      let g = 0.022 + Math.max(0, elevation) * 0.055;
      let b = 0.030 + Math.max(0, elevation) * 0.076;
      // bench bounce: warmer, much dimmer, from below
      const bounce = Math.max(0, -elevation);
      r += bounce * 0.055; g += bounce * 0.042; b += bounce * 0.028;
      const horizon = Math.exp(-Math.pow((v - 0.56) * 6, 2));
      r += horizon * 0.060; g += horizon * 0.046; b += horizon * 0.032;

      // two long strip lights running across the ceiling
      for (const stripU of [0.20, 0.70]) {
        const du = Math.min(Math.abs(u - stripU), 1 - Math.abs(u - stripU));
        const strip = Math.exp(-Math.pow(du * 26, 2)) * Math.exp(-Math.pow((v - 0.17) * 5.0, 2));
        r += strip * 15.0; g += strip * 16.0; b += strip * 17.4;
      }
      // cool rim source behind the bench, and a soft key from camera-left
      const rim = Math.exp(-Math.pow((u - 0.46) * 5.0, 2)) * Math.exp(-Math.pow((v - 0.40) * 5.0, 2));
      r += rim * 0.42; g += rim * 0.60; b += rim * 0.86;
      const keyGlow = Math.exp(-Math.pow((u - 0.90) * 4.0, 2)) * Math.exp(-Math.pow((v - 0.30) * 4.2, 2));
      r += keyGlow * 0.86; g += keyGlow * 0.90; b += keyGlow * 0.94;

      write(x, y, r, g, b);
    }
  }

  const texture = new DataTexture(data, width, height, undefined, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.needsUpdate = true;

  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(texture);
  pmrem.dispose();
  texture.dispose();
  return target.texture;
}

/* ------------------------------------------------------------------ *
 * Material set
 * ------------------------------------------------------------------ */

export function createMaterialLibrary(renderer) {
  const maps = {
    metalRoughness: machinedRoughnessMap(512, 1337, 0.52, 0.62),
    metalNormal: microNormalMap(512, 90210, 2.0, 1),
    polymerNormal: stippleNormalMap(256, 4242),
    polymerRoughness: machinedRoughnessMap(256, 7777, 0.84, 0.14)
  };
  const environment = workshopEnvironment(renderer);
  const emissiveCache = new Map();

  function build(finishId) {
    const finish = getFinish(finishId);

    const steel = new MeshPhysicalMaterial({
      color: new Color(finish.steel.color),
      metalness: finish.steel.metalness,
      roughness: finish.steel.roughness,
      roughnessMap: maps.metalRoughness,
      normalMap: maps.metalNormal,
      envMap: environment,
      envMapIntensity: 1.1
    });
    steel.normalScale.set(0.34, 0.34);

    const alu = new MeshPhysicalMaterial({
      color: new Color(finish.alu.color),
      metalness: finish.alu.metalness,
      roughness: finish.alu.roughness,
      roughnessMap: maps.metalRoughness,
      normalMap: maps.metalNormal,
      envMap: environment,
      envMapIntensity: 1.0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.55
    });
    alu.normalScale.set(0.22, 0.22);

    const polymer = new MeshPhysicalMaterial({
      color: new Color(finish.polymer.color),
      metalness: 0.03,
      roughness: 0.9,
      roughnessMap: maps.polymerRoughness,
      normalMap: maps.polymerNormal,
      envMap: environment,
      envMapIntensity: 0.5
    });
    polymer.normalScale.set(0.6, 0.6);

    const rubber = new MeshPhysicalMaterial({
      color: new Color(0x14171a),
      metalness: 0.0,
      roughness: 0.97,
      normalMap: maps.polymerNormal,
      envMap: environment,
      envMapIntensity: 0.28
    });
    rubber.normalScale.set(0.85, 0.85);

    const glass = new MeshPhysicalMaterial({
      color: new Color(0x081319),
      metalness: 0.1,
      roughness: 0.06,
      envMap: environment,
      envMapIntensity: 3.0,
      transparent: true,
      opacity: 0.52,
      clearcoat: 1,
      clearcoatRoughness: 0.04
    });

    const recess = new MeshStandardMaterial({
      color: new Color(0x0a0c0e),
      metalness: 0.55,
      roughness: 0.92,
      envMap: environment,
      envMapIntensity: 0.35
    });

    return { steel, alu, polymer, rubber, glass, recess };
  }

  function emissiveMaterial(color) {
    const key = color >>> 0;
    if (emissiveCache.has(key)) return emissiveCache.get(key);
    const material = new MeshStandardMaterial({
      color: new Color(0x05070a),
      emissive: new Color(color),
      emissiveIntensity: 2.4,
      metalness: 0,
      roughness: 0.4,
      toneMapped: true
    });
    emissiveCache.set(key, material);
    return material;
  }

  function dispose() {
    for (const texture of Object.values(maps)) texture.dispose();
    environment.dispose?.();
    for (const material of emissiveCache.values()) material.dispose();
    emissiveCache.clear();
  }

  return { build, emissiveMaterial, environment, maps, dispose, SRGBColorSpace };
}
