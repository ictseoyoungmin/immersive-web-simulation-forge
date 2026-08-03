# Interface fidelity and input conventions

Simulation quality is judged as one surface. A sophisticated world paired with placeholder icons or inconsistent controls loses credibility immediately.

## Icon system

For showcase and flagship surfaces, visible functional icons should come from one authored system:

- inline SVG, SVG sprite, icon font, authored canvas paths, or a consistent image atlas;
- common viewBox/grid, usually 20–24 units;
- consistent stroke weight, line caps, corners, and negative space;
- optical sizes for small, medium, and large use where necessary;
- currentColor or documented semantic colors;
- accessible labels on controls.

Do not use miscellaneous Unicode glyphs, emoji, geometric text characters, or font-dependent symbols as final functional icons. They vary by operating system, font fallback, hinting, and baseline and often look much cheaper than the surrounding panel.

Text symbols may remain appropriate for deliberate terminal, notation, or typographic interfaces. Record that as the visual thesis rather than using them as placeholders.

## Microdetail hierarchy

Review interface elements at their actual size:

- 1 px borders align to the output pixel grid;
- icons remain legible at 16–20 px;
- button hit targets remain larger than the drawn icon;
- muted labels are still readable against atmosphere;
- reticles and minimap marks do not blur with the world pass;
- visual states differ through more than opacity.

DOM and SVG overlays normally stay at native output resolution even when the world uses adaptive rendering.

## Pointer look

Use an explicit convention:

- standard horizontal: moving/dragging right turns the view right;
- standard vertical: moving/dragging up looks up;
- inverted axes are preferences, not accidental sign choices.

Pointer-lock and drag fallback must use identical direction and sensitivity. Test four actions:

1. right movement turns right;
2. left movement turns left;
3. up movement looks up;
4. down movement looks down.

For exploration/game experiences, expose inversion settings or at least a clear configuration path. Use `kits/input/pointer-look.mjs` as a safe default.

## HUD/world consistency

The HUD can be sharper than the world because it is an optical instrument, but the contrast must look intentional. Avoid a native-resolution premium HUD over a visibly under-sampled scene unless a deliberate surveillance/low-bandwidth aesthetic is part of the concept.

When the HUD is very refined, raise the scene clarity floor accordingly; otherwise the mismatch reveals the renderer's shortcuts.
