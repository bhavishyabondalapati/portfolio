# NOTE: public/landing-pages/kage.html (ThreeUI's original page, with its unlicensed "Wordmark" font) was removed
# before launch, so this generator can no longer run. It is kept as a record of how public/house/house.html was
# made; from now on house.html itself is the source and is edited directly.
# One-time transform: ThreeUI's Kage page (public/landing-pages/kage.html, MIT) becomes the
# Boston house page (public/house/house.html). It keeps Kage's engine (scroll rig, foreground
# stages, giant word, cloth cards, post-processing) and replaces the world builders, the hero copy,
# the palette and the title font. house.html is generated: edit scripts/house-patches.py (and this script), then re-run.
#   python3 scripts/make-house.py
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "public/landing-pages/kage.html").read_text()
world = Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else (ROOT / "scripts/house-world.js").read_text()
s = src


def rep(a, b, count=1):
    global s
    if a not in s:
        raise SystemExit(f"not found: {a[:80]!r}")
    s = s.replace(a, b, count)


def drop_function(name):
    """Remove `function name(...) { ... }` by brace matching (shader strings here are balanced)."""
    global s
    m = re.search(r"\nfunction " + name + r"\(", s)
    if not m:
        raise SystemExit(f"function not found: {name}")
    i = s.index("{", m.end())
    depth = 0
    for j in range(i, len(s)):
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                s = s[: m.start()] + "\n" + s[j + 1 :]
                return
    raise SystemExit(f"unbalanced: {name}")


# ---- head ----
rep("<title>Kage — Where stillness reveals the unseen</title>", "<title>Bhavishya Bondalapati — the Charles at night</title>")
s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Bhavishya Bondalapati, ML systems and backend engineer: a night walk along the Charles River in Boston, rendered live in WebGL.">', s, count=1)
s = re.sub(r'<link rel="icon" href="[^"]*">', "<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23070d17'/%3E%3Ccircle cx='16' cy='13' r='6' fill='%23f2a541'/%3E%3Cpath d='M5 23c3.6-2.4 7.4-2.4 11 0s7.4 2.4 11 0' stroke='%23ece6d6' stroke-width='1.6' fill='none'/%3E%3C/svg%3E\">", s, count=1)
rep('<link rel="stylesheet" href="secret-pathways-assets/fonts.css">', '<link rel="stylesheet" href="fonts.css">')

# ---- palette ----
rep("""  --ink:#05070a;          /* page black */
  --ink-2:#0a0e12;        /* raised black */
  --bone:#dfe7e0;         /* the pale sage white of the wordmark */
  --bone-dim:#aab4ad;
  --muted:#78837c;
  --line:rgba(223,231,224,.13);
  --line-soft:rgba(223,231,224,.07);
  --vermilion:#e0231c;
  --ember:#ff5a3c;
  --gold:#c9a24a;""", """  --ink:#070d17;          /* night over the Charles */
  --ink-2:#0f2236;        /* the river */
  --bone:#ece6d6;         /* moonlight off-white, the plain site's ink */
  --bone-dim:#c3bdae;
  --muted:#93a0b3;
  --line:rgba(236,230,214,.13);
  --line-soft:rgba(236,230,214,.07);
  --vermilion:#f2a541;    /* gaslight: the one accent (name kept so the engine's styles follow) */
  --ember:#ffc27a;
  --gold:#d9b46a;
  --brick:#9c3b2a;
  --dawn:#e7a08c;""")
rep("#gl{\n  position:fixed; inset:0; width:100%; height:100%;\n  display:block; z-index:0; background:#05070a;", "#gl{\n  position:fixed; inset:0; width:100%; height:100%;\n  display:block; z-index:0; background:#070d17;")
rep(".jp{ font-family:'NotoJP','Onest',sans-serif; font-weight:400; }", ".jp{ font-family:'Onest',sans-serif; font-weight:400; }")
rep("font-family:'Wordmark','Onest',sans-serif; font-weight:600; font-size:21.4vw; line-height:.78;", "font-family:'House Wordmark','Onest',sans-serif; font-weight:800; font-size:10.4vw; line-height:.78;")
rep(".hero-side .v{ writing-mode:vertical-rl; font-size:13px; letter-spacing:.62em; color:rgba(223,231,224,.5); }", ".hero-side .v{ writing-mode:vertical-rl; font-size:13px; letter-spacing:.62em; color:rgba(223,231,224,.5); }\n/* the house's margin line is a coordinate, not three characters: keep it small in every layout */\n.hero-side .v.coords, body[data-layout-hero] .hero-side .v.coords{ font-size:11px; letter-spacing:.32em; line-height:1; color:rgba(236,230,214,.55); }")

