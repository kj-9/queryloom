## ADDED Requirements

### Requirement: Scaffold workflow regression suite
The repository SHALL provide an automated regression suite that creates a fresh project with `queryloom init`, adds a minimal local CSV and dashboard, and verifies `inspect`, both guide phases, `check`, `dev`, `build`, and `preview` against that project.

#### Scenario: Fresh project completes the CLI workflow
- **WHEN** the regression suite runs against a newly initialized project
- **THEN** every required CLI command succeeds and the built output is previewable

### Requirement: Browser development verification
The regression suite SHALL use a headless browser to verify the scaffolded dashboard renders, responds to a filter interaction, accepts a Svelte hot update, and applies an updated Tailwind utility class without a manually triggered full reload.

#### Scenario: Dashboard source update is reflected during development
- **WHEN** the suite edits the running dashboard source
- **THEN** the browser observes the changed content and Tailwind-derived style through the dev server

### Requirement: Continuous integration execution
The CI workflow SHALL install the required headless browser runtime and execute the scaffold workflow regression suite on pull requests and pushes.

#### Scenario: Browser dependency is available in CI
- **WHEN** CI runs the repository validation workflow
- **THEN** the scaffold browser suite executes without relying on a browser preinstalled on the runner
