"""Tiny ink-and-wash toolkit: a blank sketchbook spread, wobbly pen lines, watercolour washes, printed figures.
Everything is drawn in code (numpy + Pillow), seeded, at 2x and scaled down. Output is a 1760x1240 RGBA page
spread with the same book outline as ThreeUI's sketchbook pages (paper x 91..1670, y 271..968, gutter at x 884)."""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

W, H = 1760, 1240
PX0, PX1, PY0, PY1, GUT = 91, 1670, 271, 968, 884
S = 2                                   # supersampling
FONT = "/System/Library/Fonts/Supplemental/"
def font(name, size): return ImageFont.truetype(FONT + name, int(size * S))
HAND = "Bradley Hand Bold.ttf"; SERIF_I = "Georgia Italic.ttf"; SERIF = "Georgia.ttf"

INK = (38, 34, 31)
rng = random.Random(7)

def noise(w, h, scale, seed):
    r = np.random.RandomState(seed)
    small = r.rand(max(2, int(h / scale) + 2), max(2, int(w / scale) + 2)).astype(np.float32)
    im = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0

def book_template():
    """Blank open sketchbook at 2x: cream cold-press paper, soft gutter shadow, page-block edge, rounded corners."""
    w, h = W * S, H * S
    base = np.zeros((h, w, 3), np.float32); base[:] = (252, 246, 238)
    tex = 0.55 * noise(w, h, 5 * S, 1) + 0.3 * noise(w, h, 11 * S, 2) + 0.15 * noise(w, h, 40 * S, 3)
    # emboss-like light on the paper tooth
    gy, gx = np.gradient(tex); tooth = (gx + gy) * 38
    base += (tex[..., None] - 0.5) * 6 + tooth[..., None] * 1.6
    xs = np.arange(w, dtype=np.float32)[None, :] / S
    # gutter: left page darkens into the fold, right page has a thin crease then brightens
    d = np.abs(xs - GUT)
    shade = np.where(xs < GUT, np.exp(-(d / 55) ** 1.6) * 0.20, np.exp(-(d / 38) ** 1.5) * 0.16)
    shade = shade + np.exp(-(d / 2.2) ** 2) * 0.30
    base *= (1 - shade)[..., None]
    # outer edge falloff (page curvature) and a stack of page edges at left / bottom
    ys = np.arange(h, dtype=np.float32)[:, None] / S
    edge = np.minimum(np.minimum(xs - PX0, PX1 - xs), np.minimum(ys - PY0, PY1 - ys))
    base *= (1 - 0.10 * np.exp(-np.maximum(edge, 0) / 22))[..., None]
    stack = np.exp(-np.maximum(xs - PX0, 0) / 4) * 0.12 + np.exp(-np.maximum(PY1 - ys, 0) / 4) * 0.12
    base *= (1 - stack)[..., None]
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert("RGBA")
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([PX0 * S, PY0 * S, PX1 * S, PY1 * S], radius=40 * S, fill=255)
    img.putalpha(m)
    return img

def wobble(pts, amp=1.6, seed=0, closed=False, step=1.4):
    """Smooth, slightly shaky path through pts (list of (x,y) in 1x coordinates)."""
    r = random.Random(seed)
    if closed: pts = pts + [pts[0]]
    out = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(2, int(math.hypot(x1 - x0, y1 - y0) / step))
        for i in range(n):
            t = i / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    out.append(pts[-1])
    n = len(out); fx = [r.uniform(0, 6.28) for _ in range(3)]
    res = []
    for i, (x, y) in enumerate(out):
        d = i * step
        a = amp * (math.sin(d / 38 + fx[0]) * .6 + math.sin(d / 14 + fx[1]) * .4)
        b = amp * (math.sin(d / 34 + fx[2]) * .6 + math.cos(d / 17 + fx[0]) * .4)
        res.append((x + a, y + b))
    return res

def pen(layer, pts, w=2.4, color=INK, alpha=235, seed=0, taper=True, amp=1.2, closed=False):
    """Draw a pressure-varying ink stroke along pts on an RGBA layer (2x)."""
    d = ImageDraw.Draw(layer); path = wobble(pts, amp, seed, closed)
    n = len(path); r = random.Random(seed + 99)
    for i, (x, y) in enumerate(path):
        t = i / max(1, n - 1)
        k = (math.sin(math.pi * t) ** .35 if taper else 1) * (0.88 + 0.12 * math.sin(i / 21 + seed))
        rad = max(.5, w * k * S / 2)
        d.ellipse([x * S - rad, y * S - rad, x * S + rad, y * S + rad], fill=color + (alpha,))

