# Notes: how the site works

## Architecture

```
src/content.ts ──► src/app/page.tsx + src/components/Sections.tsx      the plain site (static HTML)
        │
        └──────► src/components/FunMode.tsx  ◄── loaded only on "Fly the survey"
                         │ dynamic import()
                         ▼
                 src/engine/flyover/*        three.js + postprocessing (one 219 KB gzipped chunk)
```

- **Before the first paint**, an inline script (`SURVEY_SCRIPT`) sets three things on `<html>`:
  - the theme
  - whether the 3D mode is offered (width ≥ 1024, a fine pointer, no reduced motion, no Save-Data,
    4+ CPU cores; WebGL2 is checked after load)
  - whether the visitor chose it last time

  So nothing flashes.
- **The plain page** is complete without JavaScript beyond that script and React's hydration.
- **The 3D mode** is a modal overlay. The page behind it is `inert`, Esc and the always-visible
  "Back to the plain site" button exit, and the choice is remembered.
- **The engine reports state to React each frame** (FrameState: journey, stop, lock, closure,
  screen positions). React places HTML labels and panels with transforms, without re-rendering every
  frame, so text stays real, crisp, selectable and readable by screen readers.

## The 3D scene

- **Journey.** One number from 0 to 11, driven by scroll, touch, the arrow keys or the route rail.
  The stops are whole numbers:
  - 0 is over the Bay of Bengal
  - 1 Chennai, 2 Hyderabad, 3 Ongole
  - 4 Boston (Northeastern)
  - 5 to 9 the five plates
  - 10 the overview, 11 contact
- **Legs.** India (0 to 3.3) and Boston (3.75 to 11) are mapped legs. Between them, from 3.3 to
  3.75, is the globe. A navy veil hides each switch.
- **Terrain.** The ETOPO heights are Terrarium-encoded PNGs (height = R·256 + G + B/256 − 32768),
  decoded on a canvas with colour conversion off. They are projected flat around each tile's centre
  (under 1% error over a few hundred km) and drawn 12 times taller.
- **The map.** It is built once at load:
  - Only cells the drone's 30 km lidar ever reaches get points, on land only (water sends no
    returns), on a 250 m lattice.
  - Each point stores the index of the first path sample whose scan reached it.
  - Every 0.3 s, a scan writes the current time into a float texture of per-sample scan times.
  - The vertex shader reads that texture: not yet scanned (hidden), fresh (orange, scattered) or
    settled (off-white, on the lattice).
  - A beam turning every 2.4 s keeps lighting points orange while the drone hovers.
- **The camera.**
  - It chases from behind and to the side of the drone (so the trajectory crosses the frame), and
    pulls back when the drone cruises high.
  - Near each stop it eases into a framing from `route.ts`, leaving the panel's side of the screen
    over open ground or sea.
- **Landmark lock.** The reticle shows when the landmark's cell has been scanned ("detected"),
  closes in over 0.9 s on arrival ("locked"), then the panel opens on a leader line.
- **Loop closure.** While flying into Boston, the Boston map is drawn rotated 2.6° and shifted
  about 2 km, the way odometry drift accumulates. After the Northeastern lock it eases back over
  1.1 s while the trajectory brightens: the map snaps into alignment.
- **Cost.** About 870,000 points across both legs (only one leg is drawn at a time), one draw call
  per cloud, bloom, tone mapping and SMAA. Adaptive quality halves the bloom resolution, then the
  pixel ratio, if frames run slow. Every shader compiles and every scene uploads before the first
  visible frame, in steps with pauses.

## Five decisions I can explain in an interview

1. **The 3D mode is optional and loaded on demand.**
   - Recruiters skim on phones and in a hurry, so the plain site has to win on its own.
   - The 3D code is a separate chunk behind a dynamic `import()`, so the default page loads none
     of it and stays fast.
   - The trade-off is a short loading step when someone opts in, and the loading line shows real
     bytes.
2. **Real elevation data, with the licence checked first.**
   - I compared NOAA ETOPO 2022 (free to use and redistribute, cite the DOI), NASA SRTM (needs a
     login) and Copernicus (attribution and a disclaimer on any modified copy).
   - ETOPO covers land and sea floor in one source, and the camera never flies low enough to
     benefit from 30 m data.
   - The flat coasts needed ×12 vertical exaggeration, and the screen says so.
3. **The GPU decides what is visible.**
   - Instead of rebuilding geometry as the drone flies, each point carries "first seen at sample
     i", and a tiny texture holds when each sample was scanned.
   - Revealing the map costs one texture upload of a few KB per scan, not a buffer rebuild of
     hundreds of thousands of points.
   - Rewinding works for free: the scan times beyond the drone reset.
4. **Measured budgets, and the fix for Firefox.**
   - Targets: 60 fps, under 350 KB of 3D code, under 3 MB of terrain, no main-thread block over
     200 ms. I measured the longest block with a timer that records gaps between 10 ms ticks.
   - Firefox first showed a 214 ms block. It has no parallel shader compilation, so the first draw
     compiled everything at once.
   - Splitting the warm-up into steps (scene shaders, each leg's upload, post-processing) with a
     pause between them brought it under 85 ms.
5. **Text stays HTML, not texture.**
   - Panels, labels and the reticle are DOM elements positioned from projected 3D points.
   - They stay sharp at any pixel ratio, can hold links and buttons, are announced by screen
     readers, and use the same content file as the plain site.
   - The cost is a little per-frame layout work, kept to `transform` updates.

## Known limits

- The Content-Security-Policy allows `'unsafe-inline'` scripts. Next's static export inlines its
  bootstrap scripts, and their hashes change every build. Everything else is locked to the site's
  own origin.
- Plate waypoints in Boston are map positions for the plates, not where the work happened.
- Chennai and Ongole are flat, so their maps read mostly through the coastline. The Eastern Ghats on
  the way to Hyderabad show the most relief.
