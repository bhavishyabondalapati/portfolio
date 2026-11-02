// Map-margin coordinates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCoords } from "../src/lib/geo.ts";

test("north/east and south/west are labelled, not signed", () => {
  assert.equal(formatCoords({ lat: 42.3398, lon: -71.0892 }), "42.3398° N · 71.0892° W");
  assert.equal(formatCoords({ lat: -33.8688, lon: 151.2093 }, 2), "33.87° S · 151.21° E");
});

test("stop labels carry city, state, country and short coordinates", async () => {
  const { placeLine } = await import("../src/lib/geo.ts");
  const { route } = await import("../src/content.ts");
  assert.equal(placeLine(route[0]), "Chennai, Tamil Nadu, India · 12.82° N, 80.04° E");
  assert.equal(placeLine(route[3]), "Boston, Massachusetts, USA · 42.34° N, 71.09° W");
});
