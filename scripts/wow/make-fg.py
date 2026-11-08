"""Draws the foreground layers of the house in code (SVG, seeded, no photographs):
elm branches, riverbank reeds, a Beacon Hill gas lamp, an iron railing and autumn leaves.   python3 scripts/wow/make-fg.py"""
import math, random, os
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "house", "assets")
f = lambda v: f"{v:.1f}"

def save(name, w, h, body, defs=""):
    open(os.path.join(OUT, name), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f'<defs>{defs}</defs>{body}</svg>')

# ---------------------------------------------------------------- elm: branches in from the right edge
def elm():
    r = random.Random(11); W, H = 1024, 1438
    dark, rim, leaf = [], [], []
    def branch(x, y, ang, ln, wd, depth):
        x2, y2 = x + math.cos(ang) * ln, y + math.sin(ang) * ln
        mx, my = (x + x2) / 2 + r.uniform(-ln * .12, ln * .12), (y + y2) / 2 + r.uniform(-ln * .12, ln * .12)
        d = f"M{f(x)} {f(y)} Q{f(mx)} {f(my)} {f(x2)} {f(y2)}"
        dark.append(f'<path d="{d}" stroke-width="{f(wd)}"/>')
        if wd > 5: rim.append(f'<path d="{d}" stroke-width="{f(max(1.2, wd * .16))}" transform="translate(-{f(wd * .34)} -{f(wd * .2)})"/>')
        if depth == 0 or wd < 1.6:
            if r.random() < .55:
                for _ in range(r.randint(1, 3)):
                    leaf.append(f'<ellipse cx="{f(x2 + r.uniform(-14, 14))}" cy="{f(y2 + r.uniform(-14, 14))}" rx="{f(r.uniform(4, 8))}" ry="{f(r.uniform(2.5, 5))}" transform="rotate({int(r.uniform(0, 180))} {f(x2)} {f(y2)})"/>')
            return
        for k in range(r.choice([2, 2, 3])):
            a = ang + r.uniform(-.75, .75) * (1 if k else .5)
            branch(x2, y2, a, ln * r.uniform(.62, .8), wd * r.uniform(.55, .72), depth - 1)
    # three limbs that enter from the right edge and arch up and over to the left
    for (x, y, a, ln, wd) in [(W + 40, 1500, math.radians(-128), 330, 58), (W + 30, 1160, math.radians(-150), 300, 38), (W + 20, 760, math.radians(-166), 260, 26), (W + 20, 380, math.radians(-172), 230, 20)]:
        branch(x, y, a, ln, wd, 6)
    body = (f'<g fill="none" stroke="#080f19" stroke-linecap="round">{"".join(dark)}</g>'
            f'<g fill="none" stroke="#f2a541" stroke-opacity=".34" stroke-linecap="round">{"".join(rim)}</g>'
            f'<g fill="#c98a3a" fill-opacity=".8">{"".join(leaf)}</g>')
    save("elm.svg", W, H, body)

# ---------------------------------------------------------------- reeds and cattails
def reeds():
    r = random.Random(5); W, H = 1717, 916
    blades, heads = [], []
    for i in range(120):
        x = r.uniform(30, W - 30); lean = r.uniform(-1, 1) * 230; h = r.uniform(380, 860) if r.random() > .25 else r.uniform(200, 380)
        wd = r.uniform(5, 11); x2, y2 = x + lean, H - h; cx, cy = x + lean * .15, H - h * .55
        d = f"M{f(x - wd)} {H} Q{f(cx - wd * .5)} {f(cy)} {f(x2)} {f(y2)} Q{f(cx + wd * .6)} {f(cy)} {f(x + wd)} {H}Z"
        c = r.choice(["#09151a", "#0c1d20", "#10272a", "#0a1a17", "#142a22"])
        blades.append(f'<path d="{d}" fill="{c}"/>')
        if r.random() < .5: blades.append(f'<path d="M{f(x - wd)} {H} Q{f(cx - wd * .5)} {f(cy)} {f(x2)} {f(y2)}" fill="none" stroke="#f2a541" stroke-opacity="{f(r.uniform(.08, .22))}" stroke-width="1.6"/>')
    for i in range(9):
        x = r.uniform(120, W - 120); h = r.uniform(520, 800); lean = r.uniform(-60, 60); x2, y2 = x + lean, H - h
        heads.append(f'<path d="M{f(x)} {H} Q{f(x + lean * .2)} {f(H - h * .5)} {f(x2)} {f(y2)}" stroke="#0a1812" stroke-width="5" fill="none"/>'
                     f'<rect x="{f(x2 - 11)}" y="{f(y2 - 70)}" width="22" height="86" rx="11" fill="#150f0a" transform="rotate({f(lean * .25)} {f(x2)} {f(y2)})"/>'
                     f'<rect x="{f(x2 - 11)}" y="{f(y2 - 70)}" width="5" height="86" rx="2.5" fill="#f2a541" fill-opacity=".38" transform="rotate({f(lean * .25)} {f(x2)} {f(y2)})"/>')
    save("reeds.svg", W, H, "".join(blades) + "".join(heads) + f'<rect x="0" y="{H - 40}" width="{W}" height="40" fill="#070e15"/>')