def rect_pts(x, y, w, h, r=0):
    if not r: return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    pts = []
    for cx, cy, a0 in [(x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180)]:
        for k in range(7):
            a = math.radians(a0 + 90 * k / 6); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def wash(base, poly, color, alpha=0.55, seed=0, bleed=7, edge=0.35, grain=0.35):
    """Watercolour wash on base (RGBA, 2x): noisy edge, darker rim, paper-grain breakup. Multiplies onto base."""
    w, h = base.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([(x * S, y * S) for x, y in poly], fill=255)
    ns = noise(w, h, 22 * S, seed + 5)
    blur = np.asarray(m.filter(ImageFilter.GaussianBlur(bleed * S * 1.1)), np.float32) / 255
    a = np.clip((blur + (ns - .5) * 0.8 - 0.5) * 4 + 0.5, 0, 1)
    soft = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.0 * S)), np.float32) / 255
    inner = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9 * S)), np.float32) / 255
    rim = np.clip(soft - inner, 0, 1)
    gr = 1 - grain * (noise(w, h, 3 * S, seed + 11) - .3).clip(0, 1) * 1.1
    pool = 0.8 + 0.4 * noise(w, h, 60 * S, seed + 17)
    cover = np.clip(soft * (0.75 + edge * 0 ) * pool * gr + rim * edge, 0, 1) * alpha
    arr = np.asarray(base.convert("RGB"), np.float32)
    col = np.array(color, np.float32)[None, None, :] / 255
    out = arr * (1 - cover[..., None] * (1 - col))
    res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).convert("RGBA")
    res.putalpha(base.getchannel("A"))
    return res

def stamp_layer(base, layer):
    """Composite an ink layer (RGBA, 2x) over base, multiplying so ink sits in the paper."""
    return Image.alpha_composite(base, layer)

def text(layer, xy, s, size=22, name=HAND, color=INK, alpha=230, anchor="la", rot=0):
    f = font(name, size)
    if not rot:
        ImageDraw.Draw(layer).text((xy[0] * S, xy[1] * S), s, font=f, fill=color + (alpha,), anchor=anchor); return
    tmp = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    ImageDraw.Draw(tmp).text((xy[0] * S, xy[1] * S), s, font=f, fill=color + (alpha,), anchor=anchor)
    tmp = tmp.rotate(rot, center=(xy[0] * S, xy[1] * S), resample=Image.BICUBIC)
    layer.alpha_composite(tmp)

def hatch(layer, x, y, w, h, gap=7, ang=-35, seed=0, alpha=150, wd=1.1):
    """Pen hatching inside a rectangle."""
    r = random.Random(seed); a = math.radians(ang)
    L = Image.new("L", layer.size, 0); ImageDraw.Draw(L).rectangle([x * S, y * S, (x + w) * S, (y + h) * S], fill=255)
    tmp = Image.new("RGBA", layer.size, (0, 0, 0, 0)); d = ImageDraw.Draw(tmp)
    diag = int(math.hypot(w, h)); cx, cy = x + w / 2, y + h / 2
    for k in range(-diag // gap, diag // gap):
        off = k * gap + r.uniform(-1.2, 1.2)
        dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
        x0, y0 = cx + nx * off - dx * diag, cy + ny * off - dy * diag
        x1, y1 = cx + nx * off + dx * diag, cy + ny * off + dy * diag
        d.line([(x0 * S, y0 * S), (x1 * S, y1 * S)], fill=INK + (alpha,), width=max(1, int(wd * S)))
    tmp.putalpha(ImageChops.multiply(tmp.getchannel("A"), L)); layer.alpha_composite(tmp)

def finish(img, path):
    """Back to 1760x1240 (the spread is built at 2x), keep the transparent outside, save PNG."""
    out = img.resize((W, H), Image.LANCZOS)
    out.save(path.replace(".png", ".webp"), "WEBP", quality=92, method=6)   # WebP keeps the transparent outside and is ~10x smaller
    return out
