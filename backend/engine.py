"""The generation services, between the raw engine and the HTTP layer.

Two stages, matching the architecture in `docs/MERGE_PLAN.md`:

    analyse(text)                 embeddings only -> concepts, prerequisite DAG, question
                                  bank, subject. Cached per source, so the second thing you
                                  generate from a document is instant.

    build_material(kind, ...)     analysis -> a material body (quiz, notes, flashcards,
                                  summary, test paper, assignment, lesson-plan scaffold)

Everything here is *grounded*: every sentence shown to a student is a sentence from their
own material, and every number is computed from it. Nothing in this module invents content,
which is why it needs no model, no API key and no network. The LLM tier (richer exam prose,
Bloom's-tagged reasoning items) plugs in at `llm.py` and is strictly additive.
"""
from __future__ import annotations

from typing import Any

from .generate import Question, generate_bank
from .ingest import Concept, build_dag, extract_concepts

MIN_CONCEPTS = 4


class EngineError(Exception):
    def __init__(self, message: str, status: int = 422):
        super().__init__(message)
        self.status = status


_SUBJECT_WORDS: dict[str, list[str]] = {
    "biology": ["cell", "protein", "enzyme", "organism", "dna", "membrane", "species"],
    "physics": ["force", "energy", "velocity", "wave", "quantum", "momentum", "photon"],
    "math": ["theorem", "matrix", "vector", "integral", "proof", "eigen", "function"],
    "cs": ["algorithm", "complexity", "compiler", "pointer", "runtime", "data structure"],
    "history": ["century", "empire", "revolution", "treaty", "war", "dynasty"],
}


def infer_subject(text: str) -> str:
    """Guess a subject from the material's own vocabulary.

    Crude on purpose: it picks a colour and a default on a form, and the user can always
    change it. Two hits required so a passing mention does not decide it.
    """
    lowered = text.lower()
    scores = {
        key: sum(1 for w in words if w in lowered) for key, words in _SUBJECT_WORDS.items()
    }
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] >= 2 else "general"


# ---------------------------------------------------------------- analysis

def _concept_json(c: Concept) -> dict:
    """Serialisable concept. The embedding vector is deliberately dropped: it is needed to
    *build* the DAG and the distractors, never to run the learning loop or grade an answer,
    so persisting it would be 256 floats per concept for nothing."""
    return {
        "name": c.name,
        "evidence": c.evidence,
        "first_pos": c.first_pos,
        "rarity": round(c.rarity, 4),
    }


def analyse(text: str, concept_count: int = 20, use_llm: bool = False) -> dict:
    """Material -> the engine's understanding of it. The slow call; cached per source."""
    concepts = extract_concepts(text, k=concept_count)
    if len(concepts) < MIN_CONCEPTS:
        raise EngineError(
            "We could not find enough distinct concepts in that material. Longer or denser "
            "text works better — a full chapter rather than a page of headings."
        )

    llm = None
    if use_llm:
        from .generate import ollama

        llm = ollama

    bank = generate_bank(concepts, llm=llm)
    if not bank:
        raise EngineError("We could not generate questions from that material.")

    return {
        "subject": infer_subject(text),
        "concepts": [_concept_json(c) for c in concepts],
        "edges": [
            {"source": a, "target": b, "weight": round(w, 3)} for a, b, w in build_dag(concepts)
        ],
        "bank": [
            {
                "id": q.id,
                "concept": q.concept,
                "kind": q.kind,
                "stem": q.stem,
                "answer": q.answer,
                "difficulty": round(q.difficulty, 4),
                "options": q.options,
            }
            for q in bank
        ],
    }


def rehydrate_bank(bank: list[dict]) -> list[Question]:
    """JSON rows back into the dataclass the learner and grader expect."""
    return [
        Question(
            id=q["id"],
            concept=q["concept"],
            kind=q["kind"],
            stem=q["stem"],
            answer=q["answer"],
            difficulty=q.get("difficulty", 0.0),
            options=list(q.get("options") or []),
        )
        for q in bank
    ]


# ------------------------------------------------------------- derived views

def prerequisites(analysis: dict, concept_idx: int, limit: int = 2) -> list[str]:
    names = [c["name"] for c in analysis["concepts"]]
    edges = sorted(
        (e for e in analysis["edges"] if e["target"] == concept_idx),
        key=lambda e: -e["weight"],
    )[:limit]
    return [names[e["source"]] for e in edges if e["source"] < len(names)]


