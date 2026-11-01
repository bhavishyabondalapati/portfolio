// Loads a terrain tile (Terrarium PNG from scripts/terrain.mjs) and turns it into a mesh.
import * as THREE from "three";
import { EXAGGERATION, decodeTerrarium, projector, sampleGrid, type TileMeta } from "@/lib/flyover";

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

/** Height of the drawn terrain (km, exaggerated) at a local x, z. */
export function heightAt(tile: Tile, x: number, z: number) {
  const { meta, proj } = tile;
  const col = ((x + proj.size.x / 2) / proj.size.x) * (meta.width - 1);
  const row = ((z + proj.size.z / 2) / proj.size.z) * (meta.height - 1);
  return (sampleGrid(tile.heights, meta.width, meta.height, col, row) / 1000) * EXAGGERATION;
}

/**
 * One grid of vertices shared by 4 x 4 chunk meshes. Sharing the attributes means the GPU gets one
 * copy, while each chunk has its own bounds, so chunks outside the view are skipped (culled).
 */
export function buildTerrain(tile: Tile, material: THREE.Material) {
  const { meta, heights, proj } = tile;
  const w = meta.width, rows = meta.height;
  const dx = proj.size.x / (w - 1), dz = proj.size.z / (rows - 1);
  const x0 = -proj.size.x / 2, z0 = -proj.size.z / 2;
  const k = EXAGGERATION / 1000;

  const pos = new Float32Array(w * rows * 3);
  // normals as 8-bit signed integers (a quarter of the upload of floats, no visible difference)
  const nrm = new Int8Array(w * rows * 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      pos[i * 3] = x0 + c * dx;
      pos[i * 3 + 1] = Math.max(heights[i], -4000) * k;
      pos[i * 3 + 2] = z0 + r * dz;
      // normal from the slope between neighbours (central differences)
      const hl = heights[r * w + Math.max(c - 1, 0)], hr = heights[r * w + Math.min(c + 1, w - 1)];
      const hu = heights[Math.max(r - 1, 0) * w + c], hd = heights[Math.min(r + 1, rows - 1) * w + c];
      const nx = (-(hr - hl) * k) / (2 * dx), nz = (-(hd - hu) * k) / (2 * dz);
      const len = Math.hypot(nx, 1, nz);
      nrm[i * 3] = Math.round((nx / len) * 127);
      nrm[i * 3 + 1] = Math.round((1 / len) * 127);
      nrm[i * 3 + 2] = Math.round((nz / len) * 127);
    }
  }
  const position = new THREE.BufferAttribute(pos, 3);
  const normal = new THREE.BufferAttribute(nrm, 3, true);

  const group = new THREE.Group();
  const N = 4;
  for (let cy = 0; cy < N; cy++) {
    for (let cx = 0; cx < N; cx++) {
      const c0 = Math.floor((cx * (w - 1)) / N), c1 = Math.floor(((cx + 1) * (w - 1)) / N);
      const r0 = Math.floor((cy * (rows - 1)) / N), r1 = Math.floor(((cy + 1) * (rows - 1)) / N);
      const index = new Uint32Array((c1 - c0) * (r1 - r0) * 6);
      let n = 0;
      let lo = Infinity, hi = -Infinity;
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          const a = r * w + c, b = a + 1, d = a + w, e = d + 1;
          index[n++] = a; index[n++] = d; index[n++] = b;
          index[n++] = b; index[n++] = d; index[n++] = e;
        }
      }
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const y = pos[(r * w + c) * 3 + 1];
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", position);
      geo.setAttribute("normal", normal);
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      // bounds from this chunk's own corner of the grid (the shared attribute covers the whole tile)
      const box = new THREE.Box3(new THREE.Vector3(x0 + c0 * dx, lo, z0 + r0 * dz), new THREE.Vector3(x0 + c1 * dx, hi, z0 + r1 * dz));
      geo.boundingBox = box;
      geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      group.add(new THREE.Mesh(geo, material));
    }
  }
  return group;
}
