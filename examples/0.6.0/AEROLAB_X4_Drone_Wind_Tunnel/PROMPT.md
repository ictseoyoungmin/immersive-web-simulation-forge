You are an expert interactive web simulation engineer using the `immersive-web-simulation-forge` framework. 
Your objective is to build a high-fidelity, interactive **"3D Drone Physics Engine & Wind Tunnel Simulator"** web application.

Ensure the final code satisfies all requirements below and includes full-stack simulation modules, physics pipelines, UI components, and validation scripts.

---

## 1. Core Architecture Requirements

### A. Physics & Aerodynamics Engine (`kits/compute/`, `references/physics-simulation.md`)
* Implement a multi-rotor physics loop running at a fixed step (120 Hz).
* **Rotor Dynamics:** Individual thrust generation based on RPM ($F_i = k_t \cdot \omega_i^2$), reaction torque ($Q_i = k_d \cdot \omega_i^2$), and gyroscopic precession.
* **Wind Tunnel Environment:** Adjustable wind vector (Speed, Yaw, Pitch) with a 3D Vector Field grid. Include laminar and turbulent flow modes (Perlin/Simplex noise-based turbulence).
* **Aerodynamic Forces:** Drag force ($F_d = \frac{1}{2} \rho v^2 A C_d$) and lift variance depending on drone angle relative to wind direction.

### B. Visual & Rendering Pipeline (`kits/three/`, `kits/canvas/`)
* **3D Scene:** Detailed quadcopter model, wind tunnel enclosure, and dynamic ground plane.
* **Flow Visualization (`kits/canvas/field-renderer.mjs`):** Streamlines or particle velocity vectors visualizer inside the tunnel. Map wind force/pressure onto particle colors (e.g., blue = low pressure/speed, red = high pressure/speed).
* **Post-Processing (`kits/three/post-chain.mjs`):** Apply bloom to high-stress rotor points and ambient occlusion for tunnel depth.
* **LOD & Performance (`kits/three/lod-bands.mjs`):** Implement LOD logic for particle systems to maintain 60 FPS in WebGL.

### C. UI & Authoring System (`kits/authoring/`, `kits/ui/`)
* **Parameter Store (`kits/authoring/parameter-store.mjs`):**
  * Drone mass, rotor blade radius, max RPM, PID controller gains ($P, I, D$ for Roll/Pitch/Yaw).
  * Wind speed (0–30 m/s), turbulence intensity, air density ($\rho$).
* **Interactive Control (`kits/input/pointer-look.mjs`, `kits/three/picking-gizmo.mjs`):**
  * Interactive camera rotation/zoom and picking gizmo to attach payload/weights directly to the drone body.
  * Flight modes: Hovering (PID stabilized), Manual Thrust, and Wind Reaction Test.
* **State & History (`kits/authoring/history-store.mjs`):** Undo/Redo capability for simulation parameters and telemetry snapshot saving.

### D. Measurement & Telemetry (`kits/analysis/measurement-series.mjs`)
* Real-time plotting data feed:
  * Tilt Angle (Pitch/Roll) vs. Time.
  * Power Consumption (Watts) vs. Wind Speed.
  * Motor Thrust Distribution per Rotor.

---

## 2. Deliverable Requirements

1. **Code Structure:** Use modular ES modules under `kits/` as defined in the skill package framework.
2. **Main Application Entry:** Provide a fully functional `index.html` and bootstrap script that instantiates the frame loop (`kits/runtime/frame-loop.mjs`) and lifecycle handlers (`kits/runtime/lifecycle.mjs`).
3. **Verification Script:** Include a browser verification test (`scripts/browser_verify.mjs`) checking for frame rate drops (<45 FPS warning) and physics stability under maximum wind conditions.

---

## 3. Design Principles
* **Accuracy First:** Avoid arbitrary visual movement; ensure drone motion is strictly derived from the net forces and torques calculated in the compute task runner.
* **Interface Fidelity:** Clean, scientific-grade HUD and control panels using `kits/ui/icon-system.mjs`.

Begin by generating the execution plan (`FORGE_PLAN.json`), then write the core physics and rendering modules step-by-step.