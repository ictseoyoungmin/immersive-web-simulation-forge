# Surface scattering and PBR materials

Use this contract when a product claims physically based materials, when material identity is critical to a flagship scene, or when lighting changes must produce believable surface response. It extends `lighting-and-radiance.md` and complements `asset-fidelity-gates.md`.

## Canonical model

For ordinary real-time opaque materials, use an energy-aware microfacet BRDF family as the canonical technique. A common form separates specular reflection into:

`f_spec = D · F · G / (4 |n·wi| |n·wo|)`

where `D` is a normal-distribution function, `F` is Fresnel response, and `G` is masking-shadowing/geometry attenuation. GGX/Trowbridge-Reitz with a Smith-style geometry term and Schlick or exact Fresnel treatment is a strong default for real-time PBR.

Diffuse, transmission, clearcoat, sheen, anisotropy, subsurface, hair, or layered effects require explicit additional lobes or a declared approximation. Do not force every material class through one opaque metallic-roughness lobe when the hero identity depends on different transport.

## Physical constraints

Scattering models should respect as applicable:

- non-negative response;
- energy conservation or an explicitly bounded approximation;
- reciprocity where the physical model requires it;
- correct Fresnel trend with angle and index of refraction;
- roughness controlling microsurface distribution, not acting as a generic blur knob;
- metal/dielectric distinction in specular color and diffuse contribution;
- normal-map scale/orientation consistent with geometry.

## Parameterization

Metallic-roughness is a practical authoring parameterization, not the underlying physics. Record enough material metadata to avoid meaningless sliders:

- base color / spectral proxy and color-space handling;
- roughness mapping and minimum clamp;
- metallic or conductor class;
- IOR/F0 policy for dielectrics;
- normal/detail scale;
- transmission/absorption for glass/water when used;
- clearcoat/sheen/anisotropy only where materially justified.

Do not differentiate named materials only by color when roughness, Fresnel, transmission, or layered response defines their identity.

## Legitimate approximations

Simplified Lambert + specular, stylized ramps, or intentionally non-physical shaders are legitimate for stylized/abstract products when the style contract says so. They become silent substitution when the product explicitly claims PBR/physical material response or depends on material truth under changing light.

Image-based lighting, prefiltered environment maps, LUTs, and split-sum approximations are valid real-time accelerations when they remain consistent with the BRDF parameterization.

## Material/asset coupling

Read `asset-fidelity-gates.md`. A technically correct BRDF cannot rescue:

- wrong material-region assignment;
- wrong texture scale;
- missing thickness or silhouette;
- a metal surface modeled as dielectric because the authoring route lost material semantics.

Likewise, a detailed mesh with arbitrary specular values does not satisfy a PBR material claim.

## Validation

Use small canonical scenes in addition to hero captures:

- white-furnace / constant-environment test for energy behavior;
- roughness sweep under a fixed area/environment light;
- dielectric IOR/Fresnel grazing-angle check;
- conductor-vs-dielectric comparison;
- normal-map orientation and mip stability;
- reference-render comparison for one or more hero materials;
- multi-light / HDR range review to ensure the material identity survives lighting changes.

For a flagship product, visually inspect the actual target-size captures; shader parameters reported by runtime are not proof that the material reads correctly.
