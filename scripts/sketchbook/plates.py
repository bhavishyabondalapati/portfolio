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

# --------------------------------------------------------------------------------- shared bits for plates 3-9
FIG = os.path.join(ROOT, "scripts/sketchbook/figures")
RGUT = GUT - PX0                                   # gutter x in paper coordinates (793)

def stage(ink, x, y, w, h, label, sub=None, seed=0, r=12, size=20):
    """A pen-drawn box with a label (and a smaller second line)."""
    box_sketch(ink, x, y, w, h, seed=seed, r=r, wd=2.3)
    if sub:
        text(ink, (x + w / 2, y + h / 2 - 9), label, size, HAND, anchor="mm")
        text(ink, (x + w / 2, y + h / 2 + 14), sub, size - 4, HAND, anchor="mm")
    else:
        text(ink, (x + w / 2, y + h / 2), label, size, HAND, anchor="mm")

def headline(ink, x, y, big, lines, rot=-3, size=54, sub=18):
    text(ink, (x, y), big, size, HAND, anchor="lm", rot=rot)
    underline(ink, x, x + size * 0.62 * len(big) * 0.9, y + size * 0.52, seed=int(x) % 17)
    for i, ln in enumerate(lines):
        text(ink, (x, y + size * 0.95 + i * (sub + 6)), ln, sub, HAND, anchor="lm", rot=rot)

def cylinder(ink, cx, cy, w=56, h=64, seed=0):
    d = ImageDraw.Draw(ink)
    d.ellipse([(cx - w / 2) * S, (cy - h / 2) * S, (cx + w / 2) * S, (cy - h / 2 + 18) * S], outline=INK + (235,), width=int(2.3 * S))
    pen(ink, [(cx - w / 2, cy - h / 2 + 9), (cx - w / 2, cy + h / 2 - 9)], 2.3, seed=seed, taper=False, amp=.6)
    pen(ink, [(cx + w / 2, cy - h / 2 + 9), (cx + w / 2, cy + h / 2 - 9)], 2.3, seed=seed + 1, taper=False, amp=.6)
    d.arc([(cx - w / 2) * S, (cy + h / 2 - 18) * S, (cx + w / 2) * S, (cy + h / 2) * S], 0, 180, fill=INK + (235,), width=int(2.3 * S))

def docpage(ink, x, y, w=60, h=78, seed=0, lines=5, fold=True):
    pen(ink, [(x, y), (x + w - 16, y), (x + w, y + 16), (x + w, y + h), (x, y + h), (x, y)], 2.3, seed=seed, taper=False, amp=.9)
    if fold: pen(ink, [(x + w - 16, y), (x + w - 16, y + 16), (x + w, y + 16)], 1.8, seed=seed + 2, taper=False, amp=.4)
    for i in range(lines):
        pen(ink, [(x + 9, y + 28 + i * 9), (x + w - 9 - (i % 3) * 8, y + 28 + i * 9)], 1.5, seed=seed + 5 + i, taper=False, amp=.5, alpha=170)

def bar_row(ink, base, x, y, label, value, scale, hatch_it=True, seed=0, wd=24, color_note=None):
    """A pen-drawn horizontal bar of length value*scale with a label on the left."""
    text(ink, (x, y - 4), label, 19, HAND, anchor="lm")
    ln = max(3, value * scale)
    pen(ink, rect_pts(x, y + 10, ln, wd), 2.3, seed=seed, closed=True, taper=False, amp=1)
    if hatch_it and ln > 12: hatch(ink, x + 1, y + 11, ln - 2, wd - 2, gap=8, seed=seed, alpha=95)
    return ln

