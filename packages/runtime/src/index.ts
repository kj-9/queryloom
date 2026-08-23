import { LocalDuckDBRuntime, type QueryloomConfig, type QueryloomRuntimeOptions } from "./runtime.js";

let activeRuntime: LocalDuckDBRuntime | undefined;

/** Configure the single local DuckDB-Wasm runtime used by the dashboard. */
export function configure(config: QueryloomConfig, options?: QueryloomRuntimeOptions): LocalDuckDBRuntime {
  activeRuntime = new LocalDuckDBRuntime(config, options);
  return activeRuntime;
}

/** Run SQL against the configured local DuckDB-Wasm database. */
export async function query<T>(sql: string): Promise<readonly T[]> {
  if (!activeRuntime) {
    throw new Error("Queryloom is not configured. The CLI-generated entry configures it before mounting the dashboard.");
  }
  return activeRuntime.query<T>(sql);
}

export { LocalDuckDBRuntime };
export type { QueryloomConfig, QueryloomRuntimeOptions };
