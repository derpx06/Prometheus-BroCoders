"""Sources, materials and the question bank.

This is where the merge actually happens. A source is ingested once; materials are generated
from it repeatedly, by whoever is entitled to it. The generation request is the same shape
for a student making a practice quiz and a teacher building an exam — only the permitted
output kinds and what may be done with the result differ.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .. import engine, sources as ingest, store
from ..deps import current_user, teacher
from ..store import User

router = APIRouter(prefix="/api", tags=["content"])

# Outputs a student may make for themselves. The rest are class-facing documents, which is
# a teacher's job — a student generating their own graded exam is not a workflow.
STUDENT_KINDS = {"quiz", "notes", "flashcards", "summary"}


def _fail(e: Exception) -> HTTPException:
    status = getattr(e, "status", 422)
    return HTTPException(status_code=status, detail=str(e))


def _source_out(row: dict, analysis: dict | None = None) -> dict:
    out = {
        "id": row["id"],
        "kind": row["kind"],
        "title": row["title"],
        "origin": row.get("origin"),
        "charCount": row["char_count"],
        "createdAt": row["created_at"],
        "ownerId": row["owner_id"],
    }
    if analysis:
        out |= {
            "subject": analysis["subject"],
            "concepts": [
                {"id": i, "name": c["name"], "evidence": c["evidence"]}
                for i, c in enumerate(analysis["concepts"])
            ],
            "edges": analysis["edges"],
            "topics": engine.topic_layers(analysis),
            "questionCount": len(analysis["bank"]),
        }
    return out


def _require_source(user: User, source_id: str, with_text: bool = False) -> dict:
    row = store.get_source(user, source_id, with_text=with_text)
    if not row:
        raise HTTPException(status_code=404, detail="No such source.")
    return row


def _require_analysis(source_id: str) -> dict:
    analysis = store.get_analysis(source_id)
    if not analysis:
        raise HTTPException(
            status_code=409,
            detail="That source has not been analysed yet. Re-open it to build the analysis.",
        )
    return analysis


def _ingest(user: User, kind: str, title: str, text: str, origin: str | None) -> dict:
    """Store the source, analyse it once, return both. The analysis is the expensive part
    and it is cached here so nothing downstream ever pays for it twice."""
    try:
        analysis = engine.analyse(text)
    except engine.EngineError as e:
        raise _fail(e)

    row = store.create_source(user, kind, title, text, origin)
    store.save_analysis(
        row["id"], analysis["subject"], analysis["concepts"], analysis["edges"], analysis["bank"]
    )
    return _source_out(row, analysis)


# ---------------------------------------------------------------------- sources

@router.get("/sources")
def list_sources(user: User = Depends(current_user)) -> dict:
    return {"sources": [_source_out(r) for r in store.list_sources(user)]}


@router.get("/sources/{source_id}")
def get_source(source_id: str, user: User = Depends(current_user)) -> dict:
    row = _require_source(user, source_id)
    return _source_out(row, store.get_analysis(source_id))


@router.delete("/sources/{source_id}")
def delete_source(source_id: str, user: User = Depends(current_user)) -> dict:
    if not store.delete_source(user, source_id):
        raise HTTPException(status_code=404, detail="No such source, or it is not yours to delete.")
    return {"ok": True}


@router.post("/sources/file")
async def upload_source(
    file: UploadFile = File(...),
    title: str = Form(""),
    user: User = Depends(current_user),
) -> dict:
    raw = await file.read()
    try:
        text = ingest.extract_file(raw, file.filename or "material")
    except ingest.IngestError as e:
        raise _fail(e)
    name = title.strip() or (file.filename or "Uploaded material")
    return _ingest(user, "file", _clean_title(name), text, file.filename)


class TextSource(BaseModel):
    text: str = Field(min_length=ingest.MIN_TEXT_CHARS)
    title: str = Field(default="Pasted notes", max_length=140)


@router.post("/sources/text")
def paste_source(req: TextSource, user: User = Depends(current_user)) -> dict:
    try:
        text = ingest.require_enough_text(req.text, "that text")
    except ingest.IngestError as e:
        raise _fail(e)
    return _ingest(user, "text", _clean_title(req.title), text, None)


class LinkSource(BaseModel):
    url: str = Field(min_length=8, max_length=500)
    title: str = Field(default="", max_length=140)


@router.post("/sources/youtube")
def youtube_source(req: LinkSource, user: User = Depends(current_user)) -> dict:
    """A YouTube URL becomes a source by way of its caption track.

    From the row onward this is indistinguishable from an uploaded PDF, which is the point:
    one pipeline, and the origin is kept only so the card can say where it came from.
    """
    try:
        text, video_title = ingest.fetch_youtube(req.url)
    except ingest.IngestError as e:
        raise _fail(e)
    return _ingest(user, "youtube", _clean_title(req.title or video_title), text, req.url)


def _clean_title(label: str) -> str:
    base = label.rsplit(".", 1)[0] if "." in label[-6:] else label
    base = " ".join(base.replace("_", " ").split())
    return (base[:1].upper() + base[1:]) if base else "Untitled material"


# -------------------------------------------------------------------- materials

class GenerateRequest(BaseModel):
    sourceId: str
    kind: str
    title: str | None = None
    grade: str | None = None
    options: dict = Field(default_factory=dict)
    save: bool = True


KIND_LABEL = {
    "quiz": "Quiz",
    "test": "Test paper",
    "notes": "Notes",
    "assignment": "Assignment",
    "lesson_plan": "Lesson plan",
    "flashcards": "Flashcards",
    "summary": "Summary",
}


@router.post("/materials/generate")
def generate_material(req: GenerateRequest, user: User = Depends(current_user)) -> dict:
    if req.kind not in engine.MATERIAL_KINDS:
        raise HTTPException(status_code=422, detail=f"Cannot generate '{req.kind}'.")
    if not user.is_teacher and req.kind not in STUDENT_KINDS:
        raise HTTPException(
            status_code=403,
            detail=f"{KIND_LABEL[req.kind]}s are created by teachers. "
            "You can make a practice quiz, notes, flashcards or a summary.",
        )

    source = _require_source(user, req.sourceId)
    analysis = _require_analysis(req.sourceId)
    try:
        body = engine.build_material(req.kind, analysis, source["title"], req.options)
    except engine.EngineError as e:
        raise _fail(e)

    title = (req.title or "").strip() or f"{source['title']} — {KIND_LABEL[req.kind]}"
    if not req.save:
        return {"material": {"kind": req.kind, "title": title, "body": body, "id": None}}

    material = store.create_material(
        user,
        req.kind,
        title,
        body,
        source_id=req.sourceId,
        subject=analysis["subject"],
        grade=req.grade,
    )
    return {"material": _material_out(material)}


def _material_out(row: dict) -> dict:
    return {
        "id": row["id"],
        "kind": row["kind"],
        "title": row["title"],
        "subject": row.get("subject"),
        "grade": row.get("grade"),
        "status": row["status"],
        "sourceId": row.get("source_id"),
        "ownerId": row.get("owner_id"),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "body": row.get("body", {}),
    }


@router.get("/materials")
def list_materials(kind: str | None = None, user: User = Depends(current_user)) -> dict:
    rows = store.list_materials(user, kind)
    return {
        "materials": [
            {k: v for k, v in _material_out(r | {"body": "{}"}).items() if k != "body"}
            for r in rows
        ]
    }


@router.get("/materials/{material_id}")
def get_material(material_id: str, user: User = Depends(current_user)) -> dict:
    row = store.get_material(user, material_id) or store.get_material_for_student(
        user, material_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="No such material.")
    out = _material_out(row)
    # A student reading an assigned quiz must not be handed the answer key with it.
    if row["owner_id"] != user.id and not user.is_teacher:
        out["body"] = _strip_answers(out["body"])
        out["readOnly"] = True
    return {"material": out}


def _strip_answers(body: dict) -> dict:
    """Remove answers, explanations and ideal responses from a material body.

    The same defence the engine's `/next` route has always had, applied to the document
    path: a student fetching an assigned quiz gets stems and options, and nothing else.
    """
    def clean(q: dict) -> dict:
        return {k: v for k, v in q.items() if k not in ("answer", "explanation")}

    out = dict(body)
    if isinstance(out.get("questions"), list):
        out["questions"] = [clean(q) for q in out["questions"]]
    if isinstance(out.get("sections"), list):
        out["sections"] = [
            {**s, "questions": [clean(q) for q in s.get("questions", [])]}
            if isinstance(s.get("questions"), list)
            else s
            for s in out["sections"]
        ]
    return out


class MaterialPatch(BaseModel):
    title: str | None = None
    grade: str | None = None
    status: str | None = Field(default=None, pattern="^(draft|published)$")
    body: dict | None = None


@router.patch("/materials/{material_id}")
def patch_material(
    material_id: str, patch: MaterialPatch, user: User = Depends(current_user)
) -> dict:
    if not store.get_material(user, material_id):
        raise HTTPException(status_code=404, detail="No such material.")
    updated = store.update_material(
        user, material_id, patch.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=403, detail="Only the owner can edit this material.")
    return {"material": _material_out(updated)}


@router.delete("/materials/{material_id}")
def delete_material(material_id: str, user: User = Depends(current_user)) -> dict:
    if not store.delete_material(user, material_id):
        raise HTTPException(status_code=404, detail="No such material, or it is not yours.")
    return {"ok": True}


# ---------------------------------------------------------------- question bank

class BankItem(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    type: str = Field(default="mcq", pattern="^(mcq|true_false|short_answer|fill_blank|long_answer)$")
    options: list[str] = Field(default_factory=list)
    answer: str = ""
    explanation: str | None = None
    subject: str | None = None
    grade: str | None = None
    topic: str | None = None
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    bloom: str | None = None
    tags: list[str] = Field(default_factory=list)


@router.get("/question-bank")
def list_bank(user: User = Depends(teacher)) -> dict:
    return {"questions": store.list_bank(user)}


@router.post("/question-bank")
def add_bank_item(item: BankItem, user: User = Depends(teacher)) -> dict:
    return {"question": store.create_bank_item(user, item.model_dump())}


class BankFromSource(BaseModel):
    sourceId: str
    count: int = Field(default=5, ge=1, le=40)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")


@router.post("/question-bank/from-source")
def bank_from_source(req: BankFromSource, user: User = Depends(teacher)) -> dict:
    """Promote generated questions into the bank.

    The engine has already written a grounded bank for every source; this copies a spread of
    it into the teacher's reusable store with its provenance attached, rather than generating
    anything new.
    """
    source = _require_source(user, req.sourceId)
    analysis = _require_analysis(req.sourceId)
    picked = engine._pick_questions(analysis, req.count)
    made = [
        store.create_bank_item(
            user,
            {
                "question": q["stem"],
                "type": "mcq" if q["kind"] == "mcq" else "short_answer",
                "options": list(q.get("options") or []),
                "answer": q["answer"],
                "explanation": engine._explanation(analysis, q),
                "subject": analysis["subject"],
                "topic": analysis["concepts"][q["concept"]]["name"],
                "difficulty": req.difficulty,
                "tags": [source["title"]],
            },
            source_id=req.sourceId,
        )
        for q in picked
    ]
    return {"questions": made, "added": len(made)}


@router.delete("/question-bank/{item_id}")
def delete_bank_item(item_id: str, user: User = Depends(teacher)) -> dict:
    if not store.delete_bank_item(user, item_id):
        raise HTTPException(status_code=404, detail="No such question, or it is not yours.")
    return {"ok": True}