# --------------------------------------------------------------------------------- plate 3 · LexIntake (real review page)
def lexintake():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, [(ox + 30, oy + 50), (ox + 760, oy + 40), (ox + 770, oy + 640), (ox + 40, oy + 650)], OCHRE, .5, seed=31, bleed=16)
    base = wash(base, [(GUT + 40, oy + 40), (GUT + 720, oy + 50), (GUT + 700, oy + 650), (GUT + 50, oy + 640)], SLATE, .42, seed=32, bleed=16)
    base = paste_print(base, os.path.join(WORK, "lexintake-review.webp"), (GUT + 372, oy + 300), 650, rot=-1.4, seed=33)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    cw, chh, gx = 200, 92, 36
    xs = [ox + 55, ox + 55 + cw + gx, ox + 55 + 2 * (cw + gx)]; y1, y2 = oy + 70, oy + 235
    docpage(ink, xs[0] + 8, y1 + 4, 52, 66, seed=40, lines=4)
    stage(ink, xs[0] + 70, y1, cw - 70, chh, "PDF or scan", seed=41, size=18)
    stage(ink, xs[1], y1, cw, chh, "parse + OCR", "keeps page and box", seed=42)
    stage(ink, xs[2], y1, cw, chh, "classify", "Haiku", seed=43)
    stage(ink, xs[2], y2, cw, chh, "extract fields", "Sonnet, each with a quote", seed=44)
    stage(ink, xs[1], y2, cw, chh, "quote in the text?", "no: goes to a person", seed=45)
    stage(ink, xs[0], y2, cw, chh, "playbook check", "pass · deviation · unknown", seed=46, size=19)
    arrow(ink, (xs[0] + cw - 6, y1 + chh / 2), (xs[1] - 4, y1 + chh / 2), seed=47, w=2, head=10)
    arrow(ink, (xs[1] + cw, y1 + chh / 2), (xs[2] - 4, y1 + chh / 2), seed=48, w=2, head=10)
    arrow(ink, (xs[2] + cw / 2, y1 + chh), (xs[2] + cw / 2, y2 - 4), seed=49, w=2, head=10)
    arrow(ink, (xs[2] - 4, y2 + chh / 2), (xs[1] + cw, y2 + chh / 2), seed=50, w=2, head=10)
    arrow(ink, (xs[1] - 4, y2 + chh / 2), (xs[0] + cw, y2 + chh / 2), seed=51, w=2, head=10)
    arrow(ink, (xs[0] + cw / 2, y2 + chh + 4), (xs[0] + cw / 2 + 10, oy + 392), seed=52, w=2, head=10)
    text(ink, (xs[0] + cw / 2 + 14, oy + 414), "a person reviews", 21, HAND, anchor="lm")
    arrow(ink, (xs[0] + cw + 70, oy + 414), (GUT + 14, oy + 380), bend=-18, seed=53, w=2.2, head=12)
    headline(ink, ox + 55, oy + 500, "1,768 / 1,782", ["fields exactly right,", "248 held-out documents"], rot=-2, size=50, sub=19)
    text(ink, (ox + 470, oy + 512), "1,495 of 1,495 cited quotes", 19, HAND, anchor="lm", rot=-1.5)
    text(ink, (ox + 470, oy + 538), "found in the text", 19, HAND, anchor="lm", rot=-1.5)
    text(ink, (ox + 470, oy + 580), "$0.0043 a document", 19, HAND, anchor="lm", rot=-1.5)
    text(ink, (GUT + 372, oy + 592), "the review page: the cited quote is highlighted", 21, HAND, anchor="mm", rot=-1)
    return stamp_layer(base, ink)

