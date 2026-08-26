## 1. Runtime startup behavior

- [x] 1.1 Refactor resource loading to fetch independent buffers concurrently and register tables in declared order.
- [x] 1.2 Add development console diagnostics for bytes, fetch time, registration time, and categorized startup failures.

## 2. Regression coverage

- [x] 2.1 Add runtime tests for parallel fetch behavior, timing diagnostics, and actionable fetch/register failures.
- [x] 2.2 Run `bun test`, `bun run check`, `bun run style:check`, and public package compilation.
