## ADDED Requirements

### Requirement: Project validation command
The CLI SHALL provide `queryloom check` with an optional `--root` dashboard project directory. The command MUST exit with status zero only when all required validation stages succeed, and non-zero when any stage fails.

#### Scenario: Valid project passes validation
- **WHEN** a project has a readable `dashboard.svelte`, a valid `queryloom.yaml`, declared readable local resources, and a successful static build
- **THEN** `queryloom check --root <project>` completes with status zero and reports each completed validation stage

#### Scenario: Default project directory
- **WHEN** `queryloom check` is run without `--root`
- **THEN** it validates the current working directory as the dashboard project

### Requirement: Resource declaration validation
The validation command SHALL enforce the existing Queryloom resource contract before building: a resource MUST use exactly one of project-local `path` or external HTTP(S) `url`; every local `path` MUST resolve to a readable regular file inside the project; and external URLs MUST be validated for HTTP(S) syntax without being fetched.

#### Scenario: Missing local resource
- **WHEN** a declared local resource path is absent or not a readable regular file
- **THEN** validation fails before the build stage and identifies the resource and path with guidance to add the file or correct `queryloom.yaml`

#### Scenario: Valid external resource declaration
- **WHEN** a resource declares a syntactically valid HTTP(S) URL and a supported format
- **THEN** validation accepts the declaration without making a network request and informs the user that CORS and reachability are checked at runtime

### Requirement: Build validation isolation
The validation command SHALL compile the dashboard with the same Svelte, Tailwind, and Vite configuration used for `queryloom build`. It MUST use a temporary output directory and MUST remove that directory after the validation attempt without modifying the project's normal `dist/` directory.

#### Scenario: Compilation succeeds while dist exists
- **WHEN** a project already contains a `dist/` directory and the dashboard compiles
- **THEN** validation succeeds and the existing `dist/` contents remain unchanged

#### Scenario: Dashboard compilation fails
- **WHEN** Svelte, Tailwind, or Vite compilation fails
- **THEN** validation exits non-zero, identifies the build stage, preserves the underlying diagnostic, and tells the user to correct `dashboard.svelte` or its imported dependencies

### Requirement: Agent-ready scaffold and guidance
The initialized project and CLI guidance SHALL include `queryloom check` as the validation step after dashboard authoring. Resource documentation in the scaffold and guides MUST describe both local `path` and external HTTP(S) `url` resources consistently.

#### Scenario: Newly initialized project exposes check
- **WHEN** a user runs `queryloom init <directory>`
- **THEN** the generated `package.json` includes a `check` script that runs `queryloom check`

#### Scenario: Agent follows the guide
- **WHEN** an Agent reads the design or build guide
- **THEN** it is instructed to run `queryloom check` before `queryloom build` and is not told that resources are local-only
