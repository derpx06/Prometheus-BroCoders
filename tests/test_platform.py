"""Platform-level checks: who can see what, and whether the numbers are real.

These are mostly *negative* tests. The valuable assertions in a multi-tenant product are
the ones that prove a request cannot reach data it should not, so most of what follows
checks for 401/403/404 rather than for a happy path.
"""
from __future__ import annotations

import pathlib
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from backend import db  # noqa: E402

DOC = (pathlib.Path(__file__).resolve().parent.parent / "data" / "linear_algebra.txt").read_text()


@pytest.fixture(scope="module", autouse=True)
def fresh_db():
    """A scratch database per run. Reset before the app imports anything that connects."""
    path = pathlib.Path(tempfile.mkdtemp()) / "platform-test.db"
    db.reset_for_tests(path)
    yield
    db.reset_for_tests(path)


@pytest.fixture(scope="module")
def app_module(fresh_db):
    from backend.main import app

    return app


def client(app) -> TestClient:
    """A fresh client per principal — each one carries its own cookie jar, which is how we
    keep three signed-in users apart inside one test."""
    return TestClient(app)


def signup(c: TestClient, name: str, email: str, role: str = "student", school: dict | None = None):
    body = {"name": name, "email": email, "password": "a-good-password", "role": role}
    if school:
        body["school"] = school
    r = c.post("/api/auth/signup", json=body)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------- accounts

def test_signup_login_logout_roundtrip(app_module):
    c = client(app_module)
    body = signup(c, "Ama", "ama@example.com")
    assert body["user"]["role"] == "student"
    assert body["user"]["schoolId"] is None
    assert c.get("/api/auth/me").status_code == 200

    c.post("/api/auth/logout")
    assert c.get("/api/auth/me").status_code == 401

    r = c.post("/api/auth/login", json={"email": "AMA@example.com ", "password": "a-good-password"})
    assert r.status_code == 200, "email should be case- and whitespace-insensitive"


def test_password_is_never_returned_or_stored_in_the_clear(app_module):
    c = client(app_module)
    body = signup(c, "Kofi", "kofi@example.com")
    assert "password" not in str(body).lower() or "a-good-password" not in str(body)
    row = db.database().users.find_one({"email": "kofi@example.com"})
    assert "a-good-password" not in "".join(str(v) for v in row.values())
    assert row["password_hash"].startswith("scrypt$")


def test_bad_credentials_and_duplicate_email(app_module):
    c = client(app_module)
    signup(c, "Zoe", "zoe@example.com")
    assert c.post("/api/auth/login", json={"email": "zoe@example.com", "password": "nope"}).status_code == 401
    assert c.post(
        "/api/auth/signup",
        json={"name": "Other", "email": "zoe@example.com", "password": "a-good-password"},
    ).status_code == 409


def test_short_password_and_bad_email_are_rejected(app_module):
    c = client(app_module)
    assert c.post(
        "/api/auth/signup", json={"name": "X", "email": "x@example.com", "password": "short"}
    ).status_code == 422
    assert c.post(
        "/api/auth/signup", json={"name": "X", "email": "not-an-email", "password": "a-good-password"}
    ).status_code == 422


def test_protected_routes_require_a_session(app_module):
    c = client(app_module)
    for method, path in [
        ("get", "/api/sources"),
        ("get", "/api/materials"),
        ("get", "/api/classes"),
        ("get", "/api/assignments"),
        ("get", "/api/analytics/me"),
        ("post", "/api/sources/text"),
    ]:
        r = getattr(c, method)(path, **({"json": {}} if method == "post" else {}))
        assert r.status_code == 401, f"{path} answered {r.status_code} without a session"


def test_a_forged_cookie_is_not_a_session(app_module):
    c = client(app_module)
    c.cookies.set("lattice_session", "eyJzdWIiOiAiYWRtaW4ifQ.not-a-real-signature")
    assert c.get("/api/auth/me").status_code == 401


# ----------------------------------------------------------------------- sources

@pytest.fixture(scope="module")
def teacher_ctx(app_module):
    """A school admin, a teacher in that school, and an unrelated student."""
    admin = client(app_module)
    signup(admin, "Head", "head@school.test", school={"name": "Test Academy", "plan": "starter"})

    outsider = client(app_module)
    signup(outsider, "Outsider", "outsider@example.com")
    return admin, outsider


