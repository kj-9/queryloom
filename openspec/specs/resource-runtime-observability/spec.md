# Resource Runtime Observability Specification

## Purpose

Make browser-local resource startup performance and failures diagnosable during dashboard development.

## Requirements

### Requirement: Parallel resource fetch and diagnostics

The browser runtime SHALL fetch independent configured resources concurrently and emit development diagnostics for each resource's byte size, fetch duration, and DuckDB registration duration.

#### Scenario: Multiple resources initialize successfully

- **WHEN** a dashboard configures multiple local or external resources
- **THEN** their downloads begin independently and diagnostics identify the timing and size of each resource

### Requirement: Actionable resource startup failures

The browser runtime SHALL report the resource name, startup phase, and failure kind when a resource cannot be fetched or registered.

#### Scenario: External resource fetch fails

- **WHEN** an external resource returns an unsuccessful response or network error
- **THEN** the startup error identifies the affected resource and fetch failure category
