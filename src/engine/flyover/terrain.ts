// Loads a terrain tile (Terrarium PNG from scripts/terrain.mjs) and builds the terrain mesh the
// drone reveals: real heights drawn 12 times taller, the sea flat at 0 m, imagery coordinates, and
// for each vertex the first path sample whose lidar scan reaches it.
import * as THREE from "three";
import { EXAGGERATION, decodeTerrarium, projector, revealGrid, sampleGrid, type TileMeta } from "@/lib/flyover";

export type Tile = { meta: TileMeta; heights: Float32Array; proj: ReturnType<typeof projector> };

/** Downloads a file, reporting bytes as they arrive. */
export async function fetchBytes(url: string, onBytes: (loaded: number, total: number) => void) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url}: ${res.status}`);
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
  return new Blob(parts as BlobPart[]);
}

/** Downloads the tile and decodes its heights. */
export async function loadTile(name: string, onBytes: (loaded: number, total: number) => void): Promise<Tile> {
  const meta: TileMeta = await (await fetch(`/terrain/${name}.json`)).json();
  const blob = await fetchBytes(`/terrain/${name}.png`, onBytes);
  // no colour conversion: the pixels are numbers, not colours
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  return { meta, heights: decodeTerrarium(px, meta.width * meta.height), proj: projector(meta) };
}

/**
 * Downloads a colour image as a texture. Not flipped: the image's top row (north) is texture
 * row 0, so v = 0 is north in the mesh and globe coordinates.
 */
export async function loadImagery(name: string, onBytes: (loaded: number, total: number) => void) {
  const blob = await fetchBytes(`/terrain/imagery-${name}.jpg`, onBytes);
  const bmp = await createImageBitmap(blob);
  const tex = new THREE.Texture(bmp);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Height of the terrain in metres at a local x, z (km). */
export function metresAt(tile: Tile, x: number, z: number) {
  const { meta, proj } = tile;
  const col = ((x + proj.size.x / 2) / proj.size.x) * (meta.width - 1);
  const row = ((z + proj.size.z / 2) / proj.size.z) * (meta.height - 1);
  return sampleGrid(tile.heights, meta.width, meta.height, col, row);
}

/** Height of the drawn terrain (km, exaggerated; the sea is flat at 0) at a local x, z. */
export const heightAt = (tile: Tile, x: number, z: number) => (Math.max(metresAt(tile, x, z), 0) / 1000) * EXAGGERATION;

const pause = () => new Promise((r) => setTimeout(r, 0));

/**
 * The terrain mesh: one grid of vertices shared by 4 x 4 chunk meshes (one GPU copy, but chunks
 * outside the view are skipped). Built in slices with pauses, so it never blocks the page for long.
 */
export async function buildTerrain(tile: Tile, path: { x: number; z: number }[], range: number, material: THREE.Material) {
  const { meta, heights, proj } = tile;
  const w = meta.width, rows = meta.height;
  const dx = proj.size.x / (w - 1), dz = proj.size.z / (rows - 1);
  const x0 = -proj.size.x / 2, z0 = -proj.size.z / 2;
  const k = EXAGGERATION / 1000;
  const grid = { x0, z0, cols: Math.ceil(proj.size.x), rows: Math.ceil(proj.size.z), cell: 1 };
  const reveal = revealGrid(path, 1, range, grid);
  await pause();

  const n = w * rows;
  const pos = new Float32Array(n * 3), nrm = new Int8Array(n * 3), uv = new Float32Array(n * 2);
  const hm = new Float32Array(n), rev = new Float32Array(n);
  const land = (i: number) => Math.max(heights[i], 0) * k;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      const x = x0 + c * dx, z = z0 + r * dz;
      pos[i * 3] = x;
      pos[i * 3 + 1] = land(i);
      pos[i * 3 + 2] = z;
      // normal from the slope between neighbours, packed as 8-bit integers
      const hl = land(r * w + Math.max(c - 1, 0)), hr = land(r * w + Math.min(c + 1, w - 1));
      const hu = land(Math.max(r - 1, 0) * w + c), hd = land(Math.min(r + 1, rows - 1) * w + c);
      const nx = -(hr - hl) / (2 * dx), nz = -(hd - hu) / (2 * dz);
      const len = Math.hypot(nx, 1, nz);
      nrm[i * 3] = Math.round((nx / len) * 127);
      nrm[i * 3 + 1] = Math.round((1 / len) * 127);
      nrm[i * 3 + 2] = Math.round((nz / len) * 127);
      uv[i * 2] = c / (w - 1);
      uv[i * 2 + 1] = r / (rows - 1);
      hm[i] = heights[i];
      const cell = Math.min(Math.floor(z - z0), grid.rows - 1) * grid.cols + Math.min(Math.floor(x - x0), grid.cols - 1);
      rev[i] = reveal[cell] === Infinity ? -1 : reveal[cell];
    }
    if (r % 120 === 0) await pause();
  }
  const attrs = {
    position: new THREE.BufferAttribute(pos, 3),
    normal: new THREE.BufferAttribute(nrm, 3, true),
    uv: new THREE.BufferAttribute(uv, 2),
    aH: new THREE.BufferAttribute(hm, 1),
    aReveal: new THREE.BufferAttribute(rev, 1),
  };

  const group = new THREE.Group();
  const N = 4;
  for (let cy = 0; cy < N; cy++) {
    for (let cx = 0; cx < N; cx++) {
      const c0 = Math.floor((cx * (w - 1)) / N), c1 = Math.floor(((cx + 1) * (w - 1)) / N);
      const r0 = Math.floor((cy * (rows - 1)) / N), r1 = Math.floor(((cy + 1) * (rows - 1)) / N);
      const index = new Uint32Array((c1 - c0) * (r1 - r0) * 6);
      let m = 0, lo = Infinity, hi = -Infinity;
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          const a = r * w + c, b = a + 1, d = a + w, e = d + 1;
          index[m++] = a; index[m++] = d; index[m++] = b;
          index[m++] = b; index[m++] = d; index[m++] = e;
        }
      }
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const y = pos[(r * w + c) * 3 + 1];
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
      const geo = new THREE.BufferGeometry();
      for (const [key, a] of Object.entries(attrs)) geo.setAttribute(key, a);
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      // bounds from this chunk's own part of the grid (the shared attributes cover the whole tile)
      const box = new THREE.Box3(new THREE.Vector3(x0 + c0 * dx, lo, z0 + r0 * dz), new THREE.Vector3(x0 + c1 * dx, hi, z0 + r1 * dz));
      geo.boundingBox = box;
      geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      group.add(new THREE.Mesh(geo, material));
    }
  }
  return group;
}
