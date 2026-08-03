(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#scene');
  const motesCanvas = $('#motes');
  const world = $('#world');
  const runtimeStatus = $('#runtimeStatus');
  const fallback = $('#fallback');
  const captureRequested = new URLSearchParams(location.search).get('forgeCapture') === '1';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: captureRequested
  });

  if (!gl) {
    fallback.hidden = false;
    runtimeStatus.dataset.state = 'unsupported';
    runtimeStatus.textContent = 'WebGL 2 unavailable';
    return;
  }

  const vertexSource = `#version 300 es
  precision highp float;
  out vec2 vUv;
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const fragmentSource = `#version 300 es
  precision highp float;
  precision highp int;

  out vec4 fragColor;
  in vec2 vUv;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uCamera;
  uniform mat3 uCameraBasis;
  uniform float uField;
  uniform float uBloom;
  uniform float uStorm;
  uniform float uScan;
  uniform float uPulse;
  uniform float uQuality;

  #define PI 3.14159265359
  #define FAR 180.0

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.82, 0.57, -0.57, 0.82);
    for (int i = 0; i < 5; i++) {
      v += a * noise2(p);
      p = r * p * 2.03 + 7.1;
      a *= 0.48;
    }
    return v;
  }

  float ridged(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      float n = noise2(p) * 2.0 - 1.0;
      v += a * (1.0 - abs(n));
      p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.1 + 3.7;
      a *= 0.48;
    }
    return v;
  }

  float fieldAt(vec2 p) {
    float river = sin(p.x * 0.028 + sin(p.y * 0.019)) * 0.5 + 0.5;
    float veins = ridged(p * 0.055 + vec2(11.0, -7.0));
    return clamp(0.28 + 0.48 * veins + 0.22 * river, 0.0, 1.0);
  }

  float terrainHeight(vec2 p) {
    float waves = sin(p.x * 0.018) * 4.8 + sin(p.y * 0.015) * 4.2 + sin((p.x + p.y) * 0.011) * 3.5;
    float broad = (noise2(p * 0.032) - 0.5) * 12.0;
    float shelves = smoothstep(0.48, 0.78, noise2(p * 0.085 + 7.4)) * 4.2;
    float detail = (noise2(p * 0.28) - 0.5) * 0.7;
    float memoryScar = exp(-abs(sin(p.x * 0.018 + sin(p.y * 0.013) * 2.0)) * 12.0) * (0.8 + uBloom * 1.25);
    return waves + broad + shelves + detail + memoryScar - 3.0;
  }

  float sdSphere(vec3 p, float r) { return length(p) - r; }
  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  float sdHex(vec2 p, float r) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.732))), p.x) - r;
  }

  vec2 crystalCell(vec3 p) {
    const float CELL = 18.0;
    vec2 cell = floor((p.xz + CELL * 0.5) / CELL);
    vec2 rnd = hash22(cell) - 0.5;
    vec2 c = cell * CELL + rnd * 9.0;
    float seed = hash21(cell + 9.2);
    float base = terrainHeight(c);
    vec3 q = p - vec3(c.x, base, c.y);
    float h = mix(2.2, 7.8, seed) * (0.72 + uBloom * 0.72);
    float taper = mix(1.2, 0.12, clamp(q.y / max(h, 0.01), 0.0, 1.0));
    float prism = max(sdHex(q.xz, taper), max(-q.y, q.y - h));
    float rootA = length(vec2(length(q.xz) - (1.5 + uBloom * 1.2), q.y - 0.35)) - (0.06 + uBloom * 0.08);
    float rootB = length(vec2(length(q.xz) - (2.2 + uBloom * 2.0), q.y - 0.18)) - (0.035 + uBloom * 0.05);
    float alive = step(0.58, seed);
    float d = min(prism, min(rootA, rootB));
    return vec2(mix(999.0, d, alive), 2.0);
  }

  vec2 meridianLandmarks(vec3 p) {
    vec2 res = vec2(999.0, 3.0);
    vec3 centers[3];
    centers[0] = vec3(34.0, 13.0, -52.0);
    centers[1] = vec3(-68.0, 16.0, 18.0);
    centers[2] = vec3(76.0, 21.0, 58.0);
    for (int i = 0; i < 3; i++) {
      vec3 q = p - centers[i];
      float phase = float(i) * 2.2;
      float rot = 0.18 * sin(uTime * 0.11 + phase);
      q.xz = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * q.xz;
      float monolith = sdBox(q, vec3(2.2, 9.5 + float(i) * 2.0, 1.1));
      monolith = max(monolith, -(sdBox(q, vec3(1.15, 7.4 + float(i), 2.0))));
      float ring = sdTorus(q - vec3(0.0, -5.5 + sin(uTime * 0.4 + phase), 0.0), vec2(5.0 + float(i), 0.14));
      float crown = sdTorus(q - vec3(0.0, 8.0 + float(i) * 1.5, 0.0), vec2(3.5, 0.18));
      float d = min(monolith, min(ring, crown));
      if (d < res.x) res = vec2(d, 3.0 + float(i) * 0.01);
    }
    return res;
  }

  vec2 floatingSeeds(vec3 p) {
    vec2 cell = floor((p.xz + 9.0) / 28.0);
    vec2 c = cell * 28.0 + (hash22(cell + 5.3) - 0.5) * 14.0;
    float seed = hash21(cell - 12.0);
    float base = terrainHeight(c);
    float y = base + 8.0 + seed * 12.0 + sin(uTime * 0.45 + seed * 12.0) * (0.35 + uStorm);
    vec3 q = p - vec3(c.x, y, c.y);
    float d = min(sdSphere(q, 0.25 + seed * 0.3), sdTorus(q, vec2(0.7 + seed, 0.035)));
    return vec2(mix(999.0, d, step(0.8, seed)), 4.0);
  }

  vec2 mapScene(vec3 p) {
    float terrain = p.y - terrainHeight(p.xz);
    vec2 res = vec2(terrain, 1.0);
    vec2 crystals = crystalCell(p);
    if (crystals.x < res.x) res = crystals;
    vec2 monuments = meridianLandmarks(p);
    if (monuments.x < res.x) res = monuments;
    return res;
  }

  vec3 calcNormal(vec3 p, float t) {
    float e = max(0.0025, t * 0.00022);
    vec2 h = vec2(e, 0.0);
    float d = mapScene(p).x;
    return normalize(vec3(
      d - mapScene(p - h.xyy).x,
      d - mapScene(p - h.yxy).x,
      d - mapScene(p - h.yyx).x
    ));
  }

  float softShadow(vec3 ro, vec3 rd, float maxT) {
    float res = 1.0;
    float t = 0.2;
    for (int i = 0; i < 10; i++) {
      vec2 h = mapScene(ro + rd * t);
      res = min(res, 12.0 * h.x / t);
      t += clamp(h.x * 1.25, 0.16, 3.2);
      if (res < 0.015 || t > maxT) break;
    }
    return clamp(res, 0.08, 1.0);
  }

  float ambientOcclusion(vec3 p, vec3 n) {
    float occ = 0.0;
    float scale = 1.0;
    for (int i = 1; i <= 1; i++) {
      float h = 0.25 * float(i);
      float d = mapScene(p + n * h).x;
      occ += (h - d) * scale;
      scale *= 0.62;
    }
    return clamp(1.0 - occ, 0.25, 1.0);
  }

  vec3 sky(vec3 rd, vec3 sunDir) {
    float up = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 night = vec3(0.008, 0.025, 0.035);
    vec3 horizon = mix(vec3(0.07, 0.19, 0.21), vec3(0.18, 0.11, 0.23), uStorm);
    vec3 zenith = mix(vec3(0.018, 0.075, 0.105), vec3(0.035, 0.018, 0.09), uStorm);
    vec3 col = mix(horizon, zenith, pow(up, 0.7));
    col = mix(night, col, 0.86);

    float sun = max(dot(rd, sunDir), 0.0);
    col += vec3(1.0, 0.77, 0.42) * pow(sun, 480.0) * 12.0;
    col += vec3(1.0, 0.45, 0.25) * pow(sun, 18.0) * 0.22;

    vec2 suv = rd.xz / max(abs(rd.y) + 0.25, 0.25);
    float cloud = noise2(suv * 1.3 + vec2(uTime * 0.012, -uTime * 0.018)) * 0.65 + noise2(suv * 2.7 - vec2(uTime * 0.018, uTime * 0.011)) * 0.35;
    float cloudMask = smoothstep(0.56 - uStorm * 0.12, 0.78, cloud) * smoothstep(-0.1, 0.4, rd.y);
    col = mix(col, mix(vec3(0.19, 0.29, 0.30), vec3(0.18, 0.12, 0.28), uStorm), cloudMask * (0.16 + uStorm * 0.52));

    float auroraBand = exp(-abs(rd.y - 0.22 - sin(rd.x * 5.0 + uTime * 0.05) * 0.05) * 18.0);
    float auroraNoise = smoothstep(0.35, 0.85, noise2(rd.xz * 9.0 + vec2(0.0, uTime * 0.07)));
    col += mix(vec3(0.10, 0.9, 0.62), vec3(0.5, 0.25, 1.0), uStorm) * auroraBand * auroraNoise * (0.08 + uField * 0.12 + uStorm * 0.18);

    float stars = pow(hash21(floor((rd.xy / max(abs(rd.z), 0.12)) * 520.0)), 38.0);
    col += stars * (1.0 - cloudMask) * vec3(0.6, 0.9, 1.0) * smoothstep(0.0, 0.55, rd.y) * 0.6;

    float flash = pow(max(0.0, sin(uTime * 5.7 + sin(uTime * 1.37) * 8.0)), 42.0) * uStorm;
    col += vec3(0.48, 0.52, 1.0) * flash * 0.55;
    return col;
  }

  vec3 materialColor(float id, vec3 p, vec3 n, vec3 rd, vec3 sunDir, float t) {
    float field = fieldAt(p.xz);
    float ndl = max(dot(n, sunDir), 0.0);
    float shadow = 1.0;
    float ao = ambientOcclusion(p, n);
    vec3 halfDir = normalize(sunDir - rd);
    float spec = pow(max(dot(n, halfDir), 0.0), 42.0);
    vec3 col;

    if (id < 1.5) {
      float h = p.y;
      float slope = 1.0 - n.y;
      float micro = noise2(p.xz * 2.4) * 0.16 + noise2(p.xz * 8.0) * 0.04;
      vec3 moss = mix(vec3(0.055, 0.14, 0.10), vec3(0.18, 0.31, 0.17), field);
      vec3 stone = mix(vec3(0.15, 0.18, 0.17), vec3(0.28, 0.23, 0.18), noise2(p.xz * 0.18));
      vec3 mineral = vec3(0.08, 0.25, 0.23);
      col = mix(moss, stone, smoothstep(0.2, 0.72, slope));
      col = mix(col, mineral, smoothstep(8.0, 22.0, h) * 0.36);
      col *= 0.86 + micro;
      float veins = exp(-abs(sin(p.x * 0.24 + sin(p.z * 0.17) * 2.0)) * 16.0);
      col += vec3(0.25, 1.0, 0.67) * veins * field * (0.025 + uBloom * 0.12);
      col *= (0.25 + 0.9 * ndl * shadow) * ao;
      col += vec3(0.05, 0.13, 0.12) * (0.6 + n.y * 0.4);
      col += spec * vec3(0.35, 0.46, 0.39) * 0.12 * smoothstep(0.6, 0.0, slope);
    } else if (id < 2.5) {
      float facets = pow(abs(sin(atan(p.z, p.x) * 3.0)), 7.0);
      float veins = pow(0.5 + 0.5 * sin(p.y * 3.8 + noise2(p.xz * 1.8) * 8.0 - uTime * 1.6), 12.0);
      vec3 core = mix(vec3(0.04, 0.25, 0.22), vec3(0.22, 0.55, 0.38), facets);
      col = core * (0.22 + ndl * shadow * 0.72) * ao;
      col += vec3(0.45, 1.0, 0.72) * veins * (0.12 + field * 0.22 + uBloom * 0.38);
      col += spec * vec3(0.65, 1.0, 0.82) * (0.8 + facets);
      col += pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * vec3(0.12, 0.9, 0.66) * 0.38;
    } else if (id < 3.5) {
      float edge = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
      float glyph = exp(-abs(sin(p.y * 1.7 + atan(p.z, p.x) * 5.0)) * 22.0);
      vec3 metal = mix(vec3(0.055, 0.075, 0.078), vec3(0.18, 0.21, 0.18), noise2(p.xz * 5.0));
      col = metal * (0.22 + ndl * shadow * 0.82) * ao;
      col += spec * vec3(0.9, 0.82, 0.58) * 1.4;
      col += edge * vec3(0.22, 0.58, 0.48) * 0.65;
      col += glyph * vec3(0.72, 1.0, 0.58) * (0.1 + uField * 0.18 + uPulse * 0.25);
    } else {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.2 + p.y * 4.0);
      col = mix(vec3(0.36, 0.78, 0.58), vec3(0.72, 0.48, 1.0), uStorm) * (1.2 + pulse);
      col += spec * 2.0;
    }

    if (uScan > 0.01) {
      float contour = exp(-abs(fract((p.y + field * 5.0) * 0.55) - 0.5) * 35.0);
      float gridX = exp(-abs(fract(p.x * 0.25) - 0.5) * 42.0);
      float gridZ = exp(-abs(fract(p.z * 0.25) - 0.5) * 42.0);
      vec3 scanCol = vec3(0.32, 1.0, 0.76) * (contour * 0.7 + max(gridX, gridZ) * 0.16);
      col += scanCol * uScan * smoothstep(150.0, 10.0, t);
      if (id > 1.5) col += vec3(0.38, 1.0, 0.76) * uScan * 0.16;
    }
    return col;
  }

  vec3 renderWater(vec3 ro, vec3 rd, float tw, vec3 sunDir) {
    vec3 p = ro + rd * tw;
    float field = fieldAt(p.xz);
    float w1 = sin(p.x * 0.55 + uTime * 1.2) + sin(p.z * 0.42 - uTime * 0.9);
    float w2 = noise2(p.xz * 0.9 + vec2(uTime * 0.07, -uTime * 0.11));
    vec3 n = normalize(vec3((cos(p.x * 0.55 + uTime * 1.2) * 0.12 + (w2 - 0.5) * 0.05), 1.0,
                            (cos(p.z * 0.42 - uTime * 0.9) * 0.1 + (w2 - 0.5) * 0.05)));
    vec3 reflected = sky(reflect(rd, n), sunDir);
    float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    vec3 deep = mix(vec3(0.015, 0.10, 0.12), vec3(0.035, 0.20, 0.18), field);
    vec3 col = mix(deep, reflected, 0.28 + fresnel * 0.62);
    float sparkle = pow(max(dot(reflect(-sunDir, n), -rd), 0.0), 180.0);
    col += sparkle * vec3(1.0, 0.78, 0.45) * 4.0;
    float lines = exp(-abs(sin((p.x + p.z) * 0.36 + w1)) * 24.0);
    col += lines * vec3(0.12, 0.7, 0.62) * 0.08;
    return col;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = (frag * 2.0 - uResolution.xy) / uResolution.y;
    vec3 ro = uCamera;
    vec3 rd = normalize(uCameraBasis * vec3(uv, 1.55));

    float solarAngle = 0.52 + sin(uTime * 0.012) * 0.16;
    vec3 sunDir = normalize(vec3(cos(solarAngle) * 0.48, 0.66, sin(solarAngle) * 0.48));
    vec3 skyCol = sky(rd, sunDir);

    float t = 0.08;
    float matId = -1.0;
    bool hit = false;
    int maxSteps = int(mix(38.0, 58.0, uQuality));
    for (int i = 0; i < 62; i++) {
      if (i >= maxSteps) break;
      vec3 p = ro + rd * t;
      vec2 h = mapScene(p);
      float eps = max(0.002, t * 0.00034);
      if (h.x < eps) { hit = true; matId = h.y; break; }
      t += max(h.x * 0.74, 0.05);
      if (t > FAR) break;
    }

    const float WATER = -1.45;
    float tw = 9999.0;
    bool waterHit = false;
    if (rd.y < -0.001 && ro.y > WATER) {
      tw = (WATER - ro.y) / rd.y;
      vec3 wp = ro + rd * tw;
      waterHit = tw > 0.0 && tw < min(t, FAR) && terrainHeight(wp.xz) < WATER - 0.05;
    }

    vec3 col = skyCol;
    float depth = FAR;
    if (waterHit) {
      col = renderWater(ro, rd, tw, sunDir);
      depth = tw;
    } else if (hit && t < FAR) {
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p, t);
      col = materialColor(matId, p, n, rd, sunDir, t);
      depth = t;
    }

    float fogDensity = mix(0.010, 0.018, uStorm);
    float fog = 1.0 - exp(-depth * fogDensity * (0.7 + max(0.0, 0.4 - rd.y)));
    vec3 fogCol = mix(skyCol, mix(vec3(0.06, 0.18, 0.18), vec3(0.12, 0.08, 0.2), uStorm), 0.28);
    col = mix(col, fogCol, clamp(fog, 0.0, 0.94));

    float horizonGlow = exp(-abs(rd.y + 0.05) * 13.0) * (0.035 + uBloom * 0.04);
    col += vec3(0.18, 0.86, 0.6) * horizonGlow;

    float stormBands = noise2(vec2(uv.y * 1.8 + uTime * 0.9, floor(uv.x * 18.0))) * uStorm;
    col += vec3(0.18, 0.15, 0.38) * stormBands * 0.035;

    float vignette = 1.0 - smoothstep(0.58, 1.42, length(uv * vec2(0.72, 0.88))) * 0.34;
    col *= vignette;
    col = col / (1.0 + col);
    col = pow(col, vec3(0.86));
    col *= vec3(0.96, 1.02, 1.0);

    float grain = hash21(frag + fract(uTime) * 173.0) - 0.5;
    col += grain * 0.012;
    fragColor = vec4(col, 1.0);
  }`;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'Unknown shader error';
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function createProgram() {
    const program = gl.createProgram();
    const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || 'Unknown link error';
      gl.deleteProgram(program);
      throw new Error(log);
    }
    return program;
  }

  let program;
  try {
    program = createProgram();
  } catch (error) {
    console.error('Aetherwild shader failure:', error);
    fallback.hidden = false;
    fallback.querySelector('h2').textContent = '렌더러를 시작하지 못했습니다';
    fallback.querySelector('p').textContent = String(error.message || error);
    runtimeStatus.dataset.state = 'error';
    runtimeStatus.textContent = String(error);
    return;
  }

  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());

  const uniforms = {};
  ['uResolution', 'uTime', 'uCamera', 'uCameraBasis', 'uField', 'uBloom', 'uStorm', 'uScan', 'uPulse', 'uQuality']
    .forEach((name) => { uniforms[name] = gl.getUniformLocation(program, name); });

  const state = {
    started: captureRequested,
    yaw: captureRequested ? 0.55 : 0.28,
    pitch: captureRequested ? -0.11 : -0.06,
    camera: captureRequested ? [8.5, 15.5, 26.0] : [0, 16, 28],
    velocity: [0, 0, 0],
    field: 0.68,
    bloom: captureRequested ? 0.72 : 0,
    bloomTarget: captureRequested ? 0.72 : 0,
    storm: 0,
    stormTarget: 0,
    scan: captureRequested ? 0.62 : 0,
    scanTarget: captureRequested ? 0.62 : 0,
    pulse: 0,
    keys: new Set(),
    muted: false,
    audioReady: false,
    qualityPreset: captureRequested ? 'presentation' : 'balanced',
    scale: captureRequested ? 1 : 0.9,
    adaptationLocked: captureRequested,
    frameTimeAverage: 16.7,
    fps: 60,
    pointerLocked: false,
    dragging: false,
    dragX: 0,
    dragY: 0,
    lastFrame: performance.now(),
    elapsed: captureRequested ? 41.25 : 0,
    captureTime: 41.25,
    eventTimer: 0,
    eventKind: '',
    enteredAt: performance.now(),
    motes: [],
    width: 1,
    height: 1,
    pixelRatio: 1,
    renderedFrames: 0
  };

  const dom = {
    entry: $('#entry'),
    enterButton: $('#enterButton'),
    scanButton: $('#scanButton'),
    bloomButton: $('#bloomButton'),
    stormButton: $('#stormButton'),
    audioButton: $('#audioButton'),
    fieldValue: $('#fieldValue'),
    altValue: $('#altValue'),
    vectorValue: $('#vectorValue'),
    coordX: $('#coordX'),
    coordZ: $('#coordZ'),
    biomeName: $('#biomeName'),
    qualityLabel: $('#qualityLabel'),
    fpsLabel: $('#fpsLabel'),
    headingLabel: $('#headingLabel'),
    compassTicks: $('#compassTicks'),
    scanProgress: $('#scanProgress'),
    anomalyIndex: $('#anomalyIndex'),
    anomalyType: $('#anomalyType'),
    anomalyName: $('#anomalyName'),
    anomalyDetail: $('#anomalyDetail'),
    eventBanner: $('#eventBanner'),
    eventTitle: $('#eventTitle'),
    eventDetail: $('#eventDetail')
  };

  if (captureRequested) {
    document.body.classList.add('entered', 'scanning');
    dom.entry.setAttribute('aria-hidden', 'true');
  }

  const mctx = motesCanvas.getContext('2d');
  for (let i = 0; i < 90; i++) {
    state.motes.push({
      x: Math.random(), y: Math.random(), z: Math.random(),
      drift: 0.15 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      size: 0.5 + Math.random() * 1.7
    });
  }

  function fract(v) { return v - Math.floor(v); }
  function hash2(x, y) { return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123); }
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function fieldAtJS(x, z) {
    const a = Math.sin(x * 0.031 + Math.sin(z * 0.017) * 1.7) * 0.5 + 0.5;
    const b = Math.sin(z * 0.043 - x * 0.009) * 0.5 + 0.5;
    const c = hash2(Math.floor(x / 28), Math.floor(z / 28));
    return Math.max(0, Math.min(1, 0.28 + a * 0.28 + b * 0.22 + c * 0.2));
  }
  function terrainHeightJS(x, z) {
    const a = Math.sin(x * 0.027) * 3.8 + Math.sin(z * 0.021) * 4.4;
    const b = Math.sin((x + z) * 0.053) * 2.2 + Math.sin((x - z) * 0.089) * 1.1;
    return a + b + 1.2;
  }

  function setQuality(preset, announce = true) {
    const options = {
      performance: { scale: 0.72, label: 'PERFORMANCE' },
      balanced: { scale: 0.9, label: 'BALANCED' },
      presentation: { scale: 1, label: 'PRESENTATION' }
    };
    const option = options[preset] || options.balanced;
    state.qualityPreset = preset in options ? preset : 'balanced';
    state.scale = option.scale;
    state.adaptationLocked = state.qualityPreset !== 'balanced' || captureRequested;
    dom.qualityLabel.textContent = option.label;
    resize();
    if (announce && state.started) showEvent('RENDER CONTRACT', `${option.label} · scene sampling ${Math.round(option.scale * 100)}%`);
  }

  function resize() {
    const rect = world.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(devicePixelRatio || 1, captureRequested ? 1.25 : 1.0);
    const ratio = dpr * state.scale;
    const width = Math.max(2, Math.round(cssW * ratio));
    const height = Math.max(2, Math.round(cssH * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    const uiDpr = Math.min(devicePixelRatio || 1, 2);
    const mw = Math.round(cssW * uiDpr);
    const mh = Math.round(cssH * uiDpr);
    if (motesCanvas.width !== mw || motesCanvas.height !== mh) {
      motesCanvas.width = mw;
      motesCanvas.height = mh;
      motesCanvas.style.width = `${cssW}px`;
      motesCanvas.style.height = `${cssH}px`;
      mctx.setTransform(uiDpr, 0, 0, uiDpr, 0, 0);
    }
    state.width = cssW;
    state.height = cssH;
    state.pixelRatio = ratio;
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(world);

  function startExperience() {
    if (state.started) return;
    state.started = true;
    state.enteredAt = performance.now();
    document.body.classList.add('entered');
    initAudio();
    setTimeout(() => canvas.requestPointerLock?.(), 100);
  }

  dom.enterButton.addEventListener('click', startExperience);
  canvas.addEventListener('click', () => {
    if (!state.started) startExperience();
    else if (!document.pointerLockElement) canvas.requestPointerLock?.();
  });

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', (event) => {
    if (!state.pointerLocked) return;
    const sensitivity = 0.0018;
    state.yaw += event.movementX * sensitivity;
    state.pitch -= event.movementY * sensitivity;
    state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch));
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (state.pointerLocked) return;
    state.dragging = true;
    state.dragX = event.clientX;
    state.dragY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!state.dragging || state.pointerLocked) return;
    const dx = event.clientX - state.dragX;
    const dy = event.clientY - state.dragY;
    state.dragX = event.clientX;
    state.dragY = event.clientY;
    const sensitivity = event.pointerType === 'touch' ? 0.004 : 0.003;
    state.yaw += dx * sensitivity;
    state.pitch -= dy * sensitivity;
    state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch));
  });
  canvas.addEventListener('pointerup', () => { state.dragging = false; });
  canvas.addEventListener('pointercancel', () => { state.dragging = false; });

  window.addEventListener('keydown', (event) => {
    if (['KeyW','KeyA','KeyS','KeyD','Space','KeyC','ShiftLeft','ShiftRight'].includes(event.code)) event.preventDefault();
    if (!event.repeat) {
      if (event.code === 'KeyQ') toggleScan();
      if (event.code === 'KeyE') triggerBloom();
      if (event.code === 'KeyR') triggerStorm();
      if (event.code === 'Digit1') setQuality('performance');
      if (event.code === 'Digit2') setQuality('balanced');
      if (event.code === 'Digit3') setQuality('presentation');
      if (event.code === 'KeyM') toggleAudio();
    }
    state.keys.add(event.code);
  }, { passive: false });
  window.addEventListener('keyup', (event) => state.keys.delete(event.code));
  window.addEventListener('blur', () => state.keys.clear());

  function toggleScan() {
    state.scanTarget = state.scanTarget > 0.5 ? 0 : 1;
    dom.scanButton.classList.toggle('active', state.scanTarget > 0.5);
    document.body.classList.toggle('scanning', state.scanTarget > 0.5);
    showEvent(state.scanTarget ? 'RESONANCE SCAN' : 'OPTICAL MODE', state.scanTarget ? 'Hidden causal strata are now visible.' : 'World-spectrum rendering restored.');
  }

  function triggerBloom() {
    const activating = state.bloomTarget < 0.55;
    state.bloomTarget = activating ? 1 : 0;
    dom.bloomButton.classList.toggle('active', activating);
    state.pulse = 1;
    if (activating) {
      state.stormTarget = 0;
      dom.stormButton.classList.remove('active');
    }
    showEvent(activating ? 'SYMBIOTIC BLOOM' : 'BLOOM WITHDRAWAL', activating ? 'The terrain is rewriting its silhouette.' : 'The root lattice returns below the surface.');
  }

  function triggerStorm() {
    const activating = state.stormTarget < 0.55;
    state.stormTarget = activating ? 1 : 0;
    dom.stormButton.classList.toggle('active', activating);
    if (activating) {
      state.bloomTarget = Math.min(state.bloomTarget, 0.35);
      dom.bloomButton.classList.remove('active');
    }
    showEvent(activating ? 'ION STORM FRONT' : 'ATMOSPHERIC RECOVERY', activating ? 'Light, wind and navigation laws have destabilized.' : 'The horizon is restoring its prior memory.');
  }

  dom.scanButton.addEventListener('click', toggleScan);
  dom.bloomButton.addEventListener('click', triggerBloom);
  dom.stormButton.addEventListener('click', triggerStorm);
  dom.audioButton.addEventListener('click', toggleAudio);

  function showEvent(title, detail) {
    dom.eventTitle.textContent = title;
    dom.eventDetail.textContent = detail;
    dom.eventBanner.classList.remove('show');
    void dom.eventBanner.offsetWidth;
    dom.eventBanner.classList.add('show');
    state.eventTimer = 3.2;
  }

  let audio = null;
  function initAudio() {
    if (state.audioReady || captureRequested) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.14;
      master.connect(ctx.destination);

      const drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 48;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.12;
      drone.connect(droneGain).connect(master);
      drone.start();

      const overtone = ctx.createOscillator();
      overtone.type = 'triangle';
      overtone.frequency.value = 96.4;
      const overtoneGain = ctx.createGain();
      overtoneGain.gain.value = 0.025;
      overtone.connect(overtoneGain).connect(master);
      overtone.start();

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.985 + white * 0.015;
        data[i] = last * 3.2;
      }
      const wind = ctx.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 520;
      windFilter.Q.value = 0.7;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.08;
      wind.connect(windFilter).connect(windGain).connect(master);
      wind.start();

      audio = { ctx, master, drone, droneGain, overtone, overtoneGain, windFilter, windGain };
      state.audioReady = true;
    } catch (error) {
      console.warn('Audio unavailable:', error);
    }
  }

  function toggleAudio() {
    state.muted = !state.muted;
    dom.audioButton.classList.toggle('muted', state.muted);
    dom.audioButton.classList.toggle('active', !state.muted);
    if (!state.audioReady && !state.muted) initAudio();
    if (audio) audio.master.gain.setTargetAtTime(state.muted ? 0 : 0.14, audio.ctx.currentTime, 0.08);
  }

  function updateAudio() {
    if (!audio || state.muted) return;
    const t = audio.ctx.currentTime;
    audio.drone.frequency.setTargetAtTime(42 + state.field * 18 + state.bloom * 8, t, 0.4);
    audio.overtone.frequency.setTargetAtTime(92 + state.field * 36 + state.storm * 18, t, 0.3);
    audio.droneGain.gain.setTargetAtTime(0.07 + state.bloom * 0.09, t, 0.3);
    audio.windFilter.frequency.setTargetAtTime(380 + state.storm * 1100 + state.field * 280, t, 0.2);
    audio.windGain.gain.setTargetAtTime(0.045 + state.storm * 0.2, t, 0.2);
  }

  function updateMovement(dt) {
    if (!state.started || captureRequested) return;
    const forward = [Math.sin(state.yaw), 0, -Math.cos(state.yaw)];
    const right = [Math.cos(state.yaw), 0, Math.sin(state.yaw)];
    const move = [0, 0, 0];
    if (state.keys.has('KeyW')) { move[0] += forward[0]; move[2] += forward[2]; }
    if (state.keys.has('KeyS')) { move[0] -= forward[0]; move[2] -= forward[2]; }
    if (state.keys.has('KeyD')) { move[0] += right[0]; move[2] += right[2]; }
    if (state.keys.has('KeyA')) { move[0] -= right[0]; move[2] -= right[2]; }
    if (state.keys.has('Space')) move[1] += 1;
    if (state.keys.has('KeyC')) move[1] -= 1;
    const len = Math.hypot(move[0], move[1], move[2]) || 1;
    const sprint = state.keys.has('ShiftLeft') || state.keys.has('ShiftRight');
    const speed = (sprint ? 26 : 10.5) * (1 + state.storm * 0.14);
    const target = move.map((v) => v / len * speed);
    const response = 1 - Math.exp(-dt * (move[0] || move[1] || move[2] ? 6.5 : 3.5));
    for (let i = 0; i < 3; i++) state.velocity[i] += (target[i] - state.velocity[i]) * response;
    for (let i = 0; i < 3; i++) state.camera[i] += state.velocity[i] * dt;

    const ground = terrainHeightJS(state.camera[0], state.camera[2]);
    const minimum = ground + 2.1;
    if (state.camera[1] < minimum) {
      state.camera[1] += (minimum - state.camera[1]) * Math.min(1, dt * 8);
      state.velocity[1] = Math.max(0, state.velocity[1]);
    }
    state.camera[1] = Math.min(76, state.camera[1]);
  }

  function buildCameraBasis() {
    const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
    const forward = [sy * cp, sp, -cy * cp];
    const right = [cy, 0, sy];
    const up = [
      right[1] * forward[2] - right[2] * forward[1],
      right[2] * forward[0] - right[0] * forward[2],
      right[0] * forward[1] - right[1] * forward[0]
    ];
    return new Float32Array([
      right[0], right[1], right[2],
      up[0], up[1], up[2],
      forward[0], forward[1], forward[2]
    ]);
  }

  const anomalyCatalog = [
    ['MERIDIAN ORGANISM', 'Glassroot Choir', '공명 구조 분석 중 · 접근하면 표면 기억층이 드러납니다'],
    ['FLOATING SEED', 'Pale Transit Husk', '바람 벡터와 같은 위상으로 이동하는 생체 운반체'],
    ['ANCIENT MACHINE', 'Horizon Archive', '외피 아래 회전하는 중력 링과 손상된 금속 문양'],
    ['LITHIC COLONY', 'Verdant Suture', '지형 균열을 봉합하며 광물 성분을 재배열합니다']
  ];

  function updateHUD(dt) {
    const x = state.camera[0], y = state.camera[1], z = state.camera[2];
    state.field += (fieldAtJS(x, z) - state.field) * (1 - Math.exp(-dt * 1.8));
    const heading = ((state.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const direction = dirs[Math.round(heading / 45) % 8];
    dom.fieldValue.textContent = state.field.toFixed(2);
    dom.altValue.textContent = `${Math.max(0, y - terrainHeightJS(x, z)).toFixed(1)}m`;
    dom.vectorValue.textContent = `${direction} ${String(Math.round(heading)).padStart(3,'0')}°`;
    dom.coordX.textContent = `${x >= 0 ? '+' : ''}${x.toFixed(1).padStart(6,'0')}`;
    dom.coordZ.textContent = `${z >= 0 ? '+' : ''}${z.toFixed(1).padStart(6,'0')}`;
    dom.headingLabel.textContent = String(Math.round(heading)).padStart(3,'0');
    dom.compassTicks.style.transform = `translateX(calc(-50% + ${-heading * 3.333}px))`;

    const biomeIndex = Math.floor((state.field * 3.95 + (y > 24 ? 1 : 0))) % 4;
    dom.biomeName.textContent = ['VERDANT SHELF','GLASSROOT BASIN','HIGH AETHER','STORM SCAR'][biomeIndex];

    const cellX = Math.floor((x + 9) / 18), cellZ = Math.floor((z + 9) / 18);
    const anomalyIndex = Math.abs((cellX * 7 + cellZ * 13) % anomalyCatalog.length);
    const anomaly = anomalyCatalog[anomalyIndex];
    dom.anomalyIndex.textContent = String(Math.abs(cellX * 31 + cellZ * 17) % 99).padStart(2,'0');
    dom.anomalyType.textContent = anomaly[0];
    dom.anomalyName.textContent = anomaly[1];
    dom.anomalyDetail.textContent = anomaly[2];
    const scanProgress = (Math.sin(state.elapsed * 0.7 + x * 0.03) * 0.5 + 0.5) * 72 + 18;
    dom.scanProgress.style.width = `${scanProgress.toFixed(0)}%`;

    dom.fpsLabel.textContent = `${Math.round(state.fps)} FPS · ${Math.round(state.pixelRatio * 100)}%`;
    if (state.eventTimer > 0) {
      state.eventTimer -= dt;
      if (state.eventTimer <= 0) dom.eventBanner.classList.remove('show');
    }
  }

  function drawMotes(dt) {
    const w = state.width, h = state.height;
    mctx.clearRect(0, 0, w, h);
    if (!state.started) return;
    const countScale = reducedMotion ? 0.3 : 1;
    const field = state.field;
    const storm = state.storm;
    mctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < state.motes.length * countScale; i++) {
      const m = state.motes[i];
      m.y -= dt * (0.012 + m.drift * 0.018 + storm * 0.055);
      m.x += dt * (Math.sin(state.elapsed * 0.2 + m.phase) * 0.004 + storm * 0.018);
      if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      if (m.x > 1.05) m.x = -0.05;
      if (m.x < -0.05) m.x = 1.05;
      const parallaxX = (state.yaw * 22 * (0.3 + m.z)) % w;
      const parallaxY = state.pitch * 18 * (0.3 + m.z);
      const x = m.x * w - parallaxX;
      const y = m.y * h + parallaxY;
      const alpha = (0.08 + field * 0.17) * (0.35 + m.z * 0.65);
      const radius = m.size * (0.5 + m.z) * (1 + state.bloom * 0.45);
      mctx.beginPath();
      mctx.fillStyle = storm > 0.4 ? `rgba(185,179,255,${alpha})` : `rgba(174,255,220,${alpha})`;
      mctx.arc(x, y, radius, 0, Math.PI * 2);
      mctx.fill();
      if (m.z > 0.72 && !reducedMotion) {
        mctx.strokeStyle = storm > 0.4 ? `rgba(185,179,255,${alpha * .35})` : `rgba(174,255,220,${alpha * .35})`;
        mctx.lineWidth = 0.5;
        mctx.beginPath();
        mctx.moveTo(x, y);
        mctx.lineTo(x - state.velocity[0] * 0.4 - storm * 9, y + 4 + storm * 8);
        mctx.stroke();
      }
    }
    mctx.globalCompositeOperation = 'source-over';
  }

  function adaptQuality(now) {
    if (state.adaptationLocked || state.renderedFrames < 80 || captureRequested) return;
    if (now - state.lastAdaptationAt < 2200) return;
    state.lastAdaptationAt = now;
    if (state.frameTimeAverage > 22.5 && state.scale > 0.74) {
      state.scale = Math.max(0.72, state.scale - 0.06);
      resize();
    } else if (state.frameTimeAverage < 15.2 && state.scale < 0.98) {
      state.scale = Math.min(1, state.scale + 0.035);
      resize();
    }
  }
  state.lastAdaptationAt = performance.now();

  function render(now) {
    const rawDt = Math.min(0.05, Math.max(0.001, (now - state.lastFrame) / 1000));
    state.lastFrame = now;
    const dt = captureRequested ? 1 / 60 : rawDt;
    state.elapsed = captureRequested ? state.captureTime + state.renderedFrames / 60 : state.elapsed + dt;
    state.renderedFrames++;

    state.frameTimeAverage += ((rawDt * 1000) - state.frameTimeAverage) * 0.06;
    state.fps = 1000 / Math.max(1, state.frameTimeAverage);
    updateMovement(dt);
    state.bloom += (state.bloomTarget - state.bloom) * (1 - Math.exp(-dt * 1.25));
    state.storm += (state.stormTarget - state.storm) * (1 - Math.exp(-dt * 0.85));
    state.scan += (state.scanTarget - state.scan) * (1 - Math.exp(-dt * 4.2));
    state.pulse = Math.max(0, state.pulse - dt * 0.32);
    updateHUD(dt);
    updateAudio();
    drawMotes(dt);
    adaptQuality(now);

    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, state.elapsed);
    gl.uniform3f(uniforms.uCamera, state.camera[0], state.camera[1], state.camera[2]);
    gl.uniformMatrix3fv(uniforms.uCameraBasis, false, buildCameraBasis());
    gl.uniform1f(uniforms.uField, state.field);
    gl.uniform1f(uniforms.uBloom, state.bloom);
    gl.uniform1f(uniforms.uStorm, state.storm);
    gl.uniform1f(uniforms.uScan, state.scan);
    gl.uniform1f(uniforms.uPulse, state.pulse);
    gl.uniform1f(uniforms.uQuality, Math.max(0, Math.min(1, (state.pixelRatio - 0.72) / 0.28)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (state.renderedFrames === 8) {
      runtimeStatus.dataset.state = 'ready';
      runtimeStatus.textContent = 'ready';
      world.dataset.runtimeReady = 'true';
    }
    requestAnimationFrame(render);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && audio?.ctx?.state === 'running') audio.ctx.suspend();
    if (!document.hidden && state.started && audio?.ctx?.state === 'suspended') audio.ctx.resume();
  });

  window.__FORGE__ = {
    setCaptureMode(enabled, preset = 'presentation') {
      if (enabled) {
        state.adaptationLocked = true;
        state.captureTime = 41.25;
        state.camera = [8.5, 15.5, 26.0];
        state.yaw = 0.55;
        state.pitch = -0.11;
        state.bloomTarget = 0.72;
        state.bloom = 0.72;
        state.scanTarget = 0.62;
        state.scan = 0.62;
        document.body.classList.add('entered', 'scanning');
        setQuality(preset === 'presentation' ? 'presentation' : preset, false);
      }
    },
    reportFidelity() {
      const rect = canvas.getBoundingClientRect();
      return {
        renderer: 'raw WebGL2 procedural raymarch',
        cssSize: [Math.round(rect.width), Math.round(rect.height)],
        internalSize: [canvas.width, canvas.height],
        effectiveRatio: Math.min(canvas.width / Math.max(1, rect.width), canvas.height / Math.max(1, rect.height)),
        preset: state.qualityPreset,
        adaptationLocked: state.adaptationLocked,
        sceneSampling: state.pixelRatio,
        nativeInterface: true,
        pointerDirection: 'standard-x / standard-y',
        pointerLockDragParity: true,
        worldState: { field: state.field, bloom: state.bloom, storm: state.storm, scan: state.scan },
        ready: runtimeStatus.dataset.state === 'ready'
      };
    },
    report() { return this.reportFidelity(); }
  };

  setQuality(captureRequested ? 'presentation' : 'balanced', false);
  resize();
  requestAnimationFrame(render);
})();
