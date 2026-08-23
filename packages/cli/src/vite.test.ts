import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadProject } from "./config.js";
import { initializeProject } from "./init.js";
import { buildProject } from "./vite.js";

test("builds an initialized project without its own node_modules directory", { timeout: 60_000 }, async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "queryloom-build-"));
  const projectDir = path.join(parent, "fresh-dashboard");

  try {
    await initializeProject(projectDir);
    await Promise.all([
      writeFile(path.join(projectDir, "data", "sales.csv"), "month,revenue\n2026-01,100\n"),
      writeFile(
        path.join(projectDir, "queryloom.yaml"),
        "resources:\n  - name: sales\n    path: data/sales.csv\n    format: csv\n",
      ),
      writeFile(path.join(projectDir, "dashboard.svelte"), '<main class="p-4 text-slate-900">Fresh dashboard</main>\n'),
    ]);

    assert.equal(existsSync(path.join(projectDir, "node_modules")), false);
    await buildProject(await loadProject(projectDir));
    assert.equal(existsSync(path.join(projectDir, "dist", "assets", "dashboard.js")), true);
    assert.match(await readFile(path.join(projectDir, "dist", "index.html"), "utf8"), /generated-entry.*\.css/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
