# Wave and fluid surface fidelity

Use this contract whenever a product's hero visualization is a body of water, a weather-driven fluid field, or any surface whose motion is meant to read as physically simulated (ocean, lake, river, cloud volume, smoke, fire, granular flow). It extends `references/physics-simulation.md`'s canonical technique floor with the concrete technique for this domain; it does not create a new ledger.

## Contents

- Governing relation
- Spectrum-based water surfaces (the canonical technique)
- When a finite-sum approximation is legitimate
- Foam, spray, and secondary detail
- Compute placement

## Governing relation

Deep-water gravity waves obey the dispersion relation `ω² = g·k·tanh(k·h)` (`ω² = g·k` in the deep-water limit `k·h ≫ 1`). Any water-surface technique — finite sum, FFT synthesis, or hybrid — should derive each component's angular frequency from its wavenumber through this relation rather than picking frequencies by eye; that is what makes even a cheap approximation a real (if simplified) governing relationship instead of an arbitrary animation.

## Spectrum-based water surfaces (the canonical technique)

The established real-time technique for ocean and large open-water surfaces is Tessendorf's spectral method: sample a directional wave spectrum — Phillips or Pierson-Moskowitz for simple wind seas, JONSWAP for a developing sea, Horvath with TMA depth correction for combined swell and depth-limited wind sea — over a 2D wavenumber grid, assign Gaussian random amplitudes per bin, and synthesize height, displacement, and slope fields with an inverse FFT (Cooley-Tukey or Stockham butterfly), run once per frame or every few frames. Multiple cascades covering disjoint wavenumber bands at different tile sizes (for example ~250 m, ~17 m, ~5 m) avoid visible tiling while keeping each grid resolution tractable. Slope FFTs give normals that are analytically consistent with the visible displacement; the displacement field's Jacobian gives a physically motivated foam mask (compression at a crest → whitecap) instead of a decorative noise field standing in for one.

Record `domain.canonical_technique = "Tessendorf/Horvath spectral synthesis (inverse FFT)"` for this class of product, whether or not you implement it.

## When a finite-sum approximation is legitimate

A small fixed set of directional sinusoids (Gerstner-style, derived from the same dispersion relation above) is a legitimate, much cheaper approximation for background or decorative water, small viewports, or a deliberately stylized/low-poly treatment — the same way a hand-placed low-poly rock is a legitimate choice under `references/asset-fidelity-gates.md`. It stops being legitimate, and becomes the silent-substitution defect described in `physics-simulation.md`, when any of these hold: the water is the hero subject of a flagship product; the product's own language claims "realistic," "physically simulated," or "spectral"; or the viewport is large and long enough in view for the fixed component count to read as repeating/geometric rather than organic. State the component count and directional bands used in `domain.authoritative_model` — a handful of hard-coded components reads as artificial regardless of how the fragment shader disguises them with unrelated fbm noise.

## Foam, spray, and secondary detail

Foam driven by a noise field unrelated to the displacement/slope state will decouple from the waves under scrutiny: it will not intensify at the actual crest, will not track current advection correctly, and will not respond to a real gust or wind-shift event. Foam should read from crest curvature or the Jacobian of the same field driving the visible surface, even inside a finite-sum approximation — this is the cheapest change that makes an approximate ocean feel causally connected rather than merely animated.

## Compute placement

A real-time IFFT-based cascade is a large parallel numerical kernel; per `references/stack-selection.md` it belongs on WebGPU compute, or a WASM/Worker CPU FFT as a slower fallback. A WebGPU-only implementation with no WebGL fallback is an acceptable architecture, not a defect, when it is declared as a requirement in `compute.fallback` and reflected in the product's stated browser support — a spectral ocean does not need a universal fallback to be a legitimate choice; it needs the requirement disclosed instead of silently downgrading the whole technique to avoid stating it.
