# Morning report: 2 November 2026

Everything below is committed locally on `main`. **Nothing is pushed, and nothing is deployed.**
There is no GitHub remote yet (`bhavishyabondalapati/portfolio` doesn't exist).

## What got done

| Commit | What |
|---|---|
| `4229e7e` | Project list as you approved it (details below) |
| `c6d2e2d` | The whole flyover route as one SLAM run |
| `608b712` | Launch prep: security headers, SEO, social preview, README, NOTES |
| `7e52cca` | Final QA fixes and refreshed screenshots |
| `115dc43` | The great-circle test, which had been left out of an earlier commit |

### 1. Project list

- **Plates:** Aerial, LLM Gateway, RepoRAG, Robot Arm, Excel Copilot.
- **RepoRAG, plate 2.3:**
  - **Key figure:** "0.96: Recall@5 on itsdangerous; 0.722 on a held-out set written before
    tuning".
  - **Chart:** itsdangerous against ky (0.964 and 0.214, hybrid search, development set).
  - **Second result:** the reranker finding (MRR 0.446 to 0.385).
  - **Also on the plate:** the ky explanation, and "Answer faithfulness and abstention are not
    measured yet". I added that so the plate doesn't imply more than the README measures.
- **Other changes:**
  - Racket IMU is in the gazetteer.
  - Kambaz has "Team final: frontend" and "Team final: API" links.
  - The bioreactor row is gone, and a test now fails if a link to bioreactor or LexIntake comes back.
- **Fixed on the way:** bar charts had "ms" hard-coded after every value, so the RepoRAG chart
  first read "0.964 ms". Each chart now sets its own suffix.
- **Still empty:** the undergraduate coursework group (waiting on your SLAM details).

### 2. The flyover, all stops

| Journey | What happens |
|---|---|
| Opening | Over the Bay of Bengal; the first scan finds the coast |
| Chennai | Landmark detected, then locked; SRM panel |
| Cruise | The map builds live as the Eastern Ghats appear in the scan |
| Hyderabad | Mouri Tech panel |
| Ongole | JC Biotech panel |
| Transit | A dotted globe; the orange great-circle trajectory draws itself, with a 12,937 km counter |
| Boston | The Northeastern lock, then **loop closure**: the drifted Boston map (2.6°, about 2 km off) eases into alignment as the trajectory brightens; then the panel |
| Plates 2.1 to 2.5 | Waypoints along the harbour shore, key result first |
| Overview | The whole Boston map, with coursework and earlier work |
| Contact | Email, LinkedIn, GitHub, "Back to the plain site" |

- **Navigation:** the route rail now jumps to any of the four stations.
- **Inset map:** it switches from India to a world strip for the flight to Boston.
- **Screenshots:** `docs/screenshots/flyover-*.png`, one per stop.

| Target | Measured |
|---|---|
| 60 fps | 60 at every stop (WebKit, display-capped), 120 in Firefox; quality never had to step down |
| 3D code under 350 KB gzipped | 219 KB engine + 15 KB fun-mode UI; the plain page loads neither |
| Terrain under 3 MB | 1.2 MB |
| No freeze over 200 ms | Longest main-thread block 57–84 ms across loading and the whole flight, in both browsers |

### 3. Launch prep

- **Security headers in `vercel.json`:**
  - A Content-Security-Policy that limits everything to the site's own origin.
  - HSTS, nosniff, Referrer-Policy and Permissions-Policy.
  - No framing (X-Frame-Options and frame-ancestors).
  - I tested it locally with the exact headers: the whole flight runs in WebKit and Firefox with no
    console errors.
- **SEO:**
  - Title, description, canonical, Open Graph and Twitter cards.
  - `sitemap.xml`, `robots.txt` and a favicon (a survey station mark).
  - A 1200 × 630 social preview rendered from the real hero.
  - The URL comes from Vercel's production domain at build time; set `SITE_URL` for a custom domain.
- **Docs:** the README has all seven sections, and NOTES.md covers the architecture, the 3D scene,
  five interview decisions and the known limits.
- **Scans:** no keys or phone numbers in any file or anywhere in git history, and `.env` is not tracked.
- **Privacy policy:** not needed. There is no analytics, no cookies, and no third-party requests;
  even the fonts are self-hosted.

### 4. Final QA

- **Lighthouse (mobile, served compressed as Vercel will):** Performance 96, Accessibility 100,
  Best Practices 100, SEO 100. LCP 2.9 s, total blocking time 0–10 ms, layout shift 0.
  - Served uncompressed, Performance drops to 79, so the compression on Vercel matters.
- **Plain site:** WebKit and Firefox, light and dark, desktop and phone. No console errors, no
  horizontal overflow, and 28 of 28 tests pass.
- **Design detector:** one finding left, the legend's scale bar, which is deliberate (it was cleared
  in the earlier critique).

## Decisions I made without you (easy to change)

- **CSP allows inline scripts.** Next's static export inlines its startup scripts, and their hashes
  change every build. I also dropped `upgrade-insecure-requests`: Vercel is https-only anyway, and
  WebKit applied it to `http://127.0.0.1`, which broke local previews.
- **Plate waypoints:** Fort Point, Castle Island, Columbia Point, Squantum and Merrymount, shown as
  "Waypoint 2.n". They are map positions only, with no claim about where the work was done.
- **Loop-closure drift:** 2.6° and about 2 km is a visual choice, not a measurement. No numbers are
  shown for it on screen.
- **Map density:** the India map now uses the denser 250 m lattice, about 870,000 points across
  both legs, because the sparser one looked too faint. It still holds 60 fps.

## My honest look

- **Strongest:** the cruise toward Hyderabad, where the Eastern Ghats rise in orange as fresh scans
  arrive; the globe; the Boston lock and closure; and the stop panels docked opposite their
  landmarks.
- **Weakest:** the opening and Chennai, which are calm rather than wow. The coast near Chennai is
  flat, so its map reads mainly through the coastline.
  - If you want more punch there, I'd shorten the first glide and start the beam's first sweep
    right on the coast.
- **Not tested:** your own Safari or Chrome with a real GPU. My measurements ran in Playwright's
  WebKit and Firefox on this Mac.

## What needs you

1. **The SRM ROS/SLAM project details** (robot or simulator, SLAM method, sensors, what you built,
   any result). They fill the undergraduate coursework group and the Chennai panel.
2. **Approval to create the public GitHub repo and push.** No remote exists yet.
3. **Approval to deploy to Vercel.** After it's live, check the preview image with a link unfurl.
4. **Reminder:** rotate the `SESSION_SECRET` for kambaz-node-server-app on Render.

## Run it

```bash
cd ~/projects/portfolio && conda activate portfolio && npm run build && npm start
```

Open http://localhost:3000 in a window at least 1024 px wide and click "Fly the survey".
Run the tests with `npm test`.