def test_source_ingest_then_reuse(teacher_ctx):
    admin, _ = teacher_ctx
    r = admin.post("/api/sources/text", json={"text": DOC, "title": "Linear algebra"})
    assert r.status_code == 200, r.text
    src = r.json()
    assert src["kind"] == "text"
    assert len(src["concepts"]) >= 4
    assert src["topics"], "a source should carry its dependency layers"
    assert src["questionCount"] > 0

    # The analysis is cached, so a second read does not re-run the engine.
    again = admin.get(f"/api/sources/{src['id']}").json()
    assert [c["name"] for c in again["concepts"]] == [c["name"] for c in src["concepts"]]


def test_short_text_is_refused(teacher_ctx):
    admin, _ = teacher_ctx
    assert admin.post("/api/sources/text", json={"text": "too short"}).status_code == 422


def test_a_source_is_invisible_to_an_unrelated_user(teacher_ctx):
    admin, outsider = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]
    assert outsider.get(f"/api/sources/{source_id}").status_code == 404
    assert outsider.delete(f"/api/sources/{source_id}").status_code == 404


def test_youtube_rejects_a_non_youtube_link(teacher_ctx):
    admin, _ = teacher_ctx
    r = admin.post("/api/sources/youtube", json={"url": "https://example.com/video"})
    assert r.status_code == 422
    assert "youtube" in r.json()["detail"].lower()


# --------------------------------------------------------------------- materials

def test_one_source_generates_many_materials(teacher_ctx):
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]

    made = {}
    for kind in ("quiz", "notes", "flashcards", "summary", "test", "assignment", "lesson_plan"):
        r = admin.post(
            "/api/materials/generate",
            json={"sourceId": source_id, "kind": kind, "options": {"questionCount": 6}},
        )
        assert r.status_code == 200, f"{kind}: {r.text}"
        made[kind] = r.json()["material"]

    assert len(made["quiz"]["body"]["questions"]) == 6
    assert made["notes"]["body"]["sections"][0]["title"] == "Overview"
    assert made["flashcards"]["body"]["cards"]
    assert made["test"]["body"]["sections"] and made["test"]["body"]["totalMarks"] > 0
    assert made["lesson_plan"]["body"]["scaffold"] is True, "a scaffold must admit it is one"
    assert sum(a["minutes"] for a in made["lesson_plan"]["body"]["activities"]) > 0


def test_generated_questions_spread_across_concepts(teacher_ctx):
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]
    body = admin.post(
        "/api/materials/generate",
        json={"sourceId": source_id, "kind": "quiz", "options": {"questionCount": 8}, "save": False},
    ).json()["material"]["body"]
    concepts = [q["concept"] for q in body["questions"]]
    assert len(set(concepts)) >= 6, f"8 questions landed on only {len(set(concepts))} concepts"


def test_test_paper_leaves_blooms_blank_rather_than_guessing(teacher_ctx):
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]
    body = admin.post(
        "/api/materials/generate", json={"sourceId": source_id, "kind": "test", "save": False}
    ).json()["material"]["body"]
    blooms = [q["bloom"] for s in body["sections"] for q in s["questions"]]
    assert blooms and all(b == "" for b in blooms)


def test_a_test_paper_is_worth_exactly_the_marks_requested(teacher_ctx):
    """Rounding each question's share independently loses marks — twelve questions rounded
    down turned a 30-mark paper into a 22-mark one. That is wrong on a document a teacher
    hands to a class, so the total is apportioned rather than rounded."""
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]
    for count, total in ((12, 30), (6, 50), (20, 25), (5, 5)):
        body = admin.post(
            "/api/materials/generate",
            json={
                "sourceId": source_id,
                "kind": "test",
                "save": False,
                "options": {"questionCount": count, "totalMarks": total},
            },
        ).json()["material"]["body"]
        marks = [q["marks"] for s in body["sections"] for q in s["questions"]]
        assert all(m >= 1 for m in marks), f"a question was worth nothing: {marks}"
        # Every question is worth at least one mark, so a total below the question count
        # cannot be honoured exactly — the floor is the count.
        assert body["totalMarks"] == max(total, len(marks)) == sum(marks)


