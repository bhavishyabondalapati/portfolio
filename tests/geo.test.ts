// Map-margin coordinates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCoords } from "../src/lib/geo.ts";

test("north/east and south/west are labelled, not signed", () => {
  assert.equal(formatCoords({ lat: 42.3398, lon: -71.0892 }), "42.3398° N · 71.0892° W");
  assert.equal(formatCoords({ lat: -33.8688, lon: 151.2093 }, 2), "33.87° S · 151.21° E");
});
