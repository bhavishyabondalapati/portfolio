"""Draws the sketchbook plates into public/sketchbook/pages/<slug>.png.   python3 scripts/sketchbook/plates.py [slug ...]
Plates with a real project figure print that figure onto the paper; the others are drawn in code as ink and wash."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
from ink import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public/sketchbook/pages")
WORK = os.path.join(ROOT, "public/work")
os.makedirs(OUT, exist_ok=True)

# palette: the washes stay in the sketchbook's warm greys, ochre and slate blue; green only for vegetation
OCHRE = (236, 196, 138); SLATE = (150, 168, 196); GREY = (176, 172, 168); SAGE = (170, 190, 150); RUST = (214, 140, 90); ROSE = (222, 170, 160)

def blank():
    return book_template()

def paste_print(base, path, xy, width, rot=0, seed=0, tape=True, border=10, size=None):
    """A printed figure glued to the page: white border, soft shadow, slight tilt, washi tape at two corners."""
    im = Image.open(path).convert("RGB")
    ratio = im.height / im.width
    w = int(width * S); h = int(width * ratio * S)
    im = im.resize((w, h), Image.LANCZOS)
    # tone it like a real print taped into a sketchbook: less saturated, a warm paper tint, a touch softer, still readable
    from PIL import ImageEnhance
    im = ImageEnhance.Color(im).enhance(0.72)
    im = ImageEnhance.Contrast(im).enhance(0.93)
    im = Image.blend(im, Image.new("RGB", im.size, (240, 224, 196)), 0.16)           # warm cream wash over the ink
    im = ImageChops.multiply(im, Image.new("RGB", im.size, (252, 245, 232)))          # paper tint
    b = border * S
    card = Image.new("RGBA", (w + 2 * b, h + 2 * b), (253, 250, 244, 255))
    card.paste(im, (b, b))
    cw, ch = card.size
    pad = 40 * S
    canvas = Image.new("RGBA", (cw + 2 * pad, ch + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([pad + 5 * S, pad + 8 * S, pad + cw + 5 * S, pad + ch + 8 * S], fill=(60, 45, 30, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(7 * S))
    canvas.alpha_composite(sh); canvas.alpha_composite(card, (pad, pad))
    ink = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    if tape:
        for (tx, ty, ang) in [(pad + 8 * S, pad + 2 * S, -38), (pad + cw - 8 * S, pad + ch - 2 * S, -38)]:
            t = Image.new("RGBA", (74 * S, 26 * S), (232, 214, 170, 175))
            td = ImageDraw.Draw(t)
            for k in range(0, 74 * S, 6 * S): td.line([(k, 0), (k - 10 * S, 26 * S)], fill=(210, 186, 130, 70), width=S)
            t = t.rotate(ang, expand=True, resample=Image.BICUBIC)
            ink.alpha_composite(t, (int(tx - t.width / 2), int(ty - t.height / 2)))
    canvas.alpha_composite(ink)
    canvas = canvas.rotate(rot, resample=Image.BICUBIC, expand=True)
    X = int(xy[0] * S - canvas.width / 2); Y = int(xy[1] * S - canvas.height / 2)
    base.alpha_composite(canvas, (max(0, X), max(0, Y)), (max(0, -X), max(0, -Y))) if X < 0 or Y < 0 else base.alpha_composite(canvas, (X, Y))
    return base

def arrow(layer, a, b, bend=0, seed=0, w=2.2, head=13):
    (x0, y0), (x1, y1) = a, b
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2 - bend * .6
    pts = []
    for i in range(0, 21):
        t = i / 20; x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1; y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
        pts.append((x, y))
    pen(layer, pts, w, seed=seed, taper=False, amp=.8)
    ang = math.atan2(y1 - pts[-3][1], x1 - pts[-3][0])
    for s in (-1, 1):
        pen(layer, [(x1, y1), (x1 - head * math.cos(ang + s * .45), y1 - head * math.sin(ang + s * .45))], w, seed=seed + s, taper=False, amp=.4)

def underline(layer, x0, x1, y, seed=0, w=2.4):
    pen(layer, [(x0, y), ((x0 + x1) / 2, y + 3), (x1, y - 2)], w, seed=seed, amp=1.4)

# --------------------------------------------------------------------------------- plate 1 · Aerial Change Intelligence
def aerial():
    """Real project figures (vegetation 2021-24 normal, 2025, flagged loss) printed on the spread."""
    base = blank()
    ox, oy = PX0, PY0                                   # paper origin
    # washes behind the prints: sage for the green fields, rust where the loss is
    base = wash(base, [(ox + 50, oy + 60), (ox + 790, oy + 40), (ox + 800, oy + 560), (ox + 70, oy + 600)], SAGE, .55, seed=1, bleed=16)
    base = wash(base, [(GUT + 40, oy + 50), (GUT + 640, oy + 40), (GUT + 700, oy + 560), (GUT + 60, oy + 620)], RUST, .32, seed=2, bleed=16)
    base = wash(base, [(ox + 30, oy + 560), (GUT + 700, oy + 590), (GUT + 700, oy + 640), (ox + 30, oy + 640)], SLATE, .22, seed=3, bleed=8)
    base = paste_print(base, os.path.join(WORK, "aerial-before.webp"), (ox + 235, oy + 285), 330, rot=-2.2, seed=4)
    base = paste_print(base, os.path.join(WORK, "aerial-after.webp"), (ox + 640, oy + 315), 330, rot=1.8, seed=5)
    base = paste_print(base, os.path.join(WORK, "aerial-flagged.webp"), (GUT + 270, oy + 330), 440, rot=-1.2, seed=6)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    # captions, in the sketchbook hand
    text(ink, (ox + 236, oy + 505), "2021–24 normal", 26, HAND, anchor="mm", rot=-2)
    text(ink, (ox + 640, oy + 528), "2025", 26, HAND, anchor="mm", rot=1.5)
    text(ink, (GUT + 270, oy + 604), "flagged loss", 26, HAND, anchor="mm", rot=-1)
    arrow(ink, (ox + 430, oy + 520), (ox + 520, oy + 538), bend=-8, seed=1)
    arrow(ink, (ox + 745, oy + 545), (GUT + 60, oy + 610), bend=22, seed=2)
    # the result, written the way it would be in a margin
    text(ink, (GUT + 560, oy + 120), "F1 0.898", 54, HAND, anchor="lm", rot=-3)
    underline(ink, GUT + 560, GUT + 735, oy + 152, seed=3)
    text(ink, (GUT + 560, oy + 182), "change detection,", 22, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 560, oy + 208), "128 unseen test pairs", 22, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 560, oy + 270), "3,005 ha flagged", 26, HAND, anchor="lm", rot=-2)
    text(ink, (GUT + 560, oy + 298), "= 14.6% of the green", 20, HAND, anchor="lm", rot=-2)
    text(ink, (GUT + 560, oy + 322), "land it could judge", 20, HAND, anchor="lm", rot=-2)
    # little crop marks and a scribbled scale tick
    for (cx, cy, sx, sy) in [(ox + 52, oy + 50, 1, 1), (ox + 1530, oy + 650, -1, -1)]:
        pen(ink, [(cx, cy + 22 * sy), (cx, cy), (cx + 22 * sx, cy)], 1.6, seed=7, taper=False, amp=.3)
    base = stamp_layer(base, ink)
    return base

# --------------------------------------------------------------------------------- plate 2 · LLM Gateway (code-drawn)
def box_sketch(ink, x, y, w, h, seed, r=14, wd=2.6):
    pen(ink, rect_pts(x, y, w, h, r), wd, seed=seed, closed=True, taper=False, amp=1.3)
    pen(ink, rect_pts(x + 2, y + 2.5, w - 1, h, r), 1.2, seed=seed + 3, closed=True, taper=False, amp=1.6, alpha=120)

def person(ink, x, y, seed, s=1.0):
    pen(ink, [(x - 12 * s, y + 8 * s), (x - 10 * s, y - 10 * s), (x + 10 * s, y - 10 * s), (x + 12 * s, y + 8 * s), (x - 12 * s, y + 8 * s)], 2, seed=seed, taper=False, amp=.8)  # a laptop
    pen(ink, [(x - 18 * s, y + 14 * s), (x + 18 * s, y + 14 * s)], 2.2, seed=seed + 1, taper=False, amp=.5)

def gateway():
    """Code-drawn ink and wash: three teams -> gateway (redact, key and budget, rate limit, cache) -> providers, with
    a dashed failover, and the cache-hit against cache-miss times as two pen-drawn bars."""
    base = blank(); ox, oy = PX0, PY0
    # washes first (they sit under the ink): the gateway body in warm ochre, providers in slate, cache bars in rust
    base = wash(base, rect_pts(ox + 330, oy + 70, 930, 360, 30), OCHRE, .62, seed=11, bleed=14)
    base = wash(base, [(ox + 90, oy + 130), (ox + 260, oy + 120), (ox + 270, oy + 380), (ox + 95, oy + 390)], GREY, .42, seed=12, bleed=12)
    base = wash(base, [(ox + 1330, oy + 100), (ox + 1520, oy + 95), (ox + 1530, oy + 410), (ox + 1340, oy + 420)], SLATE, .55, seed=13, bleed=12)
    base = wash(base, [(ox + 330, oy + 480), (ox + 336, oy + 480), (ox + 336, oy + 520), (ox + 330, oy + 520)], RUST, .7, seed=14, bleed=2)
    base = wash(base, [(ox + 330, oy + 560), (ox + 1140, oy + 560), (ox + 1145, oy + 600), (ox + 335, oy + 602)], SLATE, .6, seed=15, bleed=4)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    # teams
    for i, (nm, y) in enumerate([("team A", 160), ("team B", 255), ("team C", 350)]):
        person(ink, ox + 150, oy + y, seed=20 + i)
        text(ink, (ox + 150, oy + y + 34), nm, 20, HAND, anchor="mm")
        arrow(ink, (ox + 190, oy + y), (ox + 322, oy + 250 + (i - 1) * 24), bend=(i - 1) * -10, seed=30 + i, w=2.0, head=11)
    # gateway frame
    box_sketch(ink, ox + 330, oy + 70, 930, 360, seed=40, r=28, wd=3.0)
    text(ink, (ox + 795, oy + 100), "one OpenAI-compatible endpoint", 24, HAND, anchor="mm")
    # four stations along the pipeline
    xs = [ox + 420, ox + 620, ox + 820, ox + 1020]
    for i, sx in enumerate(xs):
        box_sketch(ink, sx - 74, oy + 170, 148, 160, seed=50 + i, r=12, wd=2.2)
        if i < 3: arrow(ink, (sx + 78, oy + 250), (xs[i + 1] - 78, oy + 250), seed=60 + i, w=2.0, head=10)
    # 1 redact: a name with a bar over it
    text(ink, (xs[0], oy + 212), "Ada L.", 22, HAND, anchor="mm")
    pen(ink, [(xs[0] - 28, oy + 212), (xs[0] + 28, oy + 212)], 12, seed=70, taper=False, amp=.6, alpha=250)
    text(ink, (xs[0], oy + 262), "redact PII", 19, HAND, anchor="mm"); text(ink, (xs[0], oy + 284), "(reversible)", 16, HAND, anchor="mm")
    # 2 key + budget: a key
    pen(ink, [(xs[1] - 26, oy + 214), (xs[1] + 6, oy + 214)], 2.4, seed=71, taper=False)
    ImageDraw.Draw(ink).ellipse([(xs[1] - 42) * S, (oy + 204) * S, (xs[1] - 22) * S, (oy + 224) * S], outline=INK + (235,), width=int(2.4 * S))
    pen(ink, [(xs[1] - 4, oy + 214), (xs[1] - 4, oy + 226)], 2.2, seed=72, taper=False); pen(ink, [(xs[1] + 6, oy + 214), (xs[1] + 6, oy + 224)], 2.2, seed=73, taper=False)
    text(ink, (xs[1], oy + 262), "per-team keys", 19, HAND, anchor="mm"); text(ink, (xs[1], oy + 284), "budgets", 16, HAND, anchor="mm")
    # 3 rate limit: a half-dial
    cx, cy = xs[2], oy + 232
    pen(ink, [(cx + 30 * math.cos(math.pi * (1 - k / 14)), cy - 30 * math.sin(math.pi * (1 - k / 14))) for k in range(15)], 2.4, seed=74, taper=False)
    pen(ink, [(cx, cy), (cx + 22, cy - 18)], 2.6, seed=75, taper=False)
    text(ink, (xs[2], oy + 262), "rate limits", 19, HAND, anchor="mm")
    # 4 cache: a stack of discs
    cx, cy = xs[3], oy + 205
    for k in range(3):
        y = cy + k * 14
        ImageDraw.Draw(ink).ellipse([(cx - 28) * S, (y - 7) * S, (cx + 28) * S, (y + 7) * S], outline=INK + (235,), width=int(2.2 * S))
    pen(ink, [(cx - 28, cy), (cx - 28, cy + 28)], 2.2, seed=76, taper=False); pen(ink, [(cx + 28, cy), (cx + 28, cy + 28)], 2.2, seed=77, taper=False)
    text(ink, (xs[3], oy + 262), "response cache", 19, HAND, anchor="mm")
    # providers + failover
    for i, (nm, y) in enumerate([("provider 1", 160), ("provider 2", 255), ("provider 3", 350)]):
        pen(ink, [(ox + 1350, oy + y + 18), (ox + 1352, oy + y - 4), (ox + 1380, oy + y - 20), (ox + 1415, oy + y - 6), (ox + 1440, oy + y - 14), (ox + 1470, oy + y), (ox + 1488, oy + y + 18), (ox + 1350, oy + y + 18)], 2.4, seed=80 + i, taper=False, amp=1)
        text(ink, (ox + 1420, oy + y + 40), nm, 19, HAND, anchor="mm")
        arrow(ink, (ox + 1262, oy + 250 + (i - 1) * 24), (ox + 1342, oy + y), bend=(1 - i) * 6, seed=90 + i, w=2.0, head=11)
    # dashed failover loop between provider 1 and 2
    for k in range(0, 10):
        a0 = k / 10; a1 = a0 + .055
        pen(ink, [(ox + 1500 + 22 * math.sin(math.pi * a0), oy + 175 + 80 * a0), (ox + 1500 + 22 * math.sin(math.pi * a1), oy + 175 + 80 * a1)], 2, seed=100 + k, taper=False, amp=.3)
    arrow(ink, (ox + 1498, oy + 245), (ox + 1490, oy + 252), seed=110, w=2, head=9)
    text(ink, (ox + 1498, oy + 128), "failover", 19, HAND, anchor="mm")
    # the two times: pen-drawn bars on one scale (1.6 ms and 394 ms)
    text(ink, (ox + 330, oy + 460), "same prompt, p50 under load", 22, HAND, anchor="lm")
    pen(ink, rect_pts(ox + 330, oy + 480, 4, 40), 2, seed=120, closed=True, taper=False, amp=.4)
    text(ink, (ox + 352, oy + 500), "cache hit  1.6 ms", 22, HAND, anchor="lm")
    pen(ink, rect_pts(ox + 330, oy + 560, 810, 42), 2.4, seed=121, closed=True, taper=False, amp=1.2)
    hatch(ink, ox + 331, oy + 561, 808, 40, gap=9, seed=122, alpha=110)
    text(ink, (ox + 330, oy + 632), "cache miss  394 ms", 22, HAND, anchor="lm")
    text(ink, (ox + 1140, oy + 632), "same scale", 17, HAND, anchor="rm")
    # the headline in the margin
    text(ink, (ox + 1260, oy + 520), "3,085 req/s", 50, HAND, anchor="lm", rot=-3)
    underline(ink, ox + 1260, ox + 1475, oy + 554, seed=130)
    text(ink, (ox + 1260, oy + 584), "features off, 19.8 ms median", 17, HAND, anchor="lm", rot=-3)
    base = stamp_layer(base, ink)
    return base

PLATES = {"aerial-change-intelligence": aerial, "llm-gateway": gateway}

if __name__ == "__main__":
    want = sys.argv[1:] or list(PLATES)
    for slug in want:
        img = PLATES[slug]()
        finish(img, os.path.join(OUT, slug + ".png"))
        print("wrote", slug)
