// Every surface in the house is painted here on a canvas at load time: no image downloads.
import { canvas, ctx2d, fbmCanvas, mottle, mulberry32, normalFromHeight, TAU } from "./util";

export type Surface = { map: HTMLCanvasElement; normal?: HTMLCanvasElement; rough?: HTMLCanvasElement };

/** Lime-white egg plaster: chalky, slightly uneven, a little warmer near the floor. */
export function plaster(seed = 11): Surface {
  const W = 512;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.fillStyle = "#ece8de";
  x.fillRect(0, 0, W, W);
  mottle(x, W, W, seed, 0.18, 3);
  mottle(x, W, W, seed + 5, 0.08, 24);
  const h = fbmCanvas(256, 256, seed + 9, 5, 6, 6, 0.6);
  return { map: c, normal: normalFromHeight(h, 0.6) };
}

/** Burma teak: long grain, deep brown, oiled. */
export function teak(seed = 21, base = "#5b321b"): Surface {
  const W = 512;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.fillStyle = base;
  x.fillRect(0, 0, W, W);
  x.save();
  x.globalCompositeOperation = "overlay";
  x.globalAlpha = 0.55;
  // narrow, tall noise cells give grain that runs along v (up a pillar, down a door)
  x.drawImage(fbmCanvas(W, W, seed, 6, 24, 2, 1.1), 0, 0);
  x.restore();
  const r = mulberry32(seed);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = r() > 0.5 ? "rgba(20,8,2,.16)" : "rgba(160,95,50,.10)";
    x.fillRect(r() * W, 0, 0.6 + r() * 2.2, W);
  }
  const h = fbmCanvas(256, 256, seed + 3, 5, 18, 2, 1);
  return { map: c, normal: normalFromHeight(h, 1.2) };
}

/** Polished red oxide floor: deep red, glossy, faint trowel marks. */
export function redOxide(seed = 31): Surface {
  const W = 512;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.fillStyle = "#8a2f22";
  x.fillRect(0, 0, W, W);
  mottle(x, W, W, seed, 0.28, 3);
  const rough = canvas(256, 256);
  const rx = ctx2d(rough);
  rx.fillStyle = "#3a3a3a";
  rx.fillRect(0, 0, 256, 256);
  rx.globalAlpha = 0.7;
  rx.globalCompositeOperation = "lighten";
  rx.drawImage(fbmCanvas(256, 256, seed + 2, 4, 3, 3, 1.3), 0, 0);
  return { map: c, rough };
}

/** Packed earth of the front yard, swept smooth. */
export function earth(seed = 41): Surface {
  const W = 1024;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.fillStyle = "#b98a62";
  x.fillRect(0, 0, W, W);
  mottle(x, W, W, seed, 0.35, 4);
  mottle(x, W, W, seed + 1, 0.12, 64);
  const r = mulberry32(seed);
  for (let i = 0; i < 900; i++) {
    const s = 0.8 + r() * 2.4;
    x.fillStyle = r() > 0.5 ? "rgba(70,40,20,.28)" : "rgba(240,215,180,.30)";
    x.beginPath();
    x.arc(r() * W, r() * W, s, 0, TAU);
    x.fill();
  }
  // broom strokes
  x.strokeStyle = "rgba(90,55,30,.07)";
  for (let i = 0; i < 260; i++) {
    const y = r() * W;
    x.lineWidth = 1 + r() * 2;
    x.beginPath();
    x.moveTo(r() * W, y);
    x.quadraticCurveTo(r() * W, y + (r() - 0.5) * 40, r() * W, y + (r() - 0.5) * 20);
    x.stroke();
  }
  const h = fbmCanvas(256, 256, seed + 4, 5, 8, 8, 1);
  return { map: c, normal: normalFromHeight(h, 1.4) };
}

