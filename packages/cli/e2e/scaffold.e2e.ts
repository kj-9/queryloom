import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const dashboard = (title: string, color = "text-blue-700") => `<script lang="ts">
  let selected = $state("All");
</script>
<main><h1 class="${color}">${title}</h1><button onclick={() => selected = "North"}>North</button><p>{selected}</p></main>\n`;
const cliDirectory = fileURLToPath(new URL("..", import.meta.url));
const runFile = promisify(execFile);

async function runCli(args: string[]): Promise<string> {
  const { stdout } = await runFile("bun", ["src/index.ts", ...args], { cwd: cliDirectory });
  return String(stdout);
}

function startCli(args: string[]) {
  return spawn("bun", ["src/index.ts", ...args], { cwd: cliDirectory });
}

async function stopCli(server: ReturnType<typeof spawn>): Promise<void> {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await once(server, "exit");
}

async function waitForServer(port: number): Promise<void> {
  await expect
    .poll(async () => {
      try {
        return (await fetch(`http://localhost:${port}`)).status;
      } catch {
        return 0;
      }
    })
    .toBe(200);
}

test("fresh scaffold supports inspection, guides, dev HMR, check, build, and preview", async ({ page, browser }) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "queryloom-e2e-"));
  const project = path.join(parent, "dashboard");
  const port = 4187;
  let dev: ReturnType<typeof spawn> | undefined;
  let preview: ReturnType<typeof spawn> | undefined;
  try {
    await runCli(["init", project]);
    await Promise.all([
      writeFile(path.join(project, "data", "sales.csv"), "region,revenue\nNorth,100\nSouth,80\n"),
      writeFile(path.join(project, "queryloom.yaml"), "resources:\n  sales:\n    path: data/sales.csv\n"),
      writeFile(path.join(project, "dashboard.svelte"), dashboard("Scaffold dashboard")),
    ]);
    expect(await runCli(["guide"])).toContain("queryloom check");
    expect(await runCli(["guide", "--phase", "design"])).toContain("queryloom inspect");
    const inspection = JSON.parse(
      await runCli(["inspect", path.join(project, "data", "sales.csv"), "--format", "json"]),
    );
    expect(inspection.resources[0]?.tables[0]?.rowCount).toBe(2);
    await runCli(["check", "--root", project]);

    dev = startCli(["dev", "--root", project, "--port", String(port), "--strict-port"]);
    await waitForServer(port);
    await page.goto(`http://localhost:${port}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading")).toHaveText("Scaffold dashboard");
    await page.getByRole("button", { name: "North" }).click();
    await expect(page.locator("p")).toHaveText("North");
    await writeFile(path.join(project, "dashboard.svelte"), dashboard("Updated dashboard", "text-red-700"));
    await expect(page.getByRole("heading")).toHaveText("Updated dashboard");
    await expect(page.getByRole("heading")).toHaveCSS("color", "oklch(0.505 0.213 27.518)");
    await stopCli(dev);
    dev = undefined;

    await runCli(["build", "--root", project]);
    preview = startCli(["preview", "--root", project, "--port", String(port + 1), "--strict-port"]);
    await waitForServer(port + 1);
    const previewPage = await browser.newPage();
    await previewPage.goto(`http://localhost:${port + 1}`, { waitUntil: "networkidle" });
    await expect(previewPage.getByRole("heading")).toHaveText("Updated dashboard");
    await previewPage.close();
  } finally {
    if (dev) await stopCli(dev);
    if (preview) await stopCli(preview);
    await rm(parent, { recursive: true, force: true });
  }
});
