// Downloads the colour imagery draped over the flyover terrain and globe, from NASA's Global
// Imagery Browse Services (GIBS): Blue Marble Next Generation (NASA Earth Observatory), about 500 m
// per pixel. NASA imagery is generally not subject to copyright in the United States; NASA asks to
// be credited, and GIBS asks for an acknowledgement (both are in THIRD_PARTY_NOTICES.md and on screen).
// Each tile's box matches its elevation tile in public/terrain/*.json.
// Run once: node scripts/imagery.mjs   (no dependencies; needs network access)
import { readFileSync, writeFileSync } from "node:fs";

const WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const OUT = new URL("../public/terrain/", import.meta.url);
const box = (name) => JSON.parse(readFileSync(new URL(`${name}.json`, OUT), "utf8"));

const jobs = [
  { name: "india", b: box("india"), width: 1100, height: 1400 },
  { name: "boston", b: box("boston"), width: 512, height: 384 },
  { name: "world", b: { west: -180, south: -90, east: 180, north: 90 }, width: 2048, height: 1024 },
];

for (const j of jobs) {
  const q = new URLSearchParams({
    SERVICE: "WMS", REQUEST: "GetMap", VERSION: "1.1.1", SRS: "EPSG:4326", STYLES: "",
    LAYERS: "BlueMarble_NextGeneration", FORMAT: "image/jpeg",
    BBOX: [j.b.west, j.b.south, j.b.east, j.b.north].join(","), WIDTH: String(j.width), HEIGHT: String(j.height),
  });
  const res = await fetch(`${WMS}?${q}`);
  if (!res.ok || !res.headers.get("content-type")?.includes("image")) throw new Error(`${j.name}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(new URL(`imagery-${j.name}.jpg`, OUT), buf);
  console.log(`imagery-${j.name}.jpg ${j.width}x${j.height} ${(buf.length / 1024).toFixed(0)} KB`);
}