/** Mangalore clay tiles in overlapping rows (u runs along the ridge, v down the slope). */
export function roofTiles(seed = 51): Surface {
  const W = 512;
  const H = 512;
  const c = canvas(W, H);
  const x = ctx2d(c);
  const hc = canvas(W, H);
  const hx = ctx2d(hc);
  x.fillStyle = "#9b4a2c";
  x.fillRect(0, 0, W, H);
  hx.fillStyle = "#606060";
  hx.fillRect(0, 0, W, H);
  const r = mulberry32(seed);
  const rows = 8;
  const cols = 8;
  const rh = H / rows;
  const cw = W / cols;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const t = 0.82 + r() * 0.3;
      const off = j % 2 ? cw / 2 : 0;
      const px = i * cw + off;
      x.fillStyle = `rgb(${(170 * t) | 0},${(82 * t) | 0},${(48 * t) | 0})`;
      x.fillRect(px + 2, j * rh + 2, cw - 4, rh - 3);
      x.fillStyle = "rgba(255,210,170,.10)";
      x.fillRect(px + 2, j * rh + 2, cw - 4, rh * 0.25);
      x.fillStyle = "rgba(40,10,4,.35)";
      x.fillRect(px + 2, j * rh + rh - 6, cw - 4, 4);
      hx.fillStyle = "#c8c8c8";
      hx.fillRect(px + 3, j * rh + 3, cw - 6, rh - 8);
      if (off) {
        x.fillRect(px - W + 2, j * rh + 2, cw - 4, rh - 3);
      }
    }
  }
  mottle(x, W, H, seed + 2, 0.3, 4);
  // lichen and soot
  x.save();
  x.globalAlpha = 0.18;
  x.globalCompositeOperation = "multiply";
  x.drawImage(fbmCanvas(256, 256, seed + 7, 4, 3, 3, 1.4), 0, 0, W, H);
  x.restore();
  return { map: c, normal: normalFromHeight(hc, 2.2) };
}

/**
 * Carved door leaf: a teak grid of recessed panels, each with a lotus rosette,
 * and brass studs where the rails cross. Height map drives the normal map.
 */
export function doorLeaf(seed = 61): Surface {
  const W = 512;
  const H = 1024;
  const t = teak(seed, "#4e2a16");
  const c = canvas(W, H);
  const x = ctx2d(c);
  x.drawImage(t.map, 0, 0, W, H);
  const hc = canvas(W, H);
  const hx = ctx2d(hc);
  hx.fillStyle = "#a0a0a0";
  hx.fillRect(0, 0, W, H);

  const cols = 2;
  const rows = 4;
  const rail = 46;
  const pw = (W - rail * (cols + 1)) / cols;
  const ph = (H - rail * (rows + 1)) / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = rail + i * (pw + rail);
      const py = rail + j * (ph + rail);
      // recess
      x.fillStyle = "rgba(15,5,0,.30)";
      x.fillRect(px, py, pw, ph);
      x.fillStyle = "rgba(255,190,130,.06)";
      x.fillRect(px + 10, py + 10, pw - 20, ph - 20);
      hx.fillStyle = "#555";
      hx.fillRect(px, py, pw, ph);
      hx.fillStyle = "#6a6a6a";
      hx.fillRect(px + 10, py + 10, pw - 20, ph - 20);
      rosette(x, hx, px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.36);
    }
  }
  // brass studs on every rail crossing and along the rails
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols * 4; i++) {
      const sx = rail / 2 + (i * (W - rail)) / (cols * 4);
      const sy = rail / 2 + j * (ph + rail);
      stud(x, hx, sx, sy, i % 4 === 0 ? 11 : 6);
    }
  }
  return { map: c, normal: normalFromHeight(hc, 3.2) };
}

