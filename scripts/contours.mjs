// Writes public/contours.svg: topographic contour lines for the hero background.
// Seeded value noise, traced with marching squares, joined into polylines so the file stays small.
// Every fifth line is an "index contour", drawn stronger, as on a real topographic map.
// Run: node scripts/contours.mjs
import { writeFileSync } from "node:fs";

const W = 1600, H = 1000, STEP = 10, LEVELS = 30, SEED = 7;

let s = SEED;
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const N = 9;
const grid = Array.from({ length: N * N }, rnd);
const at = (a, b) => grid[(((a % N) + N) % N) + (((b % N) + N) % N) * N];
const sm = (t) => t * t * (3 - 2 * t);
function octave(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), tx = sm(x - ix), ty = sm(y - iy);
  const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
  const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
  return a + (b - a) * ty;
}
const height = (x, y) => octave(x, y) * 0.7 + octave(x * 2.3 + 3.1, y * 2.3 + 1.7) * 0.3;

const cols = W / STEP + 1, rows = H / STEP + 1, SC = 1 / 300;
const f = new Float64Array(cols * rows);
for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[i + j * cols] = height(i * STEP * SC + 0.4, j * STEP * SC + 0.2);

const key = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/** Marching squares for one level, then chain the little segments into long lines. */
function trace(lv) {
  const segs = [];
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < cols - 1; i++) {
      const a = f[i + j * cols], b = f[i + 1 + j * cols], c = f[i + 1 + (j + 1) * cols], d = f[i + (j + 1) * cols];
      const x = i * STEP, y = j * STEP, p = [];
      const edge = (v1, v2, x1, y1, x2, y2) => {
        if (v1 < lv !== v2 < lv) {
          const t = (lv - v1) / (v2 - v1);
          p.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
        }
      };
      edge(a, b, x, y, x + STEP, y);
      edge(b, c, x + STEP, y, x + STEP, y + STEP);
      edge(d, c, x, y + STEP, x + STEP, y + STEP);
      edge(a, d, x, y, x, y + STEP);
      if (p.length >= 2) segs.push([p[0], p[1]]);
      if (p.length === 4) segs.push([p[2], p[3]]);
    }
  const ends = new Map();
  segs.forEach((sg, n) => sg.forEach((pt) => (ends.get(key(pt)) ?? ends.set(key(pt), []).get(key(pt))).push(n)));
  const used = new Uint8Array(segs.length), lines = [];
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue;
    used[n] = 1;
    const line = [...segs[n]];
    for (const grow of [true, false]) {
      for (;;) {
        const tip = grow ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) || []).find((m) => !used[m]);
        if (next === undefined) break;
        used[next] = 1;
        const [p, q] = segs[next];
        const far = key(p) === key(tip) ? q : p;
        grow ? line.push(far) : line.unshift(far);
      }
    }
    if (line.length > 3) lines.push(line);
  }
  return lines;
}

/** Drop points that barely change direction (keeps every 2nd point on straight-ish runs). */
const simplify = (line) => line.filter((_, i) => i === 0 || i === line.length - 1 || i % 2 === 0);
const toPath = (line) => "M" + simplify(line).map((p) => `${Math.round(p[0])} ${Math.round(p[1])}`).join("L");

let normal = "", index = "";
for (let k = 0; k < LEVELS; k++) {
  const d = trace(0.2 + k * 0.02).map(toPath).join("");
  if (k % 5 === 0) index += d;
  else normal += d;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#000" stroke-linejoin="round"><path stroke-opacity=".5" stroke-width="1" d="${normal}"/><path stroke-width="1.5" d="${index}"/></g></svg>\n`;
writeFileSync(new URL("../public/contours.svg", import.meta.url), svg);
console.log(`public/contours.svg ${(svg.length / 1024).toFixed(1)} KB`);
