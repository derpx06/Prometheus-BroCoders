"""One runnable check on the parts that would silently rot: the learner model, the
prerequisite gating, and the question bank's grounding.
"""
from __future__ import annotations

import pathlib
import random
import sys

import numpy as np
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from backend.generate import generate_bank  # noqa: E402
from backend.ingest import Concept, build_dag, extract_concepts  # noqa: E402
from backend.learner import (  # noqa: E402
    MASTERED,
    P_INIT,
    PREREQ_FLOOR,
    SESSION_ATTEMPT_CAP,
    Mastery,
    bkt_update,
    prereqs_met,
    record,
    select_question,
)

DOC = pathlib.Path(__file__).resolve().parent.parent / "data" / "linear_algebra.txt"


@pytest.fixture(scope="module")
def course():
    concepts = extract_concepts(DOC.read_text(), k=20)
    return concepts, build_dag(concepts), generate_bank(concepts)


# --- the student model ------------------------------------------------------------

def test_bkt_moves_the_right_way():
    assert bkt_update(P_INIT, True) > P_INIT
    assert bkt_update(P_INIT, False) < P_INIT


def test_bkt_converges_on_a_student_who_knows_it():
    p = P_INIT
    for _ in range(6):
        p = bkt_update(p, True)
    assert p > 0.95
    assert p <= 1.0


def test_bkt_stays_a_probability():
    p = P_INIT
    for correct in [True, False, True, True, False, False, True] * 5:
        p = bkt_update(p, correct)
        assert 0.0 <= p <= 1.0


# --- prerequisite gating ----------------------------------------------------------

def test_locked_concept_is_never_served():
    concepts = [Concept(n, np.zeros(4), [f"{n} sentence here ok"], i, 0.5)
                for i, n in enumerate("abcd")]
    edges = [(0, 1, 0.9)]  # a is a prerequisite of b
    mastery = {i: Mastery() for i in range(4)}
    assert not prereqs_met(1, edges, mastery)

    mastery[0].p_known = PREREQ_FLOOR + 0.01
    assert prereqs_met(1, edges, mastery)


def test_selection_respects_prerequisites(course):
    concepts, edges, bank = course
    mastery = {i: Mastery() for i in range(len(concepts))}
    gated = {b for _, b, _ in edges}
    for _ in range(15):
        q = select_question(concepts, edges, mastery, bank, today=0)
        if q is None:
            break
        if q.concept in gated:
            assert prereqs_met(q.concept, edges, mastery), (
                f"served {concepts[q.concept].name} with unmet prerequisites"
            )
        record(mastery[q.concept], q.id, True, today=0)


def test_attempt_cap_prevents_one_concept_starving_the_rest(course):
    """A student who gets everything wrong must still see the whole course."""
    concepts, edges, bank = course
    mastery = {i: Mastery() for i in range(len(concepts))}
    for _ in range(len(concepts) * SESSION_ATTEMPT_CAP):
        q = select_question(concepts, edges, mastery, bank, today=0)
        if q is None:
            break
        record(mastery[q.concept], q.id, False, today=0)
    reached = sum(1 for m in mastery.values() if m.attempts)
    assert reached > len(concepts) // 2, f"only {reached}/{len(concepts)} concepts reached"


def test_mastered_concepts_stop_being_served(course):
    concepts, edges, bank = course
    mastery = {i: Mastery() for i in range(len(concepts))}
    for i in mastery:
        mastery[i].p_known = MASTERED + 0.01
    assert select_question(concepts, edges, mastery, bank, today=0) is None


# --- the course itself ------------------------------------------------------------

def test_prerequisite_graph_is_acyclic(course):
    concepts, edges, _ = course
    adjacency = {i: [b for a, b, _ in edges if a == i] for i in range(len(concepts))}
    visiting, done = set(), set()

    def walk(node):
        assert node not in visiting, "cycle in the prerequisite graph"
        if node in done:
            return
        visiting.add(node)
        for nxt in adjacency[node]:
            walk(nxt)
        visiting.discard(node)
        done.add(node)

    for node in adjacency:
        walk(node)


def test_concepts_are_grounded_in_the_source(course):
    """Every concept must appear verbatim in a sentence it cites -- this is the guard that
    caught stopword-stripped n-grams matching nothing in the text."""
    concepts, _, _ = course
    assert len(concepts) >= 10
    for c in concepts:
        assert c.evidence
        assert any(c.name in s.lower() for s in c.evidence), c.name


def test_distractors_are_never_the_answer(course):
    _, _, bank = course
    mcqs = [q for q in bank if q.kind == "mcq"]
    assert mcqs
    for q in mcqs:
        assert q.answer in q.options
        assert len(set(q.options)) == len(q.options), f"duplicate option in {q.options}"
        assert q.options.count(q.answer) == 1


def test_difficulty_spans_the_selection_range(course):
    _, _, bank = course
    difficulties = [q.difficulty for q in bank]
    assert min(difficulties) == pytest.approx(0.0)
    assert max(difficulties) == pytest.approx(1.0)


def test_mcq_stem_hides_the_answer(course):
    _, _, bank = course
    for q in (q for q in bank if q.kind == "mcq"):
        assert q.answer not in q.stem.lower(), f"answer leaked into stem: {q.stem}"
