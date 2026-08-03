# Experience concentration and session structure

Use this reference for showcase/flagship worlds, games, laboratories, design tools, instruments, and cinematic simulations. The goal is not minimalism; it is a clear hierarchy of attention and effort.

## Contents

- Outcome hierarchy
- First useful minute
- Session structures
- Feature budget
- Scale and content cadence
- Default-route review
- Three-ledger review

## Outcome hierarchy

Protect these in order:

1. identity: the result is recognizable without explanation;
2. orientation: the user sees where they are and what matters;
3. agency: the first action produces a legible consequence;
4. loop: the action points toward a repeatable pursuit or resolution;
5. transformation: the world/system changes how it reads or behaves;
6. breadth: optional systems, locations, panels, and polish.

Breadth may not dilute the first five. A feature is not free: it consumes visual attention, implementation time, QA surface, UI space, and performance budget.

## First useful minute

Design the default route or starting document, not only a cinematic capture state.

The opening should answer:

- What is this?
- Where should I look or go?
- What can I do immediately?
- What changed because I acted?

Do not require a manual, dense telemetry panel, or several minutes of travel before the core promise becomes visible. Onboarding chrome can clarify the action but cannot substitute for a legible world or mechanism.

## Session structures

Choose one primary structure.

### Game

`entry → pursuit → escalation/transformation → resolution → reward/continuation`

A short complete loop often feels more finished than a larger world with only collectibles. Resolution may unlock a new movement mode, ending, challenge, or altered world state.

### Sandbox

`entry → discovery → manipulation → systemic response → return with changed possibilities`

The return state prevents the sandbox from feeling like disconnected toggles. Discoveries should affect later navigation, interpretation, or expression.

### Instrument

`question → manipulate → observe causal result → compare/reset/export`

The hero visualization must serve the decision or understanding, not merely decorate controls.

### Authoring

`select/create → modify → validate → compare → save/export`

Start from a valid editable document. Preserve intent through constraints, transactional history, measurements, variants, and deterministic serialization.

### Data instrument

`question → filter/manipulate → interpret → compare → export`

Keep provenance, units, transforms, and uncertainty available without overwhelming the primary visual question.

### Operations panel

`detect → inspect → act → confirm → recover`

The product is incomplete if it visualizes a problem but cannot represent action scope, in-flight state, success, failure, and recovery.

### Ambient system

`state arrival → legible evolution → occasional event → persistent trace/recovery`

Keep interaction optional and motion low-attention.

## Feature budget

Write down:

- one hero system;
- one hero visual motif;
- one primary interaction loop;
- up to four supporting systems;
- deferred ideas.

The limit is a planning default, not a law. Exceed it only with an explicit concentration rationale. Combine or remove systems that need separate HUD panels merely to prove they exist.

Do not force a second major transformation, more collectibles, more biomes, or a larger map to satisfy an abstract count. Add them only when they strengthen the session structure and remain visually distinct.

## Scale and content cadence

Derive scale from motion and reward cadence.

Record:

- actual world bounds and units;
- walking/manipulation speed;
- expected time to the first meaningful action;
- typical time or distance between landmarks/rewards;
- authored versus procedurally filled area;
- any area/distance claim shown to the user.

Useful estimates:

```text
crossing time (seconds) ≈ representative distance (m) / walking speed (m/s)
bounding area (km²) = width (m) × depth (m) / 1,000,000
```

Bounding area is not land area, authored area, or meaningfully explorable area. Label the basis. Prefer the smallest scope that preserves the fantasy and keeps the intended cadence.

## Default-route review

Review at the actual target size before opening debug tools or selecting a special pose.

Check:

- focal hierarchy at first glance;
- destination and affordance visibility;
- foreground contact and horizon identity;
- UI coverage and competition with the subject;
- color/material separation;
- time to first action;
- time to first reward;
- whether the default route represents the product honestly.

A polished title screen and a polished world are separate achievements. Require both when the title screen makes a flagship claim.

## Three-ledger review

Keep product, domain, and runtime defects separate.

### Product outcome ledger

- generic or incoherent art direction;
- weak default composition;
- unclear first action;
- sparse/empty traversal;
- UI density that competes with the subject;
- no resolution or return state;
- transformations that are mostly post effects.

### Domain validity ledger

- unstated units, coordinates, assumptions, or constraints;
- visually plausible but unsupported physical behavior;
- no benchmark, tolerance, invariant, geometry check, or round trip;
- stale or untraceable data presented as current;
- concept/configurator output mislabeled as engineering-valid.

### Runtime engineering ledger

- input sign/parity failures;
- collisions and movement failures;
- frame-dependent simulation;
- inaccurate scale/performance claims;
- low internal resolution hidden by output size;
- missing adaptation, lifecycle, cleanup, or context recovery.

No ledger cancels another. Report them separately and close blockers in all applicable ledgers.
