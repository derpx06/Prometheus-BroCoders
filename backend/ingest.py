"""Material -> concepts -> prerequisite DAG.

The whole pipeline runs on embeddings; no LLM is involved in this stage.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, CountVectorizer

from .embed import embed

_SENT = re.compile(r"(?<=[.!?])\s+")
MAX_CANDIDATES = 300
_VERBISH = ("ly", "ed", "ing")
# Generic academic vocabulary that scores well against any topical document but names no
# concept. ponytail: a stoplist, not a POS tagger -- upgrade path is real noun-phrase
# chunking if the junk rate ever justifies the dependency.
_GENERIC = frozenset(
    """entire number example examples thing things way ways part parts kind amount
    point points case cases form value values result results following general single
    whole same different another certain various order type types level side fact""".split()
)


def _is_concept_phrase(term: str) -> bool:
    """Keep noun-phrase-shaped n-grams that appear verbatim in the source.

    Stopwords are filtered at the *boundaries* rather than stripped from the text, so the
    term stays contiguous in the original sentences and evidence lookup can find it.
    Stripping them instead turns "linear combination of vectors" into a token sequence that
    appears nowhere, which silently drops the concept.
    """
    tokens = term.split()
    if len(term) < 4:
        return False
    if tokens[0] in ENGLISH_STOP_WORDS or tokens[-1] in ENGLISH_STOP_WORDS:
        return False
    if len(tokens) == 1:
        return term not in _GENERIC and not term.endswith(_VERBISH)
    return True


@dataclass
class Concept:
    name: str
    vec: np.ndarray
    evidence: list[str]
    first_pos: int
    rarity: float  # 0..1, higher = mentioned in fewer sentences = harder


def split_sentences(text: str) -> list[str]:
    parts = (s.strip() for s in _SENT.split(text.replace("\n", " ")))
    return [s for s in parts if len(s.split()) >= 4]


def _mmr(scores: np.ndarray, vecs: np.ndarray, k: int, lam: float = 0.5) -> list[int]:
    """Maximal Marginal Relevance: relevant to the document, unlike each other."""
    picked: list[int] = []
    left = list(range(len(vecs)))
    while left and len(picked) < k:
        if not picked:
            best = max(left, key=lambda j: scores[j])
        else:
            chosen = vecs[picked]
            best = max(
                left,
                key=lambda j: lam * scores[j] - (1 - lam) * float(np.max(vecs[j] @ chosen.T)),
            )
        picked.append(best)
        left.remove(best)
    return picked


def extract_concepts(text: str, k: int = 20) -> list[Concept]:
    sents = split_sentences(text)
    if not sents:
        return []

    cv = CountVectorizer(
        ngram_range=(1, 3), lowercase=True, token_pattern=r"(?u)\b[a-z][a-z-]+\b"
    )
    try:
        counts = cv.fit_transform(sents)
    except ValueError:  # no usable tokens at all
        return []

    vocab = cv.get_feature_names_out()
    doc_freq = np.asarray((counts > 0).sum(axis=0)).ravel()
    term_freq = np.asarray(counts.sum(axis=0)).ravel()

    usable = [i for i, t in enumerate(vocab) if _is_concept_phrase(t) and term_freq[i] >= 2]
    if len(usable) < k:  # short input: relax the repetition requirement
        usable = [i for i, t in enumerate(vocab) if _is_concept_phrase(t)]
    if not usable:
        return []
    usable = sorted(usable, key=lambda i: -term_freq[i])[:MAX_CANDIDATES]

    terms = [vocab[i] for i in usable]
    term_vecs = embed(terms)
    doc_vec = embed([" ".join(sents)])[0]
    # multi-word phrases are far more likely to be real concepts than bare words
    phrase_bonus = np.array([1.0 + 0.12 * (t.count(" ")) for t in terms], dtype=np.float32)
    relevance = (term_vecs @ doc_vec) * phrase_bonus

    # Collapse overlapping phrases, keeping the most relevant of each family: without this
    # "vectors" / "set of vectors" / "combination of vectors" occupy three slots and crowd
    # out genuinely distinct concepts like eigenvalue.
    kept: list[int] = []
    for j in sorted(range(len(terms)), key=lambda x: -relevance[x]):
        if not any(terms[j] in terms[o] or terms[o] in terms[j] for o in kept):
            kept.append(j)
    terms = [terms[j] for j in kept]
    term_vecs, relevance = term_vecs[kept], relevance[kept]
    usable = [usable[j] for j in kept]

    lowered = text.lower()
    out = []
    for j in _mmr(relevance, term_vecs, k):
        term = terms[j]
        out.append(
            Concept(
                name=term,
                vec=term_vecs[j],
                evidence=[s for s in sents if term in s.lower()][:3],
                first_pos=lowered.find(term),
                rarity=1.0 - doc_freq[usable[j]] / len(sents),
            )
        )
    return [c for c in out if c.evidence]


def build_dag(
    concepts: list[Concept], threshold: float = 0.35, max_parents: int = 2
) -> list[tuple[int, int, float]]:
    """Edge a->b ("a is a prerequisite of b") when a is introduced first and the two are
    related. Edges only ever run from earlier to strictly later first-mention, so the graph
    is acyclic by construction.

    ponytail: first-mention order is a heuristic for prerequisite structure. It holds for
    well-ordered teaching material and breaks on reference material. Upgrade path is asking
    the LLM to confirm each edge at ingest.
    """
    edges: list[tuple[int, int, float]] = []
    for b, cb in enumerate(concepts):
        parents = [
            (a, float(ca.vec @ cb.vec))
            for a, ca in enumerate(concepts)
            if ca.first_pos < cb.first_pos and float(ca.vec @ cb.vec) > threshold
        ]
        parents.sort(key=lambda p: -p[1])
        edges += [(a, b, sim) for a, sim in parents[:max_parents]]
    return edges
