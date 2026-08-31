"""The learner model: what the student knows, and what to ask next.

Bayesian Knowledge Tracing gives a per-concept probability of mastery. SM-2 schedules
review. Selection targets the zone of proximal development: the weakest concept whose
prerequisites are already met, at a difficulty just above current mastery.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# Standard 4-parameter BKT. p_guess=0.25 is the principled value for 4-option MCQ.
P_INIT, P_TRANSIT, P_SLIP, P_GUESS = 0.2, 0.15, 0.1, 0.25

PREREQ_FLOOR = 0.5  # a prerequisite must reach this before we teach what depends on it
TARGET_GAP = 0.15  # serve questions this far above current mastery
MASTERED = 0.95
SESSION_ATTEMPT_CAP = 4  # stop drilling a concept that is not moving, and come back later


@dataclass
class Mastery:
    p_known: float = P_INIT
    attempts: int = 0
    ease: float = 2.5
    interval: int = 0
    reps: int = 0
    due: int = 0  # day ordinal; 0 = never scheduled
    seen: set[int] = field(default_factory=set)


def bkt_update(p_known: float, correct: bool) -> float:
    """Posterior probability the student knows the skill, then the learning transition."""
    if correct:
        num = p_known * (1 - P_SLIP)
        den = num + (1 - p_known) * P_GUESS
    else:
        num = p_known * P_SLIP
        den = num + (1 - p_known) * (1 - P_GUESS)
    posterior = num / den if den > 0 else p_known
    return posterior + (1 - posterior) * P_TRANSIT


def sm2_update(m: Mastery, correct: bool, today: int) -> None:
    """SM-2 scheduling, in place.

    ponytail: real SM-2 takes a 0-5 recall quality; we only collect right/wrong, so this is
    the binary reduction. Upgrade path is grading free-response confidence into a quality score.
    """
    if not correct:
        m.ease, m.interval, m.reps = max(1.3, m.ease - 0.2), 1, 0
    else:
        m.reps += 1
        m.interval = 1 if m.reps == 1 else 6 if m.reps == 2 else round(m.interval * m.ease)
        m.ease = min(2.8, m.ease + 0.1)
    m.due = today + m.interval


def record(m: Mastery, question_id: int, correct: bool, today: int) -> Mastery:
    m.p_known = bkt_update(m.p_known, correct)
    m.attempts += 1
    m.seen.add(question_id)
    sm2_update(m, correct, today)
    return m


def prereqs_met(concept: int, edges, mastery: dict[int, Mastery]) -> bool:
    return all(
        mastery[a].p_known >= PREREQ_FLOOR
        for a, b, _ in edges
        if b == concept and a in mastery
    )


def select_question(concepts, edges, mastery, questions, today: int):
    """Pick the next question, or None when every concept is mastered.

    Order of preference: an overdue review, then the weakest unlocked concept.
    """
    due = [i for i, _ in enumerate(concepts) if 0 < mastery[i].due <= today]
    unlocked = [
        i
        for i, _ in enumerate(concepts)
        if mastery[i].p_known < MASTERED and prereqs_met(i, edges, mastery)
    ]
    # Without the attempt cap the weakest concept absorbs every turn: if the student truly
    # does not know it, it never improves, so it stays the minimum forever and no other
    # concept is ever taught. Cap the drilling, move on, let SM-2 bring it back.
    active = [i for i in unlocked if mastery[i].attempts < SESSION_ATTEMPT_CAP]
    pool = due or active or unlocked
    if not pool:
        return None

    concept = min(pool, key=lambda i: mastery[i].p_known)
    target = mastery[concept].p_known + TARGET_GAP
    options = [q for q in questions if q.concept == concept]
    if not options:
        return None
    fresh = [q for q in options if q.id not in mastery[concept].seen]
    return min(fresh or options, key=lambda q: abs(q.difficulty - target))