def topic_layers(analysis: dict) -> list[dict]:
    """Dependency layers — the order a student should actually work through the material.

    Everything in layer n depends on something in layer n-1, so top-to-bottom means never
    meeting a concept before its prerequisites.
    """
    concepts = analysis["concepts"]
    depth = [0] * len(concepts)
    for _ in range(len(concepts)):
        moved = False
        for e in analysis["edges"]:
            if e["source"] < len(depth) and e["target"] < len(depth):
                if depth[e["source"]] + 1 > depth[e["target"]]:
                    depth[e["target"]] = depth[e["source"]] + 1
                    moved = True
        if not moved:
            break

    layers: dict[int, list[int]] = {}
    for i, d in enumerate(depth):
        layers.setdefault(d, []).append(i)

    return [
        {
            "id": f"layer-{d}",
            "title": _title_case(concepts[ids[0]]["name"]),
            "conceptIds": ids,
            "estMinutes": max(4, round(len(ids) * 2.5)),
            "summary": (
                f"{_title_case(concepts[ids[0]]['name'])}, and {len(ids) - 1} concept"
                f"{'s' if len(ids) > 2 else ''} that sit alongside it."
                if len(ids) > 1
                else (concepts[ids[0]]["evidence"] or [""])[0]
            ),
        }
        for d, ids in sorted(layers.items())
    ]


