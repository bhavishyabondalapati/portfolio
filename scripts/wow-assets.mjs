// Turns the graded scene photos (docs/wow-assets/drop/<name>.png, made by scripts/wow/grade.py at the
// @2x size in manifest.json) into WebP files in public/house/assets/: <name>@2x.webp and a half-size
// <name>.webp for srcset / image-set. Needs sips (built into macOS) and cwebp. Checks the total
// against the budget in manifest.json.   node scripts/wow-assets.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(ROOT, "docs/wow-assets/manifest.json"), "utf8"));
const OUT = join(ROOT, manifest.out), DROP = join(ROOT, "docs/wow-assets/drop");
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }).toString();
const tmp = mkdtempSync(join(tmpdir(), "wow-assets-"));
let total = 0;
for (const img of manifest.images) {
  const src = join(DROP, `${img.name}.png`);
  if (!existsSync(src)) { console.log(`${img.name}: no graded file, skipped`); continue; }
  const half = join(tmp, `${img.name}-1x.png`);
  run("sips", ["-z", String(img.h / 2), String(img.w / 2), src, "--out", half]);
  run("cwebp", ["-quiet", "-m", "6", "-q", "90", src, "-o", join(OUT, `${img.name}@2x.webp`)]);
  run("cwebp", ["-quiet", "-m", "6", "-q", "88", half, "-o", join(OUT, `${img.name}.webp`)]);
  const a = statSync(join(OUT, `${img.name}.webp`)).size, b = statSync(join(OUT, `${img.name}@2x.webp`)).size;
  total += a + b;
  console.log(`${img.name.padEnd(26)} 1x ${img.w / 2}×${img.h / 2} ${(a / 1024).toFixed(0)} KB   2x ${img.w}×${img.h} ${(b / 1024).toFixed(0)} KB`);
}
rmSync(tmp, { recursive: true, force: true });
const over = total / 1024 > manifest.budgetKB;
console.log(`\ntotal ${(total / 1024).toFixed(0)} KB of ${manifest.budgetKB} KB budget${over ? "  OVER BUDGET" : ""} (a visitor loads one size per image, never both)`);
if (over) process.exit(2);
