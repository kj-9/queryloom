import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function packageName(directory: string): string {
  const normalized = path
    .basename(directory)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return normalized || "queryloom-dashboard";
}

function packageJson(directory: string): string {
  return `${JSON.stringify(
    {
      name: packageName(directory),
      private: true,
      type: "module",
      scripts: {
        dev: "queryloom dev",
        check: "queryloom check",
        build: "queryloom build",
        preview: "queryloom preview",
        guide: "queryloom guide",
        inspect: "queryloom inspect",
      },
      devDependencies: {
        "@queryloom/cli": "^0.1.0",
      },
      dependencies: {
        "@queryloom/library": "^0.1.0",
        layerchart: "2.3.0",
        svelte: "^5.16.0",
      },
    },
    null,
    2,
  )}\n`;
}

/** Create an empty Queryloom project for an Agent to implement. */
export async function initializeProject(directory: string): Promise<void> {
  const projectDir = path.resolve(directory);
  if (existsSync(projectDir)) {
    throw new Error(`Cannot initialize ${projectDir}: the directory already exists`);
  }

  await mkdir(path.join(projectDir, "data"), { recursive: true });
  await Promise.all([
    writeFile(path.join(projectDir, ".gitignore"), "node_modules/\ndist/\n.queryloom/\n.DS_Store\n"),
    writeFile(
      path.join(projectDir, "dashboard.svelte"),
      "<!-- Ask an Agent to implement this Queryloom dashboard. -->\n",
    ),
    writeFile(
      path.join(projectDir, "queryloom.yaml"),
      "# Inspect source files first with: bun run inspect -- data/source.csv --format json\n# Then declare each CSV or Parquet resource with exactly one project-local path (copied to dist/) or external HTTP(S) url (browser-fetched with CORS).\n# Local .duckdb files can be inspected but are not dashboard resources in v0.\nresources: []\n",
    ),
    writeFile(path.join(projectDir, "data", ".gitkeep"), ""),
    writeFile(path.join(projectDir, "package.json"), packageJson(projectDir)),
  ]);
}