function rosette(x: CanvasRenderingContext2D, hx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const petals = 8;
  for (let ring = 0; ring < 2; ring++) {
    const rr = ring === 0 ? r : r * 0.6;
    for (let k = 0; k < petals; k++) {
      const a = (k / petals) * TAU + (ring ? Math.PI / petals : 0);
      x.save();
      hx.save();
      x.translate(cx, cy);
      hx.translate(cx, cy);
      x.rotate(a);
      hx.rotate(a);
      const path = new Path2D();
      path.moveTo(0, 0);
      path.quadraticCurveTo(rr * 0.42, -rr * 0.5, 0, -rr);
      path.quadraticCurveTo(-rr * 0.42, -rr * 0.5, 0, 0);
      x.fillStyle = ring ? "rgba(120,70,35,.55)" : "rgba(95,52,25,.6)";
      x.fill(path);
      x.strokeStyle = "rgba(20,6,0,.45)";
      x.lineWidth = 2;
      x.stroke(path);
      hx.fillStyle = ring ? "#d8d8d8" : "#bdbdbd";
      hx.fill(path);
      x.restore();
      hx.restore();
    }
  }
  stud(x, hx, cx, cy, r * 0.18);
}

function stud(x: CanvasRenderingContext2D, hx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  x.fillStyle = "#b48a3c";
  x.beginPath();
  x.arc(cx, cy, r, 0, TAU);
  x.fill();
  x.fillStyle = "rgba(255,235,170,.55)";
  x.beginPath();
  x.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, TAU);
  x.fill();
  hx.fillStyle = "#ffffff";
  hx.beginPath();
  hx.arc(cx, cy, r, 0, TAU);
  hx.fill();
}

/** Carved lintel frieze: a running vine scroll with a lotus at the centre. */
export function lintel(seed = 71): Surface {
  const W = 1024;
  const H = 256;
  const t = teak(seed, "#53301a");
  const c = canvas(W, H);
  const x = ctx2d(c);
  x.drawImage(t.map, 0, 0, W, H);
  const hc = canvas(W, H);
  const hx = ctx2d(hc);
  hx.fillStyle = "#808080";
  hx.fillRect(0, 0, W, H);
  // border mouldings
  for (const y of [14, H - 24]) {
    x.fillStyle = "rgba(255,200,140,.10)";
    x.fillRect(0, y, W, 10);
    hx.fillStyle = "#d0d0d0";
    hx.fillRect(0, y, W, 10);
  }
  // vine scroll
  x.strokeStyle = "rgba(30,10,2,.55)";
  hx.strokeStyle = "#e0e0e0";
  x.lineWidth = 7;
  hx.lineWidth = 9;
  const wave = (px: number) => H / 2 + Math.sin(px / 52) * 40;
  for (const ctx of [x, hx]) {
    ctx.beginPath();
    for (let px = 0; px <= W; px += 4) ctx.lineTo(px, wave(px));
    ctx.stroke();
  }
  const r = mulberry32(seed);
  for (let px = 26; px < W; px += 52) {
    const up = Math.floor(px / 52) % 2 === 0 ? -1 : 1;
    const cy = wave(px) + up * 30;
    for (const [ctx, col] of [
      [x, "rgba(110,60,28,.85)"],
      [hx, "#eeeeee"],
    ] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, cy, 16 + r() * 4, 9, up * 0.6, 0, TAU);
      ctx.fill();
    }
  }
  rosette(x, hx, W / 2, H / 2, 70);
  return { map: c, normal: normalFromHeight(hc, 3) };
}