# --------------------------------------------------------------------------------- plate 4 · RepoRAG (code-drawn)
def reporag():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, rect_pts(ox + 250, oy + 60, 620, 150, 24), OCHRE, .5, seed=41, bleed=13)
    base = wash(base, rect_pts(ox + 250, oy + 250, 620, 150, 24), SLATE, .5, seed=42, bleed=13)
    base = wash(base, [(ox + 1020, oy + 120), (ox + 1500, oy + 110), (ox + 1520, oy + 380), (ox + 1030, oy + 400)], SAGE, .38, seed=43, bleed=14)
    base = wash(base, [(ox + 60, oy + 470), (ox + 700, oy + 470), (ox + 705, oy + 540), (ox + 62, oy + 545)], RUST, .0, seed=44)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    # the question
    pen(ink, [(ox + 40, oy + 215), (ox + 40, oy + 255), (ox + 62, oy + 292), (ox + 52, oy + 255), (ox + 205, oy + 255), (ox + 205, oy + 215), (ox + 40, oy + 215)], 2.4, seed=50, taper=False, amp=1.1)
    text(ink, (ox + 122, oy + 235), "a question", 21, HAND, anchor="mm"); text(ink, (ox + 122, oy + 258 - 1), "", 15, HAND)
    text(ink, (ox + 122, oy + 176), "about a repo", 19, HAND, anchor="mm")
    # two retrievers
    stage(ink, ox + 270, oy + 85, 280, 100, "BM25", "exact names and identifiers", seed=51, size=22)
    stage(ink, ox + 270, oy + 275, 280, 100, "bge-small + FAISS", "meaning", seed=52, size=21)
    arrow(ink, (ox + 208, oy + 228), (ox + 262, oy + 150), bend=-6, seed=53, w=2, head=10)
    arrow(ink, (ox + 208, oy + 245), (ox + 262, oy + 322), bend=6, seed=54, w=2, head=10)
    # merge, rerank, answer
    stage(ink, ox + 640, oy + 160, 220, 120, "merge: RRF", "reciprocal rank fusion", seed=55, size=21)
    arrow(ink, (ox + 556, oy + 135), (ox + 632, oy + 200), bend=-8, seed=56, w=2, head=10)
    arrow(ink, (ox + 556, oy + 325), (ox + 632, oy + 245), bend=8, seed=57, w=2, head=10)
    stage(ink, ox + 905, oy + 170, 150, 100, "rerank", "cross-encoder", seed=58, size=21)
    arrow(ink, (ox + 866, oy + 220), (ox + 898, oy + 220), seed=59, w=2, head=9)
    # the answer page with numbered excerpts
    docpage(ink, ox + 1140, oy + 130, 150, 190, seed=60, lines=0)
    for i, t in enumerate(["answer, citing", "[1] file · symbol · lines", "[2] file · symbol · lines"]):
        text(ink, (ox + 1152, oy + 168 + i * 34), t, 17, HAND, anchor="lm")
    for i in range(3): pen(ink, [(ox + 1152, oy + 262 + i * 15), (ox + 1272 - i * 14, oy + 262 + i * 15)], 1.6, seed=61 + i, taper=False, amp=.5, alpha=160)
    arrow(ink, (ox + 1060, oy + 220), (ox + 1134, oy + 225), seed=64, w=2, head=10)
    text(ink, (ox + 1360, oy + 360), "no support in the repo?", 19, HAND, anchor="mm", rot=-2)
    text(ink, (ox + 1360, oy + 386), "“not enough information”", 19, HAND, anchor="mm", rot=-2)
    # the numbers
    text(ink, (ox + 60, oy + 470), "Recall@5 on itsdangerous", 22, HAND, anchor="lm")
    lk = bar_row(ink, base, ox + 60, oy + 500, "keyword search alone  0.82", 0.82, 560, seed=70)
    lh = bar_row(ink, base, ox + 60, oy + 568, "hybrid search  0.96", 0.964, 560, seed=71)
    headline(ink, ox + 880, oy + 500, "0.96 Recall@5", ["0.722 on a held-out set", "written before any tuning"], rot=-3, size=48, sub=18)
    text(ink, (ox + 1230, oy + 590), "an off-the-shelf reranker made it worse:", 17, HAND, anchor="lm", rot=-2)
    text(ink, (ox + 1230, oy + 614), "MRR@10 0.446 down to 0.385", 17, HAND, anchor="lm", rot=-2)
    return stamp_layer(base, ink)

