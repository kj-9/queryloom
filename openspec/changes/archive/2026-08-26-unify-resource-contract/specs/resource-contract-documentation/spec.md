## ADDED Requirements

### Requirement: Consistent static resource guidance

Queryloom SHALL describe dashboard resources consistently across its README, generated scaffold, and build guide: a resource uses exactly one project-local CSV/Parquet `path` copied to `dist/`, or one external HTTP(S) CSV/Parquet `url` fetched by the browser at runtime with CORS.

#### Scenario: Agent starts from a newly initialized project

- **WHEN** an Agent reads the generated project hints and build guide
- **THEN** it can declare either supported resource mode without adding a configuration file or connector

### Requirement: External data limitations are explicit

Queryloom SHALL distinguish inspection-only local DuckDB input from dashboard resource formats, and SHALL state that external URL reachability and CORS are runtime concerns rather than `check` network validation.

#### Scenario: Agent chooses an external data URL

- **WHEN** an Agent configures an HTTP(S) CSV or Parquet URL
- **THEN** the guidance explains that the build does not copy it and that browser CORS is required
