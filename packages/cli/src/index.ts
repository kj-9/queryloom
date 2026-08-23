#!/usr/bin/env node
import path from "node:path";
import { buildProject, startDev, startPreview } from "./vite.js";
import { loadProject } from "./config.js";
import { renderGuide, type GuideFormat } from "./guide.js";
import { initializeProject } from "./init.js";

interface CliOptions {
  root: string;
  host?: string;
  port?: number;
  strictPort?: boolean;
  outDir?: string;
}

function help(): void {
  console.log(`Queryloom v0

Usage:
  queryloom dev [--root <dir>] [--host <host>] [--port <port>]
  queryloom build [--root <dir>] [--outDir <dir>]
  queryloom preview [--root <dir>] [--host <host>] [--port <port>]
  queryloom init <directory>
  queryloom guide [--format markdown|json]

A project contains dashboard.svelte, queryloom.yaml, and local CSV/Parquet resources.`);
}

function parseGuideFormat(args: string[]): GuideFormat {
  if (args.length === 0) return "markdown";
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log("Usage: queryloom guide [--format markdown|json]");
    process.exit(0);
  }
  if (args.length === 2 && args[0] === "--format" && (args[1] === "markdown" || args[1] === "json")) return args[1];
  throw new Error("Usage: queryloom guide [--format markdown|json]");
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = { root: process.cwd() };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--root" && next) options.root = path.resolve(next), index += 1;
    else if (arg === "--host" && next) options.host = next, index += 1;
    else if (arg === "--port" && next) options.port = Number(next), index += 1;
    else if (arg === "--outDir" && next) options.outDir = path.resolve(next), index += 1;
    else if (arg === "--strictPort") options.strictPort = true;
    else if (arg === "--help" || arg === "-h") help(), process.exit(0);
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535)) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  return options;
}

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "help" || command === "--help" || command === "-h") return help();
  if (command === "guide") return console.log(renderGuide(parseGuideFormat(args)).trimEnd());
  if (command === "init") {
    if (args.length !== 1 || args[0] === "--help" || args[0] === "-h") {
      if (args.length === 1) console.log("Usage: queryloom init <directory>");
      else throw new Error("Usage: queryloom init <directory>");
      return;
    }
    await initializeProject(args[0]);
    console.log(`Queryloom project created: ${path.resolve(args[0])}\n\nNext:\n  cd ${args[0]}\n  bun install\n  bun run guide  # give this output to your Agent`);
    return;
  }
  if (!new Set(["dev", "build", "preview"]).has(command)) throw new Error(`Unknown command: ${command}`);

  const options = parseOptions(args);
  const project = await loadProject(options.root);
  if (command === "dev") return startDev(project, options);
  if (command === "preview") return startPreview(project.projectDir, options);
  await buildProject(project, options.outDir);
  console.log(`Queryloom build complete: ${options.outDir ?? path.join(project.projectDir, "dist")}`);
}

main().catch((error: unknown) => {
  console.error(`Queryloom: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