# --------------------------------------------------------------------------------- plate 5 · Robot arm (real render + tally)
def robot():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, [(ox + 40, oy + 60), (ox + 760, oy + 50), (ox + 770, oy + 640), (ox + 50, oy + 650)], GREY, .35, seed=51, bleed=16)
    base = wash(base, [(GUT + 40, oy + 50), (GUT + 730, oy + 60), (GUT + 720, oy + 640), (GUT + 50, oy + 630)], ROSE, .38, seed=52, bleed=16)
    base = paste_print(base, os.path.join(WORK, "robot-arm-scene.webp"), (ox + 380, oy + 270), 470, rot=-2, seed=53)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    text(ink, (ox + 380, oy + 470), "the simulated SO-101 arm above a red cube", 20, HAND, anchor="mm", rot=-2)
    # how it learned
    stage(ink, ox + 60, oy + 520, 190, 80, "200 demos", "from a scripted expert", seed=54, size=19)
    stage(ink, ox + 300, oy + 520, 190, 80, "behavior-cloning CNN", "2 cameras + joints", seed=55, size=18)
    stage(ink, ox + 540, oy + 520, 190, 80, "10-step action", "chunks", seed=56, size=19)
    arrow(ink, (ox + 252, oy + 560), (ox + 294, oy + 560), seed=57, w=2, head=9)
    arrow(ink, (ox + 492, oy + 560), (ox + 534, oy + 560), seed=58, w=2, head=9)
    # 50 episodes: 46 ticks, 4 misses circled
    headline(ink, GUT + 70, oy + 105, "46 / 50", ["unseen cube positions, from", "cameras and joint angles only"], rot=-3, size=72, sub=21)
    miss = {7, 18, 31, 44}
    for i in range(50):
        col, row = i % 10, i // 10
        x = GUT + 80 + col * 62; y = oy + 300 + row * 54
        pen(ink, [(x - 9, y + 2), (x - 2, y + 11), (x + 12, y - 12)], 3.2 if i not in miss else 2.2, seed=300 + i, taper=False, amp=.5, alpha=235 if i not in miss else 120)
        if i in miss:
            pen(ink, [(x - 12, y - 10), (x + 12, y + 12)], 3.2, seed=400 + i, taper=False, amp=.5); pen(ink, [(x + 12, y - 10), (x - 12, y + 12)], 3.2, seed=500 + i, taper=False, amp=.5)
    text(ink, (GUT + 80, oy + 585), "the scripted expert, which sees the true cube pose: 50 of 50", 18, HAND, anchor="lm", rot=-1)
    text(ink, (GUT + 80, oy + 615), "training took 30 minutes on an M4 Pro", 18, HAND, anchor="lm", rot=-1)
    return stamp_layer(base, ink)

