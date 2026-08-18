# Representation and stack selection

Choose by the information the user must perceive.

| Requirement | Strong default |
|---|---|
| crisp topology, labels, symbolic constraints | SVG/DOM |
| dense 2D flow, heat, particles, painterly image-space composition | Canvas 2D |
| true occlusion, spatial inspection, materials, shadows, volumetric cues | Three.js/WebGL |
| readable dashboard plus spatial scene | DOM + Canvas/WebGL |
| parametric 3D authoring with native inspectors | DOM/SVG + Three.js/WebGL |
| dense linked plots and tabular inspection | DOM/SVG/Canvas hybrid |
| custom GPU solver with established renderer capital | raw WebGL |
| cancellable CPU solver | Worker, optionally backed by WASM |
| large parallel numerical kernels (e.g. real-time FFT ocean/fluid synthesis) | WebGPU compute with a declared fallback, or a declared WebGPU-only requirement when no fallback is acceptable |
| durable or protected long-running jobs | server job plus streamed progress |

## Ceiling questions

A stack is too weak when it forces the implementation to fake the defining feature. Examples:

- a spatial inspection scene where zoom and labels replace new geometry;
- named materials whose only difference is color;
- a volumetric world represented as flat layered sprites without a deliberate 2D art thesis;
- major events that cannot alter topology or silhouette because the renderer has no representation for them.

A stack is unnecessarily heavy when its capabilities do not improve the intended perception, correctness, authoring workflow, or compute boundary.

Choose renderer, compute engine, document store, and product framework separately. Three.js does not provide undo/redo or a parameter graph; React does not validate geometry; a fast solver does not keep the main thread responsive by itself.

Do not treat engine adoption as an upgrade by itself. A compact raw-WebGL implementation with established shaders, geometry generation, post, input, and diagnostics may have a more distinctive ceiling than a generic engine scene. Conversely, a larger engine bundle may render more efficiently through instancing, culling, and mature resource handling. Judge download footprint and render cost separately.

## Raw WebGL

Select raw WebGL only when the implementation owns the needed capital: scene/camera transforms, depth and culling, materials, lighting/contact, render targets/post, picking, disposal, diagnostics, and resize/context-loss handling.

When most of that capital already exists, extend and harden it before rewriting merely for convenience.

## v0.7 — authoring and provider boundaries

Select the **authoring strategy** independently from renderer and compute boundary: `authored`, `procedural`, `reconstructed`, `generative`, `retrieved`, or `hybrid`.

Before choosing a vendor or model, write the capability requirement. Examples:

- image-generation capability;
- segmentation capability;
- reference-driven 3D reconstruction;
- procedural geometry/code generation;
- DCC scripting;
- asset retrieval;
- real-time browser renderer.

Blender, Hunyuan, GPT Image, img2threejs, or other systems may satisfy those capabilities, but no v0.7 core schema or audit should require a specific provider.

### Authority boundary

Ask explicitly:

1. What must remain canonical and editable?
2. Which generated or reconstructed outputs are only proposals?
3. What needs deterministic placement, scale, collision, or support reconciliation?
4. What requires component hierarchy, pivots, sockets, or articulation?
5. What fallback remains if an external provider is unavailable or low quality?

When `hybrid` is selected, route asset classes by salience, repetition, interaction importance, editability, reference fidelity, authoring cost, and runtime cost. Read `asset-authoring.md`.
