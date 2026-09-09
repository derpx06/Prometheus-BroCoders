"""The adaptive loop, now persistent and per-user.

Same engine as before — BKT for mastery, SM-2 for review, ZPD for selection — with the
student model moved out of a dict on the worker and into `study_states` / `concept_mastery`.
That one change is what makes "progress" mean anything: before it, closing the tab reset
everything the platform believed about the learner.

Still no model in the answer path. Selecting and grading stay local and instant.
"""
from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException

from .. import engine, grade as grading, store
from ..deps import current_user
from ..learner import Mastery, record, select_question
from ..store import User

router = APIRouter(prefix="/api/study", tags=["study"])


def _context(user: User, source_id: str) -> tuple[dict, str, dict[int, Mastery]]:
    source = store.get_source(user, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="No such source.")
    analysis = store.get_analysis(source_id)
    if not analysis:
        raise HTTPException(status_code=409, detail="That source has not been analysed yet.")

    state_id = store.get_or_create_study_state(user, source_id, len(analysis["concepts"]))
    rows = store.load_mastery(state_id)
    mastery = {
        i: Mastery(
            p_known=r["p_known"],
            attempts=r["attempts"],
            ease=r["ease"],
            interval=r["interval"],
            reps=r["reps"],
            due=r["due"],
            seen=set(r["seen"]),
        )
        for i, r in rows.items()
    }
    # A source analysed before a concept count change would leave gaps; fill rather than fail.
    for i in range(len(analysis["concepts"])):
        mastery.setdefault(i, Mastery())
    return analysis, state_id, mastery


@router.get("/{source_id}")
def state(source_id: str, user: User = Depends(current_user)) -> dict:
    analysis, state_id, mastery = _context(user, source_id)
    return {
        "sourceId": source_id,
        "concepts": [
            {
                "id": i,
                "name": c["name"],
                "evidence": c["evidence"],
                "mastery": round(mastery[i].p_known, 3),
                "attempts": mastery[i].attempts,
            }
            for i, c in enumerate(analysis["concepts"])
        ],
        "edges": analysis["edges"],
        "topics": engine.topic_layers(analysis),
        "questions": len(analysis["bank"]),
    }


@router.get("/{source_id}/next")
def next_question(source_id: str, user: User = Depends(current_user)) -> dict:
    analysis, state_id, mastery = _context(user, source_id)
    bank = engine.rehydrate_bank(analysis["bank"])
    day = store.study_day(state_id)

    q = select_question(analysis["concepts"], _edges(analysis), mastery, bank, today=day)
    if q is None:
        return {"done": True}

    # Deterministic shuffle: re-fetching the same question must not reorder the options.
    options = list(q.options)
    random.Random(q.id).shuffle(options)
    return {
        "done": False,
        "questionId": q.id,
        "kind": q.kind,
        "stem": q.stem,
        "options": options,
        "difficulty": round(q.difficulty, 3),
        "concept": {"id": q.concept, "name": analysis["concepts"][q.concept]["name"]},
    }


def _edges(analysis: dict) -> list[tuple[int, int, float]]:
    return [(e["source"], e["target"], e["weight"]) for e in analysis["edges"]]


@router.post("/{source_id}/answer")
def answer(source_id: str, payload: dict, user: User = Depends(current_user)) -> dict:
    question_id = payload.get("questionId")
    response = str(payload.get("response") or "")
    analysis, state_id, mastery = _context(user, source_id)
    bank = engine.rehydrate_bank(analysis["bank"])
    if not isinstance(question_id, int) or not 0 <= question_id < len(bank):
        raise HTTPException(status_code=404, detail="No such question.")

    q = bank[question_id]
    correct, score, ideal = grading.grade(q, response)
    m = mastery[q.concept]
    before = m.p_known
    record(m, q.id, correct, today=store.study_day(state_id))
    store.save_mastery(
        state_id,
        q.concept,
        {
            "p_known": m.p_known,
            "attempts": m.attempts,
            "ease": m.ease,
            "interval": m.interval,
            "reps": m.reps,
            "due": m.due,
            "seen": m.seen,
        },
    )

    concept_name = analysis["concepts"][q.concept]["name"]
    return {
        "correct": correct,
        "score": round(score, 3),
        "idealAnswer": ideal,
        "explanation": engine._explanation(analysis, analysis["bank"][question_id]),
        "concept": {"id": q.concept, "name": concept_name},
        "masteryBefore": round(before, 3),
        "masteryAfter": round(m.p_known, 3),
    }
