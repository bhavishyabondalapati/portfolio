# Flyover feedback (2 November 2026), for the next session

Written down at the end of the overnight run. **Nothing here is started yet.** The flyover is
behind the `NEXT_PUBLIC_FLYOVER` flag (off by default), so the plain site can ship without it.

## Bhavishya's feedback, as given

- The dot cloud looks weak. I want real imagery: realistic shaded terrain with actual landscape
  and geography, more scientific and techy. Idea: the lidar scan reveals the real terrain
  underneath as it maps, instead of leaving only dots. Check licenses for any imagery (e.g. NASA
  Blue Marble is public domain).
- Add technical overlays: coordinate grid, contour lines, elevation labels, scale bar, and a HUD
  with altitude, heading and position.
- It doesn't show my work. The timeline should be the point: a rail with years and the project or
  role at each stop, and each stop clearly showing what I did there.
- Scrolling with the trackpad jumps from stop to stop. It should move smoothly and continuously
  with my fingers, holding briefly at each stop. Arrow keys can still jump.
- I liked the earlier dusk terrain look more than the dots.

## The changes this asks for

1. **Real terrain, revealed by the scan.**
   - Bring back the shaded relief mesh from the dusk version (commit `b628789`): the ETOPO heights
     ×12 with contour lines.
   - Drape real imagery over it. The lidar scan then becomes a reveal mask: unscanned terrain stays
     dark or wireframe, and scanned terrain shows its true colour.
   - The point cloud could stay as a thin "live scan" layer at the reveal edge, rather than being
     the map itself.
   - **Check before using any imagery:** its licence, its resolution at the flight's altitude, and
     its file size against the 3 MB terrain budget. Candidates:
     - NASA Blue Marble (public domain, about 500 m per pixel)
     - Sentinel-2 cloudless mosaics (CC BY 4.0, with attribution)
     - NASA GIBS layers
2. **Technical overlays.**
   - A coordinate graticule with degree labels.
   - Contour lines with elevation labels at index lines.
   - A live scale bar that tracks the camera's distance.
   - A HUD with altitude (above sea level and above ground), heading (degrees and compass) and
     position (lat/lon).
3. **The timeline is the point.**
   - The rail shows years, plus the role or project at each stop:
     - B.Tech, SRM, finished Jan. 2025 (start year to confirm)
     - Mouri Tech, Sept. to Oct. 2024
     - JC Biotech, Nov. 2024 to Jun. 2025
     - MS, Northeastern, to May 2027 (start term to confirm)
     - then the projects
   - Each stop says plainly what was done there: the role, two or three results and the stack,
     not just a title.
   - Use only dates that are in `src/content.ts` or the resume. The SRM start year and the
     Northeastern start term must be confirmed before they are shown.
4. **Continuous trackpad scrolling.**
   - Map wheel and touch deltas straight onto journey position, with gentle smoothing and a short
     "detent" hold at each stop: resistance near whole numbers, not a snap.
   - The arrow keys, Space and "Next stop" keep the eased jumps.
   - Measure it with a real trackpad, not only synthetic wheel events.
5. **Look:** go back toward the dusk terrain palette (navy, ember horizon, glowing contours). The
   earlier SLAM rule, orange only for the live scan and the trajectory, may need revisiting
   together with it.

## Still open from before

- The SRM ROS/SLAM project details: robot or simulator, SLAM method, sensors, what was built, any
  result. They fill the undergraduate coursework group and the Chennai stop.
- Approval to deploy to Vercel. Pushed to GitHub on 2 November; not deployed.
- Rotate the kambaz-node-server-app `SESSION_SECRET` on Render.
