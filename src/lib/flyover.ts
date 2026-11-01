// Pure maths for the flyover, kept free of three.js so it can be unit tested.
import type { Coords } from "../content.ts";

/** Heights are drawn 12 times taller than they are; the corner label says so. */
export const EXAGGERATION = 12;

/** Size and bounds of a terrain tile, as written by scripts/terrain.mjs. */
export type TileMeta = { width: number; height: number; west: number; east: number; south: number; north: number };

/**
 * A flat map projection for one region: kilometres east (x) and south (z) of the tile's centre,
 * with the east-west scale taken at the centre latitude. Over a few hundred kilometres the error
 * is under 1%, which is fine for a picture.
 */
export function projector(tile: TileMeta) {
  const lat0 = (tile.south + tile.north) / 2;
  const lon0 = (tile.west + tile.east) / 2;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const kz = 110.57;
  return {
    toLocal: (c: Coords) => ({ x: (c.lon - lon0) * kx, z: -(c.lat - lat0) * kz }),
    toCoords: (x: number, z: number): Coords => ({ lat: lat0 - z / kz, lon: lon0 + x / kx }),
    /** width and depth of the tile in km */
    size: { x: (tile.east - tile.west) * kx, z: (tile.north - tile.south) * kz },
  };
}

/** Terrarium PNG pixels (RGBA) to metres: R*256 + G + B/256 - 32768. */
export function decodeTerrarium(rgba: Uint8ClampedArray | Uint8Array, count: number) {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = rgba[i * 4] * 256 + rgba[i * 4 + 1] + rgba[i * 4 + 2] / 256 - 32768;
  return out;
}

/** Bilinear height in metres at a point given in grid units (column, row from the north edge). */
export function sampleGrid(h: Float32Array, w: number, rows: number, col: number, row: number) {
  const c = Math.min(Math.max(col, 0), w - 1.001);
  const r = Math.min(Math.max(row, 0), rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r);
  const fc = c - c0, fr = r - r0;
  const i = r0 * w + c0;
  const top = h[i] * (1 - fc) + h[i + 1] * fc;
  const bottom = h[i + w] * (1 - fc) + h[i + w + 1] * fc;
  return top * (1 - fr) + bottom * fr;
}

/**
 * The scan sweep at a stop, from the seconds since arrival. The ring grows for `grow` seconds
 * (sweep 0 to 1), then the filled mask cells fade back to outlines over `settle` seconds.
 */
export function sweepAt(seconds: number, grow = 1.2, settle = 1.6) {
  if (seconds <= 0) return { sweep: 0, settle: 0, done: false };
  const sweep = Math.min(seconds / grow, 1);
  const s = Math.min(Math.max((seconds - grow) / settle, 0), 1);
  return { sweep, settle: s, done: seconds >= grow };
}

/** Moves a journey position toward the next or previous stop (stops sit at whole numbers). */
export function stopTarget(current: number, dir: 1 | -1, last: number) {
  const next = dir > 0 ? Math.floor(current + 0.02) + 1 : Math.ceil(current - 0.02) - 1;
  return Math.min(Math.max(next, 0), last);
}