# --------------------------------------------------------------------------------- plate 6 · Excel Copilot (code-drawn)
def excel():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, rect_pts(ox + 50, oy + 50, 700, 400, 22), SAGE, .42, seed=61, bleed=14)
    base = wash(base, rect_pts(ox + 880, oy + 50, 640, 470, 22), OCHRE, .42, seed=63, bleed=14)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gx, gy, cw, rh = ox + 85, oy + 85, 128, 52
    cols, rows = 5, 6
    for c in range(cols + 1): pen(ink, [(gx + c * cw, gy), (gx + c * cw, gy + rows * rh)], 1.9, seed=600 + c, taper=False, amp=.8)
    for r in range(rows + 1): pen(ink, [(gx, gy + r * rh), (gx + cols * cw, gy + r * rh)], 1.9, seed=700 + r, taper=False, amp=.8)
    for c, ch in enumerate("ABCDE"): text(ink, (gx + c * cw + cw / 2, gy + rh / 2), ch, 22, HAND, anchor="mm")
    for r in range(1, rows): text(ink, (gx + 16, gy + r * rh + rh / 2), str(r), 18, HAND, anchor="mm")
    base = wash(base, rect_pts(gx + 2 * cw + 4, gy + 3 * rh + 4, cw - 8, rh - 8, 4), OCHRE, .8, seed=64, bleed=3)
    text(ink, (gx + 2 * cw + cw / 2, gy + 3 * rh + rh / 2), "before", 21, HAND, anchor="mm")
    pen(ink, [(gx + 2 * cw + 32, gy + 3 * rh + rh / 2), (gx + 2 * cw + cw - 32, gy + 3 * rh + rh / 2)], 2.2, seed=65, taper=False, amp=.5)
    base = wash(base, rect_pts(gx + 3 * cw + 4, gy + 3 * rh + 4, cw - 8, rh - 8, 4), SAGE, .85, seed=66, bleed=3)
    text(ink, (gx + 3 * cw + cw / 2, gy + 3 * rh + rh / 2), "after", 21, HAND, anchor="mm")
    text(ink, (gx + 2.5 * cw, gy + rows * rh + 38), "a cell-level before and after, shown first", 22, HAND, anchor="mm", rot=-1)
    steps = ["Plain-English request", "Check the shape", "Check the meaning", "Preview the cell diff", "You confirm", "Apply, with undo"]
    px, py = ox + 930, oy + 85
    for i, st in enumerate(steps):
        yy = py + i * 68
        ImageDraw.Draw(ink).ellipse([(px) * S, (yy) * S, (px + 42) * S, (yy + 42) * S], outline=INK + (235,), width=int(2.4 * S))
        text(ink, (px + 21, yy + 21), str(i + 1), 24, HAND, anchor="mm")
        text(ink, (px + 66, yy + 21), st, 27, HAND, anchor="lm")
        if i < 5: pen(ink, [(px + 21, yy + 44), (px + 21, yy + 66)], 2, seed=800 + i, taper=False, amp=.4)
    ux, uy0, uy1 = px + 470, py + 5 * 68 + 21, py + 1 * 68 + 21
    pen(ink, [(ux - 20, uy0), (ux + 30, uy0 - 16), (ux + 44, (uy0 + uy1) / 2), (ux + 30, uy1 + 16), (ux - 20, uy1)], 2.2, seed=810, taper=False, amp=.8)
    arrow(ink, (ux - 4, uy1 + 4), (ux - 22, uy1 - 1), seed=811, w=2, head=10)
    text(ink, (ux + 60, (uy0 + uy1) / 2 - 20), "undo", 24, HAND, anchor="lm", rot=-8)
    text(ink, (ux + 60, (uy0 + uy1) / 2 + 12), "refuses stale", 18, HAND, anchor="lm", rot=-8)
    text(ink, (ux + 60, (uy0 + uy1) / 2 + 36), "previews", 18, HAND, anchor="lm", rot=-8)
    headline(ink, ox + 85, oy + 505, "120 tests", ["across 11 files; nothing is written", "without a confirmed preview"], rot=-2, size=60, sub=22)
    text(ink, (ox + 930, oy + 575), "a Zod schema sent to Claude or Gemini", 22, HAND, anchor="lm", rot=-2)
    text(ink, (ox + 930, oy + 608), "one TypeScript core, in Excel and in a browser demo", 20, HAND, anchor="lm", rot=-2)
    return stamp_layer(base, ink)

# --------------------------------------------------------------------------------- plate 7 · ImpactLens (real figures + bars)
def impactlens():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, [(ox + 40, oy + 50), (ox + 760, oy + 40), (ox + 770, oy + 640), (ox + 50, oy + 650)], SAGE, .38, seed=71, bleed=16)
    base = wash(base, [(GUT + 40, oy + 40), (GUT + 730, oy + 50), (GUT + 720, oy + 650), (GUT + 50, oy + 640)], OCHRE, .45, seed=72, bleed=16)
    base = paste_print(base, os.path.join(FIG, "sen1floods11-sample.jpg"), (ox + 395, oy + 175), 560, rot=-1.2, seed=73)
    base = paste_print(base, os.path.join(FIG, "valencia-ndvi-drop.jpg"), (GUT + 285, oy + 328), 470, rot=1.2, seed=74)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    text(ink, (ox + 395, oy + 302), "Sentinel-2 tile, false colour, and the flood mask", 18, HAND, anchor="mm", rot=-1)
    text(ink, (ox + 70, oy + 360), "flood detection F1, Sen1Floods11 test data", 20, HAND, anchor="lm")
    bar_row(ink, base, ox + 70, oy + 386, "ImpactLens U-Net  0.92", 0.92, 600, seed=75)
    bar_row(ink, base, ox + 70, oy + 450, "best tuned water index  0.87", 0.87, 600, seed=76)
    headline(ink, ox + 70, oy + 575, "F1 0.92", ["against 0.87 for the best", "tuned water-index baseline"], rot=-2, size=52, sub=19)
    text(ink, (ox + 520, oy + 585), "phases 1 to 4 done; the agents and", 18, HAND, anchor="lm", rot=-1.5)
    text(ink, (ox + 520, oy + 610), "the AWS deployment are built", 18, HAND, anchor="lm", rot=-1.5)
    text(ink, (GUT + 285, oy + 592), "Valencia 2024: vegetation loss by town", 20, HAND, anchor="mm", rot=1)
    text(ink, (GUT + 590, oy + 140), "Paiporta 42%", 24, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 590, oy + 172), "Alfafar 37%", 24, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 590, oy + 212), "of their vegetated land,", 17, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 590, oy + 236), "against 2 to 3% in", 17, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 590, oy + 260), "comparable farm towns", 17, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 590, oy + 300), "no location hints", 17, HAND, anchor="lm", rot=-3)
    text(ink, (GUT + 590, oy + 324), "given to the model", 17, HAND, anchor="lm", rot=-3)
    return stamp_layer(base, ink)

