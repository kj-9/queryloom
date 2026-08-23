import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeConfig } from "./config.js";

test("normalizes array and map resources without allowing path traversal", () => {
  const config = normalizeConfig(
    {
      resources: {
        revenue: { path: "data/revenue.csv" },
        events: { path: "data/events.parquet" },
      },
    },
    "/tmp/dashboard",
  );

  assert.deepEqual(config.resources, [
    { name: "revenue", path: "data/revenue.csv", format: "csv" },
    { name: "events", path: "data/events.parquet", format: "parquet" },
  ]);
  assert.throws(
    () => normalizeConfig({ resources: [{ name: "bad", path: "../secret.csv" }] }, "/tmp/dashboard"),
    /inside the dashboard/,
  );
});
