# Perceptual fidelity and clarity

A scene can have strong composition and sophisticated systems yet still look low-resolution. Treat clarity as a separate engineering and art-direction axis.

## The four resolutions

Track these independently:

1. **CSS resolution** — the visible panel/window size.
2. **output resolution** — the actual canvas/backbuffer size.
3. **scene resolution** — the expensive world pass or simulation buffer.
4. **micro-interface resolution** — text, icons, hairlines, reticles, and small charts.

A low-resolution scene may be reconstructed into a native-resolution output, while DOM/SVG interface elements remain native. Never confuse a large exported screenshot with a high-resolution render; an image can be 1440×900 while containing a 690×430 scene enlarged by CSS.

## Fidelity contract

For showcase and flagship work, record:

- default effective scene pixel ratio;
- presentation/capture ratio;
- adaptive minimum and maximum;
- reconstruction method, if any;
- which effects run in scene space versus native output space;
- whether visual capture locks quality;
- internal and CSS size of representative screenshots.

### Effective pixel ratio

`effective ratio = internal scene width / CSS width`

Use the same calculation vertically and take the smaller value. On a DPR 1 display, `0.66` means a 1440×900 canvas is effectively rendered near 950×594 and enlarged. On a slow validation renderer, adaptive scaling may reduce it further.

Flagship defaults:

- presentation tier: near-native (`>= 0.95`) unless a reviewed reconstruction pass is used;
- adaptive ceiling: near-native must be reachable;
- balanced default: normally `>= 0.85`, or reconstructed;
- UI/text/icons: native output resolution.

These are defaults, not a universal art law. Pixel art, deliberate lo-fi rendering, temporal accumulation, path tracing, and painterly image-space work can use different ratios when the softness is intentional, documented, and visually reviewed at target size.

## Separate visual capture from performance adaptation

Do not allow a slow headless/software renderer to lower quality before the representative screenshot is captured.

Use two independent modes:

- **presentation capture**: fixed quality preset, deterministic state, adaptation disabled, waits for convergence;
- **performance measurement**: adaptation enabled, representative target hardware required, no claim based on llvmpipe/SwiftShader/software-only FPS.

A `test=1` route must not silently select low visual quality when it is also used for screenshots. Prefer `forgeCapture=1` or a runtime API such as:

```js
window.__FORGE__ = {
  setCaptureMode(enabled, preset),
  reportFidelity()
};
```

## Reconstruction and frequency partitioning

When the scene pass is below native resolution:

- resolve into a native-resolution output framebuffer;
- use a reviewed spatial or temporal reconstruction/sharpen pass;
- apply grain, scanlines, thin outlines, chromatic detail, and UI after upscaling;
- reduce unresolved high-frequency procedural noise in the low-resolution pass;
- preserve stable silhouettes and contact edges before adding post effects.

Generating fine grain inside a 0.5-scale scene and then stretching it does not add detail; it creates blur and block texture.

## Clarity is not oversharpening

Improve clarity in this order:

1. adequate scene sampling;
2. stable geometry/SDF distance and normals;
3. material separation and contact cues;
4. atmospheric depth that does not flatten the focal subject;
5. controlled reconstruction;
6. restrained sharpening.

Do not use sharpening to compensate for unstable ray marching, insufficient steps, noisy normals, or over-dense fog.

## Ray-marched and procedural worlds

For fullscreen ray marching:

- expose separate scene scale and step-quality controls;
- use distance-aware epsilon and normal sampling without erasing close detail;
- reserve more steps for silhouette/focal regions if possible;
- avoid adding full-frequency FBM, grain, and scanlines before the resolve stage;
- provide a presentation tier that reaches native output or demonstrably reconstructs it;
- record the exact internal resolution and step count used by the preview.

## Target-size review

Inspect at 100% browser zoom and target CSS size. Review:

- hero silhouette edges;
- near material microstructure;
- distant landmark separation;
- contact shadows and water/terrain boundaries;
- text/icon hairlines;
- motion stability while turning the camera.

A thumbnail can hide softness. A high-resolution PNG can also hide the fact that the scene was internally low-resolution.

For performance evidence, read `measurement-integrity.md`. Fidelity capture and wall-clock performance measurement are separate runs; neither application-reported FPS nor a software-renderer screenshot proves target-device performance.
