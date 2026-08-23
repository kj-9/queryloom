import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as duckdb from "@duckdb/duckdb-wasm/blocking";
import type { QueryloomResource } from "./config.js";

export type InspectFormat = "markdown" | "json";
export type InspectableFormat = QueryloomResource["format"] | "duckdb";

export interface ColumnInspection {
  name: string;
  type: string;
  nullable: boolean;
  nullCount: number;
  distinctCount: number;
  minimum?: unknown;
  maximum?: unknown;
  average?: number;
}

export interface TableInspection {
  name: string;
  rowCount: number;
  columns: ColumnInspection[];
  sample: Record<string, unknown>[];
}

export interface ResourceInspection {
  name: string;
  path: string;
  format: InspectableFormat;
  tables: TableInspection[];
}

export interface DataInspection {
  version: 1;
  resources: ResourceInspection[];
}

interface TableInfoRow {
  name: string;
  type: string;
  notnull: boolean | number;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return Number.isSafeInteger(value) ? Number(value) : value.toString();
  if (value instanceof Date) return value.toISOString();
  const rendered = String(value);
  if (/^-?\d+$/.test(rendered)) {
    const numeric = Number(rendered);
    if (Number.isSafeInteger(numeric)) return numeric;
  }
  return rendered;
}

function normalizeColumnValue(value: unknown, type: string): unknown {
  const normalized = normalize(value);
  if (isNumeric(type) && typeof normalized === "string") {
    const numeric = Number(normalized);
    if (Number.isFinite(numeric) && Number.isSafeInteger(numeric)) return numeric;
  }
  return normalized;
}

function normalizeRows(rows: readonly Record<string, unknown>[], types: ReadonlyMap<string, string>): Record<string, unknown>[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeColumnValue(value, types.get(key) ?? "")] )));
}

function inferredFormat(filePath: string): InspectableFormat {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".csv") return "csv";
  if (extension === ".parquet" || extension === ".pq") return "parquet";
  if (extension === ".duckdb" || extension === ".db") return "duckdb";
  throw new Error(`Cannot infer a supported format for ${filePath}; use csv, parquet, or duckdb`);
}

function isNumeric(type: string): boolean {
  return /^(TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|UTINYINT|USMALLINT|UINTEGER|UBIGINT|FLOAT|DOUBLE|DECIMAL|REAL)/.test(type.toUpperCase());
}

function isComparable(type: string): boolean {
  return isNumeric(type) || /^(DATE|TIME|TIMESTAMP)/.test(type.toUpperCase());
}

