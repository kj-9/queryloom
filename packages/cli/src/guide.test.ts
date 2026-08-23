import assert from "node:assert/strict";
import { test } from "node:test";
import { guide, renderGuide } from "./guide.js";

test("renders the agent guide as markdown and JSON", () => {
  assert.match(renderGuide(), /Queryloom dashboard guide/);
  assert.match(renderGuide(), /Visual direction/);
  assert.match(renderGuide(), /#0777b3/);
  assert.deepEqual(JSON.parse(renderGuide("json")), guide);
});