def test_students_cannot_generate_class_facing_documents(app_module, teacher_ctx):
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]

    student = client(app_module)
    signup(student, "Nia", "nia@example.com")
    # The student cannot see that source at all, so use one of their own.
    own = student.post("/api/sources/text", json={"text": DOC, "title": "My notes"}).json()

    assert student.post(
        "/api/materials/generate", json={"sourceId": own["id"], "kind": "quiz"}
    ).status_code == 200
    for kind in ("test", "assignment", "lesson_plan"):
        r = student.post("/api/materials/generate", json={"sourceId": own["id"], "kind": kind})
        assert r.status_code == 403, f"a student generated a {kind}"
    assert student.get("/api/question-bank").status_code == 403


# ------------------------------------------------------------------- classrooms

@pytest.fixture(scope="module")
def classroom(app_module, teacher_ctx):
    """A class with one quiz assigned and one enrolled student."""
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]
    quiz = admin.post(
        "/api/materials/generate",
        json={"sourceId": source_id, "kind": "quiz", "options": {"questionCount": 4}},
    ).json()["material"]

    klass = admin.post("/api/classes", json={"name": "Algebra 1", "subject": "math"}).json()["class"]
    student = client(app_module)
    signup(student, "Tomas", "tomas@example.com")
    joined = student.post("/api/classes/join", json={"code": klass["joinCode"].lower()})
    assert joined.status_code == 200, "join codes should not be case-sensitive"

    assignment = admin.post(
        f"/api/classes/{klass['id']}/assignments",
        json={"materialId": quiz["id"], "title": "Quiz 1"},
    ).json()["assignment"]
    return {"admin": admin, "student": student, "class": klass, "quiz": quiz, "assignment": assignment}


def test_student_sees_the_assignment_but_not_the_roster(classroom):
    student, klass = classroom["student"], classroom["class"]
    assignments = student.get("/api/assignments").json()["assignments"]
    assert [a["title"] for a in assignments] == ["Quiz 1"]

    view = student.get(f"/api/classes/{klass['id']}").json()
    assert view["teaching"] is False
    assert "members" not in view, "a student must not be handed the class roster"


def test_assigned_material_reaches_the_student_without_its_answer_key(classroom):
    student, quiz = classroom["student"], classroom["quiz"]
    body = student.get(f"/api/materials/{quiz['id']}").json()["material"]
    assert body["readOnly"] is True
    for q in body["body"]["questions"]:
        assert "answer" not in q, "the answer key reached a student"
        assert "explanation" not in q
        assert q["options"], "options are still needed to answer"


def test_a_non_member_cannot_reach_the_class_or_its_material(app_module, classroom):
    intruder = client(app_module)
    signup(intruder, "Nosy", "nosy@example.com")
    assert intruder.get(f"/api/classes/{classroom['class']['id']}").status_code == 403
    assert intruder.get(f"/api/materials/{classroom['quiz']['id']}").status_code == 404
    assert intruder.post(
        "/api/attempts", json={"assignmentId": classroom["assignment"]["id"]}
    ).status_code == 403


def test_students_cannot_create_classes_or_assign_work(classroom):
    student, klass, quiz = classroom["student"], classroom["class"], classroom["quiz"]
    assert student.post("/api/classes", json={"name": "Mine"}).status_code == 403
    assert student.post(
        f"/api/classes/{klass['id']}/assignments", json={"materialId": quiz["id"]}
    ).status_code == 403


def test_attempt_is_graded_recorded_and_resumable(classroom):
    student, assignment, quiz = classroom["student"], classroom["assignment"], classroom["quiz"]

    started = student.post("/api/attempts", json={"assignmentId": assignment["id"]}).json()
    assert started["resumed"] is False
    attempt_id = started["attempt"]["id"]
    assert student.post("/api/attempts", json={"assignmentId": assignment["id"]}).json()["resumed"] is True

    full = classroom["admin"].get(f"/api/materials/{quiz['id']}").json()["material"]["body"]
    questions = full["questions"]

    # First answered correctly, the rest deliberately wrong, so the score is checkable.
    first = questions[0]
    r = student.post(
        f"/api/attempts/{attempt_id}/answer",
        json={"ref": first["ref"], "response": first["answer"]},
    ).json()
    assert r["correct"] is True and r["awarded"] == r["marks"]
    assert r["explanation"]

    # The same question cannot be answered twice — otherwise a student could retry until right.
    assert student.post(
        f"/api/attempts/{attempt_id}/answer",
        json={"ref": first["ref"], "response": first["answer"]},
    ).status_code == 409

    for q in questions[1:]:
        student.post(
            f"/api/attempts/{attempt_id}/answer",
            json={"ref": q["ref"], "response": "deliberately wrong nonsense"},
        )

    done = student.post(f"/api/attempts/{attempt_id}/submit").json()["attempt"]
    assert done["submitted_at"] is not None
    assert done["score"] >= first["marks"]
    assert done["score"] < done["max_score"]
    assert len(done["answers"]) == len(questions)

    # A submitted attempt is closed.
    assert student.post(
        f"/api/attempts/{attempt_id}/answer", json={"ref": questions[0]["ref"], "response": "x"}
    ).status_code == 409


