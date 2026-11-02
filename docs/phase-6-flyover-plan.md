# Phase 6: The Survey, flown (plan for Part 3)

The storyboard is [docs/proposal/flyover-storyboard.html](proposal/flyover-storyboard.html), and its
screenshot is `docs/screenshots/flyover-storyboard.png`. The route maps are computed from the
coordinates in `src/content.ts`.

## What it is

A full-screen flyover of terrain at dusk, drawn as glowing contour lines. It follows the real
route in timeline order: Chennai (SRM), then Hyderabad (Mouri Tech), Ongole (JC Biotech) and Boston
(Northeastern).

- **Distances:** 534 km, then 267 km, then 12,937 km (great-circle).
- **Scroll moves the camera along one curve.** At each stop, a scan sweep reveals the place like a
  change-detection mask. Then that section's HTML panel appears, pinned to the marker.
- **Projects** are four waypoints along the Boston shore. Coursework and Contact close the flight
  at night.
- **"Back to the plain site"** is always visible.

## Elevation data: licences (decision needed)

| Source | Resolution | Licence, in its own words | Login | Fit |
|---|---|---|---|---|
| **NOAA ETOPO 2022** | 15 arc-seconds (about 450 m), land and sea floor | ERDDAP licence: "may be used and redistributed for free but is not intended for legal use", with no warranty. NCEI asks for a citation (DOI 10.25921/fd45-gt74). | None | **Recommended.** One source for the India leg, Boston and the sea floor along the way. |
| NASA SRTM GL1 v3 | 1 arc-second (about 30 m), land only | "Openly shared, without restriction, in accordance with the EOSDIS Data Use and Citation Guidance"; citation requested (DOI 10.5067/MEASURES/SRTM/SRTMGL1.003). | Free NASA Earthdata login | Optional sharper close-ups later. Not needed at the flight's altitude. |
| Copernicus DEM GLO-30 | about 30 m | Free licence, but modified data must carry "produced using Copernicus WorldDEM-30 © DLR e.V. …", plus a liability disclaimer. | Account | Works, but brings more attribution and legal text than it adds. |

**Recommendation:** ETOPO 2022 only. It is free to use and redistribute, needs no account, and
covers the land and the sea floor. The credit goes in the fun-mode corner and in
THIRD_PARTY_NOTICES.md:

"Terrain: NOAA NCEI, ETOPO 2022 15 Arc-Second Global Relief Model, doi:10.25921/fd45-gt74."

**The honest catch:** Chennai, Ongole and Boston are nearly flat coastal plains. Real heights
would read as flat, so the terrain uses **vertical exaggeration** (about ×12), printed in the
corner as "Vertical exaggeration ×12", the way relief maps do.

**If you say no to real data,** I generate the terrain from seeded noise instead, as with the
hero contours, and label it as illustrative.

**How the data is prepared:** a Node script (`scripts/terrain.mjs`, no new dependencies) asks
NOAA's ERDDAP for three bounding boxes:

- India leg: 11.5 to 18.5° N, 76.5 to 82° E
- Boston: 41.9 to 42.8° N, 71.6 to 70.4° W
- A coarse world grid for the transit

It packs the heights into 8-bit RGB PNGs ("Terrarium" encoding, where height = R·256 + G + B/256
− 32768) and writes them to `public/terrain/`, about 2 to 3 MB in total. The files are downloaded
only when fun mode opens. Nothing is fetched from NOAA at runtime.

## Stops and what they show

| Stop | Section(s) | Notes |
|---|---|---|
| 1 Chennai, SRM Kattankulathur (12.8231° N, 80.0442° E) | Education (SRM) + the SRM project slot | **Slice 1** |
| 2 Hyderabad (17.3850° N, 78.4867° E) | Mouri Tech | Deccan plateau, the most relief on the route |
| 3 Ongole (15.5057° N, 80.0499° E) | JC Biotech | The sweep shows field plots, where the aerial work began |
| Transit | none | Climb to a contour globe; a great-circle line and a distance counter (12,937 km); night falls |
| 4 Boston (42.3398° N, 71.0892° W) | Northeastern, then Plates 2.1 to 2.4 as shore waypoints | Key result first on each panel |
| Night over Boston | Coursework, Earlier work, Contact | "Back to the plain site" beside Contact |

## How it's built (lessons from the house engine)

- **One renderer, one loop.** React hosts the canvas and the HTML panels. three.js and
  postprocessing (already installed) load only in fun mode, so the plain site still ships no 3D code.
