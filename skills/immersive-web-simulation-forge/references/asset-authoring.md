# Asset authoring strategy

Use this reference when one or more 3D assets materially affect identity, interaction, editability, or reference fidelity. Do not force every repeated prop through a hero-asset workflow.

## Choose an authoring strategy explicitly

Supported strategies: `authored`, `procedural`, `reconstructed`, `generative`, `retrieved`, or `hybrid`. Choose independently from renderer/profile/compute boundary.

## Asset Router

Route classes using visual salience, camera proximity, uniqueness/repetition, interaction/physics importance, component hierarchy, editability/reuse, reference fidelity, authoring cost, and runtime cost.

A realistic invented city can be reality-grounded without being reference-driven. Reserve strict reference reconstruction for subjects whose specific identity matters.

## Spec before geometry

For reference-critical assets, create a lightweight ObjectSpec before polish. Record identity/silhouette cues, proportions/anchor dimensions, component hierarchy, material regions, attachments/articulation, pivots/sockets, collider/support surfaces, interaction surfaces, and critical evidence views.

## Reference evidence pipeline

`reference → probe/evidence extraction → pre-spec → ObjectSpec → blockout → structure → form → material → surface → runtime semantics → optimization`

After consequential passes, capture evidence and route defects to spec vs implementation.

## Pass locking

Use applicable passes: blockout/silhouette → structure → proportion/form → material regions → surface/detail → lighting robustness → interaction semantics → optimization. Downstream polish cannot certify an upstream failure.

## Runtime semantics are part of the asset

When relevant preserve stable component IDs, hierarchy, pivots/joints, sockets, collision proxies, support surfaces, destruction/variant groups, and gameplay/simulation semantic tags.

## Generated and reconstructed assets

Treat model output as a proposal. Validate scale/orientation, silhouette, topology relevant to use, material identity, component separability, support/contact, collision/navigation footprint, provenance, and regeneration path.

When a reference image/footprint is available, calibrate projected scale before support reconciliation. Use symmetric error tolerance by default; asymmetric tolerance requires project-specific evidence or a reason one error direction is materially worse. See `spatial-reconciliation.md`.

Do not assume the model origin is a support point. Resolve an explicit support anchor/socket/probe set before placement.

## Provider-neutral capability contract

Ask for capabilities before vendors. Blender, Hunyuan, GPT Image, img2threejs, or other providers may satisfy them, but none is a core dependency.

## Flagship enforcement

When object fidelity materially contributes to flagship identity, complete the `asset_fidelity` contract, expose runtime evidence, visually inspect the captures, and run `asset_fidelity_audit.mjs`. A structural audit is necessary but cannot replace looking at the rendered result.
