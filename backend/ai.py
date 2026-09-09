"""Grounded Groq chat. The browser never receives provider credentials."""
from __future__ import annotations
import json, os
import httpx

class AIUnavailable(Exception): pass

def _models() -> list[str]:
    return [x.strip() for x in [os.environ.get("GROQ_MODEL", ""), *os.environ.get("GROQ_MODEL_FALLBACKS", "").split(",")] if x.strip()]

def grounded_reply(message: str, evidence: list[dict], history: list[dict]) -> tuple[str, list[dict]]:
    key = os.environ.get("GROQ_API_KEY")
    if not key or not _models(): raise AIUnavailable("Study chat is not configured.")
    sources = [{"id":i, "concept":x["concept"], "sentence":x["sentence"]} for i,x in enumerate(evidence)]
    system = ("You are a study assistant. Answer only from SOURCE_EVIDENCE. If it does not cover "
        "the question, say so plainly. Return strict JSON with answer (string) and citation_ids "
        "(array of SOURCE_EVIDENCE ids). Never invent citations. SOURCE_EVIDENCE=" + json.dumps(sources, ensure_ascii=False))
    messages = [{"role":"system","content":system}] + [{"role":m["role"],"content":m["content"]} for m in history[-20:]] + [{"role":"user","content":message}]
    for model in _models():
        try:
            response = httpx.post("https://api.groq.com/openai/v1/chat/completions", headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"}, json={"model":model,"messages":messages,"temperature":0.2,"response_format":{"type":"json_object"}}, timeout=30)
            response.raise_for_status()
            payload=json.loads(response.json()["choices"][0]["message"]["content"])
            answer=str(payload.get("answer","")).strip(); ids=payload.get("citation_ids",[])
            if not answer or not isinstance(ids,list): raise ValueError("invalid model schema")
            citations=[{"concept":evidence[i]["concept"],"sentence":evidence[i]["sentence"]} for i in ids if isinstance(i,int) and 0 <= i < len(evidence)]
            return answer, citations
        except (httpx.HTTPError, ValueError, KeyError, json.JSONDecodeError):
            continue
    raise AIUnavailable("The study assistant is temporarily unavailable. Please try again.")
