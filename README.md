# Portfolio: a walk through a Chettinad house

My personal portfolio. The first screen is a Chettinad house built entirely in code with Three.js: scroll and you walk up to the veranda, the carved teak door opens, and a small kitten with a sword shows you around. Recruiters who want the facts fast can press "Skip the tour"; phones and reduced-motion visitors get that fast version automatically, with the same content.

Status: hero scene (vertical slice) done. Courtyard, corridors and dusk scenes come next. A full README (tools and why, file-by-file structure, how it was built, key concepts) will be written when the site is finished.

## Run it

```bash
conda create -n portfolio -c conda-forge nodejs=22 -y
conda activate portfolio
npm install
npm run dev        # http://localhost:3000
```

```bash
npm test           # content rules, tour/fast decision, camera maths
npm run typecheck
npm run build      # static site in out/
```

Useful URL flags: `?tour=on` forces the 3D tour at any width, `?tour=off` the fast page, `?light=golden` or `?light=dusk` picks the lighting (dark mode picks dusk by default), `?fx=off` turns post-processing off, `?bench=1` exposes `window.__house.bench()` for per-effect timings, `?capture=1` hides the interface (used to render the stills in `public/stills/`), `?debug=1` exposes `window.__house`.

## Where things are

- `src/content.ts`: every word, number and link on the site.
- `src/engine/`: the 3D house (`house.ts`), the giant name (`wordmark.ts`), petals, the kitten, and the renderer that ties them together.
- `src/components/HouseTour.tsx`: hosts the canvas and the kitten's HTML button and speech bubble.
- `src/lib/tourMode.ts`: decides tour or fast page before the first paint.
- `docs/`: the phase proposals, content notes and screenshots.

Credits and licences: see `THIRD_PARTY_NOTICES.md`.
