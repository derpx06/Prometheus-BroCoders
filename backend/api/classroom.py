"""Classes, assignments and attempts.

Neither product had this, and it is where the merge earns its keep: the class is what
connects a teacher's generated material to a named student, and the attempt is what turns a
student's work into the rows every analytic is later computed from.

`classes` being the sharing primitive (rather than `schools`) is what lets an independent
teacher teach students who belong to no school.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .. import grade as grading, security, store
from ..deps import current_user, teacher
from ..generate import Question
from ..store import User

router = APIRouter(prefix="/api", tags=["classroom"])


def _class_out(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "subject": row.get("subject"),
        "grade": row.get("grade"),
        "joinCode": row["join_code"],
        "teacherId": row["teacher_id"],
        "teacherName": row.get("teacher_name"),
        "studentCount": row.get("student_count"),
        "createdAt": row["created_at"],
    }


def _assignment_out(row: dict) -> dict:
    return {
        "id": row["id"],
        "classId": row["class_id"],
        "className": row.get("class_name"),
        "materialId": row["material_id"],
        "materialKind": row.get("material_kind"),
        "title": row["title"],
        "instructions": row.get("instructions"),
        "dueAt": row.get("due_at"),
        "publishedAt": row.get("published_at"),
        "createdAt": row["created_at"],
        "submissions": row.get("submissions"),
        "attemptId": row.get("attempt_id"),
        "score": row.get("score"),
    }


# ---------------------------------------------------------------------- classes

class ClassRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    subject: str | None = None
    grade: str | None = None


@router.get("/classes")
def list_classes(user: User = Depends(current_user)) -> dict:
    """Both sides of the relationship in one call, because a teacher can also be a student
    in somebody else's class and the UI should not have to guess."""
    return {
        "teaching": [_class_out(c) for c in store.classes_taught(user)] if user.is_teacher else [],
        "enrolled": [_class_out(c) for c in store.classes_joined(user)],
    }


@router.post("/classes")
def create_class(req: ClassRequest, user: User = Depends(teacher)) -> dict:
    # Codes are read aloud and typed by hand, so a collision is worth retrying rather than
    # erroring on.
    for _ in range(6):
        code = security.new_join_code()
        if not store.class_by_code(code):
            return {"class": _class_out(store.create_class(user, req.name, code, **req.model_dump(exclude={"name"})))}
    raise HTTPException(status_code=500, detail="Could not allocate a join code. Try again.")


class JoinRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)


@router.post("/classes/join")
def join_class(req: JoinRequest, user: User = Depends(current_user)) -> dict:
    row = store.class_by_code(req.code)
    if not row:
        raise HTTPException(status_code=404, detail="No open class has that code.")
    if row["teacher_id"] == user.id:
        raise HTTPException(status_code=409, detail="You teach that class.")
    store.add_member(row["id"], user.id)
    return {"class": _class_out(row)}


@router.get("/classes/{class_id}")
def get_class(class_id: str, user: User = Depends(current_user)) -> dict:
    row = store.class_by_id(class_id)
    if not row:
        raise HTTPException(status_code=404, detail="No such class.")
    teaching = store.teaches(user, class_id)
    if not teaching and not store.is_member(user, class_id):
        raise HTTPException(status_code=403, detail="You are not in that class.")

    out: dict = {
        "class": _class_out(row),
        "teaching": teaching,
        "assignments": [_assignment_out(a) for a in store.assignments_for_class(class_id)],
    }
    if teaching:
        out["members"] = store.class_members(class_id)
    else:
        # A student sees their own work, never the roster or anyone else's results.
        mine = {a["id"]: a for a in store.assignments_for_student(user)}
        out["assignments"] = [
            _assignment_out(mine[a["id"]]) for a in out["assignments"] if a["id"] in mine
        ]
    return out


@router.delete("/classes/{class_id}/members/{member_id}")
def remove_member(class_id: str, member_id: str, user: User = Depends(teacher)) -> dict:
    if not store.teaches(user, class_id):
        raise HTTPException(status_code=403, detail="That is not your class.")
    if not store.remove_member(class_id, member_id):
        raise HTTPException(status_code=404, detail="That person is not in this class.")
    return {"ok": True}


@router.delete("/classes/{class_id}")
def archive_class(class_id: str, user: User = Depends(teacher)) -> dict:
    if not store.archive_class(user, class_id):
        raise HTTPException(status_code=404, detail="No such class, or it is not yours.")
    return {"ok": True}


# ------------------------------------------------------------------ assignments

class AssignRequest(BaseModel):
    materialId: str
    title: str | None = None
    instructions: str | None = None
    dueAt: float | None = None
    publish: bool = True


@router.post("/classes/{class_id}/assignments")
def assign(class_id: str, req: AssignRequest, user: User = Depends(teacher)) -> dict:
    if not store.teaches(user, class_id):
        raise HTTPException(status_code=403, detail="That is not your class.")
    material = store.get_material(user, req.materialId)
    if not material:
        raise HTTPException(status_code=404, detail="No such material.")
    if material["kind"] not in ("quiz", "test", "assignment", "notes", "summary", "flashcards"):
        raise HTTPException(
            status_code=422, detail=f"A {material['kind']} is not something a student completes."
        )
    row = store.create_assignment(
        user,
        class_id,
        req.materialId,
        (req.title or material["title"]).strip(),
        req.instructions,
        req.dueAt,
        publish=req.publish,
    )
    return {"assignment": _assignment_out(row)}


@router.get("/assignments")
def my_assignments(user: User = Depends(current_user)) -> dict:
    return {"assignments": [_assignment_out(a) for a in store.assignments_for_student(user)]}


