# Decisions

Judgment calls made while resuming work, newest at the bottom. How the site works is in NOTES.md.

1. **Committed the Hang entry left uncommitted by the Hang session (2026-11-10).** The edit to
   `src/content.ts` and `src/components/Sections.tsx` was complete (an optional `live` link per listed
   project, and a Hang row). Typecheck, the 20 content tests and the static build passed, and
   https://hang-dusky.vercel.app returned 200, so it was committed as is rather than reverted.
2. **Added T-Minus and Stratum to the project list.** Both are finished and public on GitHub. Every
   figure comes from the projects' own READMEs and benchmark files: T-Minus is live at
   https://t-minus-drab.vercel.app; Stratum's "100 SIGKILLs" is its crash test and "120K writes/s at
   1M keys" is 119,638 in its BENCHMARKS.md. They go in "other work", not as featured plates, so the
   sketchbook and its figure tests are unchanged.
