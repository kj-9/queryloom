# Repository Guidelines

## Project Structure & Module Organization

- `packages/cli/` contains the public `@queryloom/cli`, Vite integration, and agent guide.
- `packages/runtime/` contains the browser runtime, DuckDB-Wasm SQL helpers, and Svelte chart components.
- `examples/revenue-dashboard/` is the reference dashboard: `dashboard.svelte` for UI/query logic and `queryloom.yaml` for resources. Sample data lives in `data/`.
- Keep unit tests next to their source as `*.test.ts`. Treat `examples/**/dist/` as generated output; do not commit it.
- Read `README.md` for the product contract and `ROADMAP.md` for intentionally deferred work before changing architecture.

## Build, Test, and Development Commands

Use Bun 1.3.14 and run commands from the repository root.

| Task | Command |
| --- | --- |
| Install dependencies | `bun install` |
| Develop the reference dashboard | `bun run dev` |
| Build its deployable static output | `bun run build` |
| Preview the build | `bun run preview` |
| Run all tests | `bun test` |
| Type-check all workspaces | `bun run check` |
| Package the CLI | `bun run --cwd packages/cli compile` |

Run `bun test` and `bun run check` for every code change. Run `bun run build` when changing the CLI, runtime bundling, styling pipeline, or example dashboard.

## Coding Style & Naming Conventions

- Use two-space indentation, semicolons, and double-quoted strings, matching existing TypeScript source.
- Use `camelCase` for functions and values, `PascalCase` for Svelte components and exported types, and `kebab-case` for package paths.
- Use Svelte 5 runes (`$state`, `$derived`) for dashboard state. Keep independent dashboard sections independently queryable and give each local loading/error UI.
- Dashboard SQL may reference only tables declared in its `queryloom.yaml`; normalize DuckDB query values before display.
- Tailwind is supplied by the CLI. Do not add a Tailwind config or stylesheet entry to an example.

## Testing Guidelines

- Add `*.test.ts` coverage for CLI, config, and runtime SQL behavior.
- Prefer small deterministic fixtures such as `examples/revenue-dashboard/data/revenue.csv`.
- For Svelte UI changes, `bun run check` is required; also build and visually inspect the reference dashboard when layout or charts change.

## Commit & Pull Request Guidelines

- The repository currently has one initial commit, so no historical message convention exists. Use short, imperative subjects, e.g. `Add dashboard validation`.
- Keep commits focused; avoid mixing generated output, dependency churn, and feature changes.
- Pull requests should state user-facing effect, verification, related issues, and screenshots for visual changes.
