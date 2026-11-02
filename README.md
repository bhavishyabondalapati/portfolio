# Bhavishya Bondalapati: The Survey

My portfolio, designed as a survey map. The default page is a plain, fast, accessible site:
experience, six project "plates" with measured results first, coursework, a gazetteer of
smaller builds, and contact. On a capable laptop or desktop there is an optional 3D mode, "Fly the
survey": a drone flies my route in the order it happened (Chennai, Hyderabad, Ongole, then
12,937 km to Boston) and its lidar builds a map from real NOAA elevation data, like a SLAM run in
ROS, opening each section when it locks onto that stop.

## Tools and libraries, and why

| Tool | Why |
|---|---|
| **Next.js 16 (static export)** | One React codebase that builds to plain HTML, CSS and JS in `out/`, so it can be hosted anywhere with no server. |
| **React 19 + TypeScript** | Components for the sections and the 3D overlay; types catch content mistakes (a missing figure, a wrong link) at build time. |
| **three.js 0.186** | WebGL without writing raw WebGL: point clouds, custom shaders, a camera on a path. Loaded only when someone opens the 3D mode. |
| **postprocessing 6.39** | Bloom, tone mapping, vignette and SMAA as one efficient pass chain, instead of hand-writing them. |
| **next/font (Archivo, IBM Plex Mono)** | Self-hosted fonts at build time, so no request goes to Google and the text never jumps. Archivo's width axis gives wide display capitals and normal body text from one file. |
| **NOAA ETOPO 2022** | Free elevation data covering land and sea floor, redistributable with a citation; one source for India, Boston and the globe. |
| **node:test** | Node's built-in test runner runs the TypeScript tests directly, so no extra test framework is needed. |
| **Playwright (outside the repo)** | Used only during development to screenshot WebKit and Firefox and measure frame rate and main-thread blocking. |

## File structure

```
README.md                         This file
NOTES.md                          Architecture, the 3D scene, and the decisions worth explaining
THIRD_PARTY_NOTICES.md            Licences and credits (three.js, postprocessing, fonts, NOAA data)
package.json / package-lock.json  Exact dependency versions and the npm scripts
.npmrc                            npm settings (exact versions when adding packages)
next.config.ts                    Static export settings
tsconfig.json                     TypeScript settings
vercel.json                       Security headers (CSP, HSTS and others) and caching for Vercel
.env.example                      Optional settings (SITE_URL, NEXT_PUBLIC_FLYOVER); the site needs no secrets
.gitignore                        Keeps .env, build output, caches and resumes out of git
.claude/launch.json               Dev-server entry for the Claude desktop preview

src/content.ts                    Every word, number, link and coordinate on the site (single source of truth)
src/app/layout.tsx                HTML shell: fonts, metadata and social preview, pre-paint theme/mode script
src/app/page.tsx                  The plain site: header, hero with legend, sections, footer
src/app/globals.css               All styles: tokens for light and dark, sheets, plates, and the 3D overlay
src/app/sitemap.ts                Generates sitemap.xml at build time
src/app/robots.ts                 Generates robots.txt at build time
src/app/icon.svg                  Favicon: a survey station mark
src/components/Sections.tsx       Sheets 01 to 06: experience, plates, coursework, earlier work, about, contact
src/components/PlateChart.tsx     Small charts drawn from real numbers (bars, or a numbered process)
src/components/Survey.tsx         Theme switch, the "Fly the survey" button, and loading the 3D mode on request
src/components/FunMode.tsx        The 3D overlay: route rail, inset map, landmark reticle, stop panels, controls
src/engine/flyover/createFlyover.ts  Renderer and journey: legs, scans, landmark locks, loop closure, camera
src/engine/flyover/route.ts       The flight plan: stops, camera framings and waypoints
src/engine/flyover/leg.ts         One mapped leg: path, lidar point cloud, trajectory, pose markers, landmarks
src/engine/flyover/globe.ts       The flight to Boston: dotted globe, graticule and great-circle trajectory
src/engine/flyover/terrain.ts     Loads elevation tiles and builds the lattice point cloud from them
src/engine/flyover/shaders.ts     GLSL for the points (reveal, settle, live beam) and the reference grid
src/engine/util.ts                Small maths helpers (seeded random, damping, easing)
src/lib/flyover.ts                Pure maths: projection, height decoding, reveal order, lock timing, great circles
src/lib/geo.ts                    Coordinate and place-label formatting
src/lib/surveyMode.ts             Decides whether to offer the 3D mode, and the pre-paint script
src/lib/site.ts                   The site's public URL, and the flyover feature flag
src/lib/inset-india.json          Coastline for the India inset map (generated)
src/lib/inset-world.json          Coastline for the world inset map (generated)

scripts/terrain.mjs               Downloads ETOPO tiles from NOAA ERDDAP and packs them as PNGs
scripts/inset.mjs                 Traces inset coastlines from coarse ETOPO
scripts/contours.mjs              Generates the hero's contour lines (public/contours.svg)

public/terrain/*.png, *.json      Elevation tiles (India, Boston, world) and their bounds
public/contours.svg               The hero's topographic lines
public/og.png                     Social preview image (1200 x 630)
public/work/*                     Project figures and video from my own repositories

tests/content.test.ts             Content rules: no phone number, plate order, figures match results, no private repos
tests/flyover.test.ts             Projection, height decoding, reveal order, lock timing, great-circle distance
tests/geo.test.ts                 Coordinate and place-label formats
tests/surveyMode.test.ts          When the 3D mode is offered
tests/util.test.ts                Maths helpers

docs/phase-*.md                   Each phase's plan or proposal, in order (phases 0 to 4 were an earlier concept)
docs/project-list-proposal.md     Which repos go where on the site, and why
docs/flyover-feedback.md          Feedback on the flyover, for the next round
docs/morning-report.md            What was built overnight on 2 November, and what was measured
docs/resume-kambaz-bullets.md     Resume wording for the Kambaz project
docs/proposal/*.html              The survey sketch and the flyover storyboard
docs/screenshots/*.png            Screenshots of the site and every flyover stop
```