- **Camera on a curve:** shots pinned to journey positions, joined by centripetal Catmull-Rom
  curves, with ease-in and a hold at each stop. Scroll drives it. The arrow keys, Space and a
  "Next stop" button jump between stops, and a route rail shows where you are.
- **Terrain shader:**
  - The heightmap displaces a grid in the vertex shader.
  - Contours come from `fract(height / interval)`, anti-aliased with `fwidth`. Every 5th line is a
    brighter index contour.
  - The 0 m coastline glows. Sea-floor contours are dimmer.
- **Dusk:**
  - A low western sun.
  - A navy-to-ember sky gradient.
  - Exponential height fog for haze.
  - Bloom on the contour glow, with SMAA and a light vignette.
  - Depth of field only while holding at a stop.
- **Scan sweep:** a uniform `uSweep` (0 to 1) grows a ring from the marker. Inside the ring, a grid
  of cells fills orange by a per-cell "confidence", like a change mask over imagery, then fades to
  an outline. It lasts 1.2 s, and the panel appears as it ends.
- **Pinned panels:** each frame projects the marker into screen space and positions the HTML panel
  next to it, as the house corridor did. The panels are real, focusable HTML with the same content
  as the plain site.
- **Zone culling:** only the active region's tile is drawn: the India leg, the world grid during
  transit, or Boston. Haze hides each swap.
- **Adaptive quality:** if frames run slow, it drops, in order, depth of field, then bloom
  resolution, then pixel ratio 1.
- **Compile before the first frame:** a loading line ("Loading terrain · 2.1 MB") while the tiles
  decode, then `compileAsync`, texture upload and post-processing warm-up. The canvas fades in only
  when everything is ready.

## Slice 1 (what gets built after you approve)

Frames F1 to F4 only:

- Opening over the Bay of Bengal, descent to Kattankulathur, the scan sweep and the SRM panel.
- India tile from ETOPO (if approved), the dusk look, bloom, the loading line, the route rail, Back
  and Esc.
- **Checks:** screenshots, fps at 1440×900 on the M4 Pro, first-frame time in WebKit and Firefox, and
  the size of the fun-mode chunk.

**Targets:**

- 60 fps
- Fun-mode JavaScript chunk under 350 KB gzipped
- Terrain under 3 MB
- No main-thread freeze over 200 ms

## Risks

- **Flat terrain:** handled with stated vertical exaggeration and contour intervals tuned per region.
- **Transit scale jump** (km to thousands of km): handled with separate scenes per leg, a haze
  crossfade and camera distance scaled per zone.
- **The SRM project isn't written yet:** the Chennai panel shows Education until you send it.

## Slice 1: built (approved as written)

ETOPO 2022, ×12 exaggeration labelled in the corner, and the Chennai stop showing SRM education.
Screenshots: `docs/screenshots/flyover-slice-*.png`.

- **Data:** `node scripts/terrain.mjs` writes `public/terrain/india.png` (661 × 841 samples, about
  0.9 km apart, −3,634 m to 2,154 m) and `india.json`.
- **Engine:** `src/engine/flyover/`. The terrain is one shared vertex grid split into 4 × 4 chunks
  (one GPU copy, per-chunk culling). There is one material for contours, sweep and haze, a sky that
  the haze fades into, and a translucent sea at 0 m. The sun has just set in the west-north-west.
- **Shots:** the camera starts 34 km up over the Bay of Bengal and glides about 7 s (autopilot) down
  to a hold 10 km up, 29 km from the marker. Scroll, the arrow keys, Home/End and "Next stop" drive it.
- **At the stop:** the sweep is 1.2 s, then 1.6 s to settle to outlines. Then the leader line draws
  and the panel opens, docked right.
- **Not in this slice:** depth of field while holding (listed as the first thing adaptive quality
  drops anyway). The other stops.

| Target | Result |
|---|---|
| 60 fps at 1440 × 900 | 57–60 fps in WebKit (display-capped), 120 fps in Firefox (uncapped), quality never stepped down |
| 3D chunk under 350 KB gzipped | 211 KB (three.js + postprocessing + engine); fun-mode UI chunk 3 KB; the plain page loads neither |
| Terrain under 3 MB | 0.70 MB |
| No freeze over 200 ms | Longest main-thread gap while loading and flying: 59–78 ms (WebKit), 42–78 ms (Firefox). It was 214 ms in Firefox before the warm-up was split into steps. |

