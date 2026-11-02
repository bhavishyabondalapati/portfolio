# Project list update (proposal, nothing on the site changed yet)

From `gh repo list bhavishyabondalapati --limit 100` on 2026-11-01. Private repos are left out
(lexintake, python-journey, project-notes, interview-practice, bioreactor-batch-monitor).

## Public repos not on the site yet

| Repo | Proposed place | One line |
|---|---|---|
| RepoRAG | **Featured** | Ask questions about any GitHub repo and get answers cited to file and line; hybrid BM25 + dense retrieval, RRF, cross-encoder reranking, and an eval harness with a held-out set. |
| racket-imu-motion-inference | **Gazetteer** (earlier work, small plate) | Stroke type from one racket IMU, scored on unseen players: 0.798 macro-F1. The honest finding is that the models read racket angle, not the swing. |
| kambaz-lms-web + kambaz-lms-api | **Coursework, as extra links on the Kambaz plate** (not a new entry) | The team final for CS 5610, which adds timed, auto-graded quizzes on top of your individual build. Proposed links: "Team final: frontend" and "Team final: API". |

## Also found

- **bioreactor-batch-monitor is now private but still linked** in the gazetteer table, so that
  link would 404. Either make the repo public again or remove the row. I'd remove it until it's
  public, the same rule as LexIntake.

## RepoRAG: where it goes

You suggested second, after Aerial. **I'd put it third, after the LLM Gateway, for now.**

- **The LLM Gateway leads with a hard, measured number** (3,085 req/s at 19.8 ms p50).
- **RepoRAG's measured numbers are retrieval only, and mixed.**
  - Hybrid search lifts Recall@5 from 0.82 to 0.96 on itsdangerous, but only reaches 0.21 to 0.44 on ky.
  - On the held-out set, Recall@5 is 0.722.
  - The README marks faithfulness, answer rate and abstention as TODO, so the answer-quality side
    is unmeasured, and there is no demo GIF yet.
- **It earns second place once the faithfulness and abstention run is in.** That is the number an
  interviewer for an LLM role will ask about.
- **Its strongest story already works on a plate:** an off-the-shelf reranker made code search
  worse (MRR 0.446 to 0.385), and the evals caught it.

Proposed plate (results first; every number is from the README):

- **Field:** Retrieval-augmented generation
- **Key figure:** 0.96, "Recall@5 with hybrid search on itsdangerous, up from 0.82 with keyword
  search alone"
- **More results:**
  - Held-out set written before any tuning: Recall@5 0.722, MRR@10 0.667 (hybrid).
  - The off-the-shelf reranker lowered MRR from 0.446 to 0.385 on code, a domain-mismatch finding.
  - It refuses with "not enough information in this repo" when retrieval is weak, through three guards.
  - 73 offline tests in about 1 second; CI on every push.
- **Chart:** bars of Recall@5 by retrieval mode on the held-out set (BM25 0.722, dense 0.667,
  hybrid 0.722, hybrid + rerank 0.667), or the itsdangerous vs ky split.
- **Problem and what I built:** answers about a codebase are only useful if you can check them.
  - Tree-sitter chunks code at function and class boundaries.
  - BM25 and bge-small/FAISS run in parallel and merge with RRF, then a cross-encoder reranks.
  - Gemini must cite numbered excerpts.
  - FastAPI backend, Next.js UI, Docker Compose.
- **Stack:** Python, FastAPI, tree-sitter, FAISS, sentence-transformers, Gemini, Next.js, Docker

Proposed featured order: 1 Aerial Change Intelligence, 2 LLM Gateway, 3 RepoRAG,
4 Robot Arm Simulation, 5 Excel Copilot.

## Undergraduate coursework (new group under Coursework)

The brief's details for the ROS/SLAM project came through as the unfilled template
("[what robot or simulator, which SLAM method, sensors, what you built, any result]"). Nothing
about it is added until you send those details, since the rule is to use only what you write.
Once you do, it goes first in a new "Undergraduate coursework" group, and in fun mode it becomes
the Chennai stop's project.
