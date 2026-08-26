## Why

Dashboard authors currently see one generic startup failure after resources are fetched, registered, and materialized serially. They cannot identify the slow or failing resource before changing data delivery.

## What Changes

- Fetch independent resources concurrently before registering them with DuckDB-Wasm.
- Emit structured, development-oriented console diagnostics for resource size, fetch duration, registration duration, and categorized failure.
- Keep the dashboard contract and runtime API unchanged; diagnostics are opt-in through browser developer tools rather than a new public callback.

## Capabilities

### New Capabilities

- `resource-runtime-observability`: Browser-local resource startup timing and failure diagnostics.

### Modified Capabilities

- None.

## Impact

- Affects `@queryloom/library` runtime initialization and its tests.
- No connector, server, dashboard file, or deployment contract is added.
