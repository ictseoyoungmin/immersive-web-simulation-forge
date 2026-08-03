# Parametric and graphical design tools

Read this reference for 2D/3D configurators, CAD-like editors, vehicle or product design studios, scene editors, procedural modeling tools, and high-level graphical authoring products.

## Declare the product claim

Distinguish:

- a visual configurator that explores appearance;
- a parametric concept designer that preserves controlled geometry relationships;
- an engineering design tool that claims manufacturable or physically valid output.

A helicopter concept studio may offer rotor diameter, fuselage length, cabin, landing gear, material, lighting, exploded view, and GLB/PNG/JSON export without claiming aerodynamic or structural validity. Engineering claims require specialist models and the physics validation contract.

## Document and parameter model

Keep an authoritative versioned document separate from Three.js objects or DOM controls. Record:

- schema version, coordinate system, units, and asset references;
- stable object IDs and parent/assembly relationships;
- parameters with ranges, units, defaults, and constraints;
- derived parameters and dependency order;
- invalid, warning, and unresolved states;
- migration and round-trip behavior.

Render from the document. Do not treat scene-graph mutations as the only source of truth.

## Core authoring loop

Use:

`select/create → modify → validate → compare → save/export`

The first usable state should include a valid model or template. Every edit must yield immediate visual feedback, an undoable transaction, and legible validation feedback.

## Interaction contract

When relevant provide:

- deterministic picking and explicit selection state;
- local/world transform modes, axis constraints, and numeric entry;
- snapping with visible increments and temporary override;
- camera orbit/pan/zoom that never steals an active edit;
- hover, selected, invalid, locked, and hidden states;
- section, exploded, orthographic, perspective, and detail views;
- measurements with units and stable anchors;
- keyboard discoverability and accessible non-pointer alternatives.

Commit one history entry per meaningful gesture, not per pointermove. Cancel restores the pre-gesture state.

## Geometry and export validation

Choose checks appropriate to the claim: finite coordinates, valid indices, normals, winding, degenerates, non-manifold edges, self-intersections, clearances, bounds, parameter constraints, and assembly interference.

Test every promised export format with a round trip or an independent reader. Preserve units, axes, IDs, and parameter metadata when the format supports them. Label lossy exports.

## Comparison and persistence

Support named variants rather than forcing screenshots as memory. Record the parameter delta, validation state, thumbnail/viewpoint, and timestamp. Provide undo/redo, dirty state, autosave or explicit save, schema migration, import error recovery, and deterministic serialization.
