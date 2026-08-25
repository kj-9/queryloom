## 1. Validation core

- [x] 1.1 Add a testable CLI validation module that loads the project, checks local resource files, and reports structured stage results with actionable failures.
- [x] 1.2 Build valid projects through the existing Vite configuration in an isolated temporary output directory, including reliable cleanup.
- [x] 1.3 Add the `queryloom check` Citty subcommand with `--root`, success output, and non-zero diagnostic failure behavior.

## 2. Agent workflow alignment

- [x] 2.1 Add `bun run check` to the scaffolded package scripts and update the generated resource comments for both `path` and `url`.
- [x] 2.2 Update design/build guide output so it directs Agents to run check before build and uses the same resource contract.

## 3. Verification

- [x] 3.1 Add unit tests for valid local and URL resources, missing local files, configuration failures, build failures, and preservation of an existing `dist/` directory.
- [x] 3.2 Add CLI command coverage for default and explicit roots plus diagnostic output.
- [x] 3.3 Run `bun test`, `bun run check`, `bun run style:check`, `bun run build`, and `bun run --cwd packages/cli compile`.
