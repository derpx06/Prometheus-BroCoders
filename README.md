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

## API

| Route | Does |
|---|---|
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
```
