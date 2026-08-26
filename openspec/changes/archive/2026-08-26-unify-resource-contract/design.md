## Context

The runtime and configuration validator already accept exactly one of a project-local `path` or external HTTP(S) `url`. Local resources are copied into `dist/`; external resources remain outside the build and are fetched by the viewer's browser with CORS. The documentation and generated scaffold need to communicate this same choice at the point an Agent selects a source.

## Goals / Non-Goals

**Goals:**

- Make the two resource modes, supported CSV/Parquet formats, and delivery behavior consistent across Agent-facing surfaces.
- Preserve the two-file dashboard authoring contract and make the reference project useful for both modes.
- Test wording and behavior where practical without making network access part of ordinary checks.

**Non-Goals:**

- Add remote database connectors, server-side fetching, automatic data conversion, or a new resource schema.
- Verify external URL availability or CORS during `check`; those conditions are browser/runtime concerns.

## Decisions

### Present `path` and `url` as equal explicit choices

Every onboarding surface will state that a resource is either a project-local CSV/Parquet `path` copied into `dist/`, or an immutable external HTTP(S) CSV/Parquet `url` fetched at runtime with CORS. Local data remains the default for a self-contained dashboard, but is not the only supported route.

### Keep DuckDB files inspection-only

`inspect` can examine a local `.duckdb` file, but browser dashboard resources remain CSV or Parquet. This prevents documentation from implying that a successful inspection guarantees a deployable resource.

### Demonstrate external resources in documentation, not the maintained live example

The reference dashboard remains hermetic and local so development, browser E2E, and build tests do not depend on the network. A concise URL configuration example explains the external mode without creating a fragile example deployment.

## Risks / Trade-offs

- [A user mistakes URL format validation for reachability validation] → State that `check` validates the declaration and the browser requires CORS at runtime.
- [Duplicated wording drifts later] → Add focused guide/scaffold assertions alongside the existing resource configuration tests.
