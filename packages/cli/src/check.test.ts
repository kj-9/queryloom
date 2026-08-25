import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkProject, formatCheckError, ProjectCheckError, runCheck } from "./check.js";
import { initializeProject } from "./init.js";

async function createProject(name: string): Promise<{ parent: string; project: string }> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "queryloom-check-"));
  const project = path.join(parent, name);
  await initializeProject(project);
  await Promise.all([
    writeFile(path.join(project, "data", "sales.csv"), "month,revenue\n2026-01,100\n"),
    writeFile(path.join(project, "queryloom.yaml"), "resources:\n  sales:\n    path: data/sales.csv\n"),
    writeFile(path.join(project, "dashboard.svelte"), '<main class="p-4">Sales</main>\n'),
  ]);
  return { parent, project };
}

test("checks a valid local-resource project without replacing dist", { timeout: 60_000 }, async () => {
  const { parent, project } = await createProject("local");
  const dist = path.join(project, "dist");

  try {
    await mkdir(dist);
    await writeFile(path.join(dist, "preserved.txt"), "keep");

    const results = await checkProject(project);

    assert.deepEqual(
      results.map((result) => result.stage),
      ["project", "resources", "build"],
    );
    assert.equal(await readFile(path.join(dist, "preserved.txt"), "utf8"), "keep");
    assert.equal(
      (await readdir(project)).some((file) => file.startsWith(".queryloom-check-")),
      false,
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("accepts an external URL without fetching it", { timeout: 60_000 }, async () => {
  const { parent, project } = await createProject("external");

  try {
    await writeFile(
      path.join(project, "queryloom.yaml"),
      "resources:\n  sales:\n    url: https://cdn.example.com/sales.parquet\n",
    );

    const results = await checkProject(project);

    assert.match(results[1].message, /format only/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("reports an actionable resource failure before building", async () => {
  const { parent, project } = await createProject("missing-resource");

  try {
    await writeFile(path.join(project, "queryloom.yaml"), "resources:\n  sales:\n    path: data/missing.csv\n");

    await assert.rejects(
      () => checkProject(project),
      (error: unknown) => {
        assert.ok(error instanceof ProjectCheckError);
        assert.equal(error.stage, "resources");
        assert.match(formatCheckError(error), /data\/missing.csv/);
        assert.match(formatCheckError(error), /Add a readable data file/);
        return true;
      },
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("reports configuration and Svelte build failures with their stage", { timeout: 60_000 }, async () => {
  const { parent, project } = await createProject("failures");

  try {
    await writeFile(path.join(project, "queryloom.yaml"), "resources: []\n");
    await assert.rejects(
      () => checkProject(project),
      (error: unknown) => {
        assert.ok(error instanceof ProjectCheckError);
        assert.equal(error.stage, "project");
        return true;
      },
    );

    await writeFile(path.join(project, "queryloom.yaml"), "resources:\n  sales:\n    path: data/sales.csv\n");
    await writeFile(path.join(project, "dashboard.svelte"), "<script>let = 1;</script>\n");
    await assert.rejects(
      () => checkProject(project),
      (error: unknown) => {
        assert.ok(error instanceof ProjectCheckError);
        assert.equal(error.stage, "build");
        assert.match(formatCheckError(error), /Correct dashboard.svelte/);
        return true;
      },
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("runs the check command handler for explicit and default roots", { timeout: 60_000 }, async () => {
  const { parent, project } = await createProject("command");
  const output: string[] = [];
  const originalWorkingDirectory = process.cwd();

  try {
    await runCheck(project, (line) => output.push(line));
    assert.match(output.at(-1) ?? "", /Queryloom check complete/);

    process.chdir(project);
    await runCheck(undefined, (line) => output.push(line));
    assert.equal(output.filter((line) => line.startsWith("✓")).length, 6);
  } finally {
    process.chdir(originalWorkingDirectory);
    await rm(parent, { recursive: true, force: true });
  }
});
