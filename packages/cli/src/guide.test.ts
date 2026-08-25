import assert from "node:assert/strict";
import { test } from "node:test";
import { guide, renderDesignGuide, renderGuide } from "./guide.js";

test("renders the agent guide as markdown and JSON", () => {
  assert.match(renderGuide(), /Queryloom dashboard guide/);
  assert.match(renderGuide(), /Visual direction/);
  assert.match(renderGuide(), /#0777b3/);
  assert.match(renderGuide(), /marks.*snippet/);
  assert.match(renderGuide(), /selected value from the event/);
  assert.match(renderGuide(), /Keep the page shell stable/);
  assert.equal(JSON.parse(renderGuide("json")).version, 4);
  assert.deepEqual(JSON.parse(renderGuide("json")), guide);
});

test("renders the data-design guide for agents", () => {
  assert.match(renderDesignGuide(), /queryloom inspect --root/);
  assert.match(renderDesignGuide(), /local data input/);
  assert.match(renderDesignGuide(), /\.duckdb/);
  assert.match(renderDesignGuide(), /Prepare 2–3/);
  assert.match(renderDesignGuide(), /Do not author/);
  assert.match(renderDesignGuide(), /bun run build/);
  assert.match(renderDesignGuide(), /do not invent joins/);
  assert.equal(JSON.parse(renderDesignGuide("json")).version, 3);
});