def _title_case(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


# --------------------------------------------------------- material builders

QUESTION_KINDS = ("mcq", "free")
MATERIAL_KINDS = (
    "quiz",
    "notes",
    "flashcards",
    "summary",
    "test",
    "assignment",
    "lesson_plan",
)


def _ranked(analysis: dict) -> list[int]:
    """Concept indices, most-supported first. Evidence count is the honest proxy for how
    central a concept is to the document."""
    return sorted(
        range(len(analysis["concepts"])),
        key=lambda i: -len(analysis["concepts"][i]["evidence"]),
    )


def _pick_questions(
    analysis: dict, count: int, kinds: tuple[str, ...] = QUESTION_KINDS
) -> list[dict]:
    """A spread across concepts, easiest first.

    Selecting by difficulty alone stacks every question onto the two hardest concepts, so
    this takes one question per concept in turn before taking a second from any.
    """
    pool = [q for q in analysis["bank"] if q["kind"] in kinds]
    by_concept: dict[int, list[dict]] = {}
    for q in sorted(pool, key=lambda q: q["difficulty"]):
        by_concept.setdefault(q["concept"], []).append(q)

    order = [i for i in _ranked(analysis) if i in by_concept]
    out: list[dict] = []
    round_index = 0
    while len(out) < count and order:
        progressed = False
        for ci in order:
            if len(out) >= count:
                break
            bucket = by_concept[ci]
            if round_index < len(bucket):
                out.append(bucket[round_index])
                progressed = True
        if not progressed:
            break
        round_index += 1
    return out[:count]


def _question_out(analysis: dict, q: dict, marks: int | None = None) -> dict:
    name = analysis["concepts"][q["concept"]]["name"]
    item: dict[str, Any] = {
        "ref": f"q{q['id']}",
        "bankId": q["id"],
        "kind": q["kind"],
        "stem": q["stem"],
        "answer": q["answer"],
        "options": list(q.get("options") or []),
        "concept": name,
        "conceptId": q["concept"],
        "difficulty": q["difficulty"],
        "explanation": _explanation(analysis, q),
    }
    if marks is not None:
        item["marks"] = marks
    return item


def _explanation(analysis: dict, q: dict) -> str:
    concept = analysis["concepts"][q["concept"]]
    if q["kind"] == "mcq":
        base = (
            f"The answer is “{q['answer']}”. It is the concept this sentence was written "
            "about; the other options are its nearest neighbours in the material, which is "
            "what makes them tempting rather than random."
        )
    else:
        base = (concept["evidence"] or [""])[0]
    prereqs = prerequisites(analysis, q["concept"])
    if prereqs:
        base += f" This builds on {' and '.join(prereqs)}."
    return base


def build_quiz(analysis: dict, count: int = 10, kinds: tuple[str, ...] = QUESTION_KINDS) -> dict:
    picked = _pick_questions(analysis, count, kinds)
    return {
        "questions": [_question_out(analysis, q, marks=1) for q in picked],
        "totalMarks": len(picked),
    }


def build_notes(analysis: dict, source_title: str) -> dict:
    concepts = analysis["concepts"]
    headline = [concepts[i]["name"] for i in _ranked(analysis)[:6]]
    sections: list[dict] = [
        {
            "id": "overview",
            "title": "Overview",
            "blocks": [
                {
                    "type": "paragraph",
                    "text": (
                        f"{len(concepts)} distinct concepts were pulled out of {source_title}, "
                        "and the order below follows which ones depend on which — earlier "
                        "concepts first, so nothing arrives before its prerequisites."
                    ),
                },
                {
                    "type": "callout",
                    "tone": "key",
                    "title": "Where to start",
                    "text": (
                        "The material leans hardest on "
                        + ", ".join(_title_case(n) for n in headline[:3])
                        + ". Those carry the most supporting text, so they are the safest "
                        "place to begin."
                    ),
                },
                {"type": "bullets", "items": [_title_case(n) for n in headline]},
            ],
        }
    ]

    for i, c in enumerate(concepts):
        if not c["evidence"]:
            continue
        blocks: list[dict] = [{"type": "paragraph", "text": s} for s in c["evidence"]]
        prereqs = prerequisites(analysis, i)
        if prereqs:
            blocks.append(
                {
                    "type": "callout",
                    "tone": "note",
                    "title": "Builds on",
                    "text": " · ".join(_title_case(p) for p in prereqs),
                }
            )
        sections.append({"id": f"c-{i}", "title": _title_case(c["name"]), "blocks": blocks})

    words = sum(len(b.get("text", "").split()) for s in sections for b in s["blocks"])
    return {"sections": sections, "readingMinutes": max(1, round(words / 200))}


def build_flashcards(analysis: dict) -> dict:
    return {
        "cards": [
            {
                "id": f"f-{i}",
                "front": f"What is {c['name']}?",
                "back": c["evidence"][0],
                "concept": c["name"],
            }
            for i, c in enumerate(analysis["concepts"])
            if c["evidence"]
        ]
    }


def build_summary(analysis: dict, source_title: str) -> dict:
    ranked = _ranked(analysis)
    concepts = analysis["concepts"]
    layers = topic_layers(analysis)
    return {
        "sections": [
            {
                "id": "summary",
                "title": "Summary",
                "blocks": [
                    {
                        "type": "paragraph",
                        "text": (
                            f"{source_title} covers {len(concepts)} concepts across "
                            f"{len(layers)} dependency layers. The spine of it is "
                            + ", ".join(_title_case(concepts[i]["name"]) for i in ranked[:3])
                            + "."
                        ),
                    },
                    {
                        "type": "bullets",
                        "items": [
                            f"{_title_case(concepts[i]['name'])} — {concepts[i]['evidence'][0]}"
                            for i in ranked[:8]
                            if concepts[i]["evidence"]
                        ],
                    },
                ],
            }
        ],
        "readingMinutes": 2,
    }


def build_test(analysis: dict, opts: dict) -> dict:
    """A sectioned exam paper from the grounded bank.

    Sections are objective / short answer, which is the split the generator can actually
    support. Marks are distributed by the engine's own difficulty score, so a harder
    question is worth more. Bloom's level is left empty rather than guessed — labelling a
    cloze question "Bloom's 4" because it scored high on confusability would be a fabricated
    number on a document a teacher puts in front of a class. The editor lets them set it.
    """
    total_marks = int(opts.get("totalMarks") or 0)
    count = max(1, int(opts.get("questionCount") or 12))
    mcq_share = float(opts.get("mcqShare", 0.6))

    mcq_n = max(0, round(count * mcq_share))
    free_n = max(0, count - mcq_n)
    mcqs = _pick_questions(analysis, mcq_n, ("mcq",))
    frees = _pick_questions(analysis, free_n, ("free",))

    picked = mcqs + frees
    marks = (
        _apportion(picked, total_marks)
        if total_marks and picked
        else {q["id"]: 1 for q in mcqs} | {q["id"]: 3 for q in frees}
    )

    sections: list[dict] = []
    if mcqs:
        sections.append(
            {
                "id": "section-a",
                "title": "Section A — Objective",
                "instructions": "Choose the best option for each question.",
                "questions": [_question_out(analysis, q, marks[q["id"]]) for q in mcqs],
            }
        )
    if frees:
        sections.append(
            {
                "id": "section-b",
                "title": "Section B — Short answer",
                "instructions": "Answer in two or three sentences.",
                "questions": [_question_out(analysis, q, marks[q["id"]]) for q in frees],
            }
        )

    for s in sections:
        for q in s["questions"]:
            q.setdefault("bloom", "")

    return {
        "board": opts.get("board") or "",
        "examType": opts.get("examType") or "Class test",
        "durationMinutes": int(opts.get("durationMinutes") or 40),
        "language": opts.get("language") or "English",
        "instructions": opts.get("instructions")
        or "Answer all questions. Marks are shown beside each question.",
        "sections": sections,
        "totalMarks": sum(q["marks"] for s in sections for q in s["questions"]),
        "versionLabel": opts.get("versionLabel") or "Version A",
    }


def _apportion(questions: list[dict], total: int) -> dict[int, int]:
    """Split `total` marks across questions by difficulty, summing to exactly `total`.

    Rounding each share independently loses marks — twelve questions rounded down turn a
    30-mark paper into a 22-mark one, which is wrong on a document a teacher hands out. This
    is largest-remainder apportionment: floor everything, then hand the leftover marks to the
    questions with the biggest fractional parts.
    """
    weights = [1.0 + q["difficulty"] for q in questions]
    span = sum(weights) or 1.0
    # Every question is worth at least one mark, so apportion only what is left over.
    floor_total = max(total, len(questions))
    shares = [floor_total * w / span for w in weights]
    marks = [max(1, int(s)) for s in shares]

    remainder = floor_total - sum(marks)
    order = sorted(range(len(questions)), key=lambda i: -(shares[i] - int(shares[i])))
    i = 0
    while remainder > 0 and order:
        marks[order[i % len(order)]] += 1
        remainder -= 1
        i += 1
    # Over-allocated (every question forced up to 1): take back from the cheapest first.
    order_cheap = sorted(range(len(questions)), key=lambda i: marks[i])
    i = 0
    while remainder < 0 and order_cheap:
        j = order_cheap[i % len(order_cheap)]
        if marks[j] > 1:
            marks[j] -= 1
            remainder += 1
        i += 1
        if i > 4 * len(questions):
            break

    return {q["id"]: m for q, m in zip(questions, marks)}


def build_assignment(analysis: dict, opts: dict) -> dict:
    count = max(1, int(opts.get("questionCount") or 6))
    picked = _pick_questions(analysis, count, ("free", "mcq"))
    return {
        "instructions": opts.get("instructions")
        or "Work through every question. Show your reasoning where the question asks for it.",
        "estimatedMinutes": int(opts.get("durationMinutes") or 45),
        "sections": [
            {
                "id": "tasks",
                "title": "Tasks",
                "instructions": "",
                "questions": [_question_out(analysis, q, marks=2) for q in picked],
            }
        ],
        "totalMarks": 2 * len(picked),
    }


def build_lesson_plan(analysis: dict, opts: dict) -> dict:
    """A lesson-plan scaffold derived from the dependency layers.

    Honest about what it is: the objectives and the sequence come from the material's own
    concept structure, and the timings are arithmetic over the session length. It is a
    starting structure for a teacher to write into, not a finished plan — the prose a good
    lesson plan needs is the LLM tier's job.
    """
    minutes = int(opts.get("durationMinutes") or 40)
    layers = topic_layers(analysis)
    concepts = analysis["concepts"]
    teach = layers[: max(1, min(4, len(layers)))]

    opening, closing = max(3, round(minutes * 0.1)), max(3, round(minutes * 0.12))
    body = max(len(teach), minutes - opening - closing)
    per = body // len(teach)

    activities = [
        {"minutes": opening, "title": "Opening", "detail": "Recall prior knowledge and set the question the lesson answers."}
    ]
    for layer in teach:
        names = [_title_case(concepts[i]["name"]) for i in layer["conceptIds"][:3]]
        activities.append(
            {
                "minutes": per,
                "title": layer["title"],
                "detail": "Introduce " + ", ".join(names) + ", then check understanding before moving on.",
            }
        )
    activities.append(
        {"minutes": closing, "title": "Close", "detail": "Recap, and set the practice task."}
    )

    return {
        "scaffold": True,
        "objectives": [
            f"Explain {_title_case(concepts[i]['name'])} in your own words."
            for layer in teach
            for i in layer["conceptIds"][:2]
        ][:5],
        "materials": ["The source material", "Board or slides", "The generated practice quiz"],
        "activities": activities,
        "assessment": "The generated quiz, run as an exit ticket.",
        "differentiation": (
            "Learners who finish early take the free-response tier; learners who struggle "
            "return to the prerequisite concepts the graph points at."
        ),
        "durationMinutes": minutes,
    }


def build_material(kind: str, analysis: dict, source_title: str, opts: dict | None = None) -> dict:
    opts = opts or {}
    if kind == "quiz":
        kinds = tuple(opts.get("questionTypes") or QUESTION_KINDS)
        return build_quiz(analysis, int(opts.get("questionCount") or 10), kinds)
    if kind == "notes":
        return build_notes(analysis, source_title)
    if kind == "flashcards":
        return build_flashcards(analysis)
    if kind == "summary":
        return build_summary(analysis, source_title)
    if kind == "test":
        return build_test(analysis, opts)
    if kind == "assignment":
        return build_assignment(analysis, opts)
    if kind == "lesson_plan":
        return build_lesson_plan(analysis, opts)
    raise EngineError(f"'{kind}' is not a kind of material this build can generate.")
