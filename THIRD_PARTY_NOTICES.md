# Third-party notices

## three.js

`public/house/three.min.js` is three.js (MIT licence, Copyright 2010-2026 three.js authors) and keeps its
licence header.

## Fonts

- Archivo and IBM Plex Mono (plain site): SIL Open Font License 1.1, served from this site by `next/font`.
- Onest and a static subset of Archivo ExtraBold (Boston page): SIL Open Font License 1.1, see
  `src/vendor/threeui/FONT-LICENSES.md`.

## Images

- `public/work/*`: the author's own figures and video, copied from the author's own repositories.
- `public/house/assets/*.svg`: foreground layers drawn in code by `scripts/wow/make-fg.py` (the author's own).
- `public/house/assets/scene-*.webp`: the four photographs credited below.

## Walk the Charles (route /boston)

`public/house/house.html` is the Boston-at-night page. Its engine (scroll rig, foreground stages, giant
word, cloth cards, post-processing) is derived from ThreeUI's Kage landing page
(https://github.com/MengTo/threeui, MIT, Copyright (c) 2026 Meng To). Kage's temple, images, copy and
fonts are not shipped: the skyline, river, lamps, snow, moon, sky and every foreground layer (elm,
reeds, gas lamp, railing, autumn leaves) are drawn in code (`scripts/wow/make-fg.py` and the page's own
scripts). `src/vendor/threeui/` holds the small frame component and typography recipe used to host the
page. The ThreeUI MIT licence, in full:

```
MIT License

Copyright (c) 2026 Meng To

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Fonts on this page: Onest (SIL OFL 1.1, Copyright 2021 The Onest Project Authors,
`src/vendor/threeui/FONT-LICENSES.md`) and a static subset of Archivo ExtraBold, width 125 (SIL OFL 1.1,
Copyright The Archivo Project Authors). `public/house/three.min.js` is three.js (MIT) and keeps its header.
Kage's unlicensed "Wordmark" font and the unchanged Kage page were removed from the repository.

### Photographs on /boston

Four photographs appear, each as a full framed image (hero preview and project cards), cropped and
colour-graded by `scripts/wow/grade.py` (navy shadows, amber highlights, film grain). Nothing is cut out
or pasted into the scene. Licences were checked on each source page on 7 November 2026. The credit lines
are also in the page footer.

| Used for | Photo and author | Licence |
|---|---|---|
| Hero preview, Longfellow Bridge | [Longfellow Bridge at dusk](https://commons.wikimedia.org/wiki/File:Longfellow_Bridge_at_dusk.jpg), Justin Jensen, via Wikimedia Commons | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| Project card, Back Bay | [Downtown Boston skyline and reflections in the frozen Charles River](https://commons.wikimedia.org/wiki/File:Downtown_Boston_skyline_and_reflections_in_the_frozen_Charles_River_(51307815725).jpg), Chris Rycroft, via Wikimedia Commons | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| Project card, Zakim Bridge | [Zakim Bridge, new lighting](https://commons.wikimedia.org/wiki/File:Boston,_Zakim_Bridge,_New_Lighting,_December_2012_(8291373895).jpg), MassDOT (courtesy credit) | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) |
| Project card, Beacon Hill | [Snow on Beacon Hill](https://unsplash.com/photos/brown-concrete-building-covered-with-snow-during-daytime-VtqqOg_eHTM), Photo by Andrew Spencer on Unsplash | [Unsplash License](https://unsplash.com/license) |

Not shipped: the photos in `docs/references/` (reference only, gitignored) and the author's own
photos in `docs/references/wow/own/`.

## Sketchbook (route /sketchbook)

The page `public/sketchbook/sketchbook.html` is built by `scripts/sketchbook/build.mjs` from ThreeUI's
MengToSketchbookLandingPage (https://github.com/MengTo/threeui, MIT, Copyright (c) 2026 Meng To; the licence
text is above and in `src/vendor/threeui/LICENSE`). ThreeUI's own asset licence file covers its included
images under the same MIT licence. The original page is kept, unshipped, in `scripts/sketchbook/source/`; every
source file and asset was checked against the SHA-256 hashes ThreeUI publishes (source revision e0330548b1ac).

- Kept from ThreeUI (MIT): the page code and motion, and the decoration in `public/sketchbook/decor/` (paper wash,
  ferns, orchid and plumeria watercolours, divider). `src/shaders/landing-pages/` holds ThreeUI's typography recipe
  for this page, unchanged.
- Not kept: Meng To's nine Singapore drawings, his name, biography and links. All text on the page comes from
  `src/content.ts`.
- The nine plates (`public/sketchbook/pages/*.webp`) are made by `scripts/sketchbook/plates.py`: ink and wash drawn
  in code, with the author's own project figures printed on the paper where they exist (the aerial before/after
  figures, the LexIntake review page, the robot arm render, and two ImpactLens figures from that repository).
- Fonts: Instrument Serif and Newsreader, SIL Open Font License 1.1 (see `src/vendor/threeui/FONT-LICENSES.md`).
  The GitHub icon is from Simple Icons (CC0).
