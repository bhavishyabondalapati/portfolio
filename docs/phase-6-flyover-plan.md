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
