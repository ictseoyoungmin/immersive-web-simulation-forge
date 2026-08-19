# Interface fidelity and input conventions

Use this reference when visible functional UI or navigation/input materially affects the product experience. A nearly UI-free immersive scene does not need decorative chrome merely to satisfy an interface checklist.

## Icon system

When a showcase/flagship surface contains repeatedly visible functional icons, use one coherent authored system: inline SVG/sprite, icon font, authored canvas paths, or a consistent atlas. Keep a common grid/stroke language and accessible labels.

Do not use miscellaneous emoji/Unicode glyphs as final functional icons unless the product deliberately uses a terminal/notation/typographic visual language. A one-off textual control does not require manufacturing an elaborate icon family.

## Microdetail hierarchy

Review consequential UI at actual size. Keep text/icons/reticles native-resolution or deliberately reconstructed; maintain legible focus and hit targets; avoid a premium sharp HUD over an unintentionally under-sampled world.

## Pointer look: semantic direction, not Euler-sign folklore

The user-facing contract is semantic:

- moving/dragging right turns the **view** right;
- moving/dragging left turns the view left;
- moving/dragging up looks up;
- moving/dragging down looks down.

Do not infer correctness from `yaw += dx` or `yaw -= dx` alone. Renderer/engine Euler conventions differ; Three.js camera Euler Y sign, a custom look-at basis, and other engines may map semantic right-turn to different numeric signs.

`kits/input/pointer-look.mjs` stores a semantic positive-right yaw and exposes an explicit renderer adapter helper. Test the actual camera/view basis or an observable bearing, not the raw yaw sign.

Pointer-lock and drag fallback must preserve the same semantic direction and sensitivity. Inversion settings are a product option, not a universal requirement. Provide them when exploration/game UX or the user request benefits; do not add settings UI solely to satisfy the skill.

## WASD / locomotion contract

For traversable camera/player experiences, declare:

- whether locomotion is enabled;
- movement frame: usually `camera-planar`, sometimes `world` or another explicit frame;
- W/S/A/D semantics;
- planar up axis;
- diagonal normalization policy;
- player/support grounding policy when the actor is ground-bound.

Recommended default:

- `W` = forward relative to current planar camera/view forward;
- `S` = backward;
- `A` = left;
- `D` = right;
- W+D must not move `sqrt(2)` times faster unless that is deliberately designed.

Use `kits/input/locomotion.mjs` to derive movement from the actual forward basis instead of reconstructing direction from a remembered yaw-sign formula.

For runtime verification expose `window.__FORGE__.getInputProbeState()` returning at least `position`, `forward`, and `right`; optionally `grounded` or `supportDistance`. Run `scripts/input_audit.mjs` for traversable showcase/flagship work.

## Player/camera grounding

Treat the observer/player as a spatial entity when ground-bound. Validate spawn support, collider/capsule clearance, step height, walkable slope, ground snapping/gravity policy, headroom, and camera-wall/ground clipping as applicable.

A ground-bound player should not slowly drift above terrain after movement, and a camera should not pass through geometry simply because WASD signs are correct.

## HUD/world consistency

The HUD can be sharper than the world because it acts as an optical instrument, but the contrast should be intentional. Raise world clarity when a highly refined HUD makes renderer shortcuts conspicuous.
