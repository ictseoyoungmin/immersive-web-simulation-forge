---
name: immersive-web-simulation-forge
description: >-
  Design, implement, validate, harden, and package sophisticated interactive
  browser products including open worlds, physics and scientific simulation
  labs, parametric design studios, data instruments, operations panels,
  dashboards, and ambient systems.
---

# Plugin entry point

This plugin exposes the canonical skill stored at
`../../immersive-web-simulation-forge/SKILL.md`.

Before acting on a task, read that file completely. Load its referenced material from
`../../immersive-web-simulation-forge/references/` as needed, and use the reusable modules
from `../../immersive-web-simulation-forge/kits/` and tools from
`../../immersive-web-simulation-forge/scripts/`.

When running the Forge CLI or browser checks, execute them from the repository root using the
paths documented in the canonical skill. Keep generated project evidence under the target
project's `.forge/` directory and package only the runtime files requested by the user.
