import assert from "node:assert/strict";
import { test } from "node:test";
import { guide, renderDesignGuide, renderGuide } from "./guide.js";

test("renders the agent guide as markdown and JSON", () => {
  assert.match(renderGuide(), /Queryloom dashboard guide/);
  assert.match(renderGuide(), /Visual direction/);
  assert.match(renderGuide(), /#0777b3/);
  assert.match(renderGuide(), /marks.*snippet/);
  assert.deepEqual(JSON.parse(renderGuide("json")), guide);
});

test("renders the data-design guide for agents", () => {
  assert.match(renderDesignGuide(), /queryloom inspect --root/);
  assert.match(renderDesignGuide(), /Do not invent joins/);
  assert.equal(JSON.parse(renderDesignGuide("json")).version, 1);
});
