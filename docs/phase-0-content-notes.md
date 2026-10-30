# Phase 0: content notes

Where every fact in `src/content.ts` came from, and what still needs your answer.

## Sources read

- `~/projects/project-notes/*/01-overview.md` (12 projects)
- The README of every repo in `~/projects`: aerial-change-intelligence, llm-gateway, robot-arm-sim, excel-copilot, doc-intelligence-chatbot, facial-expression-recognition, robot-navigation-lab, pet-insurance-forecaster, adaptive-nutrition-coach, mbta-mcp-server, desktop-kitten, event-timeline-assistant, Lonza/bioreactor-batch-monitor, portfolio-analyzer, mlr-calculator
- GitHub READMEs for repos not cloned locally: kambaz-lms-web, kambaz-lms-api, mlops
- Resume: `~/projects/Burnes_Center/burnesresume.pdf` (the only resume on disk; it may be a version tailored for Burnes)

## Conflicts to settle

| Topic | Brief or repo says | Resume says | Used in content.ts |
|---|---|---|---|
| Graduation | May 2027 (brief) | Dec. 2027 (expected) | May 2027 |
| Kambaz LMS team | Team project of 3 (both repo READMEs) | "independently shipping it" | Team project |
| Kambaz auth | express-session cookies (API README) | JWT auth and RBAC | Not mentioned |
| Kambaz tests | Vitest reducer tests, node:test API tests | 12+ workflow Selenium E2E suite | Not mentioned |
| Kambaz live link | `eight-theta` is deployed from the teammate's Vercel account (bsreedee/kambaz-next-js; kambaz-lms-web is a fork of it). `navy-sigma` is the homepage of the individual repo kambaz-next-js and calls the individual API kambaz-node-server-app on Render. | n/a | navy-sigma, with the individual repos (updated 30 Oct) |
| Doc chatbot | Repo: PyMuPDF, Tesseract, bge-small, BM25, FAISS, Gemini | Textract, Flask, Docker, LoRA 7B to 13B | Repo version, as you asked |

## Missing

- **Calendar app:** no repo in `~/projects` and none on your GitHub. Is there a public link, or should it say "code not public"?
- **LinkedIn:** taken from the resume PDF's link (`linkedin.com/in/bhavishya-bondalapati`). LinkedIn blocks automated checks, so please confirm it opens.
- **Resume download:** the resume PDF contains your phone number. If you want a "Download resume" link, it needs a version without the phone number.
- **About section:** the first-person letter needs your voice. I'll draft it from facts only, for you to rewrite.

## Deliberately left out

- Phone number (your rule).
- Private repos: project-notes, python-journey, interview-practice.
- mlr-calculator: a private team repo under another account (`lequo-neu`) with a named partner organisation. Tell me if you want it listed without a link.
- Burnes_Center: application materials, not a project.

## Numbers used, and where each one is from

- JC Biotech: 6 agents, 70% less manual inspection, 60% faster stakeholder response (resume, brief).
- Mouri Tech: 40% less manual review, 30% better retrieval accuracy, 15% better extraction accuracy, under 3 s over 100K+ embeddings (resume).
- aerial-change-intelligence: F1 0.898, IoU 0.815, ECE 0.007, 128 test pairs, 3,005 ha, 14.6% of 22,459 ha, 40 verified / 0 mismatched (README).
- llm-gateway: 3,085 req/s at 19.8 ms p50, 1.6 ms vs 394 ms cache hit/miss, 100% success at 30% upstream failures, 4 bugs, 53 tests (README).
- robot-arm-sim: 46/50 (92%), 50/50, 200 demonstrations, 30 minutes on M4 Pro (README).
- excel-copilot: 120 tests across 11 files (README).
- doc-intelligence-chatbot: MRR@10 0.57 to 0.80, Hit@1 0.42 to 0.71, 60 questions (README).
- Calendar: 94% branch coverage (resume, brief).
- Other work: FER 82.5 to 82.9%, 59% and 78% KL reduction; 400 particles; WAPE 21.4% vs 26.6% (READMEs).
- Education: GPA 3.9 (brief, resume), 3.64 (resume).
