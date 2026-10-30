# Phase 1c: procedural engine (update to the cinematic plan)

Date: 30 Oct 2026. This replaces sections 2, 5, 6, 7 and 8 of `phase-1b-cinematic-plan.md`. Everything else there stays: what I took from the references, the giant name inside the scene, the scene-to-section mapping, the storyboard, the kitten's design and lines, and keeping `docs/references/` out of git.

## What changed

| Before | Now |
|---|---|
| AI-generated frame sequences and video, sliced with ffmpeg | No frames, no ffmpeg, no art from you. The whole house is built in code with Three.js |
| Parallax from separate PNG layers | Real depth: a 3D camera moving through real geometry, with fog and foreground cut-outs |
| Kitten in its own transparent canvas above the art | Kitten inside the same 3D scene, so it is lit by the same sun, casts a shadow and can walk through the door |
| React Three Fiber and drei | Plain Three.js inside one React component (see "Why plain Three.js") |

## Technical reference: ThreeUI Community (MIT)

I read the source of three Community components in [MengTo/threeui](https://github.com/MengTo/threeui) (MIT licence, Meng To): `KageLandingPage` (`public/landing-pages/kage.html`), `TempleNightScene` (`templeNightRenderer.js`) and `SylvaLivingWorldScene` (`inner-green-3d.html`). What I'm taking, as techniques rather than copied files:

| Technique | Where I saw it | How the house uses it |
|---|---|---|
| **Camera on a spline**: a few hand-placed camera positions and look-at targets joined by a Catmull-Rom curve. Scroll sets a target, and the camera eases toward it with frame-rate-independent damping | Kage, Temple Night | Street, then up the steps, then through the opening door. Scroll drives it with no scroll hijacking |
| **Hand-held drift**: the mouse moves the camera a little, less as you go deeper | Temple Night | Same, so even the still hero feels alive |
| **Tall-screen fix**: on a narrow frame the camera steps back and widens instead of cropping the subject | Temple Night | Keeps the door and the name in frame at 768 px |
| **Giant word as one plane per letter**, measured from the font, sized so the word spans the frame at its depth, set at a fixed depth between scene layers | Kage `buildWordmark` / `layoutWord` | "bhavishya" stands in the front yard: the veranda and door behind it, the low front wall and jasmine in front of it. The letters also cast shadows on the ground |
| **Textures painted in code**: layered noise on a canvas, plus a normal map computed from a height map | Temple Night `fbmCanvas`, `normalFromHeight` | Lime plaster, teak grain, the carved door panels, red oxide, clay roof tiles, and a kolam drawn on the ground. Nothing to download |
| **Foreground cut-outs**: painted transparent sheets hung as planes that sway in the vertex shader and fade out as the camera passes them | Temple Night `cutoutMaterial` | The jasmine creeper hanging into the top of the frame, and shrubs on the front wall |
| **Instanced tumbling leaves**, recycled into the cone the camera is looking down so a small count always fills the frame | Temple Night `buildLeafFall` | Jasmine petals (about 140 on desktop) |
| **Haze slabs and exponential fog** for aerial depth | Temple Night, Sylva | Light morning haze, so the far facade softens |
| **Flickering lights** driven by sine noise on intensity | Temple Night lanterns | Brass lamps (the easter egg now; the dusk scene later) |
| **Budgets**: pixel ratio cap, lower counts on small screens, render loop paused when hidden or off-screen, ACES tone mapping | All three | Same |

If any helper ends up close to their code (the seeded random function, the noise-to-normal-map step), I'll keep the MIT notice in `THIRD_PARTY_NOTICES.md`.

## Why plain Three.js instead of React Three Fiber

The ThreeUI components each own one renderer, scene and loop inside a single React component, and that pattern fits this site: one full-screen world with one render loop is easier to pause, budget and debug than a tree of React components re-rendering 3D objects. It also keeps the download smaller (no R3F or drei). React still renders every panel and button. The kitten is a plain Three.js object with its own small state machine.

## Fast version (Skip the tour, phones, reduced motion)

Same as before, except the stills are now **screenshots of the real 3D scene** taken with Playwright, so they always match the house. The kitten in the fast version is a still of the same 3D kitten until we decide on the ink-and-wash drawing.

## Performance

- First paint is HTML (name, role, Skip the tour, See the work). The Three.js code is loaded after that, and everything in the scene is generated on the device, so there are no image downloads for the tour at all.
- The full tour runs only at 1024 px and wider, with a mouse or trackpad, no reduced motion, no Data Saver, and WebGL available. Everyone else gets the fast version.
- Pixel ratio capped at 1.5; the render loop stops when the tab is hidden.

## Hero vertical slice (what I'm building now)

- The house front at morning: lime-white facade with painted bands and arched windows, the thinnai with turned teak pillars on blue bases, a tiled roof, steps, a low front wall, and a kolam on the ground.
- The carved teak door, which opens as you scroll while the camera walks up the steps; through it, a glimpse of the bright courtyard.
- "bhavishya" standing in the scene between the veranda and the front wall.
- Jasmine petals falling, a jasmine creeper in the foreground, light haze.
- The shape-built kitten: head and eyes follow the cursor; click it (or press Enter on its button) and it swings the sword.
- Hero panel, top bar, Skip the tour, and the fast version.
- Playwright screenshots at 1440, 768 and 375, plus the fast version.