# ---------------------------------------------------------------- gas lamp
def lamp():
    W, H = 1024, 1499
    defs = ('<radialGradient id="g" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#fff0c8"/><stop offset=".35" stop-color="#ffc56a"/><stop offset=".8" stop-color="#b8601c"/><stop offset="1" stop-color="#5a2a0c"/></radialGradient>'
            '<linearGradient id="p" x1="0" x2="1"><stop offset="0" stop-color="#101a26"/><stop offset=".55" stop-color="#070d15"/><stop offset="1" stop-color="#0c1520"/></linearGradient>')
    body = (
        # post with a swelling base and collar rings
        '<path d="M486 640 H538 L548 1290 Q548 1330 590 1360 L640 1400 V1499 H384 V1400 L434 1360 Q476 1330 476 1290Z" fill="url(#p)"/>'
        '<path d="M486 640 L476 1290" stroke="#f2a541" stroke-opacity=".38" stroke-width="3" fill="none"/>'
        '<rect x="470" y="700" width="84" height="18" rx="6" fill="#0a121c"/><rect x="474" y="1100" width="76" height="14" rx="5" fill="#0a121c"/>'
        '<rect x="462" y="620" width="100" height="30" rx="8" fill="#0b141f"/>'
        # cross bar with scrolled ends
        '<rect x="330" y="760" width="364" height="12" rx="6" fill="#0a121c"/><circle cx="330" cy="766" r="14" fill="#0a121c"/><circle cx="694" cy="766" r="14" fill="#0a121c"/>'
        # lantern: cap, frame, glass, flame
        '<path d="M512 70 L522 120 H502Z" fill="#0a121c"/><path d="M330 215 L512 112 L694 215Z" fill="#0b141f"/><path d="M330 215 L512 112" stroke="#f2a541" stroke-opacity=".45" stroke-width="3"/>'
        '<rect x="318" y="212" width="388" height="26" rx="6" fill="#0a121c"/>'
        '<path d="M345 238 H679 L645 590 H379Z" fill="url(#g)"/>'
        '<path d="M345 238 H679 L645 590 H379Z" fill="none" stroke="#0a121c" stroke-width="16" stroke-linejoin="round"/>'
        '<path d="M512 238 V590 M429 238 L412 590 M595 238 L612 590 M362 410 H662" stroke="#0a121c" stroke-width="9" fill="none"/>'
        '<path d="M512 520 C470 470 490 410 512 360 C534 410 556 470 512 520Z" fill="#fff6d8" fill-opacity=".9"/>'
        '<path d="M379 590 H645 L620 640 H404Z" fill="#0a121c"/>')
    save("gas-lamp.svg", W, H, body, defs)

# ---------------------------------------------------------------- iron railing
def railing():
    W, H = 1717, 876; r = random.Random(3)
    parts = ['<rect x="0" y="470" width="1717" height="14" fill="#070d15"/>', '<rect x="0" y="760" width="1717" height="14" fill="#070d15"/>',
             '<rect x="0" y="468" width="1717" height="3" fill="#f2a541" fill-opacity=".3"/>']
    x = 20
    while x < W:
        post = (round((x - 20) / 62) % 6 == 0)
        if post:
            parts.append(f'<rect x="{x - 9}" y="330" width="18" height="520" fill="#070d15"/><circle cx="{x}" cy="318" r="19" fill="#070d15"/><rect x="{x - 12}" y="420" width="24" height="12" fill="#070d15"/><circle cx="{x - 6}" cy="312" r="4" fill="#f2a541" fill-opacity=".35"/>')
        else:
            parts.append(f'<rect x="{x - 3.5}" y="400" width="7" height="450" fill="#070d15"/><path d="M{x} 360 L{x + 11} 404 H{x - 11}Z" fill="#070d15"/><path d="M{x} 362 L{x - 9} 402" stroke="#f2a541" stroke-opacity=".3" stroke-width="2"/>')
        x += 62
    # a low hedge of clipped boxwood behind the railing foot
    for i in range(34):
        cx = 20 + i * 52 + r.uniform(-10, 10); cy = 820 + r.uniform(-12, 8); rr = r.uniform(34, 52)
        parts.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(rr)}" fill="#08141a"/>')
    parts.append(f'<rect x="0" y="830" width="{W}" height="46" fill="#070d15"/>')
    save("iron-railing.svg", W, H, "".join(parts))

# ---------------------------------------------------------------- autumn leaves (drifting cluster)
def leaves():
    r = random.Random(33); W, H = 1536, 1024; out = []
    maple = "M0 -60 L12 -34 L34 -44 L28 -16 L56 -10 L36 8 L46 34 L16 28 L10 60 L0 44 L-10 60 L-16 28 L-46 34 L-36 8 L-56 -10 L-28 -16 L-34 -44 L-12 -34Z"
    for i in range(24):
        x, y = r.uniform(80, W - 80), r.uniform(60, H - 60); s = r.uniform(.55, 1.5); a = r.uniform(0, 360)
        c = r.choice(["#c8531e", "#e0902f", "#9c3b2a", "#d6761f", "#7a3320"])
        out.append(f'<g transform="translate({f(x)} {f(y)}) rotate({f(a)}) scale({f(s)})" opacity="{f(r.uniform(.7, .95))}">'
                   f'<path d="{maple}" fill="{c}"/><path d="M0 -50 V54" stroke="#2a0f08" stroke-opacity=".5" stroke-width="2"/>'
                   f'<path d="{maple}" fill="none" stroke="#f2a541" stroke-opacity=".25" stroke-width="2"/></g>')
    save("autumn-leaves.svg", W, H, "".join(out))

for fn in (elm, reeds, lamp, railing, leaves): fn()
print("drew 7 foreground layers")
