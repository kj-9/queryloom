## 1. Browser test foundation

- [x] 1.1 Add Playwright and an isolated `packages/cli` E2E test script with local and CI browser-install commands.
- [x] 1.2 Create reusable fixtures to initialize a temporary dashboard, supply a small CSV, author a minimal filterable Svelte file, and reliably start and stop CLI servers.

## 2. Workflow coverage

- [x] 2.1 Verify `inspect`, design guide, build guide, and `check` against the fresh scaffold.
- [x] 2.2 Verify browser rendering, filter interaction, Svelte HMR, and Tailwind source updates through `queryloom dev`.
- [x] 2.3 Verify `queryloom build` and `queryloom preview` render the same dashboard from static output.

## 3. Automation and verification

- [x] 3.1 Run the E2E suite in GitHub Actions with Chromium and failure artifacts.
- [x] 3.2 Run `bun test`, the E2E suite, `bun run check`, `bun run style:check`, `bun run build`, and `bun run --cwd packages/cli compile`.
