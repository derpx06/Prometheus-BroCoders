"""Lattice HTTP API.

Thin layer over the engine: ingest builds a course, then the loop is next-question /
answer. No LLM runs in the answer path, so those two routes are fast.
"""
from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .generate import Question, generate_bank, ollama
from .grade import grade
from .ingest import Concept, build_dag, extract_concepts
from .learner import Mastery, record, select_question

app = FastAPI(title="Lattice", version="0.1.0")


@dataclass
class Session:
    id: str
    concepts: list[Concept]
    edges: list[tuple[int, int, float]]
    bank: list[Question]
    mastery: dict[int, Mastery] = field(default_factory=dict)
    day: int = 0


# ponytail: process memory, so sessions die with the worker. Supabase lands with the UI;
# every read goes through _session() so there is one place to swap.
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


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "sessions": len(SESSIONS)}


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
