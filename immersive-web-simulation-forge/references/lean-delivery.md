# Lean delivery policy

The workbench and the product are different artifacts.

## Workbench

Store temporary material under `.forge/`:

- plans and notes;
- spike builds;
- screenshots and contact sheets;
- browser logs;
- performance traces;
- visual defect lists.

Replace superseded screenshots instead of accumulating them.

## Default product ZIP

Include only runtime/source needed by the user, assets, a short README, compact `VALIDATION.json`, and optionally one preview.

Exclude `.forge`, evidence directories, browser caches, recordings, discarded concepts, duplicate inline bundles, copied skill utilities, and repeated reports.

A separate full-evidence archive is created only when the user requests auditability, handoff to QA, or regulatory/research traceability.

## Size guard

The default package audit fails when it finds raw evidence or known forge utilities in the proposed runtime roots. Evidence volume is reported separately so a large workbench cannot masquerade as a large implementation.
