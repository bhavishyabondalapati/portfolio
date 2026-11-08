# NOTE: public/landing-pages/kage.html (ThreeUI's original page, with its unlicensed "Wordmark" font) was removed
# before launch, so this generator can no longer run. It is kept as a record of how public/house/house.html was
# made; from now on house.html itself is the source and is edited directly.
"""Edits applied on top of the Kage transform (called at the end of make-house.py).
Everything done to house.html after the first transform lives here, so regenerating never drops it."""
import re


def apply(s):
    def rep(a, b, count=1):
        nonlocal s
        if a not in s:
            raise SystemExit(f"patch target not found: {a[:90]!r}")
        s = s.replace(a, b, count)

    # --- the hero's foreground: elm, reeds and gas lamp ---
    rep('[data-fg="gate"] .fg-pine  { right:-4%; bottom:-46px; width:clamp(190px,21vw,370px); }',
        '''[data-fg="gate"] .fg-pine  { right:-9%; bottom:-60px; width:clamp(260px,30vw,520px); }
/* the elm: warm rim from the gas lamps so its branches stay readable against the sky */
[data-fg="gate"] .fg-pine > img{ filter:none; }
/* the gas lamp: photo cut-out with a warm glow around the lantern head */
[data-fg="gate"] .fg-lantern{ left:7%; bottom:-34px; width:clamp(200px,22vw,390px); }
[data-fg="gate"] .fg-lantern > img{ filter:saturate(1.1) brightness(1.3); }
[data-fg="gate"] .fg-lantern::after{ content:""; position:absolute; left:50%; top:6%; width:340%; aspect-ratio:1; transform:translate(-50%,0); pointer-events:none;
  background:radial-gradient(circle,rgba(255,176,82,.55) 0,rgba(242,165,65,.22) 22%,rgba(242,165,65,0) 60%); mix-blend-mode:screen; animation:lampglow 5s ease-in-out infinite alternate; }
@keyframes lampglow{ from{ opacity:.8 } to{ opacity:1 } }''')
    rep('''    <span class="fg-el fg-grass" data-fg-in="up">
      <img src="assets/reeds.webp" alt="" width="1717" height="916" loading="lazy" decoding="async">
    </span>
  </div>
  <div class="sec-head" data-rv="fade">''',
        '''    <span class="fg-el fg-lantern" data-fg-in="up">
      <img src="assets/gas-lamp.webp" alt="" width="1024" height="1499" loading="lazy" decoding="async">
    </span>
    <span class="fg-el fg-grass" data-fg-in="up">
      <img src="assets/reeds.webp" alt="" width="1717" height="916" loading="lazy" decoding="async">
    </span>
  </div>
  <div class="sec-head" data-rv="fade">''')
    # the contact section uses the dawn-rowing scene, so the old shrine-ruins piece goes
    s, n = re.subn(r'\s*<span class="fg-el fg-ruins"[^>]*>\s*<img src="[^"]*shrine-ruins[^"]*"[^>]*>\s*</span>', '', s)
    assert n == 1, "ruins span"
    # the seawall photo was a poor fit (flooded steps): the code-drawn seawall stays, so the flat placeholder strips go
    s, n = re.subn(r'\s*<span class="fg-el fg-wall[^"]*"[^>]*>\s*<img src="assets/seawall.webp"[^>]*>\s*</span>', '', s)
    assert n == 2, "seawall spans"

    # ================= the rest of the page: the owner's words (from src/content.ts) =================
    def block(start, end, new):
        nonlocal s
        a = s.index(start); b = s.index(end, a)
        s = s[:a] + new + s[b:]

    arrow = '<svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="#ece6d6" stroke-width="1.3"/></svg>'
    # loader
    rep("<span>Raising the mountain temple</span>", "<span>Lighting the lamps</span>")
    rep('<div class="pre-jp jp">影の道</div>', '<div class="pre-jp jp">Boston</div>')
    # chapter I: experience
    block('<div class="sec-head" data-rv="fade">\n    <span class="k"><b>01</b>', '<!-- ============================================================ chapter II',
f"""<div class="sec-head" data-rv="fade">
    <span class="k"><b>01</b> — Experience</span><span class="rule"></span>
  </div>
  <div class="gate-grid">
    <h2 class="display h-sec" data-rv="up">Two internships, two systems I built.</h2>
    <div class="gate-copy">
      <p class="lead" data-rv="up">At JC Biotech (Nov. 2024 to Jun. 2025) I built agentic aerial impact intelligence:
        raw aerial imagery in, audit-ready field reports out. Six AI agents, plus a validation loop that checks
        every written claim against the data and cut manual inspection by 70%.</p>
      <p class="body" data-rv="up">At Mouri Tech (Sept. to Oct. 2024) I built a GenAI document platform for healthcare
        paperwork: manual review down 40%, and semantic search in under 3 seconds across more than 100K
        document embeddings.</p>
      <a class="arrowlink" href="#pathways" data-rv="fade" data-cursor>
        <span>See the featured projects</span>
        <span class="ar">{arrow}</span>
      </a>
    </div>
  </div>
  <div class="gate-stats" data-rv="up">
    <div><b>2</b><span>Internships</span></div>
    <div><b>6</b><span>Featured projects</span></div>
    <div><b>3.9</b><span>GPA</span></div>
    <div><b>2027</b><span>MS complete</span></div>
  </div>
</section>

""")
    # chapter II: featured projects (cards keep Kage's glow positions)
    rep('<span class="k"><b>02</b> — Still Gardens</span><span class="rule"></span><span class="k jp">庭園</span>', '<span class="k"><b>02</b> — Featured projects</span><span class="rule"></span>')
    for old, name, fig, field, n in [("Approach", "Aerial Change Intelligence", "F1 0.898", "Computer vision · GIS", 1),
                                    ("Lanterns", "LLM Gateway", "3,085 req/s", "Backend · LLM infrastructure", 2),
                                    ("Moonwater", "LexIntake", "1,768 / 1,782", "LLM extraction · backend", 3)]:
        s = re.sub(r'<div class="card-lab"><b>%s</b><span class="jp">[^<]*</span></div>\s*</div>\s*<div class="card-meta"><span>[^<]*</span><span>\d\d / 03</span></div>' % old,
                   f'<div class="card-lab"><b>{name}</b><span class="jp">{fig}</span></div>\n      </div>\n      <div class="card-meta"><span>{field}</span><span>Featured project {n} / 6</span></div>', s, count=1)
    assert s.count("Featured project ") >= 3
    # chapter III: skills (counts, not invented levels)
    rep('<span class="k"><b>03</b> — Sacred Craft</span><span class="rule"></span><span class="k jp">手業</span>', '<span class="k"><b>03</b> — Skills</span><span class="rule"></span>')
    block('<div class="cur-head">', '</section>\n\n<!-- ============================================================ chapter IV',
"""<div class="cur-head">
    <h2 class="display h-sec" data-rv="up">Four toolkits and three certificates.</h2>
    <p class="body-lg" data-rv="up">Grouped by the job they do. Each row counts its tools; nothing here is a
      self-rated level.</p>
  </div>
  <div class="cur" id="cur">
    <div class="les" data-les="0" data-cursor>
      <span class="k">01</span>
      <h3>Generative AI and LLMs</h3>
      <p>RAG pipelines, LoRA, QLoRA, PEFT, LangChain, LangGraph, agentic workflows, prompt engineering.</p>
      <span class="t">6 tools</span><i class="bar"></i>
    </div>
    <div class="les" data-les="1" data-cursor>
      <span class="k">02</span>
      <h3>Machine learning and data</h3>
      <p>PyTorch, TensorFlow, scikit-learn, Hugging Face Transformers, FAISS, Pinecone, OpenCV, pandas.</p>
      <span class="t">8 tools</span><i class="bar"></i>
    </div>
    <div class="les" data-les="2" data-cursor>
      <span class="k">03</span>
      <h3>Backend and full stack</h3>
      <p>Python, Java, C, C++, SQL, FastAPI, Flask, Node.js, Express, React, MongoDB.</p>
      <span class="t">11 tools</span><i class="bar"></i>
    </div>
    <div class="les" data-les="3" data-cursor>
      <span class="k">04</span>
      <h3>Cloud</h3>
      <p>AWS Bedrock, SageMaker, Textract, Lambda, S3, SQS, Step Functions, Docker.</p>
      <span class="t">8 tools</span><i class="bar"></i>
    </div>
    <div class="les" data-les="4" data-cursor>
      <span class="k">05</span>
      <h3>Certifications</h3>
      <p>AWS Cloud Foundations, AWS Machine Learning Foundations, Cisco Networking Essentials.</p>
      <span class="t">3 certificates</span><i class="bar"></i>
    </div>
  </div>
""")
    # chapter IV: contact
    block('<div class="eyebrow" data-rv="fade">Chapter 04 — Afterlight</div>', '</section>\n\n<!-- ============================================================ footer',
f"""<div class="eyebrow" data-rv="fade">Chapter 04 — First light</div>
  <h2 class="display" data-rv="up">Say hello</h2>
  <p class="body-lg" data-rv="up">Email is the fastest way to reach me. Open to roles in ML systems, backend
    and full stack.</p>
  <a class="cta" href="mailto:bondalapati.b@northeastern.edu" data-rv="fade" data-cursor>
    <i></i><span>Open to roles · bondalapati.b@northeastern.edu</span>
    <svg viewBox="0 0 14 14" fill="none" width="13" height="13"><path d="M3 11 11 3M5 3h6v6" stroke="#ece6d6" stroke-width="1.3"/></svg>
  </a>
  <p class="fin-links" data-rv="fade"><a href="https://linkedin.com/in/bhavishya-bondalapati" data-cursor>LinkedIn</a>
    <a href="https://github.com/bhavishyabondalapati" data-cursor>GitHub</a></p>
""")
    # the closing bank was a flat placeholder; the world draws the bank itself
    s, n = re.subn(r'\s*<span class="fg-el fg-hill"[^>]*>\s*<img src="assets/esplanade-bank.webp"[^>]*>\s*</span>', '', s)
    assert n == 1, "bank span"
    # footer
    block('<div class="foot-grid">', '</footer>',
"""<div class="foot-grid">
    <div class="foot-brand">
      <svg viewBox="0 0 44 44" fill="none" width="34" height="34" aria-hidden="true">
        <circle cx="22" cy="17" r="7.4" fill="#f2a541" fill-opacity=".92"/>
        <path d="M5 30c5.6-3.6 11.4-3.6 17 0s11.4 3.6 17 0" stroke="#ece6d6" stroke-width="1.5"/>
      </svg>
      <p>Bhavishya Bondalapati, ML systems and backend engineer. MS Computer Science at Northeastern,
        Boston. A night walk along the Charles, drawn live in WebGL.</p>
    </div>
    <div><h4>Sections</h4><ul>
      <li><a href="#gate" data-cursor>Experience</a></li>
      <li><a href="#pathways" data-cursor>Featured projects</a></li>
      <li><a href="#lessons" data-cursor>Skills</a></li>
      <li><a href="#eternity" data-cursor>Contact</a></li>
    </ul></div>
    <div><h4>Elsewhere</h4><ul>
      <li><a href="https://github.com/bhavishyabondalapati" data-cursor>GitHub</a></li>
      <li><a href="https://linkedin.com/in/bhavishya-bondalapati" data-cursor>LinkedIn</a></li>
      <li><a href="mailto:bondalapati.b@northeastern.edu" data-cursor>Open to roles</a></li>
    </ul></div>
    <div><h4>Colophon</h4><ul>
      <li><a href="#credits" data-cursor>Photo credits</a></li>
      <li><a href="/" target="_top" data-cursor>Back to the plain site</a></li>
    </ul></div>
  </div>
  <div class="foot-credits" id="credits">
    <h4>Photo credits</h4>
    <p>The four framed photographs were cropped and colour-graded for this page.
      <b>CC BY:</b> Longfellow Bridge at dusk by Justin Jensen (CC BY 2.0); Downtown Boston skyline and reflections
      by Chris Rycroft (CC BY 2.0), both via Wikimedia Commons.
      <b>Public domain:</b> Zakim Bridge by MassDOT, via Wikimedia Commons.
      <b>Unsplash License:</b> Andrew Spencer (Beacon Hill in snow).
      Everything else, including the skyline, river, lamps, elm, reeds, railing, petals, leaves, snow and sky, is drawn in code.
      Built on the MIT-licensed ThreeUI engine by Meng To; full notices in THIRD_PARTY_NOTICES.md.</p>
  </div>
  <div class="foot-base">
    <span>© 2026 Bhavishya Bondalapati</span>
    <span>Boston, MA</span>
    <span>WebGL · Onest · Archivo</span>
  </div>
""")
    rep("</style>", """.foot-credits{ position:relative; margin-top:clamp(28px,4vw,56px); padding-top:22px; border-top:1px solid var(--line-soft); max-width:110ch; }
.foot-credits h4{ margin:0 0 10px; }
.foot-credits p{ margin:0; font-size:12px; line-height:1.75; color:var(--muted); }
.foot-credits b{ color:var(--bone-dim); font-weight:500; }
.fin-links{ display:flex; gap:26px; justify-content:center; margin:22px 0 0; font-size:13px; letter-spacing:.16em; text-transform:uppercase; }
.fin-links a{ color:var(--bone-dim); border-bottom:1px solid var(--line); padding-bottom:3px; }
.fin-links a:hover{ color:var(--vermilion); }
</style>""")
    # rail dots, accent leftovers
    rep("['The Hidden Gate', 'The Sanmon', 'Still Gardens', 'Sacred Craft', 'Afterlight', 'Colophon']", "['The Esplanade', 'Experience', 'Featured projects', 'Skills', 'Contact', 'Colophon']")
    s = s.replace("#e0231c", "#f2a541").replace("rgba(224,35,28", "rgba(242,165,65").replace("#dfe7e0", "#ece6d6")


    # ---- layout fixes found at 1440: smaller foregrounds so they never sit on copy ----
    for a, b in [
        ('[data-fg="pathways"] .fg-sakura { left:-6%;  bottom:-86px;  width:clamp(430px,50vw,880px); }', '[data-fg="pathways"] .fg-sakura { left:-14%; bottom:-80px;  width:clamp(200px,22vw,400px); }'),
        ('[data-fg="pathways"] .fg-leaves { right:-6%; bottom:-62px;  width:clamp(330px,38vw,670px); }', '[data-fg="pathways"] .fg-leaves { right:-8%; bottom:-70px;  width:clamp(220px,25vw,440px); }'),
        ('[data-fg="pathways"] .fg-lantern{ left:-1%;  bottom:-96px;  width:clamp(120px,13vw,215px); }', '[data-fg="pathways"] .fg-lantern{ left:-4%;  bottom:-110px; width:clamp(100px,9vw,160px); }'),
        ('[data-fg="pathways"] .fg-bush   { right:-4%; bottom:-38px;  width:clamp(250px,30vw,530px); }', '[data-fg="pathways"] .fg-bush   { right:-4%; bottom:-50px;  width:clamp(200px,20vw,360px); }'),
        ('[data-fg="lessons"] .fg-stones { left:-4%;  bottom:-48px; width:clamp(250px,30vw,530px); }', '[data-fg="lessons"] .fg-stones { left:-6%;  bottom:-60px; width:clamp(200px,20vw,340px); }'),
        ('[data-fg="lessons"] .fg-grass  { left:24%;  bottom:-84px; width:clamp(280px,33vw,580px); }', '[data-fg="lessons"] .fg-grass  { left:auto; right:-4%; bottom:-90px; width:clamp(220px,24vw,420px); }'),
    ]:
        rep(a, b)
    # contact: the links live in the footer; the dawn-rowing photo is the section's soft backdrop
    s, n = re.subn(r'\s*<p class="fin-links".*?</p>', '', s, flags=re.S); assert n == 1
    # the footer is for reading: no foreground planting over the credits
    s, n = re.subn(r'\s*<!-- foreground: one planting along the lower edge of the colophon -->\s*<div class="fg" data-fg="foot".*?</div>\s*(?=<div class="foot-grid">)', '\n  ', s, flags=re.S); assert n == 1, "foot fg"

    rep("</style>", """.sec.fin .body-lg, .sec.fin .eyebrow, .sec.fin .cta span{ text-shadow:0 1px 16px rgba(7,13,23,.95), 0 0 4px rgba(7,13,23,.6); color:var(--bone); }
</style>""")
    # Kage's red moon-glows sat on the temple moon; on the photos they read as stray blobs
    s, n = re.subn(r'\s*<i class="glow" style="[^"]*"></i>', '', s); assert n == 2, n
    rep("</style>", """@media (max-width:700px){ [data-fg="gate"] .fg-lantern{ left:auto; right:4%; bottom:-30px; width:clamp(90px,26vw,130px); } }
</style>""")
    rep("</style>", """@media (max-width:700px){ [data-fg="lessons"] .fg-stones{ display:none; } }
.sec.fin{ position:relative; }
</style>""")
    # ===== no photo cutouts: every foreground layer is drawn in code (scripts/wow/make-fg.py) =====
    for old, new in [("elm.webp", "elm.svg"), ("reeds.webp", "reeds.svg"), ("gas-lamp.webp", "gas-lamp.svg"),
                     ("magnolia-branch.webp", "magnolia-petals.svg"), ("autumn-leaves.webp", "autumn-leaves.svg"),
                     ("iron-fence-hedge.webp", "iron-railing.svg"), ("granite-riprap.webp", "granite-riprap.svg")]:
        assert "assets/" + old in s, old
        s = s.replace("assets/" + old, "assets/" + new)
    # (the dawn-rowing photo is converted but not placed yet: the Contact backdrop needs a different approach)
    # the giant name: brighter and out of the fog, so it reads clearly over the river
    rep("grad.addColorStop(0, 'rgb(240,234,220)');\n    grad.addColorStop(.52, 'rgb(214,205,186)');\n    grad.addColorStop(1, 'rgb(162,150,130)');",
        "grad.addColorStop(0, 'rgb(255,251,240)');\n    grad.addColorStop(.52, 'rgb(240,231,212)');\n    grad.addColorStop(1, 'rgb(205,192,166)');")
    rep("depthWrite: false, side: THREE.DoubleSide, fog: true, opacity: 1 }));\n    mesh.position.set(g.pen", "depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 1 }));\n    mesh.position.set(g.pen")
    # ===== retina: srcset-style image-set backgrounds, lazy cards, full device pixel ratio, finer grain =====
    def iset(name):
        return f"image-set(url('assets/{name}.webp') 1x, url('assets/{name}@2x.webp') 2x)"
    rep("url('assets/scene-longfellow.webp') center / cover no-repeat;", iset("scene-longfellow") + " center / cover no-repeat;")
    for n, name in [(1, "scene-zakim"), (2, "scene-beacon-hill"), (3, "scene-charles-reflection")]:
        rep(f".card:nth-child({n}) .card-fr{{", f".cards.cards-ready .card:nth-child({n}) .card-fr{{")
        rep(f"url('assets/{name}.webp') center / cover no-repeat;", iset(name) + " center / cover no-repeat;")
    # below the hero, the card photos load only when the gallery is near the viewport
    rep("function makeGrain() {", """(function lazyCards() {
  const c = document.getElementById('cards');
  if (!c) return;
  if (!('IntersectionObserver' in window)) { c.classList.add('cards-ready'); return; }
  new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { c.classList.add('cards-ready'); o.disconnect(); } }, { rootMargin: '1200px 0px' }).observe(c);
})();

function makeGrain() {""")
    rep("qn('dpr', LOW ? 1.4 : 1.8)", "qn('dpr', LOW ? 1.4 : 2)")
    rep("opacity:.055; mix-blend-mode:overlay;", "opacity:.035; mix-blend-mode:overlay;")
    rep("$('#grain').style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';", "$('#grain').style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';\n  $('#grain').style.backgroundSize = (S / Math.min(devicePixelRatio || 1, 2)) + 'px';   /* one grain per device pixel: fine, not soft */")
    # ===== contact: a full-width dawn photo behind the section, with a scrim under the copy =====
    rep('<div id="fg-sky" aria-hidden="true"></div>', '<div id="foot-veil" aria-hidden="true"></div>\n<div id="fg-sky" aria-hidden="true"></div>')
    rep("</style>", """#foot-veil{ position:fixed; left:0; right:0; top:0; height:48vh; z-index:5; pointer-events:none; opacity:0;
  background:linear-gradient(180deg,#070d17 0,#070d17 58%,rgba(7,13,23,.7) 80%,rgba(7,13,23,0) 100%); }
</style>""")
    rep("  if (WORLD.dawnSky) WORLD.dawnSky.material.opacity = dw;", "  if (WORLD.dawnSky) WORLD.dawnSky.material.opacity = dw;\n  if (FOOTVEIL) FOOTVEIL.style.opacity = smooth(4.2, 4.7, RIG.smooth).toFixed(3);   /* dark veil over the flipped skyline the footer camera sees */")
    rep("const FOG_N = new THREE.Color(0x09111d)", "const FOOTVEIL = document.getElementById('foot-veil');\nconst FOG_N = new THREE.Color(0x09111d)")
    # ===== critique fixes (P1: foregrounds sat on copy; P2: dark Zakim card, phone scrim and wrapping) =====
    for old, new in [
        ('[data-fg="gate"] .fg-grass { left:3%;   bottom:-150px; width:clamp(420px,60vw,1050px); }', '[data-fg="gate"] .fg-grass { left:3%;   bottom:-250px; width:clamp(380px,50vw,880px); }'),
        ('[data-fg="pathways"] .fg-leaves { right:-8%; bottom:-70px;  width:clamp(220px,25vw,440px); }', '[data-fg="pathways"] .fg-leaves { right:-11%; bottom:-120px; width:clamp(200px,19vw,340px); }'),
        ('[data-fg="pathways"] .fg-sakura { left:-14%; bottom:-80px;  width:clamp(200px,22vw,400px); }', '[data-fg="pathways"] .fg-sakura { left:-17%; bottom:-120px; width:clamp(180px,18vw,330px); }'),
    ]:
        rep(old, new)
    rep("</style>", """.les h3, .les p{ min-width:0; overflow-wrap:anywhere; }
</style>""")
    # the hero's near bough sits further right so it clears the preview card and its caption
    rep("['bough',     texBranchCutout(505), 4.6, 2.95, 6.4, 13, 8.7, .045],", "['bough',     texBranchCutout(505), 7.4, 3.25, 6.4, 13, 8.7, .045],")
    # on phones the lessons reeds put a cattail over the end of the Skills text
    rep("@media (max-width:700px){ [data-fg=\"lessons\"] .fg-stones{ display:none; } }", "@media (max-width:700px){ [data-fg=\"lessons\"] .fg-stones, [data-fg=\"lessons\"] .fg-grass{ display:none; } }")

    # ===== round 10: no rowing photo, no petals, no rocks; grass and reeds on both sides; blue night to the end =====
    rep("const dw = WORLD.dawn = smooth(3.25, 4.15, RIG.smooth);", "const dw = WORLD.dawn = 0;   /* the night stays blue to the very end: no dawn */")
    rep("Chapter 04 — First light", "Chapter 04 — Contact")
    # hero: the two rock cut-outs become grass (drawn in code) on the same side
    s, n = re.subn(r"    \['rockLeft',.*?\n.*?\n", "    ['grassLeft', texGrassCutout(404, { crest: .50, peak: .50, wide: .42, blades: 12000, len: 38, warm: .80, crest2: .40, crest3: .36 }),\n                  -7.6,  2.70,  1.8, 15, 9, .050],\n", s, count=1, flags=re.S); assert n == 1, "rockLeft"
    s, n = re.subn(r"    \['rockNear',.*?\n.*?\n", "    ['grassCorner', texGrassCutout(606, { crest: .40, peak: .58, wide: .46, blades: 11000, len: 42, warm: .85, crest2: .44, crest3: .38 }),\n                  -6.4,  2.40,  6.0, 10, 5, .080]\n", s, count=1, flags=re.S); assert n == 1, "rockNear"
    rep("    buildRiprap();\n", "")
    # sections: petals (magnolia) and granite (riprap) give way to reeds, mirrored on the left
    reeds_l = '<span class="fg-el fg-reedsL" data-fg-in="left">\n      <img src="assets/reeds.svg" alt="" width="1717" height="916" loading="lazy" decoding="async">\n    </span>'
    s, n = re.subn(r'<span class="fg-el fg-sakura[^"]*" data-fg-in="left">\s*<img src="assets/magnolia-petals.svg"[^>]*>\s*</span>', reeds_l, s); assert n == 2, "petals"
    s, n = re.subn(r'<span class="fg-el fg-stones" data-fg-in="up">\s*<img src="assets/granite-riprap.svg"[^>]*>\s*</span>', reeds_l, s); assert n == 1, "stones"
    rep("</style>", """.fg-reedsL > img{ transform:scaleX(-1); }
[data-fg="pathways"] .fg-reedsL{ left:-4%; bottom:-130px; width:clamp(240px,24vw,430px); }
[data-fg="lessons"]  .fg-reedsL{ left:-4%; bottom:-92px;  width:clamp(220px,23vw,410px); }
[data-fg="eternity"] .fg-reedsL{ left:-5%; bottom:-70px;  width:clamp(260px,28vw,500px); }
@media (max-width:700px){
  [data-fg="pathways"] .fg-reedsL{ left:-12%; bottom:-40px; width:min(60vw,300px); }
  [data-fg="lessons"]  .fg-reedsL{ display:none; }
  [data-fg="eternity"] .fg-reedsL{ left:-12%; bottom:-34px; width:min(66vw,330px); }
}
</style>""")
    # the footer credits no longer mention petals
    rep("railing, petals, leaves, snow and sky", "railing, leaves, snow and sky")
    # (the sky colours live in scripts/house-world.js)
    return s