# ---- images: Kage's slots, the house's files ----
for a, b in {
    "generated/kage-sanmon-preview.webp": "scene-longfellow.webp",
    "generated/kage-approach.webp": "scene-zakim.webp",
    "generated/kage-lantern-court.webp": "scene-beacon-hill.webp",
    "generated/kage-moonwater.webp": "scene-charles-reflection.webp",
    "foreground/png/temple-wall.webp": "seawall.webp",
    "foreground/png/pine-tree.webp": "elm.webp",
    "foreground/png/tall-grass.webp": "reeds.webp",
    "foreground/png/sakura-branch.webp": "magnolia-branch.webp",
    "foreground/png/maple-leaves.webp": "autumn-leaves.webp",
    "foreground/png/stone-lantern.webp": "gas-lamp.webp",
    "foreground/png/garden-bush.webp": "iron-fence-hedge.webp",
    "foreground/png/basalt-stones.webp": "granite-riprap.webp",
    "foreground/png/hill.webp": "esplanade-bank.webp",
}.items():
    s = s.replace("secret-pathways-assets/" + a, "assets/" + b)
rep('<script src="secret-pathways-assets/three.min.js"></script>', '<script src="three.min.js"></script>')

# ---- nav and hero, from src/content.ts ----
a0 = s.index('<header class="nav" id="nav">')
a1 = s.index("<!-- ============================================================ chapter I -->")
s = s[:a0] + (ROOT / "scripts/house-hero.html").read_text() + "\n" + s[a1:]

# ---- the world: Kage's temple builders out, the Boston builders in ----
for name in ["buildShell", "buildTemple", "buildMoon", "placeMoon", "buildTorii", "buildLantern", "buildMaple", "buildRocks", "buildLights", "buildLeafFall"]:
    drop_function(name)
s = re.sub(r"\nconst MOON = \{[^\n]*\n", "\n", s, count=1)
rep("\nfunction cutoutMaterial(", "\n" + world + "\nfunction cutoutMaterial(")
rep("scene.fog = new THREE.FogExp2(0x050a0e, 0.0168);", "scene.fog = new THREE.FogExp2(0x09111d, 0.0082);")
# the hero shot rises above the bank and looks a little down, so the river shows between the bank and the city
rep("{ p: [  0.0, 4.05, 13.6 ], t: [  0.0, 6.60, -18.0 ], fov: 36 },  /* 0 hero        */", "{ p: [  0.0, 6.20, 14.0 ], t: [  0.0, 4.40, -18.0 ], fov: 38 },  /* 0 hero: the Esplanade */")
rep("const fill = narrow ? .96 : 1.00;", "const fill = narrow ? .94 : .90;")
# the name stands a little higher on the bank, clear of the preview card
rep("const base = hit(0, narrow ? -.16 : -.585);", "const base = hit(0, narrow ? -.12 : -.47);")
# near snowflakes stay small instead of filling the lens
rep("    LEAF_S.setScalar(l.s);", "    LEAF_S.setScalar(LV.snow ? l.s * clamp(LEAF_P.distanceTo(camera.position) / 7, .25, 1) : l.s);")
rep("scene.background = new THREE.Color(0x060a0d);", "scene.background = new THREE.Color(0x070d17);")
rep("renderer.setClearColor(0x05070a, 1);", "renderer.setClearColor(0x070d17, 1);")
# the near foreground bough turns from red maple to amber autumn leaves
rep("tx.fillStyle = hex(96 + v * 96, 14 + v * 22, 16 + v * 18);", "tx.fillStyle = hex(150 + v * 80, 74 + v * 40, 22 + v * 14);")
# embers become cold river mist motes; rain is off (it snows)
rep("' gl_FragColor = vec4(t.rgb*vec3(1.6,0.78,0.42), t.a*vA*0.75); }'", "' gl_FragColor = vec4(t.rgb*vec3(0.80,0.92,1.08), t.a*vA*0.45); }'")
rep("  if (!LOW) {\n    const D = 900,", "  if (!LOW && qs('rain', '0') === '1') {\n    const D = 900,")
# ripples belong on the river now, not the court
rep("x: (rnd() - .5) * 22, z: -8 + rnd() * 22, sp: .5 + rnd() * .5", "x: (rnd() - .5) * 22, z: -8 - rnd() * 30, sp: .5 + rnd() * .5")
rep("if (u.t > 4) { u.t = 0; u.x = (Math.random() - .5) * 22; u.z = -8 + Math.random() * 22; }", "if (u.t > 4) { u.t = 0; u.x = (Math.random() - .5) * 22; u.z = -8 - Math.random() * 30; }")
rep("r.position.set(u.x, .02, u.z);", "r.position.set(u.x, WATER_Y + .03, u.z);")
# snowflakes face the camera; leaves tumble
rep("    LEAF_E.set(l.roll, l.tilt, sw * .55);\n    LEAF_Q.setFromEuler(LEAF_E);", "    if (LV.snow) LEAF_Q.copy(camera.quaternion);\n    else { LEAF_E.set(l.roll, l.tilt, sw * .55); LEAF_Q.setFromEuler(LEAF_E); }")

