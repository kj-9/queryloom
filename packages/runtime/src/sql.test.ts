import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteIdentifier, quoteString, resourceTableSql } from "./sql.js";

test("quotes resource names and paths for DuckDB SQL", () => {
  assert.equal(quoteIdentifier('sales"2026'), '"sales""2026"');
  assert.equal(quoteString("data/it's.csv"), "'data/it''s.csv'");
  assert.match(resourceTableSql("revenue", "data/revenue.csv", "csv"), /read_csv_auto/);
  assert.match(resourceTableSql("events", "data/events.parquet", "parquet"), /read_parquet/);
});
