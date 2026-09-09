from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from .. import ai, store
from ..deps import current_user
from ..store import User

router=APIRouter(prefix="/api/sources", tags=["chat"])
def _source(user: User, source_id: str) -> dict:
    source=store.get_source(user,source_id,with_text=True)
    if not source: raise HTTPException(404,"No such source.")
    analysis=store.get_analysis(source_id)
    if not analysis: raise HTTPException(409,"That source has not been analysed yet.")
    return analysis
@router.get("/{source_id}/chat")
def history(source_id: str, user: User=Depends(current_user)) -> dict:
    _source(user,source_id); return {"messages":store.chat_history(user,source_id)}
class ChatRequest(BaseModel): message: str = Field(min_length=1,max_length=2000)
@router.post("/{source_id}/chat")
def chat(source_id: str, req: ChatRequest, user: User=Depends(current_user)) -> dict:
    analysis=_source(user,source_id)
    evidence=[{"concept":c["name"],"sentence":s} for c in analysis["concepts"] for s in c.get("evidence",[])][:80]
    if not evidence: raise HTTPException(422,"This material has no usable evidence for study chat.")
    store.save_chat_message(user,source_id,"user",req.message.strip())
    try: content,citations=ai.grounded_reply(req.message.strip(),evidence,store.chat_history(user,source_id,limit=40)[:-1])
    except ai.AIUnavailable as exc: raise HTTPException(503,str(exc)) from exc
    return {"message":store.save_chat_message(user,source_id,"assistant",content,citations)}
