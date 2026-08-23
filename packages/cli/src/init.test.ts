import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { initializeProject } from "./init.js";

test("initializes an empty agent-ready dashboard project without overwriting", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "queryloom-init-"));
  const project = path.join(parent, "Sales Dashboard");

  try {
    await initializeProject(project);

    assert.equal(existsSync(path.join(project, "data", ".gitkeep")), true);
    assert.match(await readFile(path.join(project, "dashboard.svelte"), "utf8"), /Ask an Agent/);
    assert.match(await readFile(path.join(project, "queryloom.yaml"), "utf8"), /bun run inspect/);
    assert.deepEqual(JSON.parse(await readFile(path.join(project, "package.json"), "utf8")), {
      name: "sales-dashboard",
      private: true,
      type: "module",
      scripts: {
        dev: "queryloom dev",
        build: "queryloom build",
        preview: "queryloom preview",
        guide: "queryloom guide",
        inspect: "queryloom inspect",
      },
      devDependencies: { "@queryloom/cli": "^0.1.0" },
      dependencies: {
        "@queryloom/library": "^0.1.0",
        layerchart: "2.3.0",
        svelte: "^5.16.0",
      },
    });
    await assert.rejects(() => initializeProject(project), /already exists/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