## Setup

```bash
conda create -n portfolio -c conda-forge nodejs=22 -y
conda activate portfolio
npm install
```

Node packages install into the project's own `node_modules/`; the conda environment only
provides Node 22. No API keys are needed. `SITE_URL` in `.env.example` is optional.

## How to run it

```bash
npm run dev
```

Then open http://localhost:3000. For the production build:

```bash
npm run build
npm start
```

`npm start` serves the static site from `out/` at http://localhost:3000.

The 3D mode is behind a feature flag and is **off by default**, so the plain site can go live on
its own. To turn it on, build with the flag:

```bash
NEXT_PUBLIC_FLYOVER=on npm run build && npm start
```

(or `NEXT_PUBLIC_FLYOVER=on npm run dev`). On Vercel, set `NEXT_PUBLIC_FLYOVER=on` in the
project's environment variables. It then appears as "Fly the survey" in a window at least 1024 px
wide, with a mouse or trackpad, and without reduced motion.

Tests and type checks:

```bash
npm test
npm run typecheck
```

To refresh the elevation data (not needed to run the site):

```bash
node scripts/terrain.mjs
node scripts/inset.mjs india && node scripts/inset.mjs world
```

## How it was built

1. **Content first.** Every claim and number was collected from my resume and repositories into
   `src/content.ts`, with tests that fail on a phone number or on a figure missing from its results.
2. **An earlier concept, retired.** A walk through a 3D Chettinad house, kept in git as the tag
   `chettinad-house`. Its engine lessons carried over: camera on a curve, adaptive quality, and
   compiling shaders before the first frame.
3. **The survey proposal.** Palette, type pairing and a layout sketch were approved before building.
4. **The plain site.** Map-sheet sections, survey plates with key results first, a light and a dark
   theme, and WCAG AA contrast. Then a design critique, with the P1 and P2 fixes applied.
5. **Planning the flyover.** I checked the elevation data licences (ETOPO, SRTM, Copernicus), chose
   ETOPO, and storyboarded the route.
6. **The first slice (Chennai).** First a dusk contour flyover, then rebuilt on feedback as a SLAM
   run: a lidar point cloud, a live scan, a trajectory, a landmark lock, and an inset map.
7. **The whole route.** Hyderabad and Ongole, the globe, then Boston with loop closure, the plates
   and contact, measured in WebKit and Firefox against the targets (60 fps, under 350 KB of 3D code,
   under 3 MB of terrain, no main-thread block over 200 ms).
8. **Launch prep.** Security headers, metadata, sitemap and robots, a social preview, and this README.

## Key concepts

- **Progressive enhancement.** The plain site is the product, and the 3D mode is an optional layer
  loaded with a dynamic `import()` only on request. The plain page ships no three.js at all.
- **Static export.** `next build` produces plain files, so hosting is cheap and fast, and there is
  no server to secure. Headers come from the host (`vercel.json`).
- **Point clouds and SLAM, simplified.** Each lidar return is a vertex. A per-point "first seen"
  index plus a small texture of scan times lets the GPU decide what is visible, fresh (orange) or
  settled (off-white), with no per-frame work on the CPU. Loop closure is shown as the drifted map
  being corrected once a known landmark is recognised.
- **Real data, honestly labelled.** NOAA ETOPO heights are drawn 12 times taller than they are, and
  the screen says so. The source is cited on screen and in the notices.
- **Performance budgets.** Measured, not assumed: frame rate, bundle size, terrain size, and the
  longest main-thread block. Heavy setup is split into steps with pauses so the page never freezes.
- **Accessibility.** A skip link, AA contrast, 44 px targets and visible focus. The 3D overlay is a
  modal dialog: the page behind it is inert, focus starts on "Back to the plain site", Esc exits,
  and panel text is announced to screen readers.
- **Content as data.** One typed file feeds both the plain site and the 3D panels, and tests guard
  the rules (no phone number, no invented numbers, no links to private repos).
