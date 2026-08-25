import { constants } from "node:fs";
import { access, mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { loadProject, type QueryloomResource } from "./config.js";
import { buildProject } from "./vite.js";

export type CheckStage = "project" | "resources" | "build";

export interface CheckResult {
  stage: CheckStage;
  message: string;
}

export class ProjectCheckError extends Error {
  constructor(
    readonly stage: CheckStage,
    readonly target: string,
    readonly guidance: string,
    readonly cause?: unknown,
  ) {
    super(`Check failed during ${stage}: ${target}`);
    this.name = "ProjectCheckError";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function validateLocalResource(projectDir: string, resource: QueryloomResource): Promise<void> {
  if (!resource.path) return;

  const resourcePath = path.join(projectDir, resource.path);
  try {
    const details = await stat(resourcePath);
    if (!details.isFile()) {
      throw new Error("The path is not a regular file");
    }
    await access(resourcePath, constants.R_OK);
  } catch (error) {
    throw new ProjectCheckError(
      "resources",
      `${resource.name} (${resource.path})`,
      "Add a readable data file at this path or correct the resource path in queryloom.yaml.",
      error,
    );
  }
}

/** Validate a dashboard project without replacing its deployable dist directory. */
export async function checkProject(projectDir: string): Promise<CheckResult[]> {
  let project: Awaited<ReturnType<typeof loadProject>>;
  try {
    project = await loadProject(projectDir);
  } catch (error) {
    throw new ProjectCheckError(
      "project",
      path.resolve(projectDir),
      "Ensure dashboard.svelte and queryloom.yaml exist, then correct the reported configuration error.",
      error,
    );
  }

  const results: CheckResult[] = [{ stage: "project", message: "Loaded dashboard.svelte and queryloom.yaml." }];

  for (const resource of project.config.resources) {
    await validateLocalResource(project.projectDir, resource);
  }
  const externalResourceCount = project.config.resources.filter((resource) => resource.url).length;
  results.push({
    stage: "resources",
    message:
      externalResourceCount === 0
        ? `Validated ${project.config.resources.length} local resource${project.config.resources.length === 1 ? "" : "s"}.`
        : `Validated ${project.config.resources.length} resource${project.config.resources.length === 1 ? "" : "s"}; ${externalResourceCount} external URL${externalResourceCount === 1 ? " is" : "s are"} checked for format only (CORS and reachability are runtime concerns).`,
  });

  let temporaryOutDir: string | undefined;
  try {
    temporaryOutDir = await mkdtemp(path.join(project.projectDir, ".queryloom-check-"));
    await buildProject(project, temporaryOutDir);
  } catch (error) {
    throw new ProjectCheckError(
      "build",
      project.dashboardPath,
      "Correct dashboard.svelte or its imported dependencies, then run queryloom check again.",
      error,
    );
  } finally {
    if (temporaryOutDir) await rm(temporaryOutDir, { recursive: true, force: true });
  }

  results.push({ stage: "build", message: "Compiled the static dashboard in an isolated temporary directory." });
  return results;
}

export function formatCheckError(error: unknown): string {
  if (!(error instanceof ProjectCheckError)) return errorMessage(error);

  const cause = error.cause ? `\n\nDetails: ${errorMessage(error.cause)}` : "";
  return `Queryloom check failed during ${error.stage}.\nTarget: ${error.target}\nFix: ${error.guidance}${cause}`;
}

/** Run the CLI-facing check flow with injectable output for command tests. */
export async function runCheck(
  root: string | undefined,
  write: (message: string) => void = console.log,
): Promise<void> {
  const projectRoot = path.resolve(root ?? process.cwd());
  try {
    const results = await checkProject(projectRoot);
    for (const result of results) write(`✓ ${result.message}`);
    write(`Queryloom check complete: ${projectRoot}`);
  } catch (error) {
    throw new Error(formatCheckError(error));
  }
}
