"""Lattice HTTP API.

Two surfaces, on purpose:

* **The platform** — `/api/auth`, `/api/sources`, `/api/materials`, `/api/classes`,
  `/api/assignments`, `/api/attempts`, `/api/study`, `/api/analytics`. Authenticated,
  persistent, school- and class-scoped.
* **The original engine routes** — `/api/extract` and `/api/sessions*`. Unchanged in shape
  and still open to anonymous visitors, so the demo path on the landing page keeps working
  and nothing that already calls them breaks during the migration.

Engine discipline is unchanged: the slow call is ingest, and no model runs in the answer
loop, so answering is instant.
"""
from __future__ import annotations

import contextlib
import logging
import os
import random
import uuid
from dataclasses import dataclass, field

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db, security, sources as ingest
from .api import analytics, auth, classroom, content, study, chat
from .generate import Question, generate_bank, ollama
from .grade import grade
from .ingest import Concept, build_dag, extract_concepts
from .learner import Mastery, record, select_question

log = logging.getLogger("lattice")

@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    db.init()
    if security.is_dev_secret():
        log.warning(
            "LATTICE_SECRET is not set — signing sessions with the built-in development key. "
            "Set it before deploying or every cookie this process issues is forgeable."
        )
    yield


app = FastAPI(title="Lattice", version="0.2.0", lifespan=lifespan)


# Credentials now travel on a cookie, so "*" is no longer an acceptable origin: a wildcard
# with credentials lets any site drive the API as the signed-in user. The dev client origins
# are allow-listed, and deployment adds its own through LATTICE_ORIGINS.
_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "LATTICE_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, content, classroom, study, analytics, chat):
    app.include_router(module.router)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "sessions": len(SESSIONS), "persistent": True}


# --------------------------------------------------------------------------- #
#  Legacy engine surface                                                      #
#                                                                             #
#  Anonymous, in-process, ephemeral — which is exactly what the landing-page   #
#  demo wants and what the 20 existing tests assert. Signed-in users go        #
#  through /api/sources and /api/study instead, where the student model is     #
#  persisted per person.                                                      #
# --------------------------------------------------------------------------- #


@dataclass
class Session:
    id: str
    concepts: list[Concept]
    edges: list[tuple[int, int, float]]
    bank: list[Question]
    mastery: dict[int, Mastery] = field(default_factory=dict)
    day: int = 0


SESSIONS: dict[str, Session] = {}


def _session(session_id: str) -> Session:
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="no such session")
    return SESSIONS[session_id]


class IngestRequest(BaseModel):
    text: str = Field(min_length=200)
    concepts: int = Field(default=20, ge=4, le=60)
    use_llm: bool = False


class AnswerRequest(BaseModel):
    question_id: int
    response: str = ""


def _concept_view(s: Session) -> list[dict]:
    return [
        {
            "id": i,
            "name": c.name,
            "mastery": round(s.mastery[i].p_known, 3),
            "attempts": s.mastery[i].attempts,
            "evidence": c.evidence,
        }
        for i, c in enumerate(s.concepts)
    ]


def _state(s: Session) -> dict:
    return {
        "session_id": s.id,
        "concepts": _concept_view(s),
        "edges": [{"source": a, "target": b, "weight": round(w, 3)} for a, b, w in s.edges],
        "questions": len(s.bank),
    }


@app.post("/api/extract")
async def extract(file: UploadFile = File(...)) -> dict:
    """Uploaded file -> plain text, so the client can hand it straight to /api/sessions."""
    raw = await file.read()
    try:
        text = ingest.extract_file(raw, file.filename or "material")
    except ingest.IngestError as e:
        raise HTTPException(status_code=e.status, detail=str(e))
    return {"text": text, "chars": len(text), "filename": file.filename or "material"}


@app.post("/api/sessions")
def create_session(req: IngestRequest) -> dict:
    """Build a course from raw material. This is the slow call -- it is the only one that
    may touch an LLM."""
    concepts = extract_concepts(req.text, k=req.concepts)
    if len(concepts) < 4:
        raise HTTPException(
            status_code=422,
            detail="not enough distinct concepts found; try longer or denser material",
        )
    bank = generate_bank(concepts, llm=ollama if req.use_llm else None)
    if not bank:
        raise HTTPException(status_code=422, detail="could not generate questions")

    s = Session(
        id=uuid.uuid4().hex[:12],
        concepts=concepts,
        edges=build_dag(concepts),
        bank=bank,
        mastery={i: Mastery() for i in range(len(concepts))},
    )
    SESSIONS[s.id] = s
    return _state(s)


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    return _state(_session(session_id))


@app.get("/api/sessions/{session_id}/next")
def next_question(session_id: str) -> dict:
    s = _session(session_id)
    q = select_question(s.concepts, s.edges, s.mastery, s.bank, today=s.day)
    if q is None:
        return {"done": True}
    # Deterministic shuffle: re-fetching the same question must not reorder the options.
    options = list(q.options)
    random.Random(q.id).shuffle(options)
    return {
        "done": False,
        "question_id": q.id,
        "kind": q.kind,
        "stem": q.stem,
        "options": options,
        "difficulty": round(q.difficulty, 3),
        "concept": {"id": q.concept, "name": s.concepts[q.concept].name},
    }


@app.post("/api/sessions/{session_id}/answer")
def answer(session_id: str, req: AnswerRequest) -> dict:
    s = _session(session_id)
    if not 0 <= req.question_id < len(s.bank):
        raise HTTPException(status_code=404, detail="no such question")
    q = s.bank[req.question_id]

    correct, score, ideal = grade(q, req.response)
    before = s.mastery[q.concept].p_known
    record(s.mastery[q.concept], q.id, correct, today=s.day)

    return {
        "correct": correct,
        "score": round(score, 3),
        "ideal_answer": ideal,
        "concept": {"id": q.concept, "name": s.concepts[q.concept].name},
        "mastery_before": round(before, 3),
        "mastery_after": round(s.mastery[q.concept].p_known, 3),
    }
