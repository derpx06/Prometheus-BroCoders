"""Embeddings behind one interface.

model2vec (static, numpy-only, no torch) locally. A Gemini backend gets added here at
deploy time -- see the plan. ponytail: every threshold in ingest.py/grade.py is tuned
against potion-base-8M; swapping the backend changes the numbers and needs retuning.
"""
from __future__ import annotations

import functools

import numpy as np

MODEL = "minishlab/potion-base-8M"
DIM = 256


@functools.lru_cache(maxsize=1)
def _model():
    from model2vec import StaticModel

    return StaticModel.from_pretrained(MODEL)


def embed(texts: list[str]) -> np.ndarray:
    """L2-normalised embeddings, shape (len(texts), DIM).

    Normalising here means cosine similarity is a plain dot product everywhere else.
    """
    if not texts:
        return np.zeros((0, DIM), dtype=np.float32)
    v = np.asarray(_model().encode(texts), dtype=np.float32)
    return v / np.clip(np.linalg.norm(v, axis=1, keepdims=True), 1e-9, None)
