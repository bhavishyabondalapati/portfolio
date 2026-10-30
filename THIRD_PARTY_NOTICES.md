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

## Post-processing libraries

- `postprocessing` 6.39.5 by Raoul van Rüschen (pmndrs), zlib licence: https://github.com/pmndrs/postprocessing/blob/main/LICENSE.md
- `n8ao` 2.0.1 by N8python: its package.json says ISC and its LICENSE file is CC0 1.0 (public domain dedication): https://github.com/N8python/n8ao/blob/master/LICENSE

Both are bundled, unmodified, into the lazily loaded 3D chunk.

## Fonts

STIX Two Text, SIL Open Font License 1.1, served from this site by `next/font`.

## Images

- `public/work/*`: the author's own figures and video, copied from the author's own repositories.
- `public/stills/*`: screenshots of this site's own 3D scene.
