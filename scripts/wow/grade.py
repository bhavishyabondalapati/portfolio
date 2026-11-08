"""Grade the five licensed scene photos into one night palette.
   Usage: python3 scripts/wow/grade.py [slot ...]
   originals: docs/wow-assets/originals/<slot>.(jpg|png)   output: docs/wow-assets/drop/<slot>.png
Look: deep navy shadows, warm gaslight-amber highlights, fine grain. (Foreground layers are drawn in
code by make-fg.py; no photo is cut out.)"""
import json, sys, os, numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OR, DROP = [os.path.join(ROOT, "docs/wow-assets", d) for d in ("originals", "drop")]
os.makedirs(DROP, exist_ok=True)
man = {i["name"]: i for i in json.load(open(os.path.join(ROOT, "docs/wow-assets/manifest.json")))["images"]}
NAVY = np.array([0.028, 0.065, 0.13]); AMBER = np.array([0.96, 0.66, 0.26])
# gain/gamma darken daytime pictures; k = how strongly the navy-to-amber tone replaces the colour
G = {"scene-longfellow": (0.80, 1.15, .42), "scene-zakim": (1.5, 0.85, .5), "scene-charles-reflection": (0.95, 1.05, .5),
     "scene-beacon-hill": (0.6, 1.4, .6)}
DEF = (0.85, 1.2, .5)

def luma(a): return a @ np.array([.299, .587, .114])
def grade(rgb, gain, gamma, k, seed=7):
    a = rgb.astype(np.float32) / 255
    L = np.clip(luma(a) * gain, 0, 1) ** gamma
    base = (luma(a)[..., None] * .5 + a * .5) * gain ** gamma
    tone = NAVY * (1 - L[..., None]) + AMBER * L[..., None]
    tone *= (L / np.maximum(luma(tone), 1e-3))[..., None] if False else 1
    out = base * (1 - k) + (tone * (0.25 + 1.1 * L[..., None])) * k
    out = NAVY * 0.5 + out * (1 - 0.5 * NAVY.mean() * 2)          # navy floor
    out += np.random.default_rng(seed).normal(0, .011, L.shape)[..., None] * (1 - np.abs(L - .5))[..., None]
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)

def cover(im, w, h, fx=.5):
    s = max(w / im.width, h / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = int((im.width - w) * fx); y = (im.height - h) // 2; return im.crop((x, y, x + w, y + h))

only = sys.argv[1:]
for name, spec in man.items():
    if only and name not in only: continue
    src = next((os.path.join(OR, name + e) for e in (".jpg", ".png") if os.path.exists(os.path.join(OR, name + e))), None)
    if not src: print("skip (no original):", name); continue
    w, h = spec["w"], spec["h"]; gain, gamma, k = G.get(name, DEF)
    im0 = Image.open(src).convert("RGB"); t = int(min(im0.size) * .03); im0 = im0.crop((t, t, im0.width - t, im0.height - t))
    up = max(w / im0.width, h / im0.height)   # >1 means the photo is smaller than its 2x slot and gets enlarged
    print(f"  {name}: photo {im0.width}x{im0.height}, 2x slot {w}x{h}, scale {up:.2f}" + ("  TOO SMALL for sharp 2x" if up > 1.1 else ""))
    im = cover(im0, w, h, .55 if name == "scene-longfellow" else .5)
    Image.fromarray(grade(np.asarray(im), gain, gamma, k)).save(f"{DROP}/{name}.png"); print("graded", name)