/** A pulli kolam in rice flour on a freshly swept patch: a dot grid with petal loops. */
export function kolam(): HTMLCanvasElement {
  const W = 1024;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.clearRect(0, 0, W, W);
  // the swept, darker wet patch
  x.fillStyle = "rgba(90,48,26,.55)";
  x.beginPath();
  x.ellipse(W / 2, W / 2, W * 0.48, W * 0.48, 0, 0, TAU);
  x.fill();
  x.strokeStyle = "rgba(250,246,236,.95)";
  x.fillStyle = "rgba(250,246,236,.95)";
  x.lineCap = "round";
  x.lineWidth = 7;
  const n = 7;
  const step = W / (n + 2);
  const o = step * 1.5;
  // dots
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - (n - 1) / 2) + Math.abs(j - (n - 1) / 2);
      if (d > (n - 1) / 2 + 0.01) continue;
      x.beginPath();
      x.arc(o + i * step, o + j * step, 6, 0, TAU);
      x.fill();
      // a petal loop around each dot, alternating orientation
      const a = (i + j) % 2 ? Math.PI / 4 : -Math.PI / 4;
      x.save();
      x.translate(o + i * step, o + j * step);
      x.rotate(a);
      x.beginPath();
      x.ellipse(0, 0, step * 0.46, step * 0.22, 0, 0, TAU);
      x.stroke();
      x.restore();
    }
  }
  // outer lotus ring
  const cx = W / 2;
  const cy = W / 2;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    x.save();
    x.translate(cx + Math.cos(a) * W * 0.4, cy + Math.sin(a) * W * 0.4);
    x.rotate(a + Math.PI / 2);
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(step * 0.3, -step * 0.35, 0, -step * 0.62);
    x.quadraticCurveTo(-step * 0.3, -step * 0.35, 0, 0);
    x.stroke();
    x.restore();
  }
  x.beginPath();
  x.arc(cx, cy, W * 0.4, 0, TAU);
  x.stroke();
  return c;
}

/** A single drifting leaf (neem or mango): long, pointed, with a pale midrib. */
export function driftLeaf(): HTMLCanvasElement {
  const W = 64;
  const H = 160;
  const c = canvas(W, H);
  const x = ctx2d(c);
  x.fillStyle = "#ffffff";
  x.beginPath();
  x.moveTo(W / 2, H * 0.98);
  x.bezierCurveTo(W * 0.02, H * 0.7, W * 0.12, H * 0.2, W / 2, H * 0.02);
  x.bezierCurveTo(W * 0.88, H * 0.2, W * 0.98, H * 0.7, W / 2, H * 0.98);
  x.fill();
  // the midrib and a few veins, lighter than the blade (instance colours tint the white)
  x.strokeStyle = "rgba(0,0,0,.18)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W / 2, H * 0.97);
  x.lineTo(W / 2, H * 0.05);
  x.stroke();
  x.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const y = H * (0.12 + i * 0.1);
    x.beginPath();
    x.moveTo(W / 2, y);
    x.lineTo(W * 0.18, y - 10);
    x.moveTo(W / 2, y);
    x.lineTo(W * 0.82, y - 10);
    x.stroke();
  }
  return c;
}

/**
 * A jasmine sprig for the very front of the frame: one stem curving in from the top-right corner,
 * paired leaves, and clusters of white flowers. Depth of field turns it into soft shapes.
 */
export function sprig(seed = 17, w = 1024, h = 1024): HTMLCanvasElement {
  const c = canvas(w, h);
  const x = ctx2d(c);
  const r = mulberry32(seed);
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1.0001; t += 0.02) {
    pts.push([w * (0.98 - 0.62 * t + 0.08 * Math.sin(t * 5)), h * (0.02 + 0.78 * t * t + 0.1 * t)]);
  }
  x.strokeStyle = "#3a4424";
  x.lineCap = "round";
  x.lineWidth = 9;
  x.beginPath();
  pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.stroke();
  pts.forEach(([px, py], i) => {
    if (i % 3 !== 0 || i === 0) return;
    const k = i / pts.length;
    const s = 70 - 30 * k;
    leaf(x, px, py, s + r() * 20, 0.9 + (r() - 0.5) * 0.6, r);
    leaf(x, px, py, s + r() * 20, -0.9 + (r() - 0.5) * 0.6, r);
    if (i % 6 === 0) {
      for (let f = 0; f < 4; f++) flower(x, px + (r() - 0.5) * 70, py + (r() - 0.2) * 60, 16 + r() * 10);
    }
  });
  // painted already out of focus: a real lens blurs something this close far more than a depth-of-field pass does
  const soft = canvas(w, h);
  const sx = ctx2d(soft);
  sx.filter = "blur(6px)";
  sx.drawImage(c, 0, 0);
  return soft;
}

