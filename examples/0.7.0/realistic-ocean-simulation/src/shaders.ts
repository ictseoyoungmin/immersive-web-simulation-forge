export const oceanVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSwellAmplitude;
  uniform float uSwellPeriod;
  uniform float uWindEnergy;
  uniform vec2 uSwellDirection;
  uniform vec2 uWindDirection;
  uniform vec2 uCurrent;
  uniform float uGustDrive;
  uniform float uGustTrace;
  uniform float uGustAge;
  uniform vec2 uGustOrigin;
  uniform float uSeed;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vCrest;
  varying float vCurvature;
  varying float vHeight;
  varying vec2 vFlowCoord;

  const float G = 9.81;

  mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  void spectralWave(
    inout vec3 displaced,
    inout vec2 gradient,
    inout float curvature,
    vec2 direction,
    float k,
    float amplitude,
    float phaseOffset,
    float chop
  ) {
    float omega = sqrt(G * k);
    float phase = k * dot(direction, position.xz) - omega * uTime + phaseOffset + uSeed * 0.00017;
    float s = sin(phase);
    float c = cos(phase);
    displaced.y += amplitude * s;
    displaced.xz += direction * (amplitude * chop * c);
    gradient += direction * (amplitude * k * c);
    curvature += max(0.0, s) * amplitude * k * k;
  }

  void main() {
    vec3 displaced = position;
    vec2 gradient = vec2(0.0);
    float curvature = 0.0;

    vec2 sd = normalize(uSwellDirection);
    vec2 wd = normalize(uWindDirection);
    float a = uSwellAmplitude;
    float wind = clamp(uWindEnergy, 0.0, 3.2);
    float periodScale = pow(13.4 / max(uSwellPeriod, 4.0), 2.0);

    // Four physically dispersed directional bands form one compact spectral cascade.
    spectralWave(displaced, gradient, curvature, rotate2d(-0.08) * sd, 0.043 * periodScale, a * 0.36, 0.3, 0.72);
    spectralWave(displaced, gradient, curvature, rotate2d( 0.05) * sd, 0.061 * periodScale, a * 0.28, 2.1, 0.68);
    spectralWave(displaced, gradient, curvature, rotate2d( 0.13) * sd, 0.088 * periodScale, a * 0.18, 4.4, 0.62);

    float windBase = 0.12 + wind * 0.16;
    spectralWave(displaced, gradient, curvature, rotate2d(-0.30) * wd, 0.15, windBase * 0.44, 1.2, 0.56);
    spectralWave(displaced, gradient, curvature, rotate2d( 0.18) * wd, 0.23, windBase * 0.30, 3.3, 0.50);
    spectralWave(displaced, gradient, curvature, rotate2d(-0.16) * wd, 0.36, windBase * 0.21, 5.4, 0.44);
    // Sub-mesh-scale capillary bands belong in the fragment normal. Displacing them here
    // would undersample their wavelength and reveal the ocean triangulation near camera.

    vec2 gustCenter = uGustOrigin + uCurrent * uGustAge * 4.0;
    vec2 gustDelta = position.xz - gustCenter;
    float gustDistance = length(gustDelta);
    float gustRing = exp(-pow((gustDistance - uGustAge * 32.0) / 36.0, 2.0));
    float gustPhase = gustDistance * 0.19 - uTime * 4.1;
    float gustWave = gustRing * uGustDrive * 0.42;
    displaced.y += gustWave * sin(gustPhase);
    gradient += normalize(gustDelta + vec2(0.0001)) * gustWave * 0.19 * cos(gustPhase);
    curvature += gustRing * (uGustDrive * 0.2 + uGustTrace * 0.12);

    vec3 objectNormal = normalize(vec3(-gradient.x, 1.0, -gradient.y));
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
    vHeight = displaced.y;
    vCurvature = curvature;
    float steepness = length(gradient);
    vCrest = smoothstep(0.25, 0.72, steepness + curvature * 12.0 + max(displaced.y, 0.0) * 0.035);
    vFlowCoord = displaced.xz - uCurrent * uTime * 9.0;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const oceanFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uWindEnergy;
  uniform float uStorm;
  uniform float uCloud;
  uniform float uRoughness;
  uniform float uClarity;
  uniform vec3 uAbsorption;
  uniform vec3 uScatter;
  uniform vec3 uSunDirection;
  uniform vec2 uWindDirection;
  uniform vec2 uCurrent;
  uniform float uGustDrive;
  uniform float uGustTrace;
  uniform float uGustAge;
  uniform vec2 uGustOrigin;
  uniform vec3 uCameraPosition;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vCrest;
  varying float vCurvature;
  varying float vHeight;
  varying vec2 vFlowCoord;

  const float PI = 3.14159265359;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = turn * p * 2.03 + 7.1;
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 analyticSky(vec3 direction) {
    float up = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    float horizon = pow(1.0 - abs(direction.y), 5.0);
    vec3 zenith = mix(vec3(0.045, 0.10, 0.14), vec3(0.075, 0.24, 0.37), 1.0 - uStorm);
    vec3 lower = mix(vec3(0.28, 0.46, 0.54), vec3(0.72, 0.49, 0.29), max(0.0, uSunDirection.y) * (1.0 - uStorm));
    vec3 sky = mix(lower, zenith, pow(up, 0.52));
    float sunAlignment = max(dot(direction, normalize(uSunDirection)), 0.0);
    sky += vec3(1.0, 0.63, 0.29) * pow(sunAlignment, 42.0) * (1.0 - uCloud * 0.55) * 2.0;
    sky += vec3(0.55, 0.66, 0.68) * horizon * 0.2;
    return sky;
  }

  void main() {
    vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
    float distanceToCamera = length(uCameraPosition - vWorldPosition);

    // Stable analytic normal plus sub-centimetre capillary response in the material band.
    vec2 capillaryCoord = vWorldPosition.xz * (0.32 + uWindEnergy * 0.025);
    float capillaryA = fbm(capillaryCoord + vec2(uTime * 0.12, -uTime * 0.08));
    float capillaryB = fbm(capillaryCoord * 1.73 - vec2(uTime * 0.08, uTime * 0.11));
    vec2 windDirection = length(uWindDirection) > 0.001 ? normalize(uWindDirection) : vec2(0.82, -0.57);
    vec2 crossWind = vec2(-windDirection.y, windDirection.x);
    float shortA = sin(dot(vWorldPosition.xz, windDirection) * 1.28 - uTime * 2.35);
    float shortB = sin(dot(vWorldPosition.xz, crossWind) * 1.91 - uTime * 3.1 + shortA * 0.35);
    vec2 shortNormal = windDirection * shortA + crossWind * shortB * 0.55;
    float microStrength = clamp(0.010 + uWindEnergy * 0.010, 0.010, 0.032);
    vec3 normal = normalize(
      vWorldNormal +
      vec3(shortNormal.x, 0.0, shortNormal.y) * microStrength * 0.24 +
      vec3(capillaryA - 0.5, 0.0, capillaryB - 0.5) * microStrength * 1.25
    );

    float NoV = clamp(dot(normal, viewDirection), 0.0, 1.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - NoV, 5.0);
    vec3 reflectedDirection = reflect(-viewDirection, normal);
    vec3 reflectedSky = analyticSky(reflectedDirection);

    float opticalPath = mix(uClarity * 0.28, uClarity * 1.4, NoV);
    vec3 transmission = exp(-uAbsorption * opticalPath);
    vec3 body = vec3(0.004, 0.035, 0.052) + uScatter * (0.30 + 0.34 * max(normal.y, 0.0));
    body += transmission * vec3(0.004, 0.042, 0.058);
    body *= mix(1.0, 0.58, uStorm);

    vec3 sunDirection = normalize(uSunDirection);
    vec3 halfDirection = normalize(viewDirection + sunDirection);
    float rough = clamp(uRoughness + uStorm * 0.18, 0.08, 0.78);
    float sunSpec = pow(max(dot(normal, halfDirection), 0.0), mix(620.0, 38.0, rough));
    float glitterNoise = smoothstep(0.46, 0.88, fbm(vWorldPosition.xz * 0.15 + vec2(uTime * 0.18, 0.0)) + vCrest * 0.25);
    vec3 glitter = vec3(1.0, 0.62, 0.28) * sunSpec * (2.2 + glitterNoise * 4.8) * (1.0 - uStorm * 0.45);

    vec2 currentDirection = length(uCurrent) > 0.001 ? normalize(uCurrent) : vec2(1.0, 0.0);
    vec2 crossCurrent = vec2(-currentDirection.y, currentDirection.x);
    float along = dot(vFlowCoord, currentDirection);
    float across = dot(vFlowCoord, crossCurrent);
    float advectedFilament = fbm(vec2(along * 0.09, across * 0.022 + sin(along * 0.018) * 0.8));
    float brokenFilament = smoothstep(0.68, 0.88, advectedFilament) * smoothstep(0.58, 0.94, vCrest + vCurvature * 7.0);

    vec2 gustCenter = uGustOrigin + uCurrent * uGustAge * 4.0;
    float gustDistance = length(vWorldPosition.xz - gustCenter);
    float traceRing = exp(-pow((gustDistance - uGustAge * 32.0) / 43.0, 2.0));
    float traceTexture = smoothstep(0.42, 0.8, fbm(vWorldPosition.xz * 0.11 - uCurrent * uTime * 2.0));
    float persistentTrace = traceRing * traceTexture * uGustTrace;

    float crestFoam = smoothstep(0.72, 0.98, vCrest + vCurvature * 5.5);
    float foam = clamp(crestFoam * (0.34 + brokenFilament * 0.48) + persistentTrace * 0.52, 0.0, 1.0);
    foam *= smoothstep(0.24, 0.92, uWindEnergy) * 0.72 + uGustDrive * 0.18;
    vec3 foamColor = mix(vec3(0.52, 0.67, 0.66), vec3(0.93, 0.97, 0.91), NoV * 0.5 + 0.42);

    reflectedSky *= vec3(0.82, 0.92, 0.98);
    vec3 color = mix(body, reflectedSky, fresnel * 0.82 + 0.055);
    color += glitter;
    color = mix(color, foamColor, clamp(foam, 0.0, 0.93));

    float horizonHaze = smoothstep(350.0, 1050.0, distanceToCamera);
    vec3 haze = mix(vec3(0.25, 0.39, 0.41), vec3(0.31, 0.32, 0.32), uStorm);
    color = mix(color, haze, horizonHaze * 0.54);

    // Subtle distance-safe contrast: near water stays tactile while the horizon remains atmospheric.
    color *= 0.94 + 0.13 * smoothstep(-1.5, 2.4, vHeight);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const skyVertexShader = /* glsl */ `
  precision highp float;
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
    gl_Position.z = gl_Position.w;
  }
`;

export const skyFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uCloud;
  uniform float uStorm;
  uniform float uGustDrive;
  uniform float uGustTrace;
  uniform vec2 uWindDirection;
  uniform vec3 uSunDirection;
  varying vec3 vDirection;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float cloudFbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.54;
    for (int i = 0; i < 5; i++) {
      value += noise3(p) * amplitude;
      p = p * 2.01 + vec3(7.2, 3.7, 5.1);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 ray = normalize(vDirection);
    float altitude = clamp(ray.y * 0.5 + 0.5, 0.0, 1.0);
    float horizon = pow(1.0 - abs(ray.y), 6.0);
    float sunElevation = clamp(uSunDirection.y, 0.0, 1.0);

    vec3 zenithClear = vec3(0.045, 0.16, 0.27);
    vec3 zenithStorm = vec3(0.025, 0.044, 0.055);
    vec3 horizonWarm = vec3(0.68, 0.48, 0.28);
    vec3 horizonCool = vec3(0.34, 0.51, 0.59);
    vec3 zenith = mix(zenithClear, zenithStorm, uStorm);
    vec3 horizonColor = mix(horizonWarm, horizonCool, uStorm * 0.82 + uCloud * 0.12);
    vec3 color = mix(horizonColor, zenith, pow(altitude, 0.55));

    float rayleigh = pow(max(ray.y, 0.0), 0.45);
    color += vec3(0.045, 0.12, 0.17) * rayleigh * (1.0 - uStorm);
    color += vec3(0.68, 0.72, 0.67) * horizon * (0.16 + uCloud * 0.16);

    float sunDot = max(dot(ray, normalize(uSunDirection)), 0.0);
    float sunDisk = smoothstep(0.99968, 0.99988, sunDot);
    float glare = pow(sunDot, 56.0) * (1.0 - uCloud * 0.48);
    color += vec3(1.0, 0.55, 0.22) * glare * 1.7;
    color += mix(vec3(1.0, 0.68, 0.3), vec3(0.88, 0.88, 0.78), sunElevation) * sunDisk * 7.0 * (1.0 - uCloud * 0.62);

    // Spherical weather front: broad coherent layers with finer internal billows.
    vec3 cloudPoint = ray * (2.8 + max(ray.y, 0.0) * 1.5);
    cloudPoint.xz += vec2(uWindDirection.x, uWindDirection.y) * uTime * 0.012;
    float broad = cloudFbm(cloudPoint * vec3(0.7, 1.7, 0.7));
    float detail = cloudFbm(cloudPoint * vec3(2.0, 3.0, 2.0) + 9.0);
    float cloudMask = smoothstep(0.56 - uCloud * 0.24, 0.78, broad * 0.72 + detail * 0.28);
    cloudMask *= smoothstep(-0.08, 0.22, ray.y) * (1.0 - smoothstep(0.66, 0.97, ray.y));
    float front = smoothstep(-0.72, 0.38, ray.x + ray.z * 0.28 + sin(uTime * 0.015) * 0.08);
    cloudMask *= mix(0.52, 1.35, front * (0.45 + uStorm * 0.55));
    cloudMask = clamp(cloudMask + uGustDrive * 0.08 * front, 0.0, 1.0);
    vec3 cloudLit = mix(vec3(0.60, 0.66, 0.66), vec3(0.25, 0.30, 0.31), uStorm);
    cloudLit += vec3(0.34, 0.18, 0.07) * pow(sunDot, 5.0) * (1.0 - uStorm);
    color = mix(color, cloudLit, cloudMask * (0.30 + uCloud * 0.38));

    float gustGlow = uGustTrace * exp(-pow((ray.x + 0.14 - sin(uTime * 0.025) * 0.1) / 0.17, 2.0)) * horizon;
    color += vec3(0.64, 0.78, 0.77) * gustGlow * 0.32;
    color *= 1.0 - uGustDrive * 0.05 * front;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const sprayVertexShader = /* glsl */ `
  precision highp float;
  attribute float aLife;
  attribute float aSize;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPixelRatio * clamp(180.0 / -viewPosition.z, 0.55, 3.2);
    vAlpha = sin(clamp(aLife, 0.0, 1.0) * 3.14159265);
  }
`;

export const sprayFragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float radius = length(p);
    float core = smoothstep(0.48, 0.04, radius);
    float sparkle = smoothstep(0.2, 0.0, radius);
    vec3 color = mix(vec3(0.55, 0.75, 0.78), vec3(0.98, 1.0, 0.94), sparkle);
    gl_FragColor = vec4(color, core * vAlpha * 0.26);
  }
`;

export const beamVertexShader = /* glsl */ `
  precision highp float;
  varying float vAlong;
  varying float vEdge;
  void main() {
    vAlong = uv.y;
    vEdge = abs(uv.x - 0.5) * 2.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const beamFragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlong;
  varying float vEdge;
  uniform float uOpacity;
  void main() {
    float axial = pow(1.0 - vAlong, 1.2) * smoothstep(1.0, 0.15, vEdge);
    gl_FragColor = vec4(1.0, 0.78, 0.38, axial * uOpacity);
  }
`;
