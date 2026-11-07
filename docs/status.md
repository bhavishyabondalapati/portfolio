# Status: 6 November 2026

## Done

1. **Plain site, less up front** (`a84d544`).
   - Plates show the title, one line, the key figure and the stack.
   - Images, chart, results, problem, what I built and links sit behind "Read more". It expands in
     place as a native disclosure, so it works by keyboard and screen readers announce it with the
     plate's name.
   - Jobs show two points; the rest expands.
   - The gazetteer is one line per project.
2. **New repos** (`0246c39`).
   - **ImpactLens** is at its scaffold phase with no results, so it goes in a new "In progress"
     line under the plates.
   - **lexintake-aws** is finished, but it measures speed, not accuracy, so it gets a gazetteer
     line plus an "AWS version" link on the LexIntake plate.
   - **bioreactor-batch-monitor** is public again and back in the gazetteer (3 of 3 faults
     caught, 95.8% precision).
   - **No Mouri Tech rebuild exists** in your repo list, public or private.
3. **Flyover rebuilt.**
   - **Motion:** scroll and trackpad drive one continuous path with damped inertia. The drone
     slows into each stop and holds briefly, and the camera pulls back to an overview while the
     panel fades in. Keys and "Next stop" play a 2.2 s eased flight along the same path.
   - **Look:** dusk terrain from the earlier version, with NASA Blue Marble revealed by the scan.
     NASA imagery is not copyrighted in the US; it is credited on screen and in the notices.
   - **Overlays:** a degree graticule, contours, and a HUD (altitude, heading, position, live
     scale bar).
   - **Timeline:** a rail with dates and roles at each stop.
   - **Plates:** six waypoints, one per plate.

## Measured

- **Frame rate:** 60 fps at every stop in WebKit; 120 fps in Firefox.
- **Main-thread blocks:** the longest was 79 ms in WebKit and 100 ms in Firefox (target: under 200).
- **Trackpad simulation:** speed changes gradually with no jumps, and the drone ends exactly where
  it started after scrolling forward and back.
- **Sizes:** 220 KB of 3D code; 1.2 MB of terrain and imagery.

## Flag: left OFF

It meets the numbers, but I can't yet call it seamless:
- The switch from India to the globe and from the globe to Boston still fades through navy for
  about 0.1 s.
- Trackpad feel was only tested with simulated events, not real fingers.

## Left

- **One continuous zoom:** replace the two navy fades with a cross-fade between the leg and the globe.
- **Real trackpad check:** tune the 0.0011 wheel factor and the inertia of 5 by hand.
- **Labels:** elevation labels on contours, and degree labels on the graticule.
- **Imagery:** Boston is soft at 500 m per pixel. A sharper public-domain layer would be needed;
  the GIBS Landsat layers came back empty.
- **Dates:** done on 6 November (SRM 2021 to Jan. 2025, Northeastern Fall 2025 to May 2027).
- **SRM SLAM project details** are still to come.

## ImpactLens and the Aerial plate

Once ImpactLens publishes measured results on its public Sentinel-2 data, it should **replace** the
Aerial Change Intelligence plate:
- It covers the same work end to end on public data that anyone can reproduce.
- Aerial would become its "earlier version" link.

Until then, keep Aerial. Its F1 0.898 is measured, and ImpactLens has no results yet.
