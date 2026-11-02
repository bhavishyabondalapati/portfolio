# Third-party notices

## ThreeUI Community (MIT)

Some scene techniques in `src/engine/` follow the approach of ThreeUI's Community components
(`TempleNightScene`, `KageLandingPage`, `SylvaLivingWorldScene`) from https://github.com/MengTo/threeui:
the seeded random function, frame-rate independent damping, layered canvas noise with a normal map
derived from a height map, swaying foreground cut-out sheets, recycled instanced falling leaves, a
spline camera rig, and a per-letter wordmark sized to the frame. No ThreeUI files or images are included.

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

## three.js

`three` 0.186.1, MIT licence (Copyright 2010-2026 three.js authors).

## Post-processing libraries

- `postprocessing` 6.39.5 by Raoul van Rüschen (pmndrs), zlib licence: https://github.com/pmndrs/postprocessing/blob/main/LICENSE.md
- `n8ao` 2.0.1 by N8python (installed, not currently bundled): its package.json says ISC and its LICENSE file is CC0 1.0 (public domain dedication): https://github.com/N8python/n8ao/blob/master/LICENSE

`postprocessing` is bundled, unmodified, into the lazily loaded 3D chunk.

## Fonts

Archivo and IBM Plex Mono, SIL Open Font License 1.1, served from this site by `next/font`.

## Elevation data

`public/terrain/*` (India, Boston and world tiles, made by `scripts/terrain.mjs`) and the
coastlines in `src/lib/inset-india.json` and `src/lib/inset-world.json` (made by
`scripts/inset.mjs`) come from:

Terrain: NOAA NCEI, ETOPO 2022 15 Arc-Second Global Relief Model, doi:10.25921/fd45-gt74.

Downloaded from NOAA's ERDDAP server (dataset `ETOPO_2022_v1_15s`), resampled to every other
sample and re-encoded as Terrarium PNGs. Licence, as ERDDAP states it: "The data may be used and
redistributed for free but is not intended for legal use, since it may contain inaccuracies.
Neither the data Contributor, ERD, NOAA, nor the United States Government, nor any of their
employees or contractors, makes any warranty, express or implied, including warranties of
merchantability and fitness for a particular purpose, or assumes any legal liability for the
accuracy, completeness, or usefulness, of this information." The flyover draws heights 12 times
taller than they are and says so on screen.

## Images

- `public/work/*`: the author's own figures and video, copied from the author's own repositories.