def test_the_answer_key_arrives_only_after_submitting(classroom):
    """Stripped while answering, joined back on for the review — reviewing what you got wrong
    against the right answer is the point of taking the thing."""
    student, quiz = classroom["student"], classroom["quiz"]

    # Still withheld on the material itself, before and after.
    body = student.get(f"/api/materials/{quiz['id']}").json()["material"]["body"]
    assert all("answer" not in q for q in body["questions"])

    attempt_id = student.get("/api/attempts").json()["attempts"][0]["id"]
    attempt = student.get(f"/api/attempts/{attempt_id}").json()["attempt"]
    assert attempt["submitted_at"] is not None
    wrong = [a for a in attempt["answers"] if not a["correct"]]
    assert wrong, "the fixture answers most questions incorrectly"
    assert all(a["ideal_answer"] for a in wrong)
    assert all(a["explanation"] for a in wrong)


def test_attempts_are_private_to_the_student_who_made_them(app_module, classroom):
    student = classroom["student"]
    attempt_id = student.get("/api/attempts").json()["attempts"][0]["id"]
    other = client(app_module)
    signup(other, "Other", "other-student@example.com")
    assert other.get(f"/api/attempts/{attempt_id}").status_code == 404


# ---------------------------------------------------------------------- analytics

def test_teacher_analytics_come_from_real_answers(classroom):
    admin, klass = classroom["admin"], classroom["class"]
    data = admin.get(f"/api/analytics/class/{klass['id']}").json()
    assert data["hasData"] is True
    assert data["roster"] == 1
    row = next(a for a in data["assignments"] if a["title"] == "Quiz 1")
    assert row["submissions"] == 1
    assert row["completion"] == 1.0
    assert 0 < row["averageScore"] < 1, "one right out of four should be a partial score"
    assert data["students"][0]["completed"] == 1


def test_student_analytics_distinguish_untested_from_zero(classroom):
    data = classroom["student"].get("/api/analytics/me").json()
    assert data["hasData"] is True
    assert data["answered"] >= 4
    assert 0 < data["accuracy"] < 1
    # An untouched source reports mastery as null, never as 0 or as the engine's 0.2 prior.
    untested = [s for s in data["sources"] if s["testedConcepts"] == 0]
    assert all(s["mastery"] is None for s in untested)


def test_a_class_with_no_submissions_says_so(classroom):
    admin = classroom["admin"]
    empty = admin.post("/api/classes", json={"name": "Empty class"}).json()["class"]
    data = admin.get(f"/api/analytics/class/{empty['id']}").json()
    assert data["hasData"] is False
    assert data["roster"] == 0
    assert data["weakConcepts"] == [] and data["mostMissed"] == []


def test_analytics_for_someone_elses_class_is_refused(app_module, classroom):
    other_teacher = client(app_module)
    signup(other_teacher, "Rival", "rival@example.com", role="teacher")
    assert other_teacher.get(
        f"/api/analytics/class/{classroom['class']['id']}"
    ).status_code == 403


# --------------------------------------------------------------------- invitations

