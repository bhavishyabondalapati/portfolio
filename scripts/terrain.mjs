// Downloads real elevation for the flyover and packs it into small PNGs in public/terrain/.
// Source: NOAA NCEI, ETOPO 2022 15 Arc-Second Global Relief Model (doi:10.25921/fd45-gt74),
// served by NOAA's ERDDAP. Its licence: "may be used and redistributed for free", no warranty.
//
// Heights are stored with the "Terrarium" encoding: height = R*256 + G + B/256 - 32768 (metres).
// Each tile also gets a .json file with its size and bounds.
// Run once: node scripts/terrain.mjs   (no dependencies; needs network access)
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.esriAscii";

// stride 2 = every other 15" sample, so about 0.9 km between samples
const TILES = [
  { name: "india", south: 11.5, north: 18.5, west: 76.5, east: 82, stride: 2 },
  // Boston and Massachusetts Bay at full 15" detail (about 450 m)
  { name: "boston", south: 41.9, north: 42.8, west: -71.6, east: -70.4, stride: 1 },
  // the whole world at 0.5 degrees, for the dotted globe on the flight to Boston
  { name: "world", south: -89.9, north: 89.9, west: -179.9, east: 179.9, stride: 120 },
];
const only = process.argv[2]; // optional: one tile name

// CRC table for PNG chunks (defined before the top-level loop below uses it)
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const OUT = new URL("../public/terrain/", import.meta.url);
mkdirSync(OUT, { recursive: true });

for (const t of TILES.filter((t) => !only || t.name === only)) {
  const q = `z[(${t.south}):${t.stride}:(${t.north})][(${t.west}):${t.stride}:(${t.east})]`;
  const url = `${ERDDAP}?${encodeURIComponent(q)}`;
  console.log(`fetching ${t.name}: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const grid = parseEsriAscii(await res.text());
  const png = encodePng(grid.cols, grid.rows, terrarium(grid.z));
  writeFileSync(new URL(`${t.name}.png`, OUT), png);
  const meta = {
    width: grid.cols,
    height: grid.rows,
    // centres of the first and last samples (row 0 is the northern edge)
    west: grid.xll,
    east: grid.xll + (grid.cols - 1) * grid.cell,
    south: grid.yll,
    north: grid.yll + (grid.rows - 1) * grid.cell,
    min: Math.round(grid.z.reduce((a, b) => Math.min(a, b))),
    max: Math.round(grid.z.reduce((a, b) => Math.max(a, b))),
    source: "NOAA NCEI ETOPO 2022 15 Arc-Second Global Relief Model, doi:10.25921/fd45-gt74",
  };
  writeFileSync(new URL(`${t.name}.json`, OUT), JSON.stringify(meta, null, 2) + "\n");
  console.log(`${t.name}: ${grid.cols}x${grid.rows}, ${(png.length / 1024).toFixed(0)} KB, ${meta.min} m to ${meta.max} m`);
}

/** ESRI ASCII grid: a 6-line header, then rows from north to south. */
function parseEsriAscii(text) {
  const lines = text.split("\n");
  const head = {};
  for (let i = 0; i < 6; i++) {
    const [k, v] = lines[i].trim().split(/\s+/);
    head[k.toLowerCase()] = Number(v);
  }
  const z = new Float32Array(head.ncols * head.nrows);
  let n = 0;
  for (let i = 6; i < lines.length; i++) {
    for (const v of lines[i].trim().split(/\s+/)) if (v) z[n++] = Number(v) === head.nodata_value ? 0 : Number(v);
  }
  if (n !== z.length) throw new Error(`expected ${z.length} values, got ${n}`);
  return { cols: head.ncols, rows: head.nrows, xll: head.xllcenter, yll: head.yllcenter, cell: head.cellsize, z };
}

/** Quarter-metre steps are finer than the data's accuracy and keep the PNG small. */
function terrarium(z) {
  const rgb = new Uint8Array(z.length * 3);
  for (let i = 0; i < z.length; i++) {
    const v = Math.round((z[i] + 32768) * 4) / 4;
    const whole = Math.floor(v);
    rgb[i * 3] = whole >> 8;
    rgb[i * 3 + 1] = whole & 255;
    rgb[i * 3 + 2] = Math.round((v - whole) * 256);
  }
  return rgb;
}

// ---- a minimal PNG writer (8-bit RGB), choosing the best filter per row ----

function encodePng(w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  const row = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    let best = null;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const cur = rgb[y * stride + x];
        const a = x >= 3 ? rgb[y * stride + x - 3] : 0;
        const b = y > 0 ? rgb[(y - 1) * stride + x] : 0;
        const c = x >= 3 && y > 0 ? rgb[(y - 1) * stride + x - 3] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        row[x] = (cur - pred) & 255;
        score += row[x] < 128 ? row[x] : 256 - row[x];
      }
      if (score < bestScore) {
        bestScore = score;
        best = Buffer.concat([Buffer.from([f]), row]);
      }
    }
    best.copy(raw, y * (stride + 1));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
