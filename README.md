# Lattice

Adaptive learning that shows its structure.

Feed Lattice your course material and it extracts the concepts, infers which ones are
prerequisites of which, writes a question bank grounded in your own text, and then tracks
what you actually know — serving the next question at the edge of your competence.

Built for the SPEED September AI Challenge.

## Why it isn't another quiz app

Most AI tutors are a language model with a prompt that says "be adaptive". Lattice runs a
real student model:

- **Concept extraction** — embeddings + MMR pull out the concepts and keep them distinct
- **Prerequisite graph** — a DAG induced from first-mention order and embedding similarity
- **Plausible distractors** — wrong MCQ options are the *nearest other concepts* in embedding
  space, so they are genuinely tempting rather than random
- **Bayesian Knowledge Tracing** — a per-concept probability that you know it, updated on
  every answer
- **ZPD selection** — the weakest concept whose prerequisites you have already met, at a
  difficulty just above your current mastery, with SM-2 scheduling review

The LLM runs **only at ingest**, never in the answer loop, so answering is instant.

## Run it

```bash
uv sync
uv run pytest -q                                          # 20 tests
uv run python scripts/demo.py data/linear_algebra.txt     # the whole loop, headless
uv run python scripts/demo.py data/linear_algebra.txt --play   # answer it yourself
uv run uvicorn backend.main:app --reload                  # the API
```

Add `--llm` to generate the reasoning-question tier with a local Ollama model
(`qwen3:4b-instruct`). Everything else runs with no API key and no network.

And the web client, in a second terminal:

```bash
npm install --prefix frontend
npm run dev --prefix frontend                             # http://localhost:5173
```

The client proxies `/api` to `http://127.0.0.1:8000`, so with both running an upload goes
through the real engine — extraction, concepts, prerequisite graph, and the adaptive
question loop. Without the engine it starts in demo mode against bundled study packs, so
the UI is never a dead end; the badge in the top bar says which mode you are in.

The demo path: land → **Start learning** → drop a file anywhere on the page → watch the
engine read it → land on a learning path with a knowledge graph, an opinion about your
weakest area, and notes, flashcards and a quiz built from the document.

## API

| Route | Does |
|---|---|
| `POST /api/extract` | uploaded PDF / DOCX / text file → plain text |
| `POST /api/sessions` | material in → concepts, prerequisite edges, question bank |
| `GET /api/sessions/{id}` | current mastery over every concept |
| `GET /api/sessions/{id}/next` | the next question to ask |
| `POST /api/sessions/{id}/answer` | grade it and update the student model |

## Layout

```
backend/embed.py      one embed() interface (model2vec today, no torch)
backend/ingest.py     text → concepts → prerequisite DAG
backend/generate.py   MCQ / free-response / reasoning question tiers
backend/grade.py      exact match + embedding similarity
backend/learner.py    BKT, SM-2, and question selection
backend/main.py       FastAPI routes

frontend/src/styles.css               design tokens: colour, type, radius, shadow, motion
frontend/src/lib/motion.ts            durations, easings, springs, shared variants
frontend/src/lib/pack.ts              learning path, mastery bands, what-to-do-next
frontend/src/lib/tutor.ts             retrieval over the concept index
frontend/src/store/                   app state, and the upload → ingest flow
frontend/src/components/ui/           design-system primitives
frontend/src/components/landing/      the hero demo and the scroll story
frontend/src/components/app/          shell, upload, knowledge graph, notes, tutor
frontend/src/pages/                   one file per screen
```