@router.get("/assignments/{assignment_id}")
def get_assignment(assignment_id: str, user: User = Depends(current_user)) -> dict:
    row = store.assignment_by_id(assignment_id)
    if not row:
        raise HTTPException(status_code=404, detail="No such assignment.")
    teaching = store.teaches(user, row["class_id"])
    if not teaching and not store.is_member(user, row["class_id"]):
        raise HTTPException(status_code=403, detail="You are not in that class.")

    out: dict = {"assignment": _assignment_out(row), "teaching": teaching}
    if teaching:
        out["results"] = store.attempts_for_assignment(assignment_id)
        out["locked"] = store.assignment_is_locked(assignment_id)
    else:
        open_attempt = store.open_attempt(user, assignment_id)
        out["openAttemptId"] = open_attempt["id"] if open_attempt else None
    return out


# --------------------------------------------------------------------- attempts

class StartAttempt(BaseModel):
    assignmentId: str


@router.post("/attempts")
def start_attempt(req: StartAttempt, user: User = Depends(current_user)) -> dict:
    """Start, or resume, an attempt at an assigned piece of work.

    Resuming rather than starting afresh matters: a student who closes the tab halfway
    through should not lose the answers they already submitted.
    """
    assignment = store.assignment_by_id(req.assignmentId)
    if not assignment or not assignment["published_at"]:
        raise HTTPException(status_code=404, detail="No such assignment.")
    if not store.is_member(user, assignment["class_id"]):
        raise HTTPException(status_code=403, detail="That work is not assigned to you.")

    existing = store.open_attempt(user, req.assignmentId)
    if existing:
        return {"attempt": store.attempt_by_id(user, existing["id"]), "resumed": True}

    material = store.get_material_for_student(user, assignment["material_id"])
    if not material:
        raise HTTPException(status_code=404, detail="The material for that assignment is missing.")
    total = _max_score(material["body"])
    attempt = store.create_attempt(
        user,
        material["kind"],
        assignment_id=req.assignmentId,
        material_id=assignment["material_id"],
        source_id=material.get("source_id"),
        max_score=total,
    )
    return {"attempt": attempt, "resumed": False}


def _questions(body: dict) -> list[dict]:
    if isinstance(body.get("questions"), list):
        return list(body["questions"])
    return [q for s in body.get("sections") or [] for q in s.get("questions") or []]


def _max_score(body: dict) -> float:
    qs = _questions(body)
    return float(sum(q.get("marks", 1) for q in qs)) or float(len(qs))


class AnswerRequest(BaseModel):
    ref: str
    response: str = ""


@router.post("/attempts/{attempt_id}/answer")
def answer_attempt(
    attempt_id: str, req: AnswerRequest, user: User = Depends(current_user)
) -> dict:
    """Grade one answer and record it.

    Graded with the same grader the adaptive loop uses — exact match for objective items,
    embedding similarity for written ones — so a score means the same thing wherever it was
    earned.
    """
    attempt = store.attempt_by_id(user, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="No such attempt.")
    if attempt["submitted_at"]:
        raise HTTPException(status_code=409, detail="That attempt has already been submitted.")
    if any(a["question_ref"] == req.ref for a in attempt["answers"]):
        raise HTTPException(status_code=409, detail="That question has already been answered.")

    material = store.get_material(user, attempt["material_id"]) or store.get_material_for_student(
        user, attempt["material_id"]
    )
    if not material:
        raise HTTPException(status_code=404, detail="The material for that attempt is missing.")

    question = next((q for q in _questions(material["body"]) if q.get("ref") == req.ref), None)
    if not question:
        raise HTTPException(status_code=404, detail="No such question in this material.")

    correct, score, ideal = grading.grade(
        Question(
            id=0,
            concept=0,
            kind="mcq" if question.get("kind") == "mcq" else "free",
            stem=question.get("stem", ""),
            answer=question.get("answer", ""),
            options=list(question.get("options") or []),
        ),
        req.response,
    )
    marks = float(question.get("marks", 1))
    awarded = marks if correct else (marks * score if question.get("kind") != "mcq" else 0.0)

    store.record_answer(
        attempt_id,
        req.ref,
        req.response,
        correct,
        round(awarded, 3),
        concept=question.get("concept"),
        prompt=question.get("stem"),
    )
    return {
        "correct": correct,
        "score": round(score, 3),
        "awarded": round(awarded, 3),
        "marks": marks,
        "idealAnswer": ideal,
        "explanation": question.get("explanation") or ideal,
        "concept": question.get("concept"),
    }


@router.post("/attempts/{attempt_id}/submit")
def submit(attempt_id: str, user: User = Depends(current_user)) -> dict:
    attempt = store.submit_attempt(user, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="No such attempt.")
    return {"attempt": attempt}


@router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: str, user: User = Depends(current_user)) -> dict:
    """One attempt, with the answer key attached **only once it has been submitted**.

    Before submission a student's copy of the material has its answers stripped, which is what
    stops the key leaking into the quiz. After submission the opposite is true: reviewing what
    you got wrong, against the right answer and an explanation, is the entire point of taking
    it. So the key is joined back on here, and nowhere earlier.
    """
    attempt = store.attempt_by_id(user, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="No such attempt.")

    if attempt["submitted_at"] and attempt["material_id"]:
        material = store.get_material(user, attempt["material_id"]) or store.get_material_for_student(
            user, attempt["material_id"]
        )
        if material:
            by_ref = {q.get("ref"): q for q in _questions(material["body"])}
            for row in attempt["answers"]:
                q = by_ref.get(row["question_ref"]) or {}
                row["ideal_answer"] = q.get("answer")
                row["explanation"] = q.get("explanation")
    return {"attempt": attempt}


@router.get("/attempts")
def my_attempts(user: User = Depends(current_user)) -> dict:
    return {"attempts": store.attempts_for_user(user)}
