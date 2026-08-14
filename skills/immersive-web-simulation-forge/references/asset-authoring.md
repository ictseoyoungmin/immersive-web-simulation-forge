# Asset authoring strategy

Use this reference when one or more 3D assets materially affect identity, interaction, editability, or reference fidelity. Do not force every repeated prop through a hero-asset workflow.

## Contents

- Strategy selection and Asset Router
- ObjectSpec and reference pipeline
- Pass locking and runtime semantics
- Generated/reconstructed validation
- Provider-neutral flagship enforcement

## Choose an authoring strategy explicitly

Supported strategies are:

- `authored` — manually or code-authored from an explicit design;
- `procedural` — generated from deterministic parameters/rules;
- `reconstructed` — recovered from image, scan, depth, or multi-view evidence;
- `generative` — produced by an image/3D generative model;
- `retrieved` — selected from an existing asset source/library;
- `hybrid` — asset classes route to different strategies.

Choose independently from renderer, product profile, and compute boundary.

## Asset Router

Route asset classes using consequential criteria rather than novelty:

- visual salience and camera proximity;
- uniqueness and repetition count;
- interaction/physics importance;
- need for explicit component hierarchy;
- editability and reuse requirements;
- reference fidelity;
- generation/reconstruction cost;
- runtime geometry/material cost.

A typical world may use reference-driven procedural construction for a hero castle, generated or reconstructed families for ordinary architecture, procedural instancing for vegetation, and simplified terrain silhouettes for far background.

## Spec before geometry

For reference-critical assets, create an `ObjectSpec` before polishing geometry. At minimum record:

- identity and critical silhouette cues;
- proportions and anchor dimensions;
- component hierarchy;
- material regions;
- attachments and articulation intent;
- pivots and sockets;
- collider/support surfaces;
- interaction surfaces;
- critical evidence views.

The spec may be lightweight. Its purpose is to stop surface detail from hiding structural mistakes.

## Reference evidence pipeline

A robust sequence is:

`reference → probe/evidence extraction → pre-spec → ObjectSpec → blockout → structure → form → material → surface → runtime semantics → optimization`

After each consequential pass, capture evidence and decide whether the defect belongs to the spec or implementation.

## Pass locking

Do not allow downstream polish to certify an upstream failure. A useful asset sequence is:

1. blockout / silhouette;
2. structural decomposition;
3. proportion and form;
4. material-region assignment;
5. surface/detail;
6. lighting robustness;
7. interaction semantics;
8. optimization.

Mark each as `pass`, `fail`, or `not-applicable`. If a structural pass fails, material polish may continue experimentally but must not be recorded as final evidence.

## Runtime semantics are part of the asset

An explicit mesh is not necessarily an editable executable object. When relevant, preserve:

- stable component IDs;
- parent/child hierarchy;
- pivots and joint axes;
- named sockets;
- collision proxies;
- support surfaces;
- destruction/variant groups;
- semantic tags used by gameplay or simulation.

## Generated and reconstructed assets

Treat model output as a proposal. Validate:

- scale and orientation — when a reference image/footprint is available, calibrate scale by matching projected footprint ratio with an asymmetric tolerance (penalize oversizing more than slight undersizing) rather than accepting the generator's raw output scale; see `references/spatial-reconciliation.md#image-space-scale-calibration`;
- silhouette from multiple views;
- topology/mesh defects relevant to use;
- material identity and region boundaries;
- component separability;
- contact/support geometry;
- collision and navigation footprint;
- provenance and regeneration path.

If a generated mesh cannot expose required part hierarchy or articulation, choose another representation rather than pretending the requirement is met.

## Provider-neutral capability contract

Core planning should ask for capabilities such as image generation, segmentation, 3D reconstruction, DCC scripting, procedural geometry, or asset retrieval. Blender, Hunyuan, GPT Image, img2threejs, or any other provider are examples, not hard dependencies.

## v0.7 flagship enforcement

For flagship spatial work, this strategy is no longer satisfied by planning declarations alone. Complete `asset_fidelity` in the v6 plan, expose runtime evidence, and pass `scripts/asset_fidelity_audit.mjs`. See `asset-fidelity-gates.md`. A runtime hero region dominated by primitive placeholders is an `ASSET`/`REPRESENTATION` failure even when Asset Router routing was documented correctly.
