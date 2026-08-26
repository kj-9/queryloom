## 1. Align Agent-facing contract

- [x] 1.1 Update README onboarding and resource documentation to present `path` and `url` as explicit static-data choices, including copy/fetch and CORS behavior.
- [x] 1.2 Update CLI init and build-guide wording so the generated project describes the same CSV/Parquet resource boundaries and DuckDB inspection limitation.

## 2. Verify documented behavior

- [x] 2.1 Add focused tests for the scaffold and guide resource contract, while retaining hermetic local reference-dashboard coverage.
- [x] 2.2 Run `bun test`, `bun run check`, `bun run style:check`, `bun run build`, and `bun run --cwd packages/cli compile`.
