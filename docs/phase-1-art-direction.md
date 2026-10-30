# Phase 1: art direction proposal

> Superseded on 2026-10-30 by `phase-1b-cinematic-plan.md` (you changed direction to a full-screen cinematic site). Kept for the record.

Status: **waiting for your approval.** No site code has been written.

## The idea in one sentence

On this page, **the walk from the thinnai to the back of a Chettinad house** becomes **a split stage**: the house never leaves the left half of the screen, while the right half is a calm reading column that carries every fact a recruiter needs.

Why this and not a full-screen 3D tour: a full-screen scene puts text on top of 3D, which is hard to read, slow on weak laptops, and makes recruiters wait. With a split stage the 3D is the atmosphere and the column is the résumé. Someone who never scrolls still sees your name, role, school and a button to the work. This layout came from the design-taste skill's direction deck (direction "split stage", seed 700983665); I chose it over "page is the object" because it can carry a moving camera without ever covering text.

A second thread runs through the copy and one section. The Nattukottai Chettiars who built these houses were merchant bankers, famous for meticulous account ledgers. Your strongest projects share one habit: they check their own work (the report validator, the eval harness with confidence intervals, the Excel validator, the load tests that found 4 bugs). So the "Other work" section is set as a ledger page, and the copy leans on "measured, then checked" rather than adjectives.

## How the page is laid out

**Desktop (1024px and wider):** two columns. Left, about 50%: the 3D house in a sticky frame that fills the screen height, inset 20px from the edges with square corners. Right: the reading column, max about 60 characters per line. The split breaks twice, on purpose, so the page doesn't feel like one long repeated screen: the ledger section and the footer run full width.

**Tablet (768px) and phone (375px):** one column. No WebGL. Each scene is shown as a pre-rendered still (see "Phones and the fast version" below).

**Top bar, always visible:** your name as the wordmark, four links (Experience, Projects, About, Contact), and the **Skip the tour** button. No floating pill bar, no blur.

## Scene plan, section by section

The scroll is a single day in the house: morning at the door, noon in the courtyard, dusk at the back. The camera moves only when you scroll; it never moves by itself.