# ---- the giant word: BHAVISHYA in Archivo ExtraBold, width 125 ----
rep("const SZ = 320, TRACK = .40, PAD = 26;", "const SZ = 320, TRACK = .045, PAD = 26;")
s = s.replace("'600 ' + SZ + 'px Wordmark, sans-serif'", "'800 ' + SZ + 'px \"House Wordmark\", sans-serif'")
rep("const word = 'KAGE', gl = [];", "const word = 'BHAVISHYA', gl = [];")
rep("grad.addColorStop(0, 'rgb(226,236,229)');\n    grad.addColorStop(.52, 'rgb(198,214,203)');\n    grad.addColorStop(1, 'rgb(150,170,157)');",
    "grad.addColorStop(0, 'rgb(240,234,220)');\n    grad.addColorStop(.52, 'rgb(214,205,186)');\n    grad.addColorStop(1, 'rgb(162,150,130)');")
rep("['Reading the type', () => document.fonts && document.fonts.load('600 320px Wordmark')],", "['Reading the type', () => document.fonts && document.fonts.load('800 320px \"House Wordmark\"')],")

# ---- boot: build Boston instead of the temple ----
j0 = s.index("  ['Cutting the approach', () => buildShell()],")
j1 = s.index("  ['Painting the near grass', () => buildForeground()],")
s = s[:j0] + """  ['Laying the Esplanade', () => buildBank()],
  ['Raising Back Bay', () => buildCity()],
  ['Hanging the moon', () => { buildMoon(); placeMoon(); }],
  ['Pouring the river', () => buildReflections()],
  ['Lighting the lamps', () => {
    buildRiprap();
    buildGasLamp(8.6, -3.3, 1.15); buildGasLamp(-9.2, -3.0, 1.15);
    buildGasLamp(17.5, -2.6, 1.2); buildGasLamp(-18.5, -2.2, 1.2);
  }],
  ['Planting the elms', () => {
    buildElm(71, 11.4, -1.4, 1.35); buildElm(72, -7.9, -2.7, 1.25);
    buildElm(73, 19.5, 1.5, 1.45); buildElm(74, -16.5, -.6, 1.4);
  }],
""" + s[j1:]
rep("{ p: [0.6, 3.40, -12.0], t: [0, 12.0, -40.0], fov: 26 }     /* hero window    */", "{ p: [0.0, 4.20, -2.0], t: [5.0, 8.5, -118.0], fov: 26 }     /* hero window: the city across the water */")
rep("window.__kage = window.__secret =", "window.__kage = window.__house =")

# ---- per frame: night to dawn, streak shimmer, the aircraft light ----
rep("function updateWorld(dt) {\n  WORLD.uT.value = clock;", """function updateWorld(dt) {
  WORLD.uT.value = clock;
  updateCity(dt);""")
rep("    l.intensity = 2.6 * (1 + f * .55) * (.86 + .22 * Math.sin(clock * (2.3 + i * .7) + i * 2.1) + .1 * pulse);",
    "    l.intensity = 2.6 * (1 + f * .35) * (.94 + .06 * Math.sin(clock * (1.3 + i * .4) + i * 2.1)) * (1 - .6 * WORLD.dawn);")
rep("\nlet FRAME = 0;", """
/* night to first light as the walk reaches Contact (camera waypoint 4) */
const FOG_N = new THREE.Color(0x09111d), FOG_D = new THREE.Color(0x5e6378);
function updateCity(dt) {
  const dw = WORLD.dawn = smooth(3.25, 4.15, RIG.smooth);
  if (WORLD.dawnSky) WORLD.dawnSky.material.opacity = dw;
  if (scene.fog) { scene.fog.color.copy(FOG_N).lerp(FOG_D, dw); scene.background.copy(scene.fog.color); }
  if (WORLD.moon) { WORLD.moon.material.opacity = 1 - dw * .85; WORLD.moonHalo.material.opacity = .38 * (1 - dw); }
  WORLD.windowMats.forEach(m => { const g = m.userData.gain * (1 - .65 * dw); m.color.setRGB(g, g * .96, g * .92); });
  WORLD.streaks.forEach(m => {
    const u = m.userData;
    m.material.opacity = u.op * (1 - .55 * dw) * (.72 + .28 * Math.sin(clock * 1.1 + u.ph));
    m.material.map.offset.y = -clock * .05;
  });
  if (WORLD.beacon) WORLD.beacon.material.opacity = (Math.sin(clock * 2.2) > .55 ? 1 : .06) * (1 - dw * .5);
  if (WORLD.cityLight) WORLD.cityLight.intensity = 2.2 * (1 - .5 * dw);
  if (WORLD.lanternGlows) WORLD.lanternGlows.forEach(g => { g.material.opacity = .55 * (1 - .7 * dw); });
}

let FRAME = 0;""")

import importlib.util
_sp = importlib.util.spec_from_file_location("house_patches", ROOT / "scripts/house-patches.py")
_m = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(_m)
s = _m.apply(s)

out = ROOT / "public/house/house.html"
out.write_text(s)
print(f"wrote {out.relative_to(ROOT)} ({len(s) // 1024} KB)")
