"""API-level checks: the routes wire the engine together and never leak answers."""
from __future__ import annotations

import pathlib
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from backend.main import SESSIONS, app  # noqa: E402

DOC = (pathlib.Path(__file__).resolve().parent.parent / "data" / "linear_algebra.txt").read_text()
client = TestClient(app)


@pytest.fixture(scope="module")
def session_id() -> str:
    r = client.post("/api/sessions", json={"text": DOC, "concepts": 12})
    assert r.status_code == 200, r.text
    return r.json()["session_id"]


def test_health():
    assert client.get("/api/health").json()["ok"] is True


def test_ingest_builds_a_course(session_id):
    body = client.get(f"/api/sessions/{session_id}").json()
    assert len(body["concepts"]) >= 4
    assert body["questions"] > 0
    assert all(c["mastery"] == pytest.approx(0.2) for c in body["concepts"])
    ids = {c["id"] for c in body["concepts"]}
    for e in body["edges"]:
        assert e["source"] in ids and e["target"] in ids


def test_short_material_is_rejected():
    assert client.post("/api/sessions", json={"text": "too short"}).status_code == 422


def test_unknown_session_is_404():
    assert client.get("/api/sessions/deadbeef/next").status_code == 404


def test_next_question_never_leaks_the_answer(session_id):
    q = client.get(f"/api/sessions/{session_id}/next").json()
    assert q["done"] is False
    assert "answer" not in q
    if q["kind"] == "mcq":
        answer = SESSIONS[session_id].bank[q["question_id"]].answer
        assert answer in q["options"]  # present as an option...
        assert answer not in q["stem"].lower()  # ...but not given away in the stem


def test_correct_answer_raises_mastery(session_id):
    q = client.get(f"/api/sessions/{session_id}/next").json()
    truth = SESSIONS[session_id].bank[q["question_id"]].answer
    r = client.post(
        f"/api/sessions/{session_id}/answer",
        json={"question_id": q["question_id"], "response": truth},
    ).json()
    assert r["correct"] is True
    assert r["mastery_after"] > r["mastery_before"]


def test_wrong_answer_lowers_mastery(session_id):
    q = client.get(f"/api/sessions/{session_id}/next").json()
    r = client.post(
        f"/api/sessions/{session_id}/answer",
        json={"question_id": q["question_id"], "response": "definitely not the answer"},
    ).json()
    assert r["correct"] is False
    assert r["mastery_after"] < r["mastery_before"]


def test_options_are_stable_across_fetches(session_id):
    a = client.get(f"/api/sessions/{session_id}/next").json()
    b = client.get(f"/api/sessions/{session_id}/next").json()
    assert a["question_id"] == b["question_id"] and a["options"] == b["options"]