def test_invitation_flow_never_creates_a_password_for_someone_else(app_module, teacher_ctx):
    admin, _ = teacher_ctx
    r = admin.post("/api/auth/invitations", json={"email": "newteacher@school.test", "role": "teacher"})
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    token = url.rsplit("/", 1)[-1]

    # Only the hash is stored, so the database cannot be replayed into the account.
    stored = db.database().invitations.find_one({"email": "newteacher@school.test"})
    assert token not in stored["token_hash"]

    invitee = client(app_module)
    preview = invitee.get(f"/api/auth/invitations/{token}").json()
    assert preview["school"] == "Test Academy" and preview["role"] == "teacher"

    accepted = invitee.post(
        "/api/auth/invitations/accept",
        json={"token": token, "name": "New Teacher", "password": "their-own-password"},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["user"]["role"] == "teacher"
    assert accepted.json()["user"]["schoolId"] == admin.get("/api/auth/me").json()["user"]["schoolId"]

    # Single use.
    assert invitee.post(
        "/api/auth/invitations/accept",
        json={"token": token, "name": "Again", "password": "another-password"},
    ).status_code == 404


def test_teacher_list_never_exposes_a_credential(teacher_ctx):
    admin, _ = teacher_ctx
    body = admin.get("/api/auth/teachers").json()
    assert body["seats"]["limit"] == 10 and body["seats"]["used"] >= 1
    blob = str(body).lower()
    for forbidden in ("password", "plainpassword", "scrypt", "token_hash"):
        assert forbidden not in blob


def test_only_an_admin_invites_teachers(app_module):
    solo = client(app_module)
    signup(solo, "Solo", "solo@example.com", role="teacher")
    r = solo.post("/api/auth/invitations", json={"email": "x@y.test", "role": "teacher"})
    assert r.status_code == 403
    assert solo.get("/api/auth/teachers").status_code == 403


def test_seat_limit_counts_outstanding_invitations(app_module):
    admin = client(app_module)
    signup(admin, "Trial Head", "trial@school.test", school={"name": "Trial School", "plan": "trial"})
    # Trial covers 5 seats and the admin does not use one.
    for i in range(5):
        r = admin.post("/api/auth/invitations", json={"email": f"t{i}@trial.test", "role": "teacher"})
        assert r.status_code == 200, r.text
    over = admin.post("/api/auth/invitations", json={"email": "one-too-many@trial.test", "role": "teacher"})
    assert over.status_code == 409
    assert "trial plan covers 5" in over.json()["detail"]


# ------------------------------------------------------------- persistent study

def test_the_student_model_survives_a_restart(app_module, teacher_ctx):
    """The point of moving mastery into the database.

    Before this, the learner's state lived in a dict on the worker; a reload reset everything
    the platform believed about them.
    """
    admin, _ = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]

    first = admin.get(f"/api/study/{source_id}/next").json()
    assert first["done"] is False
    assert "answer" not in first, "the answer must not ride along with the question"

    graded = admin.post(
        f"/api/study/{source_id}/answer",
        json={"questionId": first["questionId"], "response": "plainly wrong"},
    ).json()
    assert graded["masteryAfter"] != graded["masteryBefore"]

    # A new client is a new process as far as the engine's old in-memory store was concerned.
    reopened = client(app_module)
    reopened.post("/api/auth/login", json={"email": "head@school.test", "password": "a-good-password"})
    state = reopened.get(f"/api/study/{source_id}").json()
    touched = [c for c in state["concepts"] if c["attempts"] > 0]
    assert touched, "the recorded attempt did not persist"
    assert touched[0]["mastery"] == graded["masteryAfter"]


def test_legacy_engine_routes_still_work_anonymously(app_module):
    """The landing-page demo calls these without an account. They must keep working."""
    anon = client(app_module)
    created = anon.post("/api/sessions", json={"text": DOC, "concepts": 8})
    assert created.status_code == 200
    session_id = created.json()["session_id"]
    q = anon.get(f"/api/sessions/{session_id}/next").json()
    assert q["done"] is False and "answer" not in q
    assert anon.post(
        f"/api/sessions/{session_id}/answer", json={"question_id": q["question_id"], "response": "x"}
    ).status_code == 200


def test_source_chat_is_grounded_and_persisted(app_module, teacher_ctx, monkeypatch):
    from backend import ai

    admin, outsider = teacher_ctx
    source_id = admin.get("/api/sources").json()["sources"][0]["id"]
    monkeypatch.setattr(ai, "grounded_reply", lambda *_: ("A grounded answer.", [{"concept": "vector", "sentence": "A vector has magnitude and direction."}]))
    reply = admin.post(f"/api/sources/{source_id}/chat", json={"message": "What is a vector?"})
    assert reply.status_code == 200, reply.text
    assert reply.json()["message"]["citations"][0]["concept"] == "vector"
    history = admin.get(f"/api/sources/{source_id}/chat").json()["messages"]
    assert [m["role"] for m in history] == ["user", "assistant"]
    assert outsider.get(f"/api/sources/{source_id}/chat").status_code == 404
