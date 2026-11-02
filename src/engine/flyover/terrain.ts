// Loads a terrain tile (Terrarium PNG from scripts/terrain.mjs) and turns the part the drone
// scans into a lidar-style point cloud.
import * as THREE from "three";
import { EXAGGERATION, decodeTerrarium, projector, revealGrid, sampleGrid, type TileMeta } from "@/lib/flyover";
import { mulberry32 } from "../util";

export type Tile = { meta: TileMeta; heights: Float32Array; proj: ReturnType<typeof projector> };

/** Downloads the tile, reporting bytes as they arrive, and decodes its heights. */
export async function loadTile(name: string, onBytes: (loaded: number, total: number) => void): Promise<Tile> {
  const meta: TileMeta = await (await fetch(`/terrain/${name}.json`)).json();
  const res = await fetch(`/terrain/${name}.png`);
  if (!res.ok || !res.body) throw new Error(`terrain ${name}: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    onBytes(loaded, total);
  }
  // no colour conversion: the pixels are numbers, not colours
  const bmp = await createImageBitmap(new Blob(parts as BlobPart[], { type: "image/png" }), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  return { meta, heights: decodeTerrarium(px, meta.width * meta.height), proj: projector(meta) };
}

/** Height of the terrain in metres at a local x, z (km). */
export function metresAt(tile: Tile, x: number, z: number) {
  const { meta, proj } = tile;
  const col = ((x + proj.size.x / 2) / proj.size.x) * (meta.width - 1);
  const row = ((z + proj.size.z / 2) / proj.size.z) * (meta.height - 1);
  return sampleGrid(tile.heights, meta.width, meta.height, col, row);
}

/** Height of the drawn terrain (km, exaggerated) at a local x, z. */
export const heightAt = (tile: Tile, x: number, z: number) => (metresAt(tile, x, z) / 1000) * EXAGGERATION;

const CELL = 1; // km
const pause = () => new Promise((r) => setTimeout(r, 0));

/**
 * The lidar returns along a flight path: `perSide` x `perSide` per square km on a regular
 * lattice, everywhere the drone's scan ever reaches, on land only (water sends no returns). Each
 * point carries the index of the first path sample whose scan reached it (aReveal), a hillshade
 * value (aShade) and a random seed for its scatter. Built in slices with pauses between them, so
 * a long flight never blocks the page for long.
 */
export async function buildCloud(tile: Tile, path: { x: number; z: number }[], range: number, perSide: number, material: THREE.Material) {
  const { proj } = tile;
  const grid = { x0: -proj.size.x / 2, z0: -proj.size.z / 2, cols: Math.floor(proj.size.x / CELL), rows: Math.floor(proj.size.z / CELL), cell: CELL };
  const reveal = revealGrid(path, 1, range, grid);
  let cells = 0;
  for (let k = 0; k < reveal.length; k++) if (reveal[k] !== Infinity) cells++;
  const max = cells * perSide * perSide;
  const pos = new Float32Array(max * 3), rev = new Float32Array(max), shade = new Float32Array(max), seed = new Float32Array(max);

  const rand = mulberry32(42);
  const light = new THREE.Vector3(-0.6, 0.75, -0.3).normalize(); // from the north-west, as on printed relief
  const n = new THREE.Vector3();
  const d = 0.25;
  let count = 0, done = 0;
  for (let k = 0; k < reveal.length; k++) {
    if (reveal[k] === Infinity) continue;
    const c = k % grid.cols, r = Math.floor(k / grid.cols);
    for (let i = 0; i < perSide * perSide; i++) {
      // a regular lattice: the clean map the scattered returns settle into
      const x = grid.x0 + (c + ((i % perSide) + 0.5) / perSide) * CELL;
      const z = grid.z0 + (r + (Math.floor(i / perSide) + 0.5) / perSide) * CELL;
      if (metresAt(tile, x, z) <= 0) continue;
      const gx = (heightAt(tile, x + d, z) - heightAt(tile, x - d, z)) / (2 * d);
      const gz = (heightAt(tile, x, z + d) - heightAt(tile, x, z - d)) / (2 * d);
      n.set(-gx, 1, -gz).normalize();
      pos[count * 3] = x;
      pos[count * 3 + 1] = heightAt(tile, x, z);
      pos[count * 3 + 2] = z;
      rev[count] = reveal[k];
      shade[count] = Math.max(n.dot(light), 0);
      seed[count] = rand();
      count++;
    }
    if (++done % 4000 === 0) await pause();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos.subarray(0, count * 3), 3));
  geo.setAttribute("aReveal", new THREE.BufferAttribute(rev.subarray(0, count), 1));
  geo.setAttribute("aShade", new THREE.BufferAttribute(shade.subarray(0, count), 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed.subarray(0, count), 1));
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false; // one cloud; the vertex shader hides what isn't scanned yet
  return points;
}
