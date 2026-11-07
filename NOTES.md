# Notes: how the site works

## Architecture

```
src/content.ts ──► src/app/page.tsx + src/components/Sections.tsx      the plain site (static HTML)
        │
        └──────► src/components/FunMode.tsx  ◄── loaded only on "Fly the survey"
                         │ dynamic import()
                         ▼
                 src/engine/flyover/*        three.js + postprocessing (one 220 KB gzipped chunk)
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

- **Journey.** One number from 0 to 12: 0 over the Bay of Bengal, 1 Chennai, 2 Hyderabad, 3 Ongole,
  4 Boston (Northeastern), 5 to 10 the six plates, 11 the overview, 12 contact.
- **Motion.**
  - Scrolling moves a target, and the journey glides after it with damped inertia, the same both
    ways.
  - Between stops, a dwell easing makes the drone slow into each stop, hold for 0.12 of a
    journey unit, and speed up again.
  - Near a stop, the camera eases from the chase view to an aerial overview behind the drone's
    approach, and the panel opens while it holds.
  - Keys, "Next stop" and the rail play an exact eased flight along the same path (2.2 s per stop).
- **Legs.** India (0 to 3.3) and Boston (3.75 to 12) are mapped legs; the globe is between them.
  The India leg ends climbing, and the globe starts close over India, pulls back and closes in over
  Boston. A 0.03-unit navy fade covers each switch.
- **Terrain.** NOAA ETOPO heights ×12 (Terrarium PNGs), with the sea drawn flat at 0 m. Each
  vertex stores the first path sample whose 30 km scan reaches it. Every 0.3 s a scan writes the
  time into a float texture of per-sample scan times. The fragment shader then shows:
  - dark shaded relief with glowing contours before the scan
  - the NASA Blue Marble landscape, lit for dusk, after it
  - an orange fresh edge and beam for the live scan
  - the graticule and contours on top
- **Loop closure.** While flying into Boston, the Boston map is drawn rotated 2.6° and shifted
  about 2 km. It eases back into alignment over 1.1 s after arrival.
- **Cost.** About 620,000 terrain vertices across both legs (only one leg is drawn at a time),
  bloom, tone mapping and SMAA. Adaptive quality halves the bloom resolution, then the pixel ratio,
  if frames run slow. Every shader compiles and every scene uploads before the first visible frame,
  in steps with pauses.

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
3. **The GPU decides what is revealed.**
   - Instead of rebuilding geometry as the drone flies, each terrain vertex carries "first seen at
     sample i", and a tiny texture holds when each sample was scanned.
   - Revealing the land costs one texture upload of a few KB per scan, not a buffer rebuild of
     half a million vertices.
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
- Blue Marble is about 500 m per pixel, so close views (the Boston plate waypoints) are soft.
