"""Grading. Embeddings only -- no LLM in the answer loop, so this is instant."""
from __future__ import annotations

from .embed import embed

FREE_RESPONSE_THRESHOLD = 0.55


def grade_mcq(question, chosen: str) -> tuple[bool, float, str]:
    correct = chosen.strip().lower() == question.answer.strip().lower()
    return correct, 1.0 if correct else 0.0, question.answer


def grade_free(question, response: str) -> tuple[bool, float, str]:
    """Cosine similarity against the source sentences the question was drawn from."""
    if not response.strip():
        return False, 0.0, question.answer
    vecs = embed([response, question.answer])
    score = float(vecs[0] @ vecs[1])
    return score >= FREE_RESPONSE_THRESHOLD, score, question.answer


def grade(question, response: str) -> tuple[bool, float, str]:
    return (grade_mcq if question.kind == "mcq" else grade_free)(question, response)