/** A far treeline of rain trees and palms that closes the horizon; fog turns it into a soft silhouette. */
export function treeline(seed = 23, w = 2048, h = 256): HTMLCanvasElement {
  const c = canvas(w, h);
  const x = ctx2d(c);
  const r = mulberry32(seed);
  x.fillStyle = "#4c5a48";
  for (let i = 0; i < 160; i++) {
    const px = r() * w;
    const rad = 18 + r() * 46;
    const py = h - rad * (0.9 + r() * 0.9);
    x.beginPath();
    x.arc(px, py, rad, 0, TAU);
    x.fill();
  }
  x.fillRect(0, h * 0.72, w, h * 0.28);
  return c;
}

/** Soft radial glow used for haze slabs (inside the 3D scene only). */
export function glow(inner: string, outer: string): HTMLCanvasElement {
  const W = 256;
  const c = canvas(W, W);
  const x = ctx2d(c);
  const g = x.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, W, W);
  return c;
}

/** Coloured-glass fanlight for the arched windows: sectors of red, green and yellow. */
export function fanlight(seed: number): HTMLCanvasElement {
  const W = 256;
  const c = canvas(W, W / 2);
  const x = ctx2d(c);
  const cols = ["#b8322a", "#2f7a52", "#d9a62e", "#2f7a52", "#b8322a", "#d9a62e", "#2f7a52"];
  const n = cols.length;
  for (let k = 0; k < n; k++) {
    x.fillStyle = cols[(k + seed) % n];
    x.beginPath();
    x.moveTo(W / 2, W / 2);
    x.arc(W / 2, W / 2, W / 2, Math.PI + (k / n) * Math.PI, Math.PI + ((k + 1) / n) * Math.PI);
    x.closePath();
    x.fill();
  }
  x.strokeStyle = "#2a1408";
  x.lineWidth = 5;
  for (let k = 0; k <= n; k++) {
    const a = Math.PI + (k / n) * Math.PI;
    x.beginPath();
    x.moveTo(W / 2, W / 2);
    x.lineTo(W / 2 + Math.cos(a) * W, W / 2 + Math.sin(a) * W);
    x.stroke();
  }
  x.beginPath();
  x.arc(W / 2, W / 2, W * 0.16, Math.PI, TAU);
  x.fillStyle = "#e9d6a0";
  x.fill();
  return c;
}

/** Wooden louvred shutter for the lower half of a window. */
export function shutter(): HTMLCanvasElement {
  const W = 128;
  const H = 256;
  const c = canvas(W, H);
  const x = ctx2d(c);
  x.fillStyle = "#2f5a45";
  x.fillRect(0, 0, W, H);
  for (let y = 10; y < H - 10; y += 12) {
    x.fillStyle = "rgba(0,0,0,.35)";
    x.fillRect(10, y + 8, W - 20, 3);
    x.fillStyle = "rgba(255,255,255,.08)";
    x.fillRect(10, y, W - 20, 2);
  }
  x.strokeStyle = "#1e3a2c";
  x.lineWidth = 8;
  x.strokeRect(4, 4, W - 8, H - 8);
  x.beginPath();
  x.moveTo(W / 2, 0);
  x.lineTo(W / 2, H);
  x.stroke();
  return c;
}

/** Cape cloth for the kitten: lime-white with a red oxide and ochre silk border. */
export function capeCloth(): HTMLCanvasElement {
  const W = 256;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.fillStyle = "#f1eee4";
  x.fillRect(0, 0, W, W);
  mottle(x, W, W, 5, 0.08, 8);
  x.fillStyle = "#8a2f22";
  x.fillRect(0, W - 34, W, 34);
  x.fillStyle = "#d19a2a";
  x.fillRect(0, W - 40, W, 6);
  for (let i = 0; i < W; i += 16) {
    x.fillStyle = "#d19a2a";
    x.beginPath();
    x.moveTo(i, W - 6);
    x.lineTo(i + 8, W - 22);
    x.lineTo(i + 16, W - 6);
    x.fill();
  }
  return c;
}


