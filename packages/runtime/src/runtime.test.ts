import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchResources } from "./resource-loader.js";

test("fetches independent resources concurrently and reports actionable failures", async () => {
  const originalFetch = globalThis.fetch;
  const started: string[] = [];
  let releaseFirst: (() => void) | undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  globalThis.fetch = async (input) => {
    const source = String(input);
    started.push(source);
    if (source.endsWith("first.csv")) await firstGate;
    return new Response("value\n1\n");
  };

  try {
    const loading = fetchResources(
      [
        { name: "first", path: "first.csv", format: "csv" },
        { name: "second", path: "second.csv", format: "csv" },
      ],
      new URL("https://example.test/dashboard/"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(started, [
      "https://example.test/dashboard/first.csv",
      "https://example.test/dashboard/second.csv",
    ]);
    releaseFirst?.();
    assert.equal((await loading)[1]?.data.byteLength, 8);

    globalThis.fetch = async () => new Response("missing", { status: 404, statusText: "Not Found" });
    await assert.rejects(
      () =>
        fetchResources(
          [{ name: "missing", url: "https://cdn.example.test/missing.csv", format: "csv" }],
          new URL("https://example.test/"),
        ),
      /Could not fetch resource missing.*\(http\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