# --------------------------------------------------------------------------------- plate 8 · Document Intelligence Chatbot (code-drawn)
def docchat():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, [(ox + 60, oy + 60), (ox + 420, oy + 50), (ox + 430, oy + 420), (ox + 70, oy + 430)], OCHRE, .42, seed=81, bleed=14)
    base = wash(base, rect_pts(ox + 520, oy + 90, 520, 300, 24), SLATE, .42, seed=82, bleed=14)
    base = wash(base, [(ox + 1130, oy + 90), (ox + 1520, oy + 80), (ox + 1530, oy + 420), (ox + 1140, oy + 430)], SAGE, .4, seed=83, bleed=14)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    # a PDF page with one highlighted passage
    docpage(ink, ox + 110, oy + 90, 260, 320, seed=90, lines=0)
    for i in range(11):
        pen(ink, [(ox + 135, oy + 140 + i * 20), (ox + 345 - (i % 4) * 14, oy + 140 + i * 20)], 1.7, seed=91 + i, taper=False, amp=.6, alpha=190)
    base = wash(base, rect_pts(ox + 132, oy + 220, 214, 22, 3), (240, 214, 90), .7, seed=84, bleed=2)
    text(ink, (ox + 240, oy + 428), "PDFs, scanned ones read with OCR", 18, HAND, anchor="mm", rot=-1)
    # retrieval
    stage(ink, ox + 560, oy + 120, 200, 90, "BM25", "words", seed=92, size=21)
    stage(ink, ox + 560, oy + 270, 200, 90, "bge-small", "meaning (FAISS)", seed=93, size=20)
    stage(ink, ox + 830, oy + 190, 170, 100, "merge", "hybrid", seed=94, size=21)
    arrow(ink, (ox + 376, oy + 230), (ox + 552, oy + 165), bend=-10, seed=95, w=2, head=10)
    arrow(ink, (ox + 376, oy + 270), (ox + 552, oy + 315), bend=8, seed=96, w=2, head=10)
    arrow(ink, (ox + 766, oy + 165), (ox + 822, oy + 225), seed=97, w=2, head=10)
    arrow(ink, (ox + 766, oy + 315), (ox + 822, oy + 258), seed=98, w=2, head=10)
    # the answer, with file, page and position
    pen(ink, rect_pts(ox + 1150, oy + 120, 350, 210, 18), 2.4, seed=99, closed=True, taper=False, amp=1.2)
    text(ink, (ox + 1325, oy + 152), "answer", 21, HAND, anchor="mm")
    text(ink, (ox + 1170, oy + 198), "cites file, page and position", 18, HAND, anchor="lm")
    text(ink, (ox + 1170, oy + 238), "and says so when it", 18, HAND, anchor="lm")
    text(ink, (ox + 1170, oy + 264), "does not know", 18, HAND, anchor="lm")
    arrow(ink, (ox + 1006, oy + 240), (ox + 1142, oy + 235), seed=100, w=2, head=10)
    # the numbers: two bars each, before and after
    text(ink, (ox + 60, oy + 500), "60 hand-labelled questions over FDA drug labels", 21, HAND, anchor="lm")
    for i, (lbl, a, b) in enumerate([("Hit@1", .42, .71), ("MRR@10", .57, .80)]):
        y = oy + 530 + i * 70
        bar_row(ink, base, ox + 60, y, f"{lbl}  keyword search alone  {a:.2f}", a, 520, seed=110 + i, wd=18)
        bar_row(ink, base, ox + 640, y, f"{lbl}  hybrid  {b:.2f}", b, 520, seed=120 + i, wd=18)
    headline(ink, ox + 1240, oy + 480, "0.42 to 0.71", ["Hit@1 with hybrid", "retrieval"], rot=-3, size=48, sub=19)
    return stamp_layer(base, ink)

