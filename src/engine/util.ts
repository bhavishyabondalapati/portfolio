// Small math and canvas helpers shared by the scene.
// mulberry32, damp, fbmCanvas and normalFromHeight follow the approach in ThreeUI's
// Temple Night renderer (MIT, Meng To); see THIRD_PARTY_NOTICES.md.
import * as THREE from "three";

export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Frame-rate independent smoothing: moves `cur` toward `to` at `rate` per second. */
export const damp = (cur: number, to: number, rate: number, dt: number) => lerp(cur, to, 1 - Math.exp(-rate * dt));

/** Seeded random numbers, so the house looks the same on every visit. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement) {
  const x = c.getContext("2d");
  if (!x) throw new Error("2D canvas unavailable");
  return x;
}

/**
 * Cheap layered noise: small random grids scaled up and overlaid.
 * cellsX/cellsY control the grain direction (long cells give wood grain).
 */
export function fbmCanvas(w: number, h: number, seed: number, octaves = 5, cellsX = 3, cellsY = cellsX, contrast = 1) {
  const out = canvas(w, h);
  const o = ctx2d(out);
  o.fillStyle = "#808080";
  o.fillRect(0, 0, w, h);
  let cx = cellsX;
  let cy = cellsY;
  let alpha = 1;
  for (let i = 0; i < octaves; i++) {
    const n = canvas(cx, cy);
    const nx = ctx2d(n);
    const im = nx.createImageData(cx, cy);
    const r = mulberry32(seed + i * 977);
    for (let k = 0; k < cx * cy; k++) {
      const v = clamp(128 + (r() - 0.5) * 255 * contrast, 0, 255);
      im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = v;
      im.data[k * 4 + 3] = 255;
    }
    nx.putImageData(im, 0, 0);
    o.globalAlpha = alpha;
    o.globalCompositeOperation = i === 0 ? "source-over" : "overlay";
    o.imageSmoothingEnabled = true;
    o.imageSmoothingQuality = "high";
    o.drawImage(n, 0, 0, w, h);
    cx *= 2;
    cy *= 2;
    alpha *= 0.62;
  }
  o.globalAlpha = 1;
  o.globalCompositeOperation = "source-over";
  return out;
}

/** Turns a greyscale height canvas into a tangent-space normal map (Sobel on a blurred copy). */
export function normalFromHeight(hc: HTMLCanvasElement, strength = 2.4) {
  const w = hc.width;
  const h = hc.height;
  const b = canvas(w, h);
  const bx = ctx2d(b);
  bx.filter = "blur(1px)";
  bx.drawImage(hc, 0, 0);
  bx.filter = "none";
  const src = bx.getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const ox = ctx2d(out);
  const im = ox.createImageData(w, h);
  const at = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const gy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const il = 1 / Math.hypot(gx, gy, 1);
      const i = (y * w + x) * 4;
      im.data[i] = (-gx * il * 0.5 + 0.5) * 255;
      im.data[i + 1] = (gy * il * 0.5 + 0.5) * 255;
      im.data[i + 2] = (il * 0.5 + 0.5) * 255;
      im.data[i + 3] = 255;
    }
  }
  ox.putImageData(im, 0, 0);
  return out;
}

export type TexOpts = { repeat?: [number, number]; srgb?: boolean; aniso?: number; clamp?: boolean };

export function tex(c: HTMLCanvasElement, o: TexOpts = {}) {
  const t = new THREE.CanvasTexture(c);
  const wrap = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.wrapS = t.wrapT = wrap;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  t.anisotropy = o.aniso ?? 8;
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Overlays noise onto a painted canvas to break up flat colour. */
export function mottle(x: CanvasRenderingContext2D, w: number, h: number, seed: number, alpha: number, cells = 4, cellsY = cells) {
  x.save();
  x.globalCompositeOperation = "overlay";
  x.globalAlpha = alpha;
  x.drawImage(fbmCanvas(Math.min(w, 512), Math.min(h, 512), seed, 5, cells, cellsY), 0, 0, w, h);
  x.restore();
}
