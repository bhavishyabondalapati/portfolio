# Notes: how the site works

## Architecture

```
src/content.ts ──► src/app/page.tsx + src/components/Sections.tsx      the plain site (static HTML)
                          │  "Walk the Charles" (a plain link)
                          ▼
              src/app/boston/  ──►  <iframe> public/house/house.html   the Boston-at-night page
```

- **The plain site is the product.** It is static HTML, complete without JavaScript beyond a tiny
  inline script that sets the light or dark theme before the first paint, so nothing flashes.
- **Boston is opt-in.** It is a separate route (`/boston`). Nothing from it loads on the plain
  site: the button is an ordinary link, so the plain page stays small and fast.
- **Back to the plain site** is a pill in the top-right corner of `/boston` (always on top, plain
  link to `/`) and a link in the page's own footer.
- **Phones, reduced motion, data saver, weak machines.** `/boston` opens the page with `?q=low`
  (lower pixel ratio, no shadows). The page also lowers its resolution by itself if frames run slow,
  and with reduced motion the camera follows the scroll without easing.

## The Boston page (public/house/house.html)

- One self-contained HTML file with its own scripts, derived from ThreeUI's Kage landing page (MIT).
  It draws the skyline, river, lamps, elms, reeds, snow and moon in code (three.js, `three.min.js`),
  with the giant name in 3D, cloth cards for the featured projects and a post-processing pass.
- The four photographs are used only as framed images in the project cards and the hero preview,
  graded to the night palette by `scripts/wow/grade.py` and exported at 1x and 2x by
  `scripts/wow-assets.mjs`. Foreground layers (elm, reeds, gas lamp, railing, leaves) are SVG drawn
  by `scripts/wow/make-fg.py`.
- `scripts/make-house.py` and `scripts/house-patches.py` record how the page was made from Kage. The
  original Kage page was removed (it used an unlicensed font), so they cannot run any more; edit
  `house.html` directly.
- Every featured project links to its GitHub repository from a list under the cards.

## Decisions worth explaining

- **Progressive enhancement.** The plain site first; the 3D page only on request.
- **Content as data.** `src/content.ts` is the single source for the plain site; tests guard it
  (no phone number, figures match results, every link is https).
- **Licences.** Only photographs with a clear licence ship, each credited in the page footer and in
  `THIRD_PARTY_NOTICES.md`; the ThreeUI MIT notice is included in full.
- **Security headers** live in `vercel.json` (static export cannot set them in Next).
