# Phase 5: The Survey (proposal for Part 1)

The house version is saved as the git tag `chettinad-house` (commit 81f2503). To get it back:
`git checkout chettinad-house`.

The sketch is a single HTML page: [docs/proposal/survey-sketch.html](proposal/survey-sketch.html).
Screenshots are in `docs/screenshots/survey-sketch-*.png`, at desktop, dark and phone sizes.

## Idea

The site reads as a survey document of my work. Sections are map sheets, projects are survey
plates with the measured result printed first, and the hero has a map legend in place of a bio
card. The 3D flyover (Part 3) is the same survey, flown.

## Colours

Light mode is chart paper; dark mode is a night chart. There is one orange, used for the primary
button, the sheet numbers, the "open to roles" dot and the corner marks on plates. Nothing else
is orange.

| Role | Light | Dark | Contrast (on paper / on plate) |
|---|---|---|---|
| Paper (background) | `#F4F1E8` | `#0B1526` | n/a |
| Plate (raised surface) | `#EAE5D7` | `#13213A` | n/a |
| Ink (text) | `#0F1E36` | `#ECE6D6` | 14.8 / 13.3 light, 14.7 / 12.9 dark |
| Ink 2 (secondary text, mono labels) | `#45526A` | `#A3AFC2` | 7.0 / 6.3 light, 8.2 / 7.3 dark |
| Survey orange (fills, marks) | `#F25C1F` | `#FF6A2B` | used as a fill, never as small text |
| Orange text (sheet numbers, link hover) | `#B33A0A` | `#FF8B57` | 5.3 / 4.7 light, 7.9 / 7.0 dark |
| Button text on orange | `#0F1E36` | `#0B1526` | 5.0 light, 6.4 dark |
| Contour lines | ink at 8%, index lines at 15% | paper at 7% / 14% | decoration only |

Every text pairing passes WCAG AA (4.5:1 or more). Light-mode orange on paper is 2.9:1, just under
the 3:1 rule for meaningful graphics. So orange marks always carry a navy outline, and the
outline carries the contrast.

## Type

**Recommended: Archivo + IBM Plex Mono.** Both are free under the SIL Open Font License and will
be self-hosted with `next/font`.

- **Archivo** (variable, with a width axis). Headings use it at the widest setting and weight
  800: wide, flat capitals like the lettering on survey sheets. Body text uses the normal width,
  so one family does both jobs and the page loads one font file.
- **IBM Plex Mono** for sheet labels, coordinates, dates and stack lists. It looks like
  engineering drawings rather than a code editor.

**Alternative: Newsreader + Martian Mono.** This gives a serif display and a softer, more
"atlas" feel. It is classier but less bold. Say if you want to see it.

Not used, as you asked: Inter, Geist, Space Grotesk.

## Layout

```
┌ BHAVISHYA BONDALAPATI ─────────────── Experience  Projects  Other work  About  Contact ┐
│ ░ contour lines (static) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ SHEET 00 · SURVEY OF WORK   42.3398° N · 71.0892° W                                   │
│ BHAVISHYA                                                                             │
│ BONDALAPATI                                         ┌ LEGEND ───────── REV. OCT 2026 ┐│
│ ML systems and backend engineer                     │ STATION   Boston, MA           ││
│ MS CS at Northeastern, GPA 3.9, May 2027 ...        │ DEGREE    MS CS · GPA 3.9      ││
│ [See the work]  [Fly the survey 3D]                 │ COMPLETE  May 2027             ││
│ Email  LinkedIn  GitHub                             │ SEEKING   ML · Backend · Full  ││
│                                                     │ STATUS    ● Open to roles      ││
├─────────────────────────────────────────────────────┴────────────────────────────────┤
│ SHEET 01 · EXPERIENCE                              coordinates of each station, mono │
│ dates / place / coords  │ Company, role, 3 to 5 measured bullets, stack              │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ SHEET 02 · SURVEY PLATES                                                             │
│ ┌ PLATE 2.1 ───────┐ ┌ PLATE 2.2 ───────┐   each plate: key figure first (F1 0.898,  │
│ │ F1 0.898         │ │ 3,085 req/s      │   3,085 req/s, 46/50, 120 tests), then a   │
│ │ picture / figure │ │ figure           │   picture or drawn figure, name, one line, │
│ │ name · line      │ │ name · line      │   results, stack and the GitHub link       │
│ └──────────────────┘ └──────────────────┘                                            │
│ ┌ - - Want to see this as a map? - - - - - - - - - - - [Fly the survey 3D] ┐         │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ SHEET 03 · GAZETTEER   Kambaz, chatbot, calendar as small plates; 10 others as index │
│ SHEET 04 · ABOUT       short letter, education, skills, certifications               │
│ SHEET 05 · CONTACT     email large, LinkedIn, GitHub                                 │
│ footer: Compiled Oct 2026 · Datum WGS 84                                             │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

On phones everything is one column, and the legend sits under the buttons.

**Details in the sketch:**

- Every fifth contour line is darker, as on a real topographic map (an "index contour").
- Sheets sit on a faint 3 rem grid.
- Plates have two orange corner marks, like registration marks on a print.
- The invitation card uses a dashed border, so it reads as optional.

**To finish in the build:**

- The two plates without a picture (LLM Gateway, Excel Copilot) look empty in the sketch. Each
  gets a small drawn figure from its real numbers: a cache hit vs miss latency bar, and a "1
  preview, 1 confirm" flow.
- The aerial image gets a tighter crop, so its labels aren't cut off.
- The contours become one static SVG generated at build time, so no script runs for them.

## The invitation (Part 2)

- **Where it appears:** a secondary button in the hero and a dashed card after the plates. No
  popup.
- **When it's shown:** only if the device has WebGL2, the screen is at least 1024 px wide, the
  device reports 4 or more CPU cores, reduced motion is off and Save-Data is off. Otherwise
  both are hidden.
- **What it says:** "3D" on the button; "Interactive 3D, about a minute; needs a recent laptop
  or desktop" on the card.
- **In fun mode:** a fixed "Back to the plain site" button. The choice is remembered in
  `localStorage`, and the plain site is the default.

## What changes in the code

- **Removed:** the house, the kitten, the tour overlay, the kitten lines and scene text in
  `content.ts`, and the hero stills.
- **Kept:** `src/content.ts` stays the one source of content. It gains two things: one key figure
  per project, and each place's coordinates.
- **Engine lessons kept for Part 3:** the camera on a curve with holds at stops, zone culling,
  adaptive quality, and compiling shaders before the first frame. `three` and `postprocessing`
  stay installed but load only in fun mode, so the plain site ships no 3D code.

## Questions

1. **JC Biotech location:** which town or city? The sketch shows Amaravati as a placeholder (TBC).
   The real one is needed for the coordinates and the flight route.
2. **Chennai stop:** SRM's Kattankulathur campus (12.8231° N, 80.0442° E). Is that right?
