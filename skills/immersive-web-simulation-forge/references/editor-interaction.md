# Editor interaction and document UX

Read this reference when the product creates or edits persistent user work.

## State layers

Keep these distinct:

1. document state — saved, shareable user intent;
2. derived state — geometry, simulation, caches, plots, and validation;
3. interaction state — hover, selection, open gesture, camera, and focus;
4. view state — panels, filters, visibility, and viewport layout;
5. history state — committed document transitions.

Only document transitions belong in undo history by default. Do not serialize GPU resources, transient DOM nodes, or circular scene objects.

## Transaction rules

- begin with a snapshot or reversible command;
- update preview state during a gesture;
- commit one labeled entry on success;
- restore the starting state on cancel;
- clear or migrate redo deterministically after a divergent edit;
- coalesce keyboard repeats and text entry deliberately.

Expose dirty state and save completion. Never imply that autosave succeeded before durable storage confirms it.

## Selection, focus, and tools

Use one authoritative selection model shared by viewport, tree, properties, and validation panels. Tool changes must not silently discard edits. Keep camera navigation available without ambiguous competition with transforms.

Provide visible focus, keyboard traversal, numeric entry, and an escape path from modal tools. Use authored icons plus labels or tooltips for unfamiliar operations.

## Failure and recovery

Design explicit states for invalid imports, unsupported versions, missing assets, failed saves, solver errors, and partial exports. Preserve the last valid document and offer retry, repair, or read-only recovery when possible.

## Responsive composition

Preserve the viewport and current task first. Collapse secondary inspectors into drawers or tabs, maintain a usable properties width, and avoid uniformly shrinking toolbars and type. Test pointer, keyboard, high-DPI, and compact layouts separately.
