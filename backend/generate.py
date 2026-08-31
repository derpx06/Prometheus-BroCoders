"""Concepts -> question bank.

Three tiers. MCQ and free-response need no LLM at all: the stem is carved out of a source
sentence and the distractors are the nearest *other* concepts in embedding space, which is
what makes them plausible instead of random. Reasoning questions are the one tier an LLM
writes, and only at ingest -- never in the answer loop.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Callable

import numpy as np

KIND_WEIGHT = {"mcq": 0.8, "free": 1.0, "reasoning": 1.2}
N_DISTRACTORS = 3


@dataclass
class Question:
    id: int
    concept: int
    kind: str
    stem: str
    answer: str
    difficulty: float = 0.0
    options: list[str] = field(default_factory=list)


def ollama(prompt: str, model: str = "qwen3:4b-instruct", host: str = "http://localhost:11434") -> str:
    import httpx

    r = httpx.post(
        f"{host}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False, "format": "json"},
        timeout=300,
    )
    r.raise_for_status()
    return r.json()["response"]


def _cloze(sentence: str, term: str) -> str:
    return re.sub(re.escape(term), "_____", sentence, flags=re.IGNORECASE)


def _distractors(i: int, concepts) -> tuple[list[str], float]:
    """The nearest other concepts, plus how close the closest one is.

    That closeness is the confusability of the question: a distractor that is almost as
    good as the answer makes a harder question.
    """
    sims = sorted(
        ((float(concepts[i].vec @ c.vec), j) for j, c in enumerate(concepts) if j != i),
        reverse=True,
    )
    return [concepts[j].name for _, j in sims[:N_DISTRACTORS]], max(0.0, sims[0][0])


_REASONING_PROMPT = """You are writing one exam question about the concept "{name}".
Use ONLY these sentences from the student's own material:
{evidence}

Return JSON: {{"question": "a why/how question testing understanding, not recall",
"answer": "the ideal answer in 2 sentences"}}"""


def generate_bank(concepts, llm: Callable[[str], str] | None = None) -> list[Question]:
    if len(concepts) < N_DISTRACTORS + 1:
        return []

    out: list[Question] = []
    raw: list[float] = []

    for i, c in enumerate(concepts):
        distractors, confusability = _distractors(i, concepts)
        base = c.rarity * confusability

        out.append(Question(len(out), i, "mcq", _cloze(c.evidence[0], c.name), c.name,
                            options=[c.name] + distractors))
        raw.append(base * KIND_WEIGHT["mcq"])

        out.append(Question(len(out), i, "free", f"In your own words, explain: {c.name}",
                            " ".join(c.evidence)))
        raw.append(base * KIND_WEIGHT["free"])

        if llm is None:
            continue
        try:
            got = json.loads(llm(_REASONING_PROMPT.format(name=c.name, evidence="\n".join(c.evidence))))
            if got.get("question") and got.get("answer"):
                out.append(Question(len(out), i, "reasoning", got["question"], got["answer"]))
                raw.append(base * KIND_WEIGHT["reasoning"])
        except Exception:  # a flaky local model must never sink the whole ingest
            pass

    # min-max the raw scores so selection has the full 0..1 range to aim at
    lo, hi = min(raw), max(raw)
    span = hi - lo or 1.0
    for q, r in zip(out, raw):
        q.difficulty = (r - lo) / span
    return out
