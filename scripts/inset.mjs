// Traces coastlines for the flyover's corner inset map from the same NOAA ETOPO 2022 data as the
// terrain (doi:10.25921/fd45-gt74). It draws coasts only, no borders: a physical locator map.
// Writes src/lib/inset-<name>.json: an SVG path in a 0..W x 0..H box plus the projection bounds.
// Run once: node scripts/inset.mjs india && node scripts/inset.mjs world   (needs network access)
import { writeFileSync } from "node:fs";

const ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.esriAscii";
const BOXES = {
  india: { south: 5.5, north: 26, west: 67, east: 93, stride: 18, min: 6 }, // 4.5 arc-minutes, about 8 km
  // the North Atlantic and both ends of the flight, 0.5 degrees
  world: { south: 0, north: 66, west: -100, east: 100, stride: 120, min: 10 },
};
const NAME = process.argv[2] ?? "india";
const BOX = BOXES[NAME];
const W = 200; // viewBox width; height follows the projection

const q = `z[(${BOX.south}):${BOX.stride}:(${BOX.north})][(${BOX.west}):${BOX.stride}:(${BOX.east})]`;
const res = await fetch(`${ERDDAP}?${encodeURIComponent(q)}`);
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const lines = (await res.text()).split("\n");
const head = {};
for (let i = 0; i < 6; i++) {
  const [k, v] = lines[i].trim().split(/\s+/);
  head[k.toLowerCase()] = Number(v);
}
const cols = head.ncols, rows = head.nrows;
const z = [];
for (let i = 6; i < lines.length; i++) for (const v of lines[i].trim().split(/\s+/)) if (v) z.push(Number(v));

// equirectangular, with east-west scaled at the middle latitude
const north = head.yllcenter + (rows - 1) * head.cellsize;
const west = head.xllcenter, east = west + (cols - 1) * head.cellsize, south = head.yllcenter;
const k = Math.cos((((north + south) / 2) * Math.PI) / 180);
const H = Math.round((W * (north - south)) / ((east - west) * k));
const px = (c) => (c / (cols - 1)) * W;
const py = (r) => (r / (rows - 1)) * H;

// marching squares on the 0 m level: one segment per crossing cell
const at = (r, c) => z[r * cols + c];
const segs = [];
for (let r = 0; r < rows - 1; r++) {
  for (let c = 0; c < cols - 1; c++) {
    const a = at(r, c), b = at(r, c + 1), d = at(r + 1, c + 1), e = at(r + 1, c);
    const pts = [];
    const edge = (v1, v2, x1, y1, x2, y2) => {
      if (v1 > 0 === v2 > 0) return;
      const t = v1 / (v1 - v2);
      pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    };
    edge(a, b, px(c), py(r), px(c + 1), py(r));
    edge(b, d, px(c + 1), py(r), px(c + 1), py(r + 1));
    edge(d, e, px(c + 1), py(r + 1), px(c), py(r + 1));
    edge(e, a, px(c), py(r + 1), px(c), py(r));
    for (let i = 0; i + 1 < pts.length; i += 2) segs.push([pts[i], pts[i + 1]]);
  }
}

// chain segments into polylines, then drop tiny islands and thin the points
const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
const ends = new Map();
segs.forEach((s, i) => {
  for (const p of s) (ends.get(key(p)) ?? ends.set(key(p), []).get(key(p))).push(i);
});
const used = new Uint8Array(segs.length);
const polylines = [];
for (let i = 0; i < segs.length; i++) {
  if (used[i]) continue;
  used[i] = 1;
  const line = [...segs[i]];
  for (const forward of [true, false]) {
    for (;;) {
      const tip = forward ? line[line.length - 1] : line[0];
      const next = (ends.get(key(tip)) ?? []).find((j) => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      const [p, q2] = segs[next];
      const other = key(p) === key(tip) ? q2 : p;
      forward ? line.push(other) : line.unshift(other);
    }
  }
  polylines.push(line);
}
const length = (l) => l.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0);
const kept = polylines.filter((l) => length(l) > BOX.min);
const d = kept
  .map((l) => {
    const thin = l.filter((_, i) => i % 2 === 0 || i === l.length - 1);
    return "M" + thin.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
  })
  .join("");

const out = { width: W, height: H, north, south, west, east, d, source: "NOAA NCEI ETOPO 2022, doi:10.25921/fd45-gt74" };
writeFileSync(new URL(`../src/lib/inset-${NAME}.json`, import.meta.url), JSON.stringify(out) + "\n");
console.log(`inset ${NAME}: ${W}x${H}, ${kept.length} coastlines, ${(d.length / 1024).toFixed(1)} KB of path`);
