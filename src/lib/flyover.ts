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
 * The landmark lock at a stop, from the seconds since arrival: the reticle closes in for `close`
 * seconds (lock 0 to 1), and the panel may open once it is done.
 */
export function lockAt(seconds: number, close = 0.9) {
  if (seconds <= 0) return { lock: 0, done: false };
  return { lock: Math.min(seconds / close, 1), done: seconds >= close };
}

/**
 * When the drone's lidar first reaches each cell of a grid: the distance flown (km) at the first
 * path sample within `range` of the cell's centre, or Infinity if it never does. The drone flies
 * `samples` in order (x, z in km, spaced `step` km apart). Cells are `cell` km square, covering
 * [x0, x0 + cols*cell) by [z0, z0 + rows*cell). This is what makes the map appear scan by scan.
 */
export function revealGrid(
  samples: { x: number; z: number }[],
  step: number,
  range: number,
  grid: { x0: number; z0: number; cols: number; rows: number; cell: number },
) {
  const { x0, z0, cols, rows, cell } = grid;
  const out = new Float32Array(cols * rows).fill(Infinity);
  const reach = Math.ceil(range / cell);
  samples.forEach((s, i) => {
    const cc = Math.floor((s.x - x0) / cell), cr = Math.floor((s.z - z0) / cell);
    for (let r = Math.max(cr - reach, 0); r <= Math.min(cr + reach, rows - 1); r++) {
      for (let c = Math.max(cc - reach, 0); c <= Math.min(cc + reach, cols - 1); c++) {
        const k = r * cols + c;
        if (out[k] !== Infinity) continue;
        const dx = x0 + (c + 0.5) * cell - s.x, dz = z0 + (r + 0.5) * cell - s.z;
        if (dx * dx + dz * dz <= range * range) out[k] = i * step;
      }
    }
  });
  return out;
}

/** Moves a journey position toward the next or previous stop (stops sit at whole numbers). */
export function stopTarget(current: number, dir: 1 | -1, last: number) {
  const next = dir > 0 ? Math.floor(current + 0.02) + 1 : Math.ceil(current - 0.02) - 1;
  return Math.min(Math.max(next, 0), last);
}
