import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbMvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { fetchResources } from "./resource-loader.js";
import { resourceTableSql } from "./sql.js";

export interface QueryloomResource {
  name: string;
  path?: string;
  url?: string;
  format: "csv" | "parquet";
}

export interface QueryloomConfig {
  resources: QueryloomResource[];
}

export interface QueryloomRuntimeOptions {
  /** Base URL used to resolve data files. Defaults to the current document. */
  baseUrl?: string | URL;
}

function projectBaseUrl(baseUrl?: string | URL): URL {
  if (baseUrl) return new URL("./", baseUrl);
  if (typeof document !== "undefined") return new URL("./", document.baseURI);
  return new URL("./", import.meta.url);
}

function registeredFileName(resource: QueryloomResource): string {
  return resource.path ?? `external/${resource.name}.${resource.format}`;
}

function durationSince(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function reportResource(event: Record<string, unknown>): void {
  const environment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  if (environment?.DEV) console.debug("[queryloom] resource", event);
}

export class LocalDuckDBRuntime {
  private readonly config: QueryloomConfig;
  private readonly baseUrl: URL;
  private readonly readyPromise: Promise<void>;
  private db?: duckdb.AsyncDuckDB;
  private connection?: duckdb.AsyncDuckDBConnection;

  public constructor(config: QueryloomConfig, options: QueryloomRuntimeOptions = {}) {
    this.config = config;
    this.baseUrl = projectBaseUrl(options.baseUrl);
    this.readyPromise = this.initialize();
  }

  public ready(): Promise<void> {
    return this.readyPromise;
  }

  public async query<T>(sql: string): Promise<readonly T[]> {
    await this.readyPromise;
    const connection = this.connection;
    if (!connection) throw new Error("DuckDB connection is not available");
    const result = await connection.query(sql);
    return result.toArray() as T[];
  }

  public async dispose(): Promise<void> {
    await this.readyPromise;
    await this.connection?.close();
    await this.db?.terminate();
    this.connection = undefined;
    this.db = undefined;
  }

  private async initialize(): Promise<void> {
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: duckdbMvpWasm, mainWorker: duckdbMvpWorker },
      eh: { mainModule: duckdbEhWasm, mainWorker: duckdbEhWorker },
    });
    if (!bundle.mainModule || !bundle.mainWorker) {
      throw new Error("DuckDB-Wasm could not select a browser bundle");
    }

    const worker = new Worker(bundle.mainWorker);
    const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    const connection = await db.connect();
    this.db = db;
    this.connection = connection;

    const loadedResources = await fetchResources(this.config.resources, this.baseUrl);
    for (const { resource, data } of loadedResources) {
      const startedAt = performance.now();
      try {
        const fileName = registeredFileName(resource);
        await db.registerFileBuffer(fileName, data);
        await connection.query(resourceTableSql(resource.name, fileName, resource.format));
        reportResource({ resource: resource.name, phase: "register", durationMs: durationSince(startedAt) });
      } catch (cause) {
        reportResource({
          resource: resource.name,
          phase: "register",
          kind: "data",
          durationMs: durationSince(startedAt),
          cause,
        });
        throw new Error(`Could not register resource ${resource.name} (data)`, { cause });
      }
    }
  }
}