# --------------------------------------------------------------------------------- plate 9 · Kambaz LMS (code-drawn)
def kambaz():
    base = blank(); ox, oy = PX0, PY0
    base = wash(base, rect_pts(ox + 60, oy + 60, 620, 410, 24), OCHRE, .42, seed=91, bleed=14)
    base = wash(base, rect_pts(ox + 830, oy + 105, 300, 210, 24), SLATE, .45, seed=92, bleed=14)
    base = wash(base, rect_pts(ox + 1275, oy + 110, 190, 240, 22), SAGE, .5, seed=93, bleed=12)
    ink = Image.new("RGBA", base.size, (0, 0, 0, 0))
    # a browser window with course cards
    wx, wy, ww, wh = ox + 90, oy + 90, 560, 350
    box_sketch(ink, wx, wy, ww, wh, seed=130, r=16, wd=2.6)
    pen(ink, [(wx, wy + 44), (wx + ww, wy + 44)], 2, seed=131, taper=False, amp=.8)
    for i in range(3): ImageDraw.Draw(ink).ellipse([(wx + 16 + i * 22) * S, (wy + 15) * S, (wx + 30 + i * 22) * S, (wy + 29) * S], outline=INK + (230,), width=int(2 * S))
    text(ink, (wx + ww / 2, wy + 22), "Kambaz", 20, HAND, anchor="mm")
    names = ["course", "course", "course", "course", "course", "course"]
    for i in range(6):
        cx, cy = wx + 26 + (i % 3) * 176, wy + 70 + (i // 3) * 130
        box_sketch(ink, cx, cy, 160, 112, seed=140 + i, r=10, wd=2)
        pen(ink, [(cx, cy + 46), (cx + 160, cy + 46)], 1.6, seed=150 + i, taper=False, amp=.5)
        text(ink, (cx + 80, cy + 78), names[i], 20, HAND, anchor="mm")
    text(ink, (wx + ww / 2, wy + wh + 30), "courses, modules, assignments, enrollments", 21, HAND, anchor="mm", rot=-1)
    # the API and the database
    stage(ink, ox + 850, oy + 150, 260, 120, "Express 5 API", "cookie sessions", seed=160, size=22)
    arrow(ink, (ox + 654, oy + 250), (ox + 842, oy + 210), bend=-10, seed=161, w=2.2, head=11)
    arrow(ink, (ox + 842, oy + 238), (ox + 660, oy + 275), bend=10, seed=162, w=1.8, head=9)
    cylinder(ink, ox + 1370, oy + 230, 120, 120, seed=163)
    text(ink, (ox + 1370, oy + 320), "MongoDB", 22, HAND, anchor="mm")
    arrow(ink, (ox + 1112, oy + 210), (ox + 1296, oy + 225), seed=164, w=2.2, head=11)
    text(ink, (ox + 480, oy + 52), "Next.js 15 · React 19 · Redux Toolkit", 20, HAND, anchor="mm", rot=-1)
    text(ink, (ox + 980, oy + 118), "Mongoose", 17, HAND, anchor="mm", rot=-2)
    headline(ink, ox + 840, oy + 430, "my own full stack", ["the frontend and the API are both mine,", "built for CS 5610 Web Development, Fall 2025", "a live site and four repositories are linked"], rot=-2, size=50, sub=22)
    return stamp_layer(base, ink)

PLATES = {"aerial-change-intelligence": aerial, "llm-gateway": gateway, "lexintake": lexintake, "reporag": reporag,
          "robot-arm-sim": robot, "excel-copilot": excel, "impactlens": impactlens, "doc-intelligence-chatbot": docchat, "kambaz": kambaz}

if __name__ == "__main__":
    want = sys.argv[1:] or list(PLATES)
    for slug in want:
        img = PLATES[slug]()
        finish(img, os.path.join(OUT, slug + ".png"))
        print("wrote", slug)