## Slice 1, rebuilt as a SLAM run (feedback round 1)

The dusk contour flyover above was replaced at your request:
- **The concept:** a drone flies the route and builds the map live, like ROS/RViz but calmer.
- **Colours:** navy, off-white for the built map, and orange only for the live scan and the
  trajectory.
- **The inset:** a corner map with each stop labelled by city, state, country and coordinates.

Screenshots: `docs/screenshots/flyover-slam-*.png`.

- **The map:** lidar returns on a 250 m lattice, generated only where the drone's 30 km scan
  ever reaches, on land only (water sends no returns), from the same ETOPO heights.
  - Each stretch of the flight records when it was scanned, scanning every 0.3 s.
  - New points appear orange and scattered, then settle onto the lattice and turn off-white over
    2.6 s.
  - In the settled map, higher ground, 20 m contour bands and the coastline read brighter.
  - A beam turning every 2.4 s keeps lighting points orange while the drone hovers.
- **The trajectory:** an orange line with a pose marker every 3 km, plus the drone (a flat chevron)
  and a faint line down to the ground.
- **The landmark:** when SRM comes within range, a reticle appears ("detected"). On arrival it
  closes in for 0.9 s ("locked"), then a leader line draws and the panel opens.
- **The camera:** it chases from behind and to the side of the drone, so the trajectory crosses
  the frame. At the stop it swings round to look south, with the sea on the left; the panel docks
  over the sea.
- **The inset:** `scripts/inset.mjs` traces coastlines only from coarse ETOPO (no national
  borders), with the stops and the drone's position on it.
- **Loop closure in Boston** is for the Boston slice.

| Target | Result |
|---|---|
| 60 fps at 1440 × 900 | 60 fps in WebKit (display-capped), 120 fps in Firefox; quality never stepped down |
| 3D chunk under 350 KB gzipped | 215 KB; fun-mode UI chunk 7 KB (includes the inset coastline); the plain page loads neither |
| Terrain under 3 MB | 0.70 MB (the inset adds 8 KB of path) |
| No freeze over 200 ms | Longest main-thread gap: 47–60 ms (WebKit), 28–75 ms (Firefox) |

## The full flight (built overnight, 2026-11-02)

All the stops, in timeline order:

| Journey | Stop | Panel |
|---|---|---|
| 0 | Over the Bay of Bengal | Title |
| 1 | Chennai, Tamil Nadu, India | SRM education (the SRM project slot stays empty until its details arrive) |
| 2 | Hyderabad, Telangana, India | Mouri Tech |
| 3 | Ongole, Andhra Pradesh, India | JC Biotech |
| 3.3 to 3.75 | Great circle over a dotted globe, with a 12,937 km counter | (none) |
| 4 | Boston, Massachusetts, USA | Northeastern; the loop closes first |
| 5 to 9 | Five waypoints along Boston Harbor | Plates 2.1 to 2.5, key result first |
| 10 | Overview of the Boston map | Coursework and earlier work |
| 11 | Contact | Email, links, Back to the plain site |

- **Engine:** `route.ts` holds the flight plan and framings, `leg.ts` a mapped leg, `globe.ts` the
  transit, and `createFlyover.ts` the journey, scans, locks, closure and camera.
- **Data:** `node scripts/terrain.mjs boston` and `node scripts/terrain.mjs world` add the Boston
  tile (15", 72 KB) and the world grid (0.5°, 462 KB). `node scripts/inset.mjs world` traces the
  world inset.
- **Loop closure:** the Boston map (points, trajectory, poses, drone) is drawn drifted by 2.6° and
  about 2 km while the drone flies in. After the Northeastern lock, it eases back into alignment over
  1.1 s while the trajectory brightens, then the panel opens.
- **Leg switches:** a navy veil hides the switch between India, the globe and Boston.
- **Plate waypoints:** Fort Point, Castle Island, Columbia Point, Squantum and Merrymount. They are
  map positions for the plates, not claims about where the work happened.

| Target | Result (whole flight, 1440 × 900) |
|---|---|
| 60 fps | 60 fps at every stop in WebKit, 120 in Firefox; quality never stepped down |
| 3D under 350 KB gzipped | 219 KB engine chunk + 15 KB fun-mode UI (with both insets) |
| Terrain under 3 MB | 1.2 MB (India 0.71, world 0.47, Boston 0.07) |
| No freeze over 200 ms | Longest main-thread gap 57–84 ms (WebKit), 79 ms (Firefox), across load and the whole flight |
