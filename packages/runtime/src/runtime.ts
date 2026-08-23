import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbMvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { resourceTableSql } from "./sql.js";

export interface QueryloomResource {
  name: string;
  path: string;
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

    for (const resource of this.config.resources) {
      const url = new URL(resource.path, this.baseUrl);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load ${resource.name} from ${url}: ${response.status} ${response.statusText}`);
      }
      await db.registerFileBuffer(resource.path, new Uint8Array(await response.arrayBuffer()));
      await connection.query(resourceTableSql(resource.name, resource.path, resource.format));
    }
  }
}
