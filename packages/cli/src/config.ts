import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export type ResourceFormat = "csv" | "parquet";

export interface QueryloomResource {
  name: string;
  /** Project-relative data file copied into the static build. */
  path?: string;
  /** HTTP(S) data asset fetched by the dashboard at runtime. */
  url?: string;
  format: ResourceFormat;
}

export interface QueryloomConfig {
  resources: QueryloomResource[];
}

interface RawResource {
  name?: unknown;
  path?: unknown;
  file?: unknown;
  url?: unknown;
  format?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function resourceEntries(resources: unknown): Array<[string | undefined, unknown]> {
  if (Array.isArray(resources)) {
    return resources.map((resource) => [undefined, resource]);
  }

  if (isRecord(resources)) {
    return Object.entries(resources).map(([name, resource]) => [name, resource]);
  }

  return [];
}

function normalizedRelativePath(projectDir: string, value: string): string {
  const relative = value.replaceAll("\\", "/");
  if (relative.startsWith("/") || relative.includes("\0")) {
    throw new Error(`Resource path must be relative to the dashboard: ${value}`);
  }

  const absolute = path.resolve(projectDir, relative);
  const relativeToProject = path.relative(projectDir, absolute);
  if (relativeToProject.startsWith("..") || path.isAbsolute(relativeToProject)) {
    throw new Error(`Resource path must stay inside the dashboard: ${value}`);
  }

  return relativeToProject.split(path.sep).join("/");
}

function inferFormat(resourcePath: string, format: unknown): ResourceFormat {
  const normalized =
    typeof format === "string" ? format.toLowerCase() : path.extname(resourcePath).slice(1).toLowerCase();
  if (normalized === "csv") return "csv";
  if (normalized === "parquet" || normalized === "pq") return "parquet";
  throw new Error(`Unsupported resource format for ${resourcePath}; use csv or parquet`);
}

function normalizedExternalUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Resource url must be a valid HTTP(S) URL: ${value}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Resource url must use HTTP(S): ${value}`);
  }
  return url.href;
}

export function normalizeConfig(value: unknown, projectDir: string): QueryloomConfig {
  if (!isRecord(value)) {
    throw new Error("queryloom.yaml must contain a mapping");
  }

  const entries = resourceEntries(value.resources);
  if (entries.length === 0) {
    throw new Error("queryloom.yaml must define at least one resource");
  }

  const seenNames = new Set<string>();
  const resources = entries.map(([mapName, raw]) => {
    const object = typeof raw === "string" ? { path: raw } : raw;
    if (!isRecord(object)) {
      throw new Error("Each resource must be a mapping or a path string");
    }

    const resource = object as RawResource;
    const localPath = resource.path ?? resource.file;
    const remoteUrl = resource.url;
    if (localPath !== undefined && remoteUrl !== undefined) {
      throw new Error("Each resource must define either path or url, not both");
    }
    if (typeof localPath !== "string" && typeof remoteUrl !== "string") {
      throw new Error("Each resource needs a non-empty path or url");
    }
    if (
      (typeof localPath === "string" && localPath.length === 0) ||
      (typeof remoteUrl === "string" && remoteUrl.length === 0)
    ) {
      throw new Error("Each resource needs a non-empty path or url");
    }

    const normalizedPath =
      typeof localPath === "string" && localPath.length > 0 ? normalizedRelativePath(projectDir, localPath) : undefined;
    const normalizedUrl = typeof remoteUrl === "string" ? normalizedExternalUrl(remoteUrl) : undefined;
    const formatSource = normalizedPath ?? new URL(normalizedUrl as string).pathname;
    const name =
      typeof resource.name === "string" && resource.name.length > 0
        ? resource.name
        : (mapName ?? path.basename(formatSource, path.extname(formatSource)));
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Resource name must be a SQL identifier: ${name}`);
    }
    if (seenNames.has(name)) {
      throw new Error(`Duplicate resource name: ${name}`);
    }
    seenNames.add(name);

    return {
      name,
      ...(normalizedPath ? { path: normalizedPath } : { url: normalizedUrl as string }),
      format: inferFormat(formatSource, resource.format),
    } satisfies QueryloomResource;
  });

  return { resources };
}

export async function loadProject(
  projectDir: string,
): Promise<{ projectDir: string; dashboardPath: string; config: QueryloomConfig }> {
  const absoluteProjectDir = path.resolve(projectDir);
  const dashboardPath = path.join(absoluteProjectDir, "dashboard.svelte");
  const configPath = path.join(absoluteProjectDir, "queryloom.yaml");

  let source: string;
  try {
    source = await readFile(configPath, "utf8");
  } catch {
    throw new Error(`Cannot read ${configPath}`);
  }

  try {
    await readFile(dashboardPath);
  } catch {
    throw new Error(`Cannot read ${dashboardPath}`);
  }

  return {
    projectDir: absoluteProjectDir,
    dashboardPath,
    config: normalizeConfig(parseYaml(source), absoluteProjectDir),
  };
}
