# Phase 2: one continuous journey through the house

Date: 30 Oct 2026. Builds on `phase-1c-procedural-engine.md` and the cinematic hero.

## The idea

The page never drops out of the house. The scroll is one camera path, from the street to the back of the house, and every section of the site is a stop on it. The light changes as you walk, like a day passing: golden hour at the gate, the brighter sun overhead in the courtyard, low raking light along the corridor, and dusk at the back. In dark mode the whole walk is at night, lit by the lamps.

## How it works

**One path, many stops.** A list of camera "shots" (position, look-at point, lens) runs from the street to the back of the house. Each DOM section (hero, experience, projects, and later other work, about, contact) owns a stretch of the scroll and a set of shots. Between shots the camera glides along a curve. At a stop it eases in, holds while you read, and eases out. There are no cuts and no jumps.

**Panels anchored to the house.** Every job and every project is a real HTML article, in reading order in the DOM, so text stays crisp, selectable, searchable and readable by screen readers. In the tour, each article is pinned to a point in the 3D scene (between two pillars, under a lamp): every frame the renderer projects that point to the screen and moves the panel there, so it travels with the architecture as the camera passes. A panel fades in only near its own stop. Tabbing into a panel scrolls the camera to its stop. On the fast page the same articles are an ordinary page, so all content stays the same.

**Lamps answer to you.** Hovering or focusing a project panel brightens the lamp above its bay.

**The kitten walks the same path.** Each shot also says where the kitten stands, so it trots ahead, waits at each exhibit, and says that project's line.

## Storyboard

| Stop | Where | What you see | Panel | Kitten |
|---|---|---|---|---|
| Hero | The yard, low three-quarter | As now: the house at golden hour, the name in the yard | Corner card | Sits on the "a" |
| Door | Veranda | The carved doors swing in | (none) | Waits beside the door, then leads in |
| Hall | Entrance hall | A carved teak ceiling of stepped brackets overhead, turned teak pillars on blue bases, the bright courtyard framed by the far doorway | (none) | Trots ahead |
| Courtyard 1 | The open-sky courtyard | Light falling from the open sky onto the sunken court, dust in the shaft, green glass bell lamps hanging from the beams, two swings on chains, yellow-medallion floor, blue tile dado | JC Biotech, pinned to the left colonnade | Sits in the patch of sun: "Two internships. Six AI agents. Zero naps." |
| Courtyard 2 | Same, camera turns | The other side of the court | Mouri Tech, pinned to the right colonnade | Turns to follow |
| Corridor 1 to 4 | The green-pillar corridor | Faceted green pillars with yellow capitals, sunlight raking in between them, reflections on the glossy tile floor, teak beams overhead | One project per bay, between two pillars, with a lamp above | Stops at each bay with that project's line |
| Ledger (next slice) | End of the corridor | The accountant's desk | Other work | Sits on the ledger |
| Back at dusk (next slice) | The back courtyard | Lamps lighting one by one | About, then contact | Waves, then sleeps |

This slice builds the hero changes, the hall, the courtyard (experience) and the corridor. The corridor gets all four bays, because each bay is the same few lines of code repeated and leaving two projects out would make the tour incomplete. Other work, about and contact stay as plain sections after the corridor until the next slice.

## Exterior and kitten changes

- **Fluffy kitten:** a rounder body and bigger head, with shell-texture fur. Each fur-bearing part is drawn about 16 times, every copy pushed slightly further out along its surface and cut by a noise pattern, so the fur gets thinner toward the tips. It is one draw call per part, because the copies are instanced. Also cheek tufts, white ear tufts, and a big plume tail that curls and sways. All interactions stay.
- **Palms in real 3D:** curved, ringed trunks; fronds with a rachis and two rows of individual leaflets that droop toward the tips; coconut clusters; varied heights; sway in the wind in the vertex shader. They cast real shadows.
- **Leaves instead of petals:** about 25 neem and mango leaves drifting slowly, turning so they flash in the light.
- **Fixes:** dusk is bluer and less lavender; the kitten sits on top of the "a" instead of sinking into it.

## Performance plan

- The interior adds geometry, so repeated parts (ceiling brackets, tiles, pillars, leaflets) are instanced or merged.
- **Floor reflections:** a planar reflection of the corridor floor, rendered at half resolution and only while the camera is in the corridor. It is the first thing the adaptive quality drops, then depth of field, then ambient occlusion, then resolution.
- The sun's shadow follows the camera, so one 2048 px shadow map covers wherever you are.
- I'll measure the cost of the corridor stop with the same `?bench=1` tool.
