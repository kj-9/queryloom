import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { inspectResources, renderInspection } from "./inspect.js";

const exampleDir = path.resolve(import.meta.dirname, "../../../examples/revenue-dashboard");

test("inspects a configured CSV resource through DuckDB-Wasm", async () => {
  const inspection = await inspectResources(exampleDir, [{ name: "revenue", path: "data/revenue.csv", format: "csv" }]);
  const table = inspection.resources[0]?.tables[0];

  assert.equal(table?.rowCount, 12);
  assert.deepEqual(table?.columns.map((column) => column.name), ["month", "region", "revenue"]);
  assert.equal(table?.columns.find((column) => column.name === "revenue")?.minimum, 31000);
  assert.equal(table?.sample.length, 5);
  assert.match(renderInspection(inspection, "markdown"), /12 rows/);
});
