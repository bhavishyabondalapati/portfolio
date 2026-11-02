import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeTerrarium, lockAt, projector, revealGrid, sampleGrid, stopTarget, type TileMeta } from "../src/lib/flyover.ts";
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

test("the landmark lock closes, then is done", () => {
  assert.deepEqual(lockAt(0), { lock: 0, done: false });
  assert.equal(lockAt(0.45).lock, 0.5);
  assert.equal(lockAt(0.9).done, true);
});

test("the map is revealed in flight order, only within lidar range", () => {
  // a drone flying east along z = 0.5 from x = 0 to x = 9, range 2 km, over a 10 x 6 grid of 1 km cells
  const samples = Array.from({ length: 10 }, (_, i) => ({ x: i, z: 0.5 }));
  const grid = { x0: 0, z0: -1.5, cols: 10, rows: 6, cell: 1 };
  const r = revealGrid(samples, 1, 2, grid);
  const at = (x: number, z: number) => r[Math.floor(z - grid.z0) * grid.cols + Math.floor(x)];
  assert.equal(at(0.5, 0.5), 0); // under the start
  assert.equal(at(4.5, 0.5), 3); // reached at 3 km: centre 4.5 is within 2 km of x = 3
  assert.ok(at(9.5, 0.5) < at(9.5, -1.5) || at(9.5, -1.5) === Infinity);
  assert.equal(at(0.5, 4.0), Infinity); // cell centre 3.5 km from the path: never scanned
  for (let x = 1; x < 9; x++) assert.ok(at(x + 0.5, 0.5) >= at(x - 0.5, 0.5)); // later cells, later scans
});

test("next and previous stop stay inside the route", () => {
  assert.equal(stopTarget(0, 1, 1), 1);
  assert.equal(stopTarget(0.4, 1, 1), 1);
  assert.equal(stopTarget(1, 1, 1), 1);
  assert.equal(stopTarget(1, -1, 1), 0);
  assert.equal(stopTarget(0.6, -1, 1), 0);
});
