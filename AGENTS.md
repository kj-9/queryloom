# Repository Guidelines

## Structure

- `packages/cli/`: public `@queryloom/cli`, Vite integration, data inspection, and agent guides.
- `packages/runtime/`: public `@queryloom/library` browser-local DuckDB-Wasm API.
- `examples/revenue-dashboard/`: maintained reference dashboard and small test data.
- `examples/address-data/`: generated dashboard experiment; its source data is intentionally large.
- `openspec/`: OpenSpec configuration and in-progress change artifacts.
- Keep unit tests beside source as `*.test.ts`. Never commit `examples/**/dist/`.

## Commands

Use Bun 1.3.14 from the repository root.

| Task | Command |
| --- | --- |
| Install dependencies | `bun install` |
| Run tests | `bun test` |
| Type-check workspaces | `bun run check` |
| Lint and format check | `bun run style:check` |
| Apply formatting | `bun run format` |
| Build reference dashboard | `bun run build` |
| Compile CLI package | `bun run --cwd packages/cli compile` |
| Validate OpenSpec artifacts | `openspec validate --all --strict` |

Run `bun test`, `bun run check`, and `bun run style:check` for every code change. Build and visually inspect a dashboard after CLI, runtime, styling, or chart changes.

## OpenSpec Changes

- Use OpenSpec for behavior or architecture changes: propose, agree the artifacts, implement, verify, then archive.
- Keep project-wide context and artifact rules in `openspec/config.yaml`.
- Keep each change scoped; do not implement unapproved proposal work.
- Update `ROADMAP.md` when a decision changes product sequencing or a deferred scope.

## Conventions

- Biome enforces two spaces, semicolons, and double-quoted TypeScript strings.
- Use `camelCase` for values/functions, `PascalCase` for components/types, and `kebab-case` paths.
- Use Svelte 5 runes for dashboard state. Keep independent sections independently queryable with local loading/error UI.
- Dashboard SQL may use only `queryloom.yaml` resources. Normalize DuckDB query values before display.
- A resource uses either project-local `path` (copied into `dist/`) or external HTTP(S) `url` (browser-fetched with CORS); never both.
- Tailwind and LayerChart are supplied by the CLI. Import generic LayerChart components directly; do not add domain-specific chart wrappers to the library.

## Commit and Pull Requests

- Use short imperative commit subjects, e.g. `Add dashboard validation`.
- Keep generated output and dependency churn separate from functional changes.
- Describe user-facing behavior and verification in pull requests; add screenshots for visual changes.