/** Athangudi floor tile: a yellow ground with a cream medallion and red and green accents (2x2 tiles). */
export function athangudi(): Surface {
  const W = 512;
  const c = canvas(W, W);
  const x = ctx2d(c);
  const T = W / 2;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const ox = i * T;
      const oy = j * T;
      x.fillStyle = "#d8a43c";
      x.fillRect(ox, oy, T, T);
      const cx = ox + T / 2;
      const cy = oy + T / 2;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        x.save();
        x.translate(cx, cy);
        x.rotate(a);
        x.fillStyle = "#f3e6c4";
        x.beginPath();
        x.ellipse(0, -T * 0.22, T * 0.06, T * 0.16, 0, 0, TAU);
        x.fill();
        x.restore();
      }
      x.fillStyle = "#b8452c";
      x.beginPath();
      x.arc(cx, cy, T * 0.07, 0, TAU);
      x.fill();
      // quarter flowers in the corners join into a pattern across tiles
      for (const [qx, qy] of [[ox, oy], [ox + T, oy], [ox, oy + T], [ox + T, oy + T]]) {
        x.fillStyle = "#3f6b4a";
        x.beginPath();
        x.arc(qx, qy, T * 0.11, 0, TAU);
        x.fill();
      }
      x.strokeStyle = "rgba(60,30,10,.35)";
      x.lineWidth = 2;
      x.strokeRect(ox + 1, oy + 1, T - 2, T - 2);
    }
  }
  mottle(x, W, W, 12, 0.12, 6);
  return { map: c };
}

/** The corridor floor from the reference: small terracotta, ochre and green tiles in a diamond lattice. */
export function corridorTile(): Surface {
  const W = 512;
  const c = canvas(W, W);
  const x = ctx2d(c);
  const n = 8;
  const S = W / n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      x.fillStyle = (i + j) % 2 ? "#9c4a2c" : "#c98a3a";
      x.fillRect(i * S, j * S, S, S);
      x.fillStyle = (i + j) % 2 ? "#d9b46a" : "#7a3a24";
      x.beginPath();
      x.moveTo(i * S + S / 2, j * S + S * 0.18);
      x.lineTo(i * S + S * 0.82, j * S + S / 2);
      x.lineTo(i * S + S / 2, j * S + S * 0.82);
      x.lineTo(i * S + S * 0.18, j * S + S / 2);
      x.fill();
      x.fillStyle = "#3d6650";
      x.beginPath();
      x.arc(i * S + S / 2, j * S + S / 2, S * 0.08, 0, TAU);
      x.fill();
    }
  }
  x.strokeStyle = "rgba(40,20,10,.4)";
  x.lineWidth = 2;
  for (let k = 0; k <= n; k++) {
    x.beginPath();
    x.moveTo(k * S, 0);
    x.lineTo(k * S, W);
    x.moveTo(0, k * S);
    x.lineTo(W, k * S);
    x.stroke();
  }
  mottle(x, W, W, 14, 0.1, 6);
  return { map: c };
}

/** Blue and white tile dado for the lower walls. */
export function blueDado(): HTMLCanvasElement {
  const W = 256;
  const c = canvas(W, W);
  const x = ctx2d(c);
  const n = 4;
  const S = W / n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      x.fillStyle = "#e9e4d6";
      x.fillRect(i * S, j * S, S, S);
      x.fillStyle = "#2c5f9a";
      x.beginPath();
      x.arc(i * S + S / 2, j * S + S / 2, S * 0.3, 0, TAU);
      x.fill();
      x.fillStyle = "#e9e4d6";
      x.beginPath();
      x.arc(i * S + S / 2, j * S + S / 2, S * 0.16, 0, TAU);
      x.fill();
      x.fillStyle = "#2c5f9a";
      for (const [qx, qy] of [[0, 0], [S, 0], [0, S], [S, S]]) {
        x.beginPath();
        x.arc(i * S + qx, j * S + qy, S * 0.12, 0, TAU);
        x.fill();
      }
      x.strokeStyle = "rgba(30,40,60,.3)";
      x.strokeRect(i * S + 0.5, j * S + 0.5, S - 1, S - 1);
    }
  }
  return c;
}

