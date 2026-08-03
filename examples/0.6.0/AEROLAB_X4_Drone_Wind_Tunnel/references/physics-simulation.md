# AEROLAB X4 Physics & Aerodynamics Reference

## Coordinate system

The tunnel uses a right-handed Y-up world:

- `+X`: nominal tunnel flow direction and drone forward axis
- `+Y`: vertical and rotor thrust axis
- `+Z`: lateral axis
- body attitude channels: roll about X, pitch about Z, yaw about Y

The rigid body stores world position/velocity and a normalized body-to-world quaternion. Angular velocity and torque are expressed in body coordinates.

## Fixed-step execution

Physics advances at exactly 120 Hz (`Δt = 1/120 s`) through `kits/runtime/frame-loop.mjs`. Rendering uses interpolation between the previous and current rigid-body state. The loop allows at most 12 catch-up steps after a display stall; excess wall time is discarded to prevent a spiral-of-death.

Translation uses semi-implicit Euler:

```
a = ΣF / m
v(t+Δt) = v(t) + a Δt
x(t+Δt) = x(t) + v(t+Δt) Δt
```

Rotation uses Euler's rigid-body equation in principal body axes:

```
I ωdot = τ - ω × (I ω)
qdot = 1/2 q ⊗ [ωx, ωy, ωz, 0]
```

The quaternion is normalized every step. Velocity, angular velocity, tunnel bounds, and finite-value guards prevent numerical runaway while preserving force-derived movement.

## Rotor model

Each rotor is evaluated independently:

```
ωi = RPMi · 2π / 60
Fi = kt · ωi²
Qi = kd · ωi²
```

`kt` and `kd` scale with air density and blade radius. Motor RPM follows a first-order response rather than changing instantaneously:

```
RPM += (RPMtarget - RPM) · (1 - exp(-Δt / τmotor))
```

For a rotor at body position `ri`, thrust torque is `ri × [0, Fi, 0]`. Reaction torque is applied along body Y with alternating spin sign. Rotor angular momentum adds gyroscopic precession:

```
Hrotor = Σ si Ii ωi · ŷ
τgyro = -(ωbody × Hrotor)
```

Estimated electrical power is mechanical shaft power divided by efficiency:

```
Pi = |Qi ωi| / η
```

## Quad-X mixer

The controller requests total thrust plus roll, pitch, and yaw torque. The mixer solves the symmetric Quad-X allocation analytically and converts each requested thrust back to RPM. RPM is clamped to the authored motor limit.

Hover mode runs position, altitude, attitude, and yaw PID loops. Manual mode maps collective throttle to RPM. Wind Reaction Test holds static-hover collective without attitude feedback so aerodynamic disturbance remains visible.

## Wind field

The canonical wind field returns:

- velocity vector
- speed
- dynamic-pressure proxy
- static-pressure proxy
- turbulence magnitude
- vorticity proxy
- flow regime

Base wind from speed, yaw, and pitch:

```
Vbase = speed · [cos(pitch)cos(yaw), sin(pitch), cos(pitch)sin(yaw)]
```

Turbulent mode adds deterministic multi-octave gradient noise with three decorrelated channels. The field is spatially coherent, advected in time, and attenuated near tunnel boundaries. Laminar mode returns the base vector only.

The same `WindField.sample()` result drives rigid-body aerodynamics, particle advection, vector-grid diagnostics, particle color, tunnel luminaires, local-flow probe, telemetry, and maximum-wind verification.

## Aerodynamic force model

Relative air velocity:

```
Vrel = Vwind - Vbody
q = 1/2 ρ |Vrel|²
```

Projected drag:

```
Fd = q Cd Aprojected · normalize(Vrel)
```

Projected area increases with incidence angle. Lift varies with wind incidence relative to body up:

```
Fl = q Cl A sin(2α) · nbody
```

The model includes a center-of-pressure offset and angular aerodynamic damping. It is a lumped engineering approximation, not Navier–Stokes CFD.

## Payload authoring

Four underside hardpoints accept 0.05–0.75 kg payloads. Each payload updates:

- total mass
- principal inertia tensor through the parallel-axis contribution
- hover collective requirement
- PID response
- motor power
- telemetry and stability verification

## Stability interpretation

"Stable" means the integrator remains finite, quaternion-normalized, bounded by the physical tunnel enclosure, and below the solver's emergency tilt criterion. It does not claim that every airframe can station-keep at 30 m/s; insufficient thrust or control authority may produce a physically plausible tunnel-wall contact.
