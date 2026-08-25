#!/usr/bin/env node
import path from "node:path";
import { defineCommand, runMain } from "citty";
import { runCheck } from "./check.js";
import { loadProject } from "./config.js";
import { type GuideFormat, type GuidePhase, renderDesignGuide, renderGuide } from "./guide.js";
import { initializeProject } from "./init.js";
import { type InspectFormat, inspectPath, inspectResources, renderInspection } from "./inspect.js";
import { buildProject, startDev, startPreview } from "./vite.js";

interface CliOptions {
  root: string;
  host?: string;
  port?: number;
  strictPort?: boolean;
  outDir?: string;
}

function projectOptions(args: {
  root?: string;
  host?: string;
  port?: string;
  strictPort?: boolean;
  outDir?: string;
}): CliOptions {
  const port = args.port === undefined ? undefined : Number(args.port);
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error(`Invalid port: ${args.port}`);
  }

  return {
    root: path.resolve(args.root ?? process.cwd()),
    host: args.host,
    port,
    strictPort: args.strictPort,
    outDir: args.outDir === undefined ? undefined : path.resolve(args.outDir),
  };
}

const projectArgs = {
  root: { type: "string" as const, description: "Dashboard project directory." },
  host: { type: "string" as const, description: "Host interface to bind." },
  port: { type: "string" as const, description: "Port to bind." },
  strictPort: { type: "boolean" as const, description: "Fail instead of choosing another port." },
};

const dev = defineCommand({
  meta: { name: "dev", description: "Start a dashboard development server." },
  args: projectArgs,
  async run({ args }) {
    const options = projectOptions(args);
    const project = await loadProject(options.root);
    await startDev(project, options);
  },
});

const build = defineCommand({
  meta: { name: "build", description: "Build a deployable static dashboard." },
  args: {
    ...projectArgs,
    outDir: { type: "string" as const, description: "Output directory. Defaults to <root>/dist." },
  },
  async run({ args }) {
    const options = projectOptions(args);
    const project = await loadProject(options.root);
    await buildProject(project, options.outDir);
    console.log(`Queryloom build complete: ${options.outDir ?? path.join(project.projectDir, "dist")}`);
  },
});

const preview = defineCommand({
  meta: { name: "preview", description: "Preview a built static dashboard." },
  args: projectArgs,
  async run({ args }) {
    const options = projectOptions(args);
    const project = await loadProject(options.root);
    await startPreview(project.projectDir, options);
  },
});

const check = defineCommand({
  meta: { name: "check", description: "Validate a dashboard project without replacing dist." },
  args: { root: { type: "string" as const, description: "Dashboard project directory." } },
  async run({ args }) {
    await runCheck(args.root);
  },
});

const init = defineCommand({
  meta: { name: "init", description: "Create an empty, Agent-ready dashboard project." },
  args: {
    directory: { type: "positional" as const, description: "Directory to create.", required: true },
  },
  async run({ args }) {
    await initializeProject(args.directory);
    console.log(
      `Queryloom project created: ${path.resolve(args.directory)}\n\nNext:\n  cd ${args.directory}\n  bun install\n  bun run inspect -- data/<source>.csv --format json\n  bun run guide -- --phase design`,
    );
  },
});

const guide = defineCommand({
  meta: { name: "guide", description: "Print instructions for planning or authoring a dashboard." },
  args: {
    phase: {
      type: "enum" as const,
      options: ["build", "design"],
      default: "build",
      description: "Guide phase.",
    },
    format: {
      type: "enum" as const,
      options: ["markdown", "json"],
      default: "markdown",
      description: "Output format.",
    },
  },
  run({ args }) {
    const format = args.format as GuideFormat;
    const content = (args.phase as GuidePhase) === "design" ? renderDesignGuide(format) : renderGuide(format);
    console.log(content.trimEnd());
  },
});

const inspect = defineCommand({
  meta: {
    name: "inspect",
    description: "Inspect local or HTTP(S) CSV/Parquet data, or local DuckDB data, with DuckDB-Wasm.",
  },
  args: {
    file: {
      type: "positional" as const,
      description: "Local path or HTTP(S) CSV/Parquet URL, or local DuckDB file.",
      required: false,
    },
    root: {
      type: "string" as const,
      description: "Project directory; inspects queryloom.yaml resources when no file is given.",
    },
    format: {
      type: "enum" as const,
      options: ["markdown", "json"],
      default: "markdown",
      description: "Output format.",
    },
  },
  async run({ args }) {
    const inspection = args.file
      ? await inspectPath(args.file)
      : await (async () => {
          const project = await loadProject(path.resolve(args.root ?? process.cwd()));
          return inspectResources(project.projectDir, project.config.resources);
        })();
    console.log(renderInspection(inspection, args.format as InspectFormat).trimEnd());
  },
});

const command = defineCommand({
  meta: {
    name: "queryloom",
    version: "0.1.0",
    description: "Create and ship local-data Svelte dashboards with an Agent.",
  },
  subCommands: { dev, build, preview, check, init, guide, inspect },
});

runMain(command);
