# Lattice

An AI learning workspace built around material, not forms.

Bring a PDF, a lecture video, or your own notes. Lattice reads it, extracts the concepts,
infers which ones are prerequisites of which, and writes a question bank grounded in your
own text. From that one source a **teacher** builds quizzes, exams, assignments, notes and
lesson plans for a class — while **students** practise against the same material and the
platform tracks, concept by concept, what each of them actually knows.

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

## Two sides, one engine

| | Teacher | Student |
|---|---|---|
| Bring material | upload · paste · YouTube link | upload · paste · YouTube link |
| Generate | quiz · test paper · assignment · notes · flashcards · summary · lesson plan | quiz · notes · flashcards · summary |
| Then | edit it, bank the questions, assign it to a class | practise it, or complete what was assigned |
| Measure | class accuracy, weak concepts, most-missed questions | own accuracy, concepts held, session history |

Every number on an analytics screen is an aggregate over answers somebody actually gave.
Where there is no data, the screen says so rather than drawing an empty chart.

A source is an asset, not an upload event: read once, generated from many times.

## Run it

```bash
uv sync
uv run pytest -q                                          # 52 tests
uv run python scripts/demo.py data/linear_algebra.txt     # the whole loop, headless
uv run python scripts/demo.py data/linear_algebra.txt --play   # answer it yourself
uv run uvicorn backend.main:app --reload                  # the API
```

Without `uv`, a plain virtualenv works:

```bash
python3 -m venv .venv && .venv/bin/pip install fastapi httpx model2vec numpy pypdf python-multipart scikit-learn "uvicorn[standard]" pytest
```

Copy `.env.example` to `.env` and set `MONGODB_URI`, `SESSION_SECRET`, and the Groq values
before deploying. The server loads this file on startup. `LATTICE_ORIGINS` allow-lists browser
origins (credentials travel on a cookie, so a wildcard is not an option).

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

Two surfaces. The platform is authenticated, persistent and scoped by school and class; the
original engine routes stay open and anonymous so the landing-page demo works with no account.

| Route | Does |
|---|---|
| `POST /api/auth/signup` · `login` · `logout` · `me` | accounts — student, teacher, or a school and its first admin |
| `POST /api/auth/invitations` · `…/accept` | single-use invitation links; the invitee sets their own password |
| `POST /api/sources/{file,text,youtube}` | anything in → a reusable source, analysed once |
| `GET /api/sources` · `/api/sources/{id}` | the material you can generate from |
| `POST /api/materials/generate` | source + kind → quiz, test, notes, assignment, flashcards, summary, lesson plan |
| `GET|PATCH /api/materials/{id}` | read or edit one; the answer key is stripped for students |
| `GET|POST /api/question-bank` | reusable questions, promoted from a source or written by hand |
| `POST /api/classes` · `/api/classes/join` | classes, and the six-character code students join with |
| `POST /api/classes/{id}/assignments` | assign a material to a class |
| `POST /api/attempts` · `…/answer` · `…/submit` | take assigned work; every answer is a row |
| `GET /api/study/{sourceId}/next` · `answer` | the adaptive loop, per user, surviving a restart |
| `GET /api/analytics/me` · `/api/analytics/class/{id}` | computed from those rows, never mocked |

Still anonymous and unchanged: `POST /api/extract`, `POST /api/sessions`,
`GET /api/sessions/{id}`, `…/next`, `POST …/answer`.

## Layout

```
backend/embed.py      one embed() interface (model2vec today, no torch)
backend/ingest.py     text → concepts → prerequisite DAG
backend/generate.py   MCQ / free-response / reasoning question tiers
backend/grade.py      exact match + embedding similarity
backend/learner.py    BKT, SM-2, and question selection
backend/main.py       FastAPI app, plus the original anonymous engine routes
backend/db.py         MongoDB connection and collection indexes
backend/store.py      Mongo repositories; scope comes from the session, never the request
backend/security.py   scrypt passwords, HMAC session tokens, hashed invitations
backend/sources.py    file / text / YouTube caption track -> plain text
backend/engine.py     analysis cache, and every material builder
backend/api/          auth · content · classroom · study · analytics

frontend/src/styles.css               design tokens: colour, type, radius, shadow, motion
frontend/src/lib/motion.ts            durations, easings, springs, shared variants
frontend/src/lib/pack.ts              learning path, mastery bands, what-to-do-next
frontend/src/lib/tutor.ts             retrieval over the concept index
frontend/src/store/                   app state, and the upload → ingest flow
frontend/src/components/ui/           design-system primitives
frontend/src/components/landing/      the hero demo and the scroll story
frontend/src/components/app/          shell, upload, knowledge graph, notes, tutor
frontend/src/store/auth.tsx           who is signed in, and what they may do
frontend/src/pages/                   one file per screen
```

`docs/MERGE_PLAN.md` has the full architecture: the audit, the data model, the route map,
and what is deliberately not built yet.