async function createDatabase(): Promise<duckdb.DuckDBBindings> {
  const bundles = {
    mvp: { mainModule: fileURLToPath(import.meta.resolve("@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm")) },
    eh: { mainModule: fileURLToPath(import.meta.resolve("@duckdb/duckdb-wasm/dist/duckdb-eh.wasm")) },
  } as unknown as duckdb.DuckDBBundles;
  const database = await duckdb.createDuckDB(bundles, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await database.instantiate();
  return database;
}

function tableReaderSql(tableName: string, fileName: string, format: QueryloomResource["format"]): string {
  const reader = format === "csv" ? `read_csv_auto(${quoteString(fileName)}, HEADER = true, AUTO_DETECT = true)` : `read_parquet(${quoteString(fileName)})`;
  return `CREATE OR REPLACE TEMP TABLE ${quoteIdentifier(tableName)} AS SELECT * FROM ${reader}`;
}

function rows<T extends object>(result: { toArray(): T[] }): T[] {
  return result.toArray();
}

function scalar(result: { toArray(): Array<Record<string, unknown>> }, key: string): number {
  return Number(result.toArray()[0]?.[key] ?? 0);
}

function inspectTable(connection: duckdb.DuckDBConnection, tableName: string): TableInspection {
  const table = quoteIdentifier(tableName);
  const tableInfo = rows<TableInfoRow>(connection.query(`PRAGMA table_info(${quoteString(tableName)})`));
  const rowCount = scalar(connection.query(`SELECT COUNT(*) AS count FROM ${table}`), "count");
  const columns = tableInfo.map((column) => {
    const field = quoteIdentifier(column.name);
    const stats = rows<Record<string, unknown>>(connection.query(`
      SELECT
        COUNT(*) FILTER (WHERE ${field} IS NULL) AS nullCount,
        APPROX_COUNT_DISTINCT(${field}) AS distinctCount
        ${isComparable(column.type) ? `, MIN(${field}) AS minimum, MAX(${field}) AS maximum` : ""}
        ${isNumeric(column.type) ? `, AVG(${field}) AS average` : ""}
      FROM ${table}
    `))[0] ?? {};

    return {
      name: column.name,
      type: column.type,
      nullable: !Boolean(column.notnull),
      nullCount: Number(stats.nullCount ?? 0),
      distinctCount: Number(stats.distinctCount ?? 0),
      ...(isComparable(column.type) ? { minimum: normalizeColumnValue(stats.minimum, column.type), maximum: normalizeColumnValue(stats.maximum, column.type) } : {}),
      ...(isNumeric(column.type) ? { average: Number(stats.average ?? 0) } : {}),
    } satisfies ColumnInspection;
  });

  return {
    name: tableName,
    rowCount,
    columns,
    sample: normalizeRows(rows<Record<string, unknown>>(connection.query(`SELECT * FROM ${table} LIMIT 5`)), new Map(tableInfo.map((column) => [column.name, column.type]))),
  };
}

export async function inspectResources(projectDir: string, resources: QueryloomResource[]): Promise<DataInspection> {
  const database = await createDatabase();
  const connection = database.connect();

  try {
    const inspected = [];
    for (const resource of resources) {
      const absolutePath = path.resolve(projectDir, resource.path);
      const data = await readFile(absolutePath);
      await database.registerFileBuffer(resource.path, new Uint8Array(data));
      connection.query(tableReaderSql(resource.name, resource.path, resource.format));
      inspected.push({
        name: resource.name,
        path: resource.path,
        format: resource.format,
        tables: [inspectTable(connection, resource.name)],
      });
    }
    return { version: 1, resources: inspected };
  } finally {
    connection.close();
  }
}

export async function inspectPath(filePath: string): Promise<DataInspection> {
  const absolutePath = path.resolve(filePath);
  const format = inferredFormat(absolutePath);
  if (format !== "duckdb") {
    return inspectResources(path.dirname(absolutePath), [{ name: path.basename(absolutePath, path.extname(absolutePath)), path: path.basename(absolutePath), format }]);
  }

  const database = await createDatabase();
  const virtualPath = path.basename(absolutePath);
  await database.registerFileBuffer(virtualPath, new Uint8Array(await readFile(absolutePath)));
  database.open({ path: virtualPath, accessMode: duckdb.DuckDBAccessMode.READ_ONLY });
  const connection = database.connect();
  try {
    const tableNames = rows<{ table_name: string }>(connection.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `));
    return {
      version: 1,
      resources: [{
        name: path.basename(absolutePath, path.extname(absolutePath)),
        path: absolutePath,
        format,
        tables: tableNames.map((table) => inspectTable(connection, table.table_name)),
      }],
    };
  } finally {
    connection.close();
  }
}

export function renderInspection(inspection: DataInspection, format: InspectFormat): string {
  if (format === "json") return `${JSON.stringify(inspection, null, 2)}\n`;

  const sections = inspection.resources.flatMap((resource) => [
    `## ${resource.name}`,
    `- Source: \`${resource.path}\` (${resource.format})`,
    ...resource.tables.flatMap((table) => [
      `- Table: \`${table.name}\` · ${table.rowCount.toLocaleString("en-US")} rows`,
      "",
      "| Column | Type | Nulls | Distinct | Range / average |",
      "| --- | --- | ---: | ---: | --- |",
      ...table.columns.map((column) => `| ${column.name} | ${column.type} | ${column.nullCount.toLocaleString("en-US")} | ${column.distinctCount.toLocaleString("en-US")} | ${column.minimum === undefined ? "—" : `${String(column.minimum)}–${String(column.maximum)}${column.average === undefined ? "" : ` · avg ${column.average.toFixed(2)}`}`} |`),
      "",
      "Sample (first 5 rows):",
      "```json",
      JSON.stringify(table.sample, null, 2),
      "```",
    ]),
  ]);
  return `# Queryloom data inspection\n\n${sections.join("\n")}\n`;
}
