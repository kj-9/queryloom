export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function quoteString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function resourceTableSql(name: string, path: string, format: "csv" | "parquet"): string {
  const reader = format === "csv" ? `read_csv_auto(${quoteString(path)}, HEADER = true, AUTO_DETECT = true)` : `read_parquet(${quoteString(path)})`;
  return `CREATE OR REPLACE TABLE ${quoteIdentifier(name)} AS SELECT * FROM ${reader}`;
}
