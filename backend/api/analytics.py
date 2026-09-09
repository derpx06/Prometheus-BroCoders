"""Analytics, computed from recorded answers only.

Savitrix shipped analytics screens backed by static mock data. Nothing here is mocked —
every figure is an aggregate over `answers` and `concept_mastery` rows written by a real
attempt. The trade is that these endpoints return empty results for a class that has not
submitted anything yet, and they say so explicitly via `hasData` so the UI can render an
honest empty state instead of a zeroed chart that reads like a finding.
"""
from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException

from .. import store
from ..deps import current_user, teacher
from ..store import User

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Below this many attempts at a concept, an accuracy figure is noise rather than a signal,
# so it is reported but flagged rather than ranked.
MIN_OBSERVATIONS = 3


def _accuracy(rows: list[dict]) -> float | None:
    return (sum(1 for r in rows if r["correct"]) / len(rows)) if rows else None


def _by(rows: list[dict], key: str) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        value = r.get(key)
        if value:
            out[str(value)].append(r)
    return out


@router.get("/me")
def my_progress(user: User = Depends(current_user)) -> dict:
    """A student's own picture: accuracy, concept strengths and gaps, and quiz history."""
    answers = store.answers_for_user(user)
    attempts = store.attempts_for_user(user)
    sources = store.list_sources(user)
    mastery = store.mastery_by_source(user, [s["id"] for s in sources])

    by_concept = _by(answers, "concept")
    concepts = sorted(
        (
            {
                "concept": name,
                "attempts": len(rows),
                "accuracy": round(_accuracy(rows) or 0, 3),
                "reliable": len(rows) >= MIN_OBSERVATIONS,
            }
            for name, rows in by_concept.items()
        ),
        key=lambda c: (c["accuracy"], -c["attempts"]),
    )

    return {
        "hasData": bool(answers),
        "answered": len(answers),
        "accuracy": round(_accuracy(answers), 3) if answers else None,
        "attempts": len(attempts),
        "weakest": [c for c in concepts if c["reliable"]][:5],
        "strongest": [c for c in reversed(concepts) if c["reliable"]][:5],
        "concepts": concepts,
        "sources": [
            {
                "id": s["id"],
                "title": s["title"],
                "kind": s["kind"],
                # Mean mastery over *tested* concepts only. An untouched source reports
                # nothing rather than the engine's 0.2 prior, which is a belief not a result.
                "mastery": (
                    round(sum(mastery[s["id"]]) / len(mastery[s["id"]]), 3)
                    if mastery.get(s["id"])
                    else None
                ),
                "testedConcepts": len(mastery.get(s["id"], [])),
            }
            for s in sources
        ],
        "history": [
            {
                "id": a["id"],
                "title": a.get("material_title") or a.get("source_title") or "Practice",
                "kind": a["kind"],
                "score": a["score"],
                "maxScore": a["max_score"],
                "submittedAt": a["submitted_at"],
            }
            for a in attempts
        ],
    }


@router.get("/class/{class_id}")
def class_analytics(class_id: str, user: User = Depends(teacher)) -> dict:
    """A teacher's picture of one class, aggregated across its assignments."""
    if not store.teaches(user, class_id):
        raise HTTPException(status_code=403, detail="That is not your class.")

    members = [m for m in store.class_members(class_id) if m["role"] == "student"]
    assignments = store.assignments_for_class(class_id)
    roster = len(members)

    out_assignments = []
    all_answers: list[dict] = []
    for a in assignments:
        attempts = store.attempts_for_assignment(a["id"])
        answers = store.answers_for_assignment(a["id"])
        all_answers += answers
        scored = [t for t in attempts if t["score"] is not None and t["max_score"]]
        out_assignments.append(
            {
                "id": a["id"],
                "title": a["title"],
                "kind": a.get("material_kind"),
                "dueAt": a.get("due_at"),
                "submissions": len(attempts),
                "roster": roster,
                "completion": round(len(attempts) / roster, 3) if roster else None,
                "averageScore": (
                    round(sum(t["score"] / t["max_score"] for t in scored) / len(scored), 3)
                    if scored
                    else None
                ),
                "accuracy": round(_accuracy(answers), 3) if answers else None,
            }
        )

    by_concept = _by(all_answers, "concept")
    concept_rows = sorted(
        (
            {
                "concept": name,
                "attempts": len(rows),
                "accuracy": round(_accuracy(rows) or 0, 3),
                "reliable": len(rows) >= MIN_OBSERVATIONS,
            }
            for name, rows in by_concept.items()
        ),
        key=lambda c: (c["accuracy"], -c["attempts"]),
    )

    by_question = _by(all_answers, "prompt")
    missed = sorted(
        (
            {
                "prompt": prompt,
                "attempts": len(rows),
                "accuracy": round(_accuracy(rows) or 0, 3),
            }
            for prompt, rows in by_question.items()
            if len(rows) >= 2
        ),
        key=lambda q: q["accuracy"],
    )[:8]

    # Per-student, so a teacher can see who is stuck rather than only the class mean.
    submitted_by: dict[str, list[dict]] = defaultdict(list)
    for a in assignments:
        for t in store.attempts_for_assignment(a["id"]):
            submitted_by[t["user_id"]].append(t)

    return {
        "hasData": bool(all_answers),
        "roster": roster,
        "assignments": out_assignments,
        "weakConcepts": [c for c in concept_rows if c["reliable"]][:8],
        "strongConcepts": [c for c in reversed(concept_rows) if c["reliable"]][:8],
        "mostMissed": missed,
        "students": sorted(
            (
                {
                    "id": m["id"],
                    "name": m["name"],
                    "completed": len(submitted_by.get(m["id"], [])),
                    "assigned": len(assignments),
                    "averageScore": (
                        round(
                            sum(
                                t["score"] / t["max_score"]
                                for t in submitted_by.get(m["id"], [])
                                if t["score"] is not None and t["max_score"]
                            )
                            / max(
                                1,
                                len(
                                    [
                                        t
                                        for t in submitted_by.get(m["id"], [])
                                        if t["score"] is not None and t["max_score"]
                                    ]
                                ),
                            ),
                            3,
                        )
                        if submitted_by.get(m["id"])
                        else None
                    ),
                }
                for m in members
            ),
            key=lambda s: s["name"].lower(),
        ),
    }
