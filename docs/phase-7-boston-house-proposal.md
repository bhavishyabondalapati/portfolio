# Phase 7 proposal: "Enter the house", Boston at night on the Charles

This is a proposal only; nothing is built yet. Branch: `wow`.

**What stays from Kage:**
- the scroll scenes and camera rig
- the foreground parallax layers and their stage reveals
- the giant title cut into the 3D world
- the cloth-simulated cards
- the transitions, grain and typography system

**What gets replaced:**
- every word, from `src/content.ts`
- the 3D world's builders: temple, torii and lanterns become skyline, river and gas lamps
- the four scene images and ten cutouts
- the "Wordmark" font

The plain site stays the default. Later, the invitation offers "Fly the survey" and "Enter the house".

## 1. What I take from each reference (docs/references/wow, in file order)

**Reference use only:** these photos belong to other people (several are watermarked). I use them to
learn composition, light and detail, never to trace them or feed them to an image model as an input.
None ships with the site.

| # | What I take |
|---|---|
| 1 | Back Bay skyline across the basin: the low horizon line and wide sky proportion for the hero |
| 2 | Autumn trees framing still water: warm foliage against cool reflections, for the autumn-leaves cutout |
| 3 | Aerial of the basin and Longfellow Bridge: the river's real curve and the bridge's place in it |
| 4 | Esplanade path, green iron railing and bench under a maple: railing height and the seawall edge |
| 5 | Silhouettes on a dock at sunset: a dark foreground against bright water, for the dawn section |
| 6 | Dense lit towers from above: how many windows glow at night (scattered, not grids) |
| 7 | Skyline over a canopy: the layered depth of trees in front of towers |
| 8 | Skyline with sailboats: the scale of the towers against the river (very low and wide) |
| 9 | Back Bay at dusk, mirrored on ice: long vertical reflections, for the moonwater card |
| 10 | Towers and a truss bridge at blue hour: deep cobalt sky with amber windows, the core palette |
| 11 | Cobblestone wharf with chain bollards: granite paving texture for the seawall and stones |
| 12 | Red-orange skyline over water: too saturated; I take only the warm reflection streaks |
| 13 | Harbour walk at twilight: the lamp rhythm along a waterfront path |
| 14 | Pink dusk panorama: the thin pastel band at the horizon, for the dawn section |
| 15 | Wharf chain and bollard at night, low angle: the foreground silhouette idea |
| 16 | Skyline mirrored on still blue water: the reflection plane for the hero river |
| 17 | Lamp-lit waterfront panorama: a warm lamp against a cool sky as the hero's contrast |
| 18 | Aerial of towers at night: avoid (too busy and photographic for Kage's style) |
| 19 | Glowing street lamp on the wharf: a halo and bloom size for the gas-lamp glow |
| 20 | Purple dusk, single tower mirrored: one tall vertical as the composition anchor |
| 21 | Golden sky over the harbour: avoid (the daytime palette fights the night theme) |
| 22 | Neon reflections on water: avoid the rainbow colours and the rooftop signage; take the wet sheen only |
| 23 | Zakim pylon between buildings: the pylon's inverted-Y shape; avoid the street signage |
| 24 | Longfellow Bridge at night, lit arches over water: the main reference for the peek scene |
| 25 | Longfellow tower at pink dusk: the "salt-and-pepper" tower silhouette and arch lighting |
| 26 | Zakim at sunset with reflection: the cable fan and the orange-to-navy sky gradient |
| 27 | Zakim from far, at night: how small the bridges read in the wide shot |
| 28 | Zakim at blue hour: the cable fan as clean bright lines on cobalt, for the card |
| 29 | Beacon Hill lane at night with gas lamps: the main reference for the lantern card |
| 30 | A Beacon Hill gas lamp in daylight: the lamp's shape, cross-bar and post, for the cutout |
| 31 | Gas lamp close-up on brick: the glass panes and the flame inside, for cutout detail |
| 32 | Brick lane with lamps and window boxes: brick red, black shutters and iron, for the card palette |
| 33 | Wet lane at night with lamps and trees: the warm puddle glow, for the snow version |
| 34 | Esplanade bank with stones and blossoms: the granite riprap edge, for the stones cutout |
| 35 | Blossom branch over the lagoon: a branch entering from the frame edge, for the magnolia cutout |
| 36 | Esplanade lagoon collage: footbridge and lagoon shapes |
| 37 | Blossoms on the Esplanade with skyline: the grassy bank, for the embankment cutout |
| 38 | Autumn lagoon with a footbridge: oak and maple colours, for the leaves |
| 39 | Pink branch with a tower reflected: framing the city through a branch (hero foreground) |
| 40 | Magnolia collage: the magnolia flower shape (cup-shaped, not cherry) |
| 41 | Magnolia over a brownstone stoop with iron railing: the fence-and-hedge cutout |
| 42 | Magnolia blooms close: petal colour (pink outside, cream inside) |
| 43 | Commonwealth Ave magnolias and brownstones: the row-house rhythm for the hero's back row |
| 44 | Magnolia collage: the bloom density of a full branch |
| 45 | Magnolia collage: the petals on stone steps, for a falling-petal option |
| 46 | Granite seawall collage: block sizes and joints, for the seawall cutout |
| 47 | Full moon beside the Zakim pylon: the moon's size and colour against cobalt |
| 48 | Zakim at night, long reflections: the reflection length for the card |
| 49 | Waterfront towers at night with soft reflections: the riverbank lights for the hero far shore |
| 50 | Zakim mirrored perfectly: the symmetry idea, kept for the card |
| 51 | Overhead rowing eight: the shell's shape and oar spread; avoid the bib numbers and kit colours |
| 52 | Rowing eight at dusk below the skyline: the main reference for the dawn contact section; plain kit only |

**Avoided everywhere:**
- building-top signs and the Citgo sign
- team and university logos, crew colours and bib numbers
- named brands on towers
- recognisable people

## 2. Section mapping (Kage → mine, all words from `src/content.ts`)

| Kage | Mine | Content |
|---|---|---|
| Brand "KAGE / Hidden realms of Kyoto" | "BHAVISHYA BONDALAPATI / ML systems · Boston" | `person.name`, `person.role` |
| Nav: Temples, Gardens, Rituals, Afterlight (+ Japanese) | Experience, Projects, Skills, Contact (Japanese labels dropped) | section ids |
| Hero eyebrow "Chapter 00 — The Hidden Gate" | "Chapter 00 — The Esplanade" | |
| Hero headline (3 lines) | "I build ML systems / that check their / own work." | `person.tagline` (first clause) |
| Hero sub | "…and the backends that serve them. MS Computer Science, Northeastern, Fall 2025 to May 2027." | `tagline`, `education[0]` |
| 4 chapter chips | 01 Experience (2 internships), 02 Projects (6 plates), 03 Skills (4 groups), 04 Contact (Email first) | counts from content |
| Peek card "Sanmon — before the bell" | "Longfellow Bridge — the night crossing" | caption only; the card can later open "Fly the survey" |
| Giant word "KAGE" | **BHAVISHYA** on the Esplanade bank | `person.name` (first name; the surname is in the brand) |
| Vertical "影の道" | a vertical mono coordinate line, "42.3554° N · 71.0730° W" (the Esplanade) | |
| 01 The Sanmon: headline, lead, body, link, 4 stats | 01 Experience: "Two internships. Both shipped." The lead and body are JC Biotech's and Mouri Tech's role, dates and summary. The link is "Read the plates". Stats: **2** Internships · **6** Plates · **3.9** GPA · **2027** MS complete | `experience[]`, `featured.length`, `education[0].gpa` |
| 02 Still Gardens: 3 cloth cards | 02 Projects: three cards for plates 2.1 to 2.3 (Aerial, LLM Gateway, LexIntake), each with its key figure as the label and "Plate 2.n / 06" as the meta; then "All six plates on the plain site" | `featured[0..2]` |
| 03 Sacred Craft: headline, body, 5 lessons with time bars | 03 Skills: "Four toolkits and three certificates." Five rows: the 4 skill groups plus certifications. Each row's "time bar" becomes the item count (no invented proficiency levels) | `skills[]`, `certifications` |
| 04 Afterlight (final) | 04 Contact: "Chapter 04 — First light". The display reads "Say hello"; the body is `contactLine`. The CTA is the email, then LinkedIn and GitHub. Dawn over the Charles with a rowing shell | `contact` |
| Footer columns | Sections · Elsewhere (GitHub, LinkedIn) · Colophon (credits, licences, "Back to the plain site") | |

**Engine changes needed (code, not images).** Kage's hero world is drawn procedurally in Three.js,
so these builders get rewritten. The rig, reveals, cloth cards and post-processing stay.
- `buildTemple` becomes `buildSkyline`: Back Bay-like towers and a brownstone row with scattered lit
  windows (from `texShoji`). The buildings are generic, with no named landmarks.
- `buildTorii` becomes a low Esplanade railing along the bank.
- `buildLantern` becomes a gas lamp: a glass box with a warm flame and halo.
- `buildMaple` becomes an elm: a tall vase-shaped canopy, bare or turning.
- `buildRocks` becomes granite riprap blocks.
- `texMoon` becomes a pale cream moon, not vermilion.
- **New:** a river plane between the bank and the skyline, with long vertical reflections. This is
  the biggest new piece.
- `buildLeafFall` gets a season switch: snow (default) or autumn leaves, from one shared particle system.
- **Final section:** the sky and fog ease from night to a rose-and-steel dawn as you reach Contact,
  and the rowing shell crosses on the water.

## 3. Palette

| Token | Hex | Use |
|---|---|---|
| `--night` | `#070D17` | page and sky top |
| `--river` | `#0F2236` | water, card shade |
| `--slate` | `#1C2B3F` | far skyline, fog |
| `--ink` | `#ECE6D6` | text, moon (same off-white as the plain site) |
| `--muted` | `#93A0B3` | secondary text (about 7:1 on `--night`) |
| `--gaslight` | `#F2A541` | **primary accent** (replaces Kage's `#e0231c`): lamp glow, links, CTA |
| `--brick` | `#9C3B2A` | brownstones and card glows, sparingly |
| `--dawn` | `#E7A08C` | final section sky only |

All text pairs meet WCAG AA. Gaslight on night is about 9:1, so it works for small text too.

## 4. The font replacing "Wordmark"

**Archivo**, ExtraBold 800 at width 125 (SIL OFL 1.1, Omnibus-Type).
- It is already the plain site's display face, self-hosted with `next/font`, so both experiences
  share one identity and no new licence is needed.
- Its wide, heavy capitals have the same mass as Kage's wordmark.
- It covers every letter of BHAVISHYA, which Kage's 22-glyph Wordmark subset does not.

**Also replaced:**
- **Noto Sans JP** is dropped, because no Japanese text remains.
- **Onest** stays for headings and body (OFL), as in your Kage props. You could switch the body to
  Archivo to match the plain site; I'd keep Onest for Kage's lighter tone.

**Fitting the name:** "BHAVISHYA" is 9 letters against KAGE's 4. `layoutWord` sizes the word to the
frame, so it lands at roughly 10.5vw. On phones it stays on one line at about 13vw with tighter
tracking.

## 5. Images to generate

Same slots, sizes and formats as Kage: WebP, sRGB. Scenes are opaque; cutouts have transparent
backgrounds. The budget is about 2.5 MB in total, like Kage's assets.

**Shared style line** (prepend to every prompt):

> Painterly cinematic digital illustration, matte gouache texture with fine film grain, quiet and
> still, night in Boston, deep navy and teal shadows, warm gaslight-amber highlights, pale cream moonlight,
> soft river mist, limited palette, no people in focus, no text, no logos, no signage, no brand names.

### Scenes (4, plus 1 optional)

| File (replaces) | Size | Prompt (after the style line) |
|---|---|---|
| `scene-longfellow.webp` (kage-sanmon-preview, the hero peek card) | 1600 × 1000 (16:10) | The Longfellow Bridge at night seen from the Boston bank of the Charles River: granite piers, its four "salt-and-pepper" stone towers lit warmly, the arches glowing faintly blue-white underneath, a train's lit windows crossing, long vertical reflections on still dark water, mist on the far bank. |
| `scene-zakim.webp` (kage-approach, card 1) | 1536 × 1024 (3:2) | A cable-stayed bridge with two inverted-Y towers over a dark river at night, fans of thin bright cables, a full pale moon high to the left, deep cobalt sky, a mirror reflection of the cables on the water, faint city lights low on the horizon. |
| `scene-beacon-hill.webp` (kage-lantern-court, card 2, portrait) | 1024 × 1536 (2:3) | A narrow sloping Beacon Hill lane in falling snow at night: red brick row houses with black shutters, iron railings, a line of glowing gas lamps receding uphill, snow settling on the brick pavement, the warm halos of the lamps in the snowfall. |
| `scene-charles-reflection.webp` (kage-moonwater, card 3) | 1536 × 1024 (3:2) | The Back Bay skyline across the Charles River basin at night, low wide composition, a few tall towers with scattered warm windows, the whole city mirrored in long trembling reflections, a thin layer of mist on the water, a pale moon above. |
| `scene-dawn-rowing.webp` (optional backdrop for the final section) | 1920 × 1080 (16:9) | Dawn over the Charles River, a soft rose-and-steel-blue sky over a low skyline silhouette, flat calm water, a single rowing eight gliding left to right with small wakes, the rowers as plain dark silhouettes with no colours or numbers, mist on the water. |

### Foreground cutouts (10, transparent background)

Add "isolated on a fully transparent background, clean alpha edge, lit from the upper left by moonlight
with a warm rim from a gas lamp, no ground shadow" to each.

| File (replaces) | Size | Prompt (after the style line and the cutout line) |
|---|---|---|
| `seawall.webp` (temple-wall) | 1536 × 884 | A long low granite seawall of large weathered rectangular blocks topped by a simple dark green iron railing, as on the Charles River Esplanade, seen front-on, horizontal. |
| `elm.webp` (pine-tree) | 1024 × 1438 | A tall American elm with a vase-shaped crown of late-autumn branches, a few amber leaves left, a dark trunk, portrait. |
| `reeds.webp` (tall-grass) | 1717 × 916 | A dense band of riverbank reeds and cattails, dark green to straw, a few seed heads catching amber light, horizontal, base cropped flat. |
| `magnolia-branch.webp` (sakura-branch) | 1536 × 1024 | A single magnolia branch reaching in from the right edge, cup-shaped blooms pink outside and cream inside, a few buds, dark bark. |
| `autumn-leaves.webp` (maple-leaves) | 1536 × 1024 | A loose drifting cluster of red maple and amber oak leaves at different angles, some in shadow, as if falling. |
| `gas-lamp.webp` (stone-lantern) | 1024 × 1499 | A Beacon Hill style gas street lamp: black cast-iron post with a cross-bar, a four-sided glass lantern with a warm flame inside and a soft glow, portrait, full height. |
| `iron-fence-hedge.webp` (garden-bush) | 1717 × 876 | A low black wrought-iron fence with simple spear-top pickets in front of a clipped dark boxwood hedge, horizontal. |
| `granite-riprap.webp` (basalt-stones) | 1536 × 996 | A pile of rough grey granite riprap boulders at a river's edge, wet, with a faint cold sheen, horizontal. |
| `esplanade-bank.webp` (hill) | 1774 × 887 | A soft grassy embankment rising from the left with a footpath line along its top, dark green at night, horizontal, flat base. |
| `rowing-shell.webp` (shrine-ruins, final section) | 1536 × 1001 | A long racing shell with eight plain dark silhouetted rowers mid-stroke, oars spread, side view, small water spray at the blades, no colours, logos or numbers. |

**Drawn in code, not images:** falling snow and leaves (Kage's leaf fall uses a canvas texture), the
moon, the skyline, the river reflections, and the lamp glows.

## 6. Licences and names

- **Keep:** the Kage engine (MIT, Meng To), with its licence notice in `src/vendor/threeui/LICENSE`.
- **Remove:** the names "Kage" and "ThreeUI" from the page.
- **Fonts:** Onest and Archivo are OFL. Wordmark and Noto Sans JP are removed, so nothing unlicensed ships.
- **Images:** all generated by you, with no reference photo used as an input. Add a line to
  THIRD_PARTY_NOTICES saying they are generated for this site.
- **Pushing:** `wow` can go to GitHub once Wordmark is gone. That happens in the first build step.
