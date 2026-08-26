## Context

The runtime fetches, registers, and creates every resource table serially before any dashboard query can run. Runtime startup has no per-resource visibility.

## Goals / Non-Goals

**Goals:**

- Fetch independent resources concurrently.
- Report size, fetch duration, registration duration, and categorized failures in browser developer tools.
- Keep the public runtime API and dashboard contract unchanged.

**Non-Goals:**

- Retry policy, caching, progressive query readiness, remote connectors, or a dashboard-visible status UI.

## Decisions

### Use development-oriented console groups rather than a new callback API

The runtime will emit concise `console.debug` diagnostics only when the browser is in development mode. This avoids committing a public observer API before a dashboard UI use case exists. A later API can consume the same internal event shape if needed.

### Fetch in parallel, register deterministically

All fetches run with `Promise.all`; DuckDB registration and table creation then run in config order to avoid concurrent database mutation. Each diagnostic separates fetch from registration timing.

### Preserve useful failures

Failures identify the resource, phase (`fetch` or `register`), and kind (HTTP, network, data/register). The original cause remains attached.

## Risks / Trade-offs

- [Parallel downloads increase peak memory] → retain full-buffer behavior already required by DuckDB-Wasm and document this as the current boundary.
- [Console diagnostics are not a product UI] → keep event data internally structured so a later API can be added without changing timing behavior.