| Section | Where the camera is | What moves | Reading column |
|---|---|---|---|
| **Hero** | Street level, looking at the thinnai (raised veranda with its pillars) and the carved teak door. Morning light from the left. | As you start scrolling, the door swings open (hinge rotation, tied to scroll) and the camera steps up onto the thinnai. This is the signature move. | `h1` "Bhavishya Bondalapati", one sentence: role, Northeastern MS CS, GPA 3.9, graduation date, "Looking for ML systems, backend and full-stack roles." One button: "See the work". Your first name in lowercase runs huge along the bottom, crossing from the 3D frame into the column. |
| **Experience** | Through the door into the first pillared corridor. Two bays, one per job. | The camera walks one bay per job. Light falls across the red oxide floor in stripes between the pillars. | JC Biotech, then Mouri Tech: role, dates, a one-line summary, bullets with your real numbers, stack. |
| **Featured projects** | Along the corridor that rings the courtyard. Each project is a room between two teak pillars, with its name painted on a board above the doorway (decorative copy; the real heading is in the column). | The camera turns to face each room's doorway as its project scrolls into view. | Per project: name, one line, problem, what I built, result, stack, links, and the project's own picture or clip (Godavari NDVI figure, robot-arm video). A small "house plan" (see "The one live thing") marks which room you are in. |
| **Other work** | Resting at the accountant's desk at the end of the corridor. | Nothing in 3D; the split breaks here. | Full width: a ledger sheet (a lime-white panel on a red oxide field) listing Kambaz LMS (live link), the doc chatbot, the calendar app, then the compact list of the other repos. Name on the left, result in tabular figures, stack on the right. No ruled lines; alignment does the work. |
| **About** | The open-to-sky central courtyard, camera looking down from the corridor edge. Noon light from directly above. | A kolam draws itself on the courtyard floor, stroke by stroke. Jasmine petals drift down (about 60, very slow). | A short first-person letter (your voice, I'll draft from facts for you to rewrite), then education, skills and certifications. |
| **Contact** | The back of the house at dusk, the kitchen courtyard. | Brass oil lamps (kuthu vilakku) light one by one as you arrive. The light shows on the walls and floor, not as glowing balls. | "Write to me", your email as the main button, plus copy-email, LinkedIn and GitHub. No phone number, no form. |
| **Footer** | Full width: the final dusk view. | The name grows very slightly (scale 0.94 to 1) as it arrives. | Your full name across the bottom in lime-white, the image credits, and one line of small print. |

### The one live thing

**The house plan.** A small top-down plan of the house (drawn in flat filled shapes in the palette, not lines) sits in the corner of the 3D frame. Every room is a real link: the door, each job, each of the four projects, the courtyard, the back. Click or tab to a room and the camera walks there. It is navigation, a progress indicator and a map in one, it works from the keyboard as a plain list of links, and on a phone it opens from the menu. Without JavaScript it is just anchor links.

## Typeface

**STIX Two Text** for everything (one family, regular 400, semibold 600, italic). Free, on Google Fonts.

Why: it's a plain, sturdy book roman in the tradition of the printed ledgers, almanacs and gazettes from the years these houses were built (roughly 1850 to 1940). That ties to the banker's-ledger thread without costume. One family keeps the page fast (two font files with `font-display: swap`) and avoids the generic-AI pairings. It is on none of the banned or overused lists (Inter, Geist, Space Grotesk, Playfair, Fraunces and so on).

How it's set:

| Role | Size | Notes |
|---|---|---|
| Wordmark (your first name) | 120 to 200px (12vw) | lowercase, tracking -0.04em, one line |
| Section headings | 32 to 64px | sentence case, tracking -0.026em, two lines at most |
| Lead sentence | 20 to 26px | |
| Body | 18 to 21px | line height 1.45, full ink colour |
| Small (stack, dates, credits) | 13 to 14px | never smaller than 13px |

Five sizes total. Left-aligned throughout. Numbers in results use tabular figures if STIX ships them (I'll check the font file in Phase 2; if not, I align them with fixed-width cells instead).

## Palette

Taken from the house's own materials. Proportions: one ground, one ink, one accent, and two colour fields that own whole sections.

**Light mode (daylight)**

| Role | Material | Hex | Contrast |
|---|---|---|---|
| Ground | Lime-white egg plaster | `#F2F1EC` | |
| Ink (all running text) | Indigo, the dye, not violet | `#1B2342` | 13.6 : 1 on ground |
| Secondary text | Faded indigo | `#4F5672` | 6.4 : 1 on ground |
| Surface (a step in tone, no borders) | Polished plaster | `#E6E4DC` | ink 12.1 : 1 |
| Accent: the one action and the current room on the plan | Turmeric ochre | `#D19A2A` | indigo text on it 6.1 : 1 |
| Field 1: the ledger section | Red oxide floor | `#7C2D20` | lime-white text 8.2 : 1 |
| Field 2: footer, the door | Burma teak | `#4A2F1D` | lime-white text 10.8 : 1 |

**Dark mode (the house at night):** not an inverted page; the 3D scene switches to night lighting with the lamps lit and moonlight in the courtyard.

| Role | Hex | Contrast |
|---|---|---|
| Ground: night teak | `#16130F` | |
| Ink: lime-white | `#ECEAE2` | 15.4 : 1 |
| Secondary | `#B3AE9F` | 8.4 : 1 |
| Surface | `#231E18` | ink 13.7 : 1 |
| Accent: lamp-lit ochre | `#E3B04B` | 9.3 : 1 |

All pairs pass WCAG AA for body text (4.5 : 1); most pass AAA. Ochre is never used for text on the light ground (only 2.2 : 1), only as a fill behind indigo text.

A note on two design-skill warnings. The taste skill bans "cream ground with terracotta" and "violet or indigo" as overused AI palettes. Your brief pins these materials, and the brief wins, but I've kept clear of the cliché: the ground is a cool chalky white rather than yellow cream, the indigo is a deep blue-black rather than violet, and red oxide fills whole sections instead of being a sprinkled accent colour.

### Athangudi tiles

Drawn in code, not photographed: 3 or 4 patterns (a four-petal medallion, a border, a chequer) generated as canvas textures in the palette's colours (red oxide, ochre, indigo, lime-white, a muted green). They appear on the 3D floors, and once in 2D: the ledger section's red oxide field gets a single tile border along its top edge.

## Motion style

Heavy and calm, like walking through a real house. Three layers:

1. **The camera** follows a spline path through the house. Native browser scroll drives it (no scroll hijacking, so the scrollbar, keyboard, and screen readers behave normally). The camera eases toward the scroll position with a short damping, which makes it feel weighty without lagging behind your thumb.
2. **The scene's own moments:** the door opening (signature), the kolam drawing, petals, lamps lighting. Each plays once per visit to its section.
3. **The interface** (Motion library): each section's heading, text and picture rise 16 to 24px and fade in, staggered by about 70ms, once. Buttons press down to 97% scale in 160ms. Easing is a strong ease-out, `cubic-bezier(0.23, 1, 0.32, 1)`; nothing uses ease-in. No animation on keyboard-driven navigation or the menu, because things you do often should feel instant (from the emil-design-eng skill).

Only transform and opacity are animated, so nothing causes layout reflow.

## Phones and the fast version

**Recruiter rule check:** your name, role and "Skip the tour" are plain HTML in the static page, so they paint in the first frame, before any 3D code downloads.

- **Desktop:** the left frame first shows a still image of the door view. The 3D code loads after the page is interactive and fades in over the still. If WebGL is missing or the GPU is weak, the still simply stays.
- **Phones and tablets:** no WebGL at all. Each scene appears as a pre-rendered still at the top of its section (door, corridor, courtyard, dusk), about 60 to 120KB each in AVIF/WebP, and the kolam is drawn as an SVG line that animates once.
- **Skip the tour, or prefers-reduced-motion:** the same flat page as phones, at any width, with all the same content. The choice is remembered for your next visit.

The stills are rendered from the real 3D scene by a script at build time, using Playwright. So there is one source of truth: change the house once and the mobile pictures update with it.

## How the 3D house gets built

Everything procedural in React Three Fiber, from a small kit of parts:

| Part | How |
|---|---|
| Walls, thinnai platform, steps, beams | Boxes with bevelled edges |
| Teak pillars and granite pillars | `LatheGeometry`: a 2D profile spun around an axis, which is exactly how turned pillars are made |
| Roof (clay tiles sloping into the courtyard) | One tile mesh instanced a few hundred times |
| Athangudi and red oxide floors | Canvas-generated textures, so zero image downloads |
| Brass lamps | `LatheGeometry` again, plus one warm point light per lit lamp |
| Kolam | A generated dot-grid (pulli) kolam path, drawn by revealing the line over time |
| Jasmine petals | One instanced mesh of about 60 small petal shapes |
| Carved door | Panels and frame from boxes; the carving is a normal map generated from an SVG lotus pattern, which reads as low relief from the camera's distance |

**Does anything need Blender or Spline?** Not for version one. The only candidate is the carved door: if you later want true deep relief (deities, lotus and parrot carvings you can see in profile), that needs a sculpted model, and Blender is the right tool. Spline I'd avoid: its runtime adds roughly half a megabyte and gives less control over performance.

**Lighting:** one sun (direction and colour change with the time of day per section), a soft sky light, and shadows computed once and then frozen, since the house doesn't move. A filmic tone mapping keeps colours from looking flat.

**Performance budget:** under 150 draw calls, under 150k triangles, device pixel ratio capped at 1.5, rendering only when the scroll or an animation changes something, and paused when the tab is hidden. Lighthouse tests mobile, and mobile never downloads the 3D code, so 85+ is realistic.

## Pictures on the page

The 3D scenes are drawings. The real pictures are your own work:

- Godavari NDVI figure (aerial-change-intelligence)
- Robot-arm scene still and the learned-policy video, as a muted loop: the one moving picture
- Robot-navigation-lab screenshot, desktop-kitten demo, the FER results figure, the doc chatbot PR curves
- Screenshots I'd take in Phase 2: the live Kambaz site, the Excel Copilot browser demo, and the LLM gateway dashboard (both run offline with fake providers, so no API keys needed)

Optional: two or three CC BY-SA photographs of real Chettinad houses from Wikimedia Commons, in the About section as "the houses this one is drawn from", credited in the footer. I found suitable ones (for example "Chettinad house courtyard" by Yashima, CC BY-SA 2.0). They would also be my modelling reference either way.

## Avoid-list check

| Generic-AI tell | How this design avoids it |
|---|---|
| Inter, Geist, Space Grotesk | STIX Two Text only |
| Purple on black | Indigo ink on lime-white; dark mode is warm teak black |
| Rainbow or default gradients | Flat colour everywhere in the interface. The 3D has real light and shade, which isn't a gradient |
| Drop shadows everywhere | None in the interface; surfaces differ by a step in tone |
| Three identical cards in a row, bento grids | Featured projects are full-width blocks; the rest is a ledger list |
| Emojis, sparkle icons | None. No icons except arrow glyphs on links |
| Glowing orbs | Lamps light the walls; no bloom halos |
| Fake terminal windows | None; real screenshots of real interfaces instead |
| Checkmark bullet lists | Plain sentences and normal list markers |
| Em dashes in copy | None; the content file was written without them |
| Also from the skills: eyebrow labels above headings, 01/02/03 numbering, monospace labels, hairline dividers, glass panels | None of these |

## Stack (for Phase 2)

Next.js App Router with static export, TypeScript, React Three Fiber and drei for the house, Motion for interface animation, exact versions pinned at install. Security headers go in `vercel.json`, because a static export can't set headers from `next.config`.

## Decisions I need from you

1. Approve the split stage, or ask for a different structure.
2. Approve STIX Two Text and the palette above.
3. Phones: pre-rendered stills (my recommendation) or a lighter live 3D scene?
4. Include the Wikimedia photos of real Chettinad houses in About, yes or no?
5. Optional: a nameplate on the door with your name in Tamil script. I'd need you to give me the exact spelling.
