# Compute and data pipeline contract

Read this reference for Worker/WASM/WebGPU/server computation, streamed data, data instruments, and operations panels.

## Choose the execution boundary

- main thread: only bounded work that stays comfortably inside the interaction budget;
- Worker: CPU work with structured-cloneable inputs and cancellable jobs;
- WASM: hot numerical kernels or mature native libraries;
- WebGPU compute: large parallel kernels with a tested fallback or declared requirement;
- server job: protected data, shared compute, long-running workloads, or durable queues.

Record the reason, latency budget, memory budget, progress model, cancellation behavior, and fallback. Rendering should remain responsive while a calculation runs.

## Message and job contract

Use stable job IDs and versioned payloads. Distinguish queued, running, partial, completed, cancelled, failed, stale, and superseded states. Ignore late results from cancelled or superseded jobs.

Progress must describe real completed work; an indeterminate indicator is more honest than invented percentages. Bound transfer size and prefer transferable buffers for large arrays.

## Data contract

Record source, timestamp, units, schema version, transforms, missing-value policy, and provenance. Keep raw input, normalized state, derived output, and presentation formatting separate.

For live products expose freshness, reconnect/backoff, duplicate handling, ordering policy, and last-known-good state. Never animate stale data as if it were live.

## Reproducibility and comparison

Hash or serialize the effective input configuration, seed, solver version, and data version. A saved comparison must be replayable or explicitly labeled as a snapshot. Export machine-readable data alongside images when the product promises analysis.

## Operational loop

- data instrument: `question → filter/manipulate → interpret → compare → export`;
- operations panel: `detect → inspect → act → confirm → recover`.

Destructive or consequential actions require scope preview, confirmation proportional to risk, visible in-flight state, idempotency where possible, and a recoverable failure path.
