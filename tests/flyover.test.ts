import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeTerrarium, projector, sampleGrid, stopTarget, sweepAt, type TileMeta } from "../src/lib/flyover.ts";
import { route } from "../src/content.ts";

const india: TileMeta = JSON.parse(readFileSync(new URL("../public/terrain/india.json", import.meta.url), "utf8"));

test("the India tile covers the first three stops", () => {
  for (const stop of route.slice(0, 3)) {
    assert.ok(stop.coords.lat > india.south && stop.coords.lat < india.north, stop.id);
    assert.ok(stop.coords.lon > india.west && stop.coords.lon < india.east, stop.id);
  }
});

test("the projection keeps real distances (Chennai to Hyderabad is about 534 km)", () => {
  const p = projector(india);
  const a = p.toLocal(route[0].coords);
  const b = p.toLocal(route[1].coords);
  const km = Math.hypot(a.x - b.x, a.z - b.z);
  assert.ok(Math.abs(km - 534) < 534 * 0.01, `${km.toFixed(1)} km`);
  // north is -z, east is +x
  assert.ok(b.z < a.z && b.x < a.x);
  const back = p.toCoords(a.x, a.z);
  assert.ok(Math.abs(back.lat - route[0].coords.lat) < 1e-9 && Math.abs(back.lon - route[0].coords.lon) < 1e-9);
});

test("Terrarium decoding matches the encoding in scripts/terrain.mjs", () => {
  const encode = (m: number) => {
    const v = m + 32768;
    const whole = Math.floor(v);
    return [whole >> 8, whole & 255, Math.round((v - whole) * 256), 255];
  };
  const px = new Uint8Array([...encode(-3634), ...encode(0), ...encode(28.25), ...encode(2154)]);
  assert.deepEqual([...decodeTerrarium(px, 4)], [-3634, 0, 28.25, 2154]);
});

test("bilinear sampling interpolates between samples", () => {
  const h = new Float32Array([0, 10, 20, 30]);
  assert.equal(sampleGrid(h, 2, 2, 0.5, 0.5), 15);
  assert.equal(sampleGrid(h, 2, 2, 0, 0), 0);
});

test("the sweep grows, then settles", () => {
  assert.deepEqual(sweepAt(0), { sweep: 0, settle: 0, done: false });
  assert.equal(sweepAt(0.6).sweep, 0.5);
  assert.equal(sweepAt(1.2).done, true);
  assert.equal(sweepAt(10).settle, 1);
});

test("next and previous stop stay inside the route", () => {
  assert.equal(stopTarget(0, 1, 1), 1);
  assert.equal(stopTarget(0.4, 1, 1), 1);
  assert.equal(stopTarget(1, 1, 1), 1);
  assert.equal(stopTarget(1, -1, 1), 0);
  assert.equal(stopTarget(0.6, -1, 1), 0);
});