/** Granite slabs for the sunken court and the hall. */
export function granite(seed = 81): Surface {
  const W = 512;
  const c = canvas(W, W);
  const x = ctx2d(c);
  x.fillStyle = "#8a847a";
  x.fillRect(0, 0, W, W);
  mottle(x, W, W, seed, 0.4, 32);
  mottle(x, W, W, seed + 1, 0.25, 4);
  x.strokeStyle = "rgba(30,28,24,.55)";
  x.lineWidth = 3;
  for (let k = 0; k <= 2; k++) {
    x.beginPath();
    x.moveTo(k * (W / 2), 0);
    x.lineTo(k * (W / 2), W);
    x.moveTo(0, k * (W / 2));
    x.lineTo(W, k * (W / 2));
    x.stroke();
  }
  return { map: c, normal: normalFromHeight(fbmCanvas(256, 256, seed + 5, 5, 16, 16, 1), 1.2) };
}

/** Painted base for the corridor pillars: a cream panel with a stylised pineapple and leaves. */
export function pillarBase(): HTMLCanvasElement {
  const W = 128;
  const H = 192;
  const c = canvas(W, H);
  const x = ctx2d(c);
  x.fillStyle = "#efe6cf";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "#3f6b4a";
  x.lineWidth = 6;
  x.strokeRect(6, 6, W - 12, H - 12);
  x.fillStyle = "#d9a63a";
  x.beginPath();
  x.ellipse(W / 2, H * 0.62, W * 0.2, H * 0.17, 0, 0, TAU);
  x.fill();
  x.strokeStyle = "#b8452c";
  x.lineWidth = 2;
  for (let k = -3; k <= 3; k++) {
    x.beginPath();
    x.moveTo(W / 2 + k * 9 - 20, H * 0.48);
    x.lineTo(W / 2 + k * 9 + 20, H * 0.78);
    x.stroke();
  }
  x.fillStyle = "#3f6b4a";
  for (let k = 0; k < 5; k++) {
    x.save();
    x.translate(W / 2, H * 0.46);
    x.rotate(-0.9 + k * 0.45);
    x.beginPath();
    x.ellipse(0, -18, 6, 20, 0, 0, TAU);
    x.fill();
    x.restore();
  }
  return c;
}

function leaf(x: CanvasRenderingContext2D, px: number, py: number, s: number, a: number, r: () => number) {
  x.save();
  x.translate(px, py);
  x.rotate(a);
  const g = 50 + r() * 30;
  x.fillStyle = `rgb(${(g * 0.55) | 0},${(g * 1.05) | 0},${(g * 0.45) | 0})`;
  x.beginPath();
  x.moveTo(0, 0);
  x.quadraticCurveTo(s * 0.45, s * 0.25, 0, s);
  x.quadraticCurveTo(-s * 0.45, s * 0.25, 0, 0);
  x.fill();
  x.fillStyle = "rgba(200,230,150,.12)";
  x.fillRect(-0.5, 0, 1, s * 0.9);
  x.restore();
}

function flower(x: CanvasRenderingContext2D, px: number, py: number, s: number) {
  x.fillStyle = "#fdfbf3";
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    x.beginPath();
    x.ellipse(px + Math.cos(a) * s * 0.55, py + Math.sin(a) * s * 0.55, s * 0.5, s * 0.24, a, 0, TAU);
    x.fill();
  }
  x.fillStyle = "#e9d48a";
  x.beginPath();
  x.arc(px, py, s * 0.18, 0, TAU);
  x.fill();
}
